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
// suites.push(createIMruleSuite());
suites.push(createThresholdRuleSuite({
  rulesCount: 250,
  numAggFields: 3,
}));
suites.push(createThresholdRuleSuite({
  rulesCount: 250,
  numAggFields: 2,
}));
suites.push(createThresholdRuleSuite({
  rulesCount: 250,
  numAggFields: 1,
}));

// imBenchmarkSuites.forEach(suite => suites.push(createIMruleSuite(suite)));


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

  function createThresholdRuleSuite({
    rulesCount = 10,
    alertInterval = 1,
    numAggFields = 1,
  } = {}) {
    const scenarios = [{
      name: `${rulesCount} threshold rules`,
      alertInterval: `${alertInterval}m`,
      alerts: rulesCount,
      esSpec: '1 x 64 GB',
      kbSpec: '2 x 8 GB',
      numAggFields,
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      ruleType: 'threshold',
      searchableSnapshot: false,
      version: '8.1.0',
      // trafficRate: 1000,
      // concurrentSearches: 1,
      itemsPerSearch: 10000,
    }];
    return {
      id: `threshold-rules-${rulesCount}-ruleIntervalMinutes-${alertInterval}-numAggFields-${numAggFields}`,
      description: 'basic threshold rule scenario',
      scenarios,
    };
  }


module.exports = {
  // esUrl: 'https://admin:72Y0lKw49iw26sztxTl7n8Qj@7ed70b040885489a9694fcfa86db5e5b.us-west2.gcp.elastic-cloud.com',
  // kbUrl: 'https://admin:72Y0lKw49iw26sztxTl7n8Qj@3c105becbf4447199dd363e4055d2400.us-west2.gcp.elastic-cloud.com:9243',
//    esUrl: 'https://admin:4GMO7OnXdgFTwDxQf0yD8r64@538941a5d5ab483488415f20f48488eb.us-west2.gcp.elastic-cloud.com:9243',
//    kbUrl: 'https://admin:4GMO7OnXdgFTwDxQf0yD8r64@90237f49ca9142a48f1a864364ffbcd0.us-west2.gcp.elastic-cloud.com:9243',
//    esUrl: 'http://elastic:changeme@localhost:9200',
//    kbUrl: 'http://elastic:changeme@localhost:5601',
   suites,
}