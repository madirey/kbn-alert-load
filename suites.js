'use strict'

/** @typedef { import('./lib/types').Suite } Suite */
/** @typedef { import('./lib/types').Scenario } Scenario */

const Versions = [
  // '7.11.0-SNAPSHOT', unstable
  '7.12.0',
  '7.11.0',
  '7.10.0',
  '7.9.3',
  // '7.8.1', old api version?
]
const Version = Versions[0]

const AlertsList = [100, 500, 1000, 2000, 4000]
// const RulesCountList = [50]
// const RulesCountList = [25, 50, 75]
// const RulesCountList = [100, 200, 300]
const RulesCountList = [300, 400, 500, 600, 800]
// const RulesCountList = [1000, 1200, 1500]
const RulesList = ['query', 'indicator', 'eql', 'threshold']
const esClusterSizes = [
  [
    { esSpec: '1 x 4 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    { esSpec: '1 x 8 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    { esSpec: '1 x 16 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
  ],
  [
    { esSpec: '1 x 32 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '8 x 8 GB', ruleCount: 1650 },
  ],
  [
    { esSpec: '4 x 64 GB', kbSpec: '8 x 8 GB', ruleCount: 1650 },
  ],
  [
    { esSpec: '4 x 64 GB', kbSpec: '16 x 8 GB', ruleCount: 3250 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '16 x 8 GB', ruleCount: 850 },
  ],
]
const kbClusterSizes = [
  [
    { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '8 x 8 GB', ruleCount: 1650 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '16 x 8 GB', ruleCount: 3250 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '24 x 8 GB', ruleCount: 4850 },
  ],
  [
    { esSpec: '2 x 64 GB', kbSpec: '32 x 8 GB', ruleCount: 6450 },
  ],
]
const indicatorIndexSizes = [
  5000,
  10000,
  20000,
  30000,
  40000,
  50000,
  75000,
  100000,
  250000,
  500000,
]

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
suites.push(...withRuleTypes(suiteRuleIndicators))
suites.push(...withArrayMap(esClusterSizes, suiteIndicatorEsSizeA))
suites.push(...withArrayMap(esClusterSizes, suiteIndicatorEsSizeB))
suites.push(...withArrayMap(esClusterSizes, suiteIndicatorEsSizeC))
suites.push(...withArrayMap(kbClusterSizes, suiteIndicatorKbSize))
// suites.push(suiteIndicatorIndexSize())
suites.push(...withIndicatorIndexSize(indicatorIndexSizes, suiteIndicatorIndexSize))
suites.push(suiteIndicatorFieldCount())
suites.push(suiteIndicatorTraffic())
suites.push(suiteIndicatorRuleInterval())
suites.push(...withArrayMap(RulesCountList, suiteIndicatorItemsPerSearch))
suites.push(...withArrayMap(RulesCountList, suiteIndicatorConcurrentSearches))
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

/** @type { ( fn: (clusterSpecs: [], index: number) => Suite) => Suite[] } */
function withArrayMap(arrayToMap, fn) {
  return arrayToMap.map((arraySpec, index) => fn(arraySpec, index))
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
      indicatorCount: 1000,
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
  const esSpec = '1 x 64 GB'
  const indicatorIndexSize = 100000
  const scenarios = RulesCountList.map((ruleCount) => {
    return {
      name: `${ruleCount} ${ruleType} rules ${indicatorIndexSize}-indicator-index ES ${esSpec}`,
      alertInterval: '1m',
      alerts: ruleCount,
      esSpec: esSpec,
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: ruleType,
      indicatorCount: 1,
      indicatorIndexSize: indicatorIndexSize,
      trafficRate: 1150
    }
  })

  return {
    id: `${ruleType}-rules-count-${indicatorIndexSize}-indicator-index`,
    description: `vary scenarios by count of ${ruleType} rule`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteIndicatorEsSizeA(sizes, index) {
  if (sizes === undefined) {
    sizes = [
      // { esSpec: '1 x 32 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 32 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    ]
  }

  const indicatorIndexSize = 10000

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}; ${size.ruleCount}`,
    alertInterval: '1m',
    alerts: size.ruleCount,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 1,
    // searchableSnapshot: true,
    indicatorIndexSize: indicatorIndexSize,
  }))

  return {
    id: `${indicatorIndexSize}-indicator-es-size-${index}`,
    description: `vary scenarios by ES size for indicator rules`,
    scenarios,
  }
}

function suiteIndicatorEsSizeB(sizes, index) {
  if (sizes === undefined) {
    sizes = [
      // { esSpec: '1 x 32 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 32 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    ]
  }

  const indicatorIndexSize = 250000

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}; ${size.ruleCount}`,
    alertInterval: '1m',
    alerts: size.ruleCount,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 1,
    // searchableSnapshot: true,
    indicatorIndexSize: indicatorIndexSize,
  }))

  return {
    id: `${indicatorIndexSize}-indicator-es-size-${index}`,
    description: `vary scenarios by ES size for indicator rules`,
    scenarios,
  }
}

function suiteIndicatorEsSizeC(sizes, index) {
  if (sizes === undefined) {
    sizes = [
      // { esSpec: '1 x 32 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 32 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    ]
  }

  const indicatorIndexSize = 500000

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}; ${size.ruleCount}`,
    alertInterval: '1m',
    alerts: size.ruleCount,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 1,
    // searchableSnapshot: true,
    indicatorIndexSize: indicatorIndexSize,
  }))

  return {
    id: `${indicatorIndexSize}-indicator-es-size-${index}`,
    description: `vary scenarios by ES size for indicator rules`,
    scenarios,
  }
}

function suiteIndicatorKbSize(sizes, index) {
  if (sizes === undefined) {
    sizes = [
      // { esSpec: '1 x 32 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 32 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    ]
  }

  const indicatorIndexSize = 10000

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}; ${size.ruleCount}`,
    alertInterval: '1m',
    alerts: size.ruleCount,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 1,
    // searchableSnapshot: true,
    indicatorIndexSize: indicatorIndexSize,
  }))

  return {
    id: `${indicatorIndexSize}-indicator-kb-size-${index}`,
    description: `vary scenarios by KB size for indicator rules`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteRuleKbSize(ruleType, sizes) {
  if (sizes === undefined) {
    sizes = [
      // { esSpec: '1 x 32 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 32 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '2 x 8 GB', ruleCount: 850 },
      // { esSpec: '1 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
      { esSpec: '2 x 64 GB', kbSpec: '4 x 8 GB', ruleCount: 850 },
    ]
  }

  const scenarios = sizes.map((size, index) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}; ${size.ruleCount}`,
    alertInterval: '1m',
    alerts: size.ruleCount,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: ruleType,
    indicatorCount: 1,
    // searchableSnapshot: true,
    indicatorIndexSize: 10000,
  }))

  return {
    id: `${ruleType}-deployment-size`,
    description: `vary scenarios by deployment size for ${ruleType} rules`,
    scenarios,
  }
}

/** @type { (ruleType: string) => Suite } */
function suiteRuleIndicators(ruleType) {
  const indicatorCounts = [100, 200, 400, 1000]
  const scenarios = indicatorCounts.map((indicatorCount) => {
    return {
      name: `${indicatorCount} query traffic`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: ruleType,
      indicatorCount,
      // searchableSnapshot: true,
      indicatorIndexSize: 10000
    }
  })

  return {
    id: `${ruleType}-rules-indicators`,
    description: `vary scenarios by indicators of ${ruleType} rule`,
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
      indicatorCount: 50,
      searchableSnapshot: snapshot,
      topology: "hotCold"
    }
  })

  return {
    id: `${ruleType}-rules-snapshot`,
    description: `vary scenarios by searchable snapshot indices for ${ruleType} rule`,
    scenarios,
  }
}

// /** @type { () => Suite } */
// function suiteIndicatorIndexSize() {
//   const indicatorIndexSizes = [1, 100, 5000, 10000, 50000]
//   // const indicatorIndexSizes = [10000, 50000]
//   const scenarios = indicatorIndexSizes.map((indicatorIndexSize) => {
//     return {
//       name: `indicator index with ${indicatorIndexSize} indicators`,
//       alertInterval: '1m',
//       alerts: 800,
//       esSpec: '1 x 32 GB',
//       kbSpec: '4 x 8 GB',
//       tmMaxWorkers: 10,
//       tmPollInterval: 3000,
//       version: Version,
//       ruleType: 'indicator',
//       indicatorCount: 1,
//       // trafficRate: 10000,
//       searchableSnapshot: false,
//       indicatorIndexSize
//     }
//   })
//
//   return {
//     id: `indicator-rules-index-size`,
//     description: `vary scenarios by size of indicator index for indicator rule`,
//     scenarios,
//   }
// }

/** @type { ( fn: (indicatorIndexSizes: [], index: number) => Suite) => Suite[] } */
function withIndicatorIndexSize(indicatorIndexSizes, fn) {
  return indicatorIndexSizes.map(indicatorIndexSize => fn(indicatorIndexSize))
}

/** @type { () => Suite } */
function suiteIndicatorIndexSize(indicatorIndexSize) {
  const scenarios = [{
    name: `indicator index with ${indicatorIndexSize} indicators`,
    alertInterval: '1m',
    alerts: 800,
    esSpec: '2 x 64 GB',
    kbSpec: '16 x 8 GB',
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 10,
    // trafficRate: 10000,
    searchableSnapshot: false,
    indicatorIndexSize
  }]

  return {
    id: `indicator-rules-indicator-index-size-${indicatorIndexSize}`,
    description: `vary scenarios by size of indicator index for indicator rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorRuleInterval() {
  const ruleIntervals = ['1s', '5s', '30s', '1m']
  const scenarios = ruleIntervals.map((ruleInterval) => {
    return {
      name: `indicator rule ${ruleInterval} interval`,
      alertInterval: ruleInterval,
      alerts: 30,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 1000,
      // trafficRate: 10000,
      searchableSnapshot: false,
      indicatorIndexSize: 10000
    }
  })

  return {
    id: `indicator-rules-interval`,
    description: `vary scenarios rule interval`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorFieldCount() {
  const indicatorFieldCounts = [10, 100]
  const scenarios = indicatorFieldCounts.map((indicatorFieldCount) => {
    return {
      name: `indicator rules with ${indicatorFieldCount} OR'd fields`,
      alertInterval: '1m',
      alerts: 450,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 5,
      searchableSnapshot: false,
      indicatorFieldCount
    }
  })

  return {
    id: `indicator-rules-field-count`,
    description: `vary scenarios by count of fields for indicator rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorItemsPerSearch(alerts) {
  // const itemsPerSearchSet = [1000, 5000, 10000, 20000]
  const itemsPerSearchSet = [100, 200, 500, 1000]
  const scenarios = itemsPerSearchSet.map((itemsPerSearch) => {
    return {
      name: `indicator rule ${itemsPerSearch} items per search`,
      alertInterval: '1m',
      alerts,
      esSpec: '2 x 64 GB',
      kbSpec: '8 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 10,
      trafficRate: 1000,
      searchableSnapshot: false,
      indicatorIndexSize: 50000,
      itemsPerSearch
    }
  })

  return {
    id: `indicator-items-per-search-${alerts}`,
    description: `vary scenarios by items_per_search for indicator rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorConcurrentSearches(alerts) {
  const concurrentSearchSet = [1, 2, 4, 8]
  const scenarios = concurrentSearchSet.map((concurrentSearches) => {
    return {
      name: `indicator rule ${concurrentSearches} concurrent searches`,
      alertInterval: '1m',
      alerts,
      esSpec: '2 x 64 GB',
      kbSpec: '8 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 10,
      trafficRate: 1000,
      searchableSnapshot: false,
      indicatorIndexSize: 50000,
      concurrentSearches,
      itemsPerSearch: 2000
    }
  })

  return {
    id: `indicator-concurrent-searches-${alerts}`,
    description: `vary scenarios by concurrent_searches for indicator rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorTraffic() {
  // const trafficRates = [100000]
  // const scenarios = trafficRates.map((trafficRate) => {
  const alertCounts = [10]
  // const alertCounts = [50, 200, 400]
  const scenarios = alertCounts.map((alertCount) => {
    return {
      name: `indicator ${alertCount} rules`,
      alertInterval: '1m',
      alerts: alertCount,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 1,
      trafficRate: 1000,
      searchableSnapshot: false,
      indicatorFieldCount: 1,
      indicatorIndexSize: 10000,
    }
  })

  return {
    id: `indicator-rules-traffic`,
    description: `vary scenarios by amount of traffic for indicator rule`,
    scenarios,
  }
}


/** @type { (alerts: number) => Suite } */
function testSuite() {
  const scenarios = [{
    name: `Simple test suite`,
    alertInterval: '1m',
    alerts: 50,
    esSpec: '1 x 8 GB',
    kbSpec: '2 x 8 GB',
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 20,
    searchableSnapshot: false,
    trafficRate: 1000,
  }]

  return {
    id: `simple-test`,
    description: `simple scenario for testing`,
    scenarios,
  }
}