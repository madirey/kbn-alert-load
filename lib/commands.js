'use strict'

/** @typedef { import('./types').Deployment } Deployment */
/** @typedef { import('./types').CommandHandler } CommandHandler */
/** @typedef { import('./types').EventLogRecord } EventLogRecord */
/** @typedef { import('./types').TaskManagerStats } TaskManagerStats */

const path = require('path')
const { homedir } = require('os')
const pkg = require('../package.json')
const logger = require('./logger')
const ecCommands = require('./ec-commands')
const { createDeployment, DeploymentPrefix } = require('./deployment')
const parseArgs = require('./parse_args')
const { getSuite, getSuites, validateSuite } = require('./suites')
const {
  createAlert,
  createAction,
  createRule,
  updateRule,
  getRuleStatuses,
  deleteRules,
  getKbStatus,
  getKbTaskManagerStatus,
  createDefaultIndex } = require('./kb')
const {
  getEventLog,
  getEsStatus,
  putClusterSettings,
  putILMPolicy,
  putIndexTemplate,
  createIndicatorIndex,
  deleteIndicatorIndex,
  deleteTestIndex,
  createDetection
} = require('./es')
const { generateReport, generateCombineReport } = require('./report')
const { delay, shortDateString, arrayFrom, sortByDate } = require('./utils')
const { runQueue } = require('./work-queue')
const { runTraffic } = require('./traffic')

module.exports = {
  commands: [
    run,
    help,
    ls,
    lsv,
    lsd,
    rmd,
    rmdall,
    env,
    runIM
  ]
}

const CONCURRENT_ALERT_CREATION = 40
const STATS_INTERVAL_MILLIS = 15 * 1000


async function runIM({ configSequence, reportFileName, outputFolder, minutes, waitMore}) {
  const configSequenceData = require(path.join('..', configSequence))

  const {esUrl, kbUrl, suites} = configSequenceData;

  const reports = [];
  for (const suite of suites) {
    const reportName = await run({esUrl, kbUrl, reportFileName, suiteData: suite, scenario:1, minutes: suite.minutes || minutes, outputFolder, waitMore:suite.waitMore || waitMore}, []);
    reports.push(reportName)
  }

  generateCombineReport(reports, outputFolder)
}

