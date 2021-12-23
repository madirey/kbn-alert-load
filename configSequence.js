const imBenchmarkSuites = [
    {
      indicatorIndexSize: 6000,
    },
    {
      rulesCount: 100,
      indicatorIndexSize: 4000,
    },
    {
      rulesCount: 100,
      indicatorIndexSize: 8000,
    },
    {
      indicatorIndexSize: 9000,
    },
    {
      indicatorCount: 100,
      rulesCount: 1000,
    },
    {
        indicatorFieldCount: 15,
    }
  ];

const suites = [];
suites.push(createIMruleSuite())

// imBenchmarkSuites.forEach(suite => suites.push(createIMruleSuite(suite)))


function createIMruleSuite({
    rulesCount = 10,
    indicatorIndexSize = 1000,
    alertInterval = 1,
    indicatorCount = 1,
    indicatorFieldCount = 1
  } = {}) {
    const scenarios = [{
      name: `${rulesCount} rules ${indicatorIndexSize} indicator index`,
      alertInterval: `${alertInterval}m`,
      alerts: rulesCount,
      esSpec: '1 x 64 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      ruleType: 'indicator',
      indicatorCount: indicatorCount,
      searchableSnapshot: false,
      version: '7.12.0',
      // trafficRate: 1000,
      indicatorIndexSize: indicatorIndexSize,
      // concurrentSearches: 1,
      itemsPerSearch: 10000,
      indicatorFieldCount: indicatorFieldCount,
    }]
  
    return {
      id: `im-rules-${rulesCount}-indicatorSize-${indicatorIndexSize}-ruleIntervalMinutes-${alertInterval}-indicatorCount-${indicatorCount}-indicatorFieldCount-${indicatorFieldCount}`,
      description: `basic test scenario`,
      scenarios,
    }
  }


module.exports = {
//    esUrl: 'https://admin:4GMO7OnXdgFTwDxQf0yD8r64@538941a5d5ab483488415f20f48488eb.us-west2.gcp.elastic-cloud.com:9243',
//    kbUrl: 'https://admin:4GMO7OnXdgFTwDxQf0yD8r64@90237f49ca9142a48f1a864364ffbcd0.us-west2.gcp.elastic-cloud.com:9243',
   esUrl: 'http://elastic:changeme@localhost:9200',
   kbUrl: 'http://elastic:changeme@localhost:5601',
   suites,
}