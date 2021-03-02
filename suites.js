'use strict'

/** @typedef { import('./lib/types').Suite } Suite */
/** @typedef { import('./lib/types').Scenario } Scenario */

const Versions = [
  // '7.11.0-SNAPSHOT', unstable
  '7.11.0',
  '7.10.0',
  '7.9.3',
  // '7.8.1', old api version?
]
const Version = Versions[0]

const AlertsList = [100, 500, 1000, 2000, 4000]
const RulesCountList = [200, 500, 1000, 2000]
const RulesList = ['query', 'indicator', 'eql', 'threshold']

/** @type { Suite[] } */
const suites = module.exports = []

suites.push(...withAlerts(suiteKibanaSizes))
suites.push(...withAlerts(suiteTmMaxWorkers))
suites.push(...withAlerts(suiteTmPollInterval))
suites.push(...withAlerts(suiteVersions))
suites.push(suiteAlerts())
suites.push(...withRuleTypes(suiteRuleCount))
suites.push(...withRuleTypes(suiteRuleKbSize))
suites.push(...withRuleTypes(suiteRuleSnapshot))
suites.push(...withRuleTypes(suiteRuleTraffic))
suites.push(suiteIndicatorCount())
suites.push(suiteRuleType())
suites.push(testSuite())

/** @type { ( fn: (alerts: number) => Suite) => Suite[] } */
function withAlerts(fn) {
  return AlertsList.map(alerts => fn(alerts))
}

/** @type { ( fn: (ruleType: string) => Suite) => Suite[] } */
function withRuleTypes(fn) {
  return RulesList.map(ruleType => fn(ruleType))
}

/** @type { (alerts: number) => Suite } */
function suiteKibanaSizes(alerts) {
  const sizes = [
    { esSpec: '1 x 1 GB', kbSpec: '1 x 1 GB' },
    { esSpec: '1 x 4 GB', kbSpec: '2 x 8 GB' },
    { esSpec: '1 x 8 GB', kbSpec: '4 x 8 GB' },
    { esSpec: '1 x 15 GB', kbSpec: '8 x 8 GB' },
  ]

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}`,
    alertInterval: '1m',
    alerts,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
  }))

  return {
    id: `deployment-size-${alerts}`,
    description: `vary scenarios by deployment size for ${alerts} alerts`,
    scenarios,
  }
}

/** @type { (alerts: number) => Suite } */
function suiteTmMaxWorkers(alerts) {
  const tmMaxWorkersList = [ 10, 15, 20 ]

  const scenarios = tmMaxWorkersList.map((tmMaxWorkers, index) => {
    return {
      name: `tm max workers: ${tmMaxWorkers}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers,
      tmPollInterval: 3000,
      version: Version,
    }
  })

  return {
    id: `tm-max-workers-${alerts}`,
    description: `vary scenarios by TM max workers for ${alerts} alerts`,
    scenarios,
  }
}

/** @type { (alerts: number) => Suite } */
function suiteTmPollInterval(alerts) {
  const tmPollIntervalList = [ 3000, 2000, 1000, 500 ]

  const scenarios = tmPollIntervalList.map((tmPollInterval, index) => {
    return {
      name: `tm poll interval: ${tmPollInterval}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval,
      version: Version,
    }
  })

  return {
    id: `tm-poll-interval-${alerts}`,
    description: `vary scenarios by TM poll interval for ${alerts} alerts`,
    scenarios,
  }
}

/** @type { (alerts: number) => Suite } */
function suiteVersions(alerts) {
  const scenarios = Versions.map((version, index) => {
    return {
      name: `stack version: ${version}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version,
    }
  })

  return {
    id: `stack-versions-${alerts}`,
    description: `vary scenarios by stack version for ${alerts} alerts`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteAlerts() {
  const scenarios = AlertsList.slice(0, 4).map((alerts, index) => {
    return {
      name: `alerts: ${alerts}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
    }
  })

  return {
    id: `number-of-alerts`,
    description: `vary scenarios by number of alerts`,
    scenarios,
  }
}



/** @type { (ruleType: string) => Suite } */
function suiteRuleType() {
  const scenarios = RulesList.map((ruleType) => {
    return {
      name: `rule type: ${ruleType}`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType,
      trafficCount: 1000,
      searchableSnapshot: true
    }
  })

  return {
    id: `rule-types`,
    description: `vary scenarios by rule types`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteRuleCount(ruleType) {
  const scenarios = RulesCountList.map((ruleCount) => {
    return {
      name: `${ruleCount} ${ruleType} rules`,
      alertInterval: '1m',
      alerts: ruleCount,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: ruleType,
    }
  })

  return {
    id: `${ruleType}-rules-count`,
    description: `vary scenarios by count of ${ruleType} rule`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteRuleKbSize(ruleType) {
  const sizes = [
    { esSpec: '1 x 8 GB', kbSpec: '1 x 8 GB' },
    { esSpec: '1 x 8 GB', kbSpec: '2 x 8 GB' },
    { esSpec: '1 x 8 GB', kbSpec: '4 x 8 GB' },
    // { esSpec: '1 x 15 GB', kbSpec: '8 x 8 GB' },
  ]

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}`,
    alertInterval: '1m',
    alerts: 1000,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: ruleType,
    trafficCount: 1000,
    searchableSnapshot: true
  }))

  return {
    id: `${ruleType}-deployment-size`,
    description: `vary scenarios by deployment size for ${ruleType} rules`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteRuleTraffic(ruleType) {
  const trafficCounts = [100, 200, 400, 1000]
  const scenarios = trafficCounts.map((trafficCount) => {
    return {
      name: `${trafficCount} query traffic`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: ruleType,
      trafficCount,
      searchableSnapshot: true
    }
  })

  return {
    id: `${ruleType}-rules-traffic`,
    description: `vary scenarios by traffic of ${ruleType} rule`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteRuleSnapshot(ruleType) {
  const snapshots = [true, false]
  const scenarios = snapshots.map((snapshot) => {
    return {
      name: `searchable snapshot ${snapshot} ${ruleType} rules`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: ruleType,
      trafficCount: 1000,
      searchableSnapshot: snapshot
    }
  })

  return {
    id: `${ruleType}-rules-snapshot`,
    description: `vary scenarios by searchable snapshot indices for ${ruleType} rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorCount() {
  const indicatorCounts = [2000, 3000, 4000, 5000, 10000]
  const scenarios = indicatorCounts.map((indicatorCount) => {
    return {
      name: `indicator index with ${indicatorCount} indicators`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      trafficCount: 1000,
      searchableSnapshot: true,
      indicatorCount
    }
  })

  return {
    id: `indicator-rules-index-size`,
    description: `vary scenarios by size of indicator index for indicator rule`,
    scenarios,
  }
}

/** @type { (alerts: number) => Suite } */
function testSuite() {
  const scenarios = [{
      name: `Simple test suite`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'eql',
      trafficCount: 20,
      searchableSnapshot: false
    }]

  return {
    id: `simple-test`,
    description: `simple scenario for testing`,
    scenarios,
  }
}