/** @type { CommandHandler } */
async function run({ config, minutes, percentFiring, esUrl, kbUrl, scenario, trafficGenerator, trafficGeneratorId, reportFileName, suiteData, outputFolder, waitMore }, [ suiteId ]) {
  if (suiteId == null && suiteData == null) {
    return logger.logErrorAndExit('suite must passed as an parameter')
  }

  const suite = suiteData || getSuite(suiteId)
  if (suite == null) {
    return logger.logErrorAndExit(`no suite with id "${suiteId}"`)
  }

  try {
    validateSuite(suite)
  } catch (err) {
    return logger.logErrorAndExit(`invalid suite: ${err.message}`)
  }

  if (percentFiring < 0 || percentFiring > 100) {
    return logger.logErrorAndExit(`invalid percentFiring: ${percentFiring}. Value must be between 0 and 100`)
  }

  logger.printTime(true)

  const date = new Date()
  const runName = shortDateString(date)

  const deployments = []
  if (esUrl !== undefined && kbUrl !== undefined) {
    if (esUrl === undefined || kbUrl === undefined) {
      return logger.logErrorAndExit(`invalid esUrl: ${esUrl} or kbUrl: ${kbUrl}.  Both must be defined if given`)
    }
    if (scenario > suite.scenarios.length) {
      return logger.logErrorAndExit(`invalid scenario: ${scenario} selected from suite: ${suiteId}.  Value must be between 1 and ${suite.scenarios.length}`)
    }
    const deployment = {
      name: 'custom',
      id: 'custom',
      esUrl: esUrl,
      kbUrl: kbUrl,
      kbInstances: 1,
      scenario: suite.scenarios[scenario-1]
    }
    deployment.scenario.kbSpec = 'custom'
    deployment.scenario.esSpec = 'custom'
    logger.log(`Deleting existing rules`)
    await deleteTestIndex(deployment.esUrl)
    await deleteIndicatorIndex(deployment.esUrl)
    await deleteRules(deployment.kbUrl)
    deployments.push(deployment)
    logger.log(`Running test: \n${JSON.stringify(deployment, null, 2)}`)
  } else {
    await listOldDeployments(config)
    logger.log(`creating deployments for config ${config}`)
    // @ts-ignore
    const deploymentPromises = []
    for (let i = 0; i < suite.scenarios.length; i++) {
      const deploymentPromise = createDeployment(config, runName, suite, suite.scenarios[i])
      deploymentPromises.push(deploymentPromise)
      await delay(30 * 1000)
    }

    try {
      await Promise.all(deploymentPromises)
    } catch (err) {
      logger.log(`error creating deployments: ${err}`)
      logger.log(``)
      return logger.logErrorAndExit(`You will need to manually shutdown any deployments that started.`)
    }

    /** @type { Deployment[] } */
    for (const deploymentPromise of deploymentPromises) {
      deployments.push(await deploymentPromise)
    }
  }

  logger.log('')
  for (const deployment of deployments) {
    logger.log(`deployment ${deployment.id} ${deployment.scenario.name}`)
    logger.log(`  es: ${deployment.esUrl}`)
    logger.log(`  kb: ${deployment.kbUrl}`)
    logger.log('')
  }

  logger.log(`creating ilm and index template`)
  deployments.map(async deployment => {
    const indexPattern = "test-*"
    if (deployment.scenario.searchableSnapshot) {
      const ilmName = "hot-warm-cold"
      await putClusterSettings(deployment.esUrl)
      await putILMPolicy(deployment.esUrl, ilmName)
      await putIndexTemplate(deployment.esUrl, indexPattern, ilmName)
    }
    else {
      await putIndexTemplate(deployment.esUrl, indexPattern)
    }
  })

  logger.log(`creating rules`)
  const queues = deployments.map(async deployment => {
    logger.log(`${deployment.name}: creating .siem-signals-default index`)
    await createDefaultIndex(deployment.kbUrl)
    if (deployment.scenario.ruleType === 'indicator' && deployment.scenario.indicatorIndexSize !== undefined && deployment.scenario.indicatorIndexSize > 0) {
      const indicatorIndexSize = deployment.scenario.indicatorIndexSize || 1
      const indicatorFieldCount = deployment.scenario.indicatorFieldCount || 1
      logger.log(`${deployment.name}: creating threat-indicator index with ${indicatorIndexSize} size and ${indicatorFieldCount} fields per document`)
      await createIndicatorIndex(deployment.esUrl, indicatorIndexSize, indicatorFieldCount)
      await addIndicators(deployments, percentFiring)
    }
    logger.log(`${deployment.name}: creating ${deployment.scenario.alerts} ${deployment.scenario.ruleType} rules`)
    const alertNames = arrayFrom(deployment.scenario.alerts, (i) => `${i}`.padStart(5, '0'))
    return await runQueue(alertNames, CONCURRENT_ALERT_CREATION, async (alertName, i) => {
      try {
        const data = await createRule(deployment.kbUrl, `${alertName}`, deployment.scenario)
        return data
      } catch (err) {
        logger.log(`error creating ${deployment.scenario.ruleType} rule ${alertName} in ${deployment.scenario.name}, but continuing: ${err.message}`)
      }
    })
  })
  const ruleIds = await Promise.all(queues)

  const ruleUpdatesPromises = deployments.map(async (deployment, index) => {
    const rulePatchJSON = {}
    if (deployment.scenario.itemsPerSearch !== undefined) rulePatchJSON['items_per_search'] = deployment.scenario.itemsPerSearch
    if (deployment.scenario.concurrentSearches !== undefined) rulePatchJSON['concurrent_searches'] = deployment.scenario.concurrentSearches

    if (Object.keys(rulePatchJSON).length !== 0) {
      logger.log(`${deployment.name}: patching rules`)
      await updateRule(deployment.kbUrl, ruleIds[index], rulePatchJSON)
    }
  })
  await Promise.all(ruleUpdatesPromises)

  logger.log('starting stats collection')
  const startTimestamp = Date.now()
  /** @type { any[] } */
  const kbStatusList = []
  /** @type { Map<string, Map<string, TaskManagerStats[]>> } */
  const kbTaskManagerStatusList = new Map()
  /** @type { any[] } */
  const esStatusList = []
  const interval = setInterval(async () => {
    updateKbStatus(deployments, kbStatusList)
    updateKbTMStatus(deployments, kbTaskManagerStatusList)
    updateEsStatus(deployments, esStatusList)
  }, STATS_INTERVAL_MILLIS).unref()

  logger.log('Starting indicator traffic and background traffic')
 
  const traffic = setInterval(async () => {
    addIndicators(deployments, percentFiring)
  }, 60 * 1000).unref()
  if (trafficGenerator === undefined){
    logger.log(`No background traffic generator set, skipping background traffic`)
  } else {
    deployments.map(deployment => {
      if (deployment.scenario.trafficRate !== undefined) {
        runTraffic(trafficGenerator, trafficGeneratorId, deployment.esUrl, deployment.scenario.trafficRate, minutes * 60)
      }
    })
  }

  logger.log(`running for ${minutes} minute(s)`)
  await delay(minutes * 60 * 1000)

  clearInterval(interval)
  clearInterval(traffic)

  logger.log(`waiting for ${waitMore} minute(s)`)
  await delay(waitMore * 60 * 1000)

  logger.log(`capturing event logs`)
  /** @type { EventLogRecord[] } */
  let completeLog = []
  for (const deployment of deployments) {
    const eventLog = await getEventLog(`${deployment.scenario.sortName}`, deployment.esUrl, startTimestamp)
    completeLog = completeLog.concat(eventLog)
  }
  let ruleStatus = {}
  const getRuleStatusPromises = deployments.map(async (deployment, index) => {
    const getRuleStatus = await getRuleStatuses(deployment.kbUrl, ruleIds[index])
    ruleStatus[deployment.scenario.sortName] = getRuleStatus
  })
  await Promise.all(getRuleStatusPromises)

  completeLog.sort(sortByDate)
  logger.log(`generating report`)
  const reportName = generateReport(runName, suite, deployments, completeLog, kbStatusList, esStatusList, kbTaskManagerStatusList, ruleStatus, reportFileName, outputFolder)

  if (esUrl === undefined && kbUrl === undefined) {
    logger.log('')
    logger.log(`deleting deployments`)
    const deletePromises = deployments.map(deployment => deployment.delete())
    await Promise.all(deletePromises)
    logger.log(`deployments deleted`)

    await listOldDeployments(config)
  }

  return reportName;

  /** @type { (deployments: Deployment[], kbStatusList: any[]) => Promise<void> } */
  async function updateKbStatus(deployments, kbStatusList) {
    for (const deployment of deployments) {
      try {
        const status = await getKbStatus(deployment.kbUrl)
        status.scenario = deployment.scenario.sortName
        delete status.status // don't need this info, save some space
        kbStatusList.push(status)
      } catch (err) {
        logger.log(`error getting kb stats from ${deployment.scenario.name}: ${err}`)
      }
    }
  }

  /** @type { (deployments: Deployment[], kbTaskManagerStatusList: Map<string, Map<string, TaskManagerStats[]>>) => Promise<void> } */
  async function updateKbTMStatus(deployments, kbTaskManagerStatusList) {
    for (const deployment of deployments) {
      if(!kbTaskManagerStatusList.has(deployment.scenario.sortName)){
        kbTaskManagerStatusList.set(deployment.scenario.sortName, new Map())
      }
      const scenarioTmStats = kbTaskManagerStatusList.get(deployment.scenario.sortName)
      const tmIDsInScenaio = Array.from(scenarioTmStats.keys())

      try {
        const statusMap = new Map()
        logger.log(`collecting stats from ${deployment.kbInstances} Task Managers`)

        await retryMaxTimes(async () => {
          const tmStats = await getKbTaskManagerStatus(deployment.kbUrl)
          if(!statusMap.has(tmStats.id)){
            tmStats.scenario = deployment.scenario.sortName
            statusMap.set(tmStats.id, tmStats)
          }
          return statusMap.size === deployment.kbInstances
        }, deployment.kbInstances * 4)

        if(statusMap.size !== deployment.kbInstances){
          const missingTMs = tmIDsInScenaio.filter(tmId => !statusMap.has(tmId))
          const missingCount = deployment.kbInstances - statusMap.size
          logger.log(`failed to find ${missingCount} Task managers (${missingTMs.join(', ')}${ missingCount > missingTMs.length ? ` and ${missingCount - missingTMs.length} more` : ``})`)
        }

        statusMap.forEach((stat, tmId) => {
          if(!scenarioTmStats.has(tmId)){
            scenarioTmStats.set(tmId, [])
          }
          scenarioTmStats.get(tmId).push(stat)
        })
      } catch (err) {
        logger.log(`error getting kb stats from ${deployment.scenario.name}: ${err}`)
      }
    }
  }

  /** @type { (deployments: Deployment[], esStatusList: any[]) => Promise<void> } */
  async function updateEsStatus(deployments, esStatusList) {
    for (const deployment of deployments) {
      try {
        const statuses = await getEsStatus(deployment.esUrl)
        for (const status of statuses) {
          status.scenario = deployment.scenario.sortName
          status.date = new Date().toISOString()
          esStatusList.push(status)
        }
      } catch (err) {
        logger.log(`error getting es stats from ${deployment.scenario.name}: ${err}`)
      }
    }
  }

  async function addIndicators(deployments) {
    const indicatorQueues = deployments.map(async deployment => {
      if (deployment.scenario.indicatorCount !== undefined) {
        const alertNames = arrayFrom(deployment.scenario.alerts, (i) => `${i}`.padStart(5, '0'))
        const indicators = [...Array(deployment.scenario.indicatorCount).keys()]
        return await runQueue(indicators, CONCURRENT_ALERT_CREATION, async (alertName, i) => {
          try {
            const indicatorName = alertNames[i % deployment.scenario.alerts]
            const numValue = Math.floor(Math.random() * 999999999999)
            const data = await createDetection(deployment.esUrl, deployment.scenario.ruleType, indicatorName, numValue,  deployment.scenario.indicatorIndexSize - 1 || 0,  deployment.scenario.indicatorFieldCount - 1 || 0)
            return data
          } catch (err) {
            logger.log(`error creating indicator in ${deployment.scenario.name}, but continuing: ${err.message}`)
          }
        })
      }
    })
    await Promise.all(indicatorQueues)
  }
}

