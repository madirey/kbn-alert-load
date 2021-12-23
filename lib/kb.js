'use strict'

const https = require('https')
const axios = require('axios').default
const pkg = require('../package.json')
const { retry } = require('./utils')
const { eqlRule, indicatorRule, queryRule, thresholdRule } = require('./rules')

module.exports = {
  createAlert,
  createAction,
  createRule,
  updateRule,
  getRuleStatuses,
  deleteRules,
  getKbStatus,
  getKbTaskManagerStatus,
  createDefaultIndex,
}

const alertTypeId = '.index-threshold'
const actionTypeId = '.index'

const axiosConfig = {
  headers: {
    'kbn-xsrf': `${pkg.name}@${pkg.version}`,
    'content-type': 'application/json',
  },
  httpsAgent: new https.Agent ({
    rejectUnauthorized: false
  })
}

const httpClient = axios.create(axiosConfig)

/** @type { (kbUrl: string, name: string, inputIndex: string, firing: boolean, actions: Array<{ id: string, group: string, params: any }>) => Promise<string> } */
async function createAlert(kbUrl, name, inputIndex, firing = false, actions = []) {
  /** @type {any} */
  const data = {
    enabled: true,
    name,
    alertTypeId,
    consumer: 'alerts',
    schedule: { interval: '1m' },
    actions,
    params: {
      index: '.kibana-event-log*',
      timeField: '@timestamp',
      aggType: 'count',
      groupBy: 'all',
      termSize: 5,
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: firing ? '>' : '<',
      threshold: [-1],
    },
  }

  const response = await retry(120, 5, `creating alert`, async () => 
    await httpClient.post(`${kbUrl}/api/alerts/alert`, data)
  )

  const { id } = response.data || {}
  return id
}

/** @type { (kbUrl: string, name: string, outputIndex: string) => Promise<string> } */
async function createAction(kbUrl, name, outputIndex) {
  /** @type {any} */
  const data = {
    name,
    actionTypeId,
    config: {
      index: outputIndex,
      executionTimeField: '@timestamp',
    },
  }

  const response = await retry(120, 5, `creating action`, async () =>
    await httpClient.post(`${kbUrl}/api/actions/action`, data)
  )

  const { id } = response.data || {}
  return id
}

/** @type { (kbUrl: string) => Promise<string> } */
async function createDefaultIndex(kbUrl) {
  const data = {}
  // const response = await retry(10, 2, `creating .siem-signals-default index`, async () =>
     
  // )
  try {
    const response = await httpClient.post(`${kbUrl}/api/detection_engine/index`, data)
    return response.data || []
  } catch (error) {
    console.log(error)
  }

}

/** @type { (kbUrl: string, ruleName: string, scenario: scenario, enabled: boolean) => Promise<string> } */
async function createRule(kbUrl, ruleName, scenario, enabled=true) {
  let rule
  if (scenario.ruleType === 'query') {
    rule = queryRule(ruleName, ruleName, enabled, scenario.alertInterval || '1m')
  } else if (scenario.ruleType === 'indicator') {
    // let field = 'value'
    // if (ruleName === '00000') {
    //   field = 'indicator_value'
    // }
    let field = 'indicator_value'
    rule = indicatorRule(ruleName, field, scenario.indicatorFieldCount || 1, enabled, scenario.alertInterval || '1m')
  } else if (scenario.ruleType === 'eql') {
    rule = eqlRule(ruleName, ruleName, enabled, scenario.alertInterval || '1m')
  } else if (scenario.ruleType === 'threshold') {
    let thresholdField = 'not_field'
    if (ruleName === '00000') {
      thresholdField = 'num_value'
    }
    rule = thresholdRule(ruleName, thresholdField, 10, enabled, scenario.alertInterval || '1m')
  }

  const response = await retry(10, 2, `creating ${scenario.ruleType} rule`, async () =>
      await httpClient.post(`${kbUrl}/api/detection_engine/rules`, rule)
  )
  const { id } = response.data || {}
  return id
}

/** @type { (kbUrl: string, ruleIds: [string], patchData: object) => Promise<any> } */
async function updateRule(kbUrl, ruleIds, patchData) {
  const data = await ruleIds.map(ruleId => {
    return {
      id: ruleId,
      ...patchData
    }
  })
  const response = await retry(10, 2, `updating rule`, async () =>
      await httpClient.patch(`${kbUrl}/api/detection_engine/rules/_bulk_update`, data)
  )
  return response.data || {}
}

/** @type { (kbUrl: string, ruleIds: [string]) => Promise<any> } */
async function getRuleStatuses(kbUrl, ruleIds) {
  const response = await retry(10, 2, `getting rule statuses`, async () =>
      await httpClient.get(`${kbUrl}/api/detection_engine/rules/_find?page=1&per_page=${ruleIds.length}&sort_field=enabled&sort_order=desc`)
  )
  return response.data || {}
}

/** @type { (kbUrl: string) => Promise<any> } */
async function deleteRules(kbUrl) {
  const response = await retry(10, 2, `getting rules`, async () =>
      await httpClient.get(`${kbUrl}/api/detection_engine/rules/_find?page=1&per_page=2000`)
  )
  const data = []
  response.data.data.forEach(rule => {
    data.push({id: rule.id})
  })

  const deleteResponse = await retry(10, 2, `deleting rules`, async () =>
      await httpClient.post(`${kbUrl}/api/detection_engine/rules/_bulk_delete`, data)
  )

  return deleteResponse || {}
}

/** @type { (kbUrl: string) => Promise<any> } */
async function getKbStatus(kbUrl) {
  const response = await retry(10, 2, `getting kibana status`, async () =>
    await httpClient.get(`${kbUrl}/api/status`)
  )
  return response.data || {}
}

/** @type { (kbUrl: string) => Promise<any> } */
async function getKbTaskManagerStatus(kbUrl) {
  const response = await retry(10, 2, `getting kibana Task Manager status`, async () =>
    await httpClient.get(`${kbUrl}/api/task_manager/_health`)
  )
  return response.data || {}
}

// @ts-ignore
if (require.main === module) test()

async function test() {
  const url = 'https://elastic:changeme@localhost:5601'
  const name = __filename
  const inputIndex = `${pkg.name}-alert-input`
  try {
    const id = await createAlert(url, name, inputIndex)
    console.log(`created alert:`, id)
  } catch (err) {
    const { status, statusText, data} = err.response
    console.log('error:', status, statusText)
    console.log(JSON.stringify(data, null, 4))
  }
}
