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

const RulesCountList = [200, 400, 600, 1000]
const indicatorIndexSizes = [
  10000,
  50000,
  100000,
  500000,
]

/** @type { Suite[] } */
const suites = module.exports = []

suites.push(...withArrayMap(indicatorIndexSizes, suiteIndicatorIndexSize))
suites.push(...withArrayMap(RulesCountList, suiteIndicatorItemsPerSearch))
suites.push(suiteIndicatorConcurrentSearches(400))

/** @type { ( fn: (clusterSpecs: [], index: number) => Suite) => Suite[] } */
function withArrayMap(arrayToMap, fn) {
  return arrayToMap.map((arraySpec, index) => fn(arraySpec, index))
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
      itemsPerSearch: 1000
    }
  })

  return {
    id: `indicator-concurrent-searches-${alerts}`,
    description: `vary scenarios by concurrent_searches for indicator rule`,
    scenarios,
  }
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
    trafficRate: 1000,
    searchableSnapshot: false,
    indicatorIndexSize
  }]

  return {
    id: `indicator-rules-indicator-index-size-${indicatorIndexSize}`,
    description: `vary scenarios by size of indicator index for indicator rule`,
    scenarios,
  }
}