/** @type { CommandHandler } */
// @ts-ignore
async function env({ config, minutes }, [ suiteId ]) {
  logger.log('current environment:')
  logger.log(`  minutes:   ${minutes}`)
  logger.log(`  config:    ${config}`)

  const configFile = path.join(homedir(), '.ecctl', `${config}.json`)
  /** @type { any } */
  let configData = {}
  try {
    configData = require(configFile)
    logger.log(`     host:   ${configData.host}`)
    logger.log(`     region: ${configData.region}`)
  } catch (err) {
    logger.log(`    error reading config file "${configFile}": ${err}`)
  }
}

/** @type { CommandHandler } */
// @ts-ignore
async function ls({ config }, args) {
  const suites = getSuites()
  for (const { id, description, scenarios } of suites) {
    logger.log(`suite: ${id} - ${description}`)
    for (const scenario of scenarios) {
      logger.log(`    ${scenario.name}`)
    }
  }

  for (const suite of suites) {
    try {
      validateSuite(suite)
    } catch (err) {
      logger.log(`error: ${err.message}`)
    }
  }
}

/** @type { CommandHandler } */
// @ts-ignore
async function lsv({ config }) {
  const suites = getSuites()
  for (const { id, description, scenarios } of suites) {
    logger.log(`suite: ${id} - ${description}`)
    for (const scenario of scenarios) {
      const prefix1 = `    `
      const prefix2 = `${prefix1}${prefix1}`
      logger.log(`${prefix1}${scenario.name}`)
      logger.log(`${prefix2}version:        ${scenario.version}`)
      logger.log(`${prefix2}esSpec:         ${scenario.esSpec}`)
      logger.log(`${prefix2}kbSpec:         ${scenario.kbSpec}`)
      logger.log(`${prefix2}alerts:         ${scenario.alerts}`)
      logger.log(`${prefix2}alertInterval:  ${scenario.alertInterval}`)
      logger.log(`${prefix2}tmPollInterval: ${scenario.tmPollInterval}`)
      logger.log(`${prefix2}tmMaxWorkers:   ${scenario.tmMaxWorkers}`)
      if (scenario.indicatorIndexSize !== undefined) logger.log(`${prefix2}indicatorIndexSize:   ${scenario.indicatorIndexSize}`)
    }
    logger.log('')
  }

  for (const suite of suites) {
    try {
      validateSuite(suite)
    } catch (err) {
      logger.log(`error: ${err.message}`)
    }
  }
}

