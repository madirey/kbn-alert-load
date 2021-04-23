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

// const RulesCountList = [200, 400, 600, 1000]
const KbSpec = '8 x 8 GB'
const EsSpec = '2 x 64 GB'
const TrafficRate = 100

/** @type { Suite[] } */
const suites = module.exports = []

// suites.push(...withArrayMap(RulesCountList, suiteIndicatorIndexSize))
// suites.push(...withArrayMap(RulesCountList, suiteIndicatorItemsPerSearch))
suites.push(suiteIndicatorIndexSize(200))
suites.push(suiteIndicatorItemsPerSearch(200))
suites.push(suiteIndicatorConcurrentSearches(200))
suites.push(createRulesSuite())
suites.push(runExistingSuite())

/** @type { ( fn: (clusterSpecs: [], index: number) => Suite) => Suite[] } */
function withArrayMap(arrayToMap, fn) {
  return arrayToMap.map((arraySpec, index) => fn(arraySpec, index))
}

/** @type { () => Suite } */
function suiteIndicatorItemsPerSearch(rulesCount) {
  // const itemsPerSearchSet = [1000, 5000, 10000, 20000]
  const itemsPerSearchSet = [100, 200, 500, 1000]
  const scenarios = itemsPerSearchSet.map((itemsPerSearch) => {
    return {
      name: `indicator rule ${itemsPerSearch} items per search`,
      alertInterval: '1m',
      alerts: rulesCount,
      esSpec: EsSpec,
      kbSpec: KbSpec,
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 1,
      trafficRate: TrafficRate,
      searchableSnapshot: false,
      indicatorIndexSize: 50000,
      itemsPerSearch
    }
  })

  return {
    id: `indicator-items-per-search-${rulesCount}`,
    description: `vary scenarios by items_per_search for indicator rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorConcurrentSearches(rulesCount) {
  const concurrentSearchSet = [1, 2, 4, 8]
  const scenarios = concurrentSearchSet.map((concurrentSearches) => {
    return {
      name: `indicator rule ${concurrentSearches} concurrent searches`,
      alertInterval: '1m',
      alerts: rulesCount,
      esSpec: EsSpec,
      kbSpec: KbSpec,
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 1,
      trafficRate: TrafficRate,
      searchableSnapshot: false,
      indicatorIndexSize: 50000,
      concurrentSearches,
      itemsPerSearch: 1000
    }
  })

  return {
    id: `indicator-concurrent-searches-${rulesCount}`,
    description: `vary scenarios by concurrent_searches for indicator rule`,
    scenarios,
  }
}

/** @type { () => Suite } */
function suiteIndicatorIndexSize(rulesCount) {
  const indicatorIndexSizes = [10000, 50000, 100000, 500000]
  const scenarios = indicatorIndexSizes.map((indicatorIndexSize) => {
    return {
      name: `indicator index with ${indicatorIndexSize} indicators`,
      alertInterval: '1m',
      alerts: rulesCount,
      esSpec: EsSpec,
      kbSpec: KbSpec,
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
      ruleType: 'indicator',
      indicatorCount: 1,
      trafficRate: TrafficRate,
      searchableSnapshot: false,
      indicatorIndexSize
    }
  })

  return {
    id: `indicator-rules-indicator-index-size-${rulesCount}`,
    description: `vary scenarios by size of indicator index for indicator rule`,
    scenarios,
  }
}

/** @type { (alerts: number) => Suite } */
function createRulesSuite(rulesCount=50, indicatorIndexSize=10000) {
  const scenarios = [{
    name: `${rulesCount} rules ${indicatorIndexSize} indicator index`,
    alertInterval: '1m',
    alerts: rulesCount,
    esSpec: '1 x 8 GB',
    kbSpec: '2 x 8 GB',
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 1,
    searchableSnapshot: false,
    // trafficRate: 1000,
    indicatorIndexSize: indicatorIndexSize,
    // concurrentSearches: 1,
    // itemsPerSearch: 10000,
  }]

  return {
    id: `create-indicator-rules`,
    description: `basic test scenario`,
    scenarios,
  }
}

/** @type { (alerts: number) => Suite } */
function runExistingSuite() {
  const scenarios = [{
    name: `Running existing test`,
    alertInterval: '1m',
    alerts: 0,
    esSpec: EsSpec,
    kbSpec: KbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
    ruleType: 'indicator',
    indicatorCount: 1,
    searchableSnapshot: false,
    // trafficRate: 1000,
    indicatorIndexSize: 0,
    // concurrentSearches: 1,
    // itemsPerSearch: 10000,
  }]

  return {
    id: `run-existing-test`,
    description: `creates no rules or additional documents in indicator index to run against existing cluster`,
    scenarios,
  }
}