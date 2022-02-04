const baseCase = {
  ruleInterval: 1,
  eventCount: 100,
  rulesCount: 5,
  threatIndexSize: 10000,
  minutes: 4,
  waitMore: 0,
}
const imBenchmarkSuites = [
    baseCase,
    // add more rules,
    {
      ...baseCase,
      rulesCount: baseCase.rulesCount * 3,
    },
    // Big amount of event and small threat index
    {
      ...baseCase,
      eventCount: baseCase.eventCount * 100,
      threatIndexSize:  baseCase.threatIndexSize / 10,
    },
    {
      ...baseCase,
      indicatorFieldCount: 15,
    },
    // Large threat index
    {
      ...baseCase,
      threatIndexSize: baseCase.threatIndexSize * 10,
      ruleInterval: 3,
      minutes:10,
      waitMore: 5,
    },
  ];

const suites = [];
// suites.push(createIMruleSuite())

imBenchmarkSuites.forEach(suite => suites.push(createIMruleSuite(suite)))


function createIMruleSuite({
    rulesCount = 10,
    threatIndexSize = 1000,
    ruleInterval = 1,
    eventCount = 1,
    indicatorFieldCount = 1,
    minutes,
    waitMore
  } = {}) {
    const scenarios = [{
      name: `${rulesCount} rules ${threatIndexSize} indicator index`,
      alertInterval: `${ruleInterval}m`,
      alerts: rulesCount,
      esSpec: '1 x 64 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      ruleType: 'indicator',
      indicatorCount: eventCount,
      searchableSnapshot: false,
      version: '7.12.0',
      // trafficRate: 1000,
      indicatorIndexSize: threatIndexSize,
      // concurrentSearches: 1,
      itemsPerSearch: 10000,
      indicatorFieldCount: indicatorFieldCount,
    }]
  
    return {
      id: `im-rules-${rulesCount}-indicatorSize-${threatIndexSize}-ruleIntervalMinutes-${ruleInterval}-indicatorCount-${eventCount}-indicatorFieldCount-${indicatorFieldCount}`,
      description: `basic test scenario`,
      scenarios,
      minutes,
      waitMore
    }
  }


module.exports = {
   esUrl: 'http://elastic:changeme@localhost:9200',
   kbUrl: 'http://elastic:changeme@localhost:5601',
  //  esUrl: 'https://admin:asIO0m5yDqBI3YirG0u8zfHp@bc0dce1a36cd4408912566283e194cb6.us-west2.gcp.elastic-cloud.com:9243',
  //  kbUrl: 'https://admin:asIO0m5yDqBI3YirG0u8zfHp@d35c2440b8c744938d7d444520d34c43.us-west2.gcp.elastic-cloud.com:9243',
   suites,
}