/** @type { CommandHandler } */
async function lsd({ config }) {
  const deployments = await getDeployments(config)
  for (const { name, id } of deployments) {
    logger.log(`${id} - ${name}`)
  }
}

/** @type { CommandHandler } */
async function rmd({ config }, [pattern]) {
  if (pattern == null) {
    return logger.logErrorAndExit('deployment pattern must be passed as a parameter')
  }

  const deployments = await getDeployments(config)
  for (const { name, id } of deployments) {
    if ((pattern !== '*') && (name.indexOf(pattern) === -1)) continue

    logger.log(`deleting deployment ${id} - ${name}`)

    try {
      await ecCommands.deleteDeployment({ config, id, name })
    } catch (err) {
      logger.log(`error deleting deployment: ${err}`)
    }
  }
}

/** @type { CommandHandler } */
async function rmdall({ config }) {
  return await rmd({ config, minutes: 0, percentFiring: 0 }, ['*'])
}

/** @type { CommandHandler } */
async function help() {
  console.log(parseArgs.help)
}

/** @type { (config: string) => Promise<{ id: string, name: string }[]> } */
async function getDeployments(config) {
  /** @type { { deployments: { id: string, name: string }[] } } */
  const { deployments } = await ecCommands.listDeployments({ config })

  return deployments
      .filter(({ name }) => name.startsWith(DeploymentPrefix))
      .sort((a, b) => a.name.localeCompare(b.name))
}

/** @type { (config: string) => Promise<void> } */
async function listOldDeployments(config) {
  const deployments = await getDeployments(config)
  if (deployments.length === 0) return

  logger.log('')
  logger.log('currently running (old?) deployments:')
  await lsd({ config, minutes: 0, percentFiring: 0 })
  logger.log(`(use "${pkg.name} rmd" or "${pkg.name} rmdall" to delete)`)
  logger.log('')
}


/** @type { (retryPredicate: () => Promise<boolean>, times: number) => Promise<void> } */
async function retryMaxTimes(retryPredicate, times) {
  const result = await retryPredicate()
  if(!result && times > 0){
    await retryMaxTimes(retryPredicate, times - 1)
  }
}
