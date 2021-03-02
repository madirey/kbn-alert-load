'use strict'

/** @typedef { import('./types').EventLogRecord } EventLogRecord */

const https = require('https')
const querystring = require('querystring')
const axios = require('axios').default
const logger = require('./logger')
const { retry } = require('./utils')

module.exports = {
  getEventLog,
  getEsStatus,
  putClusterSettings,
  putILMPolicy,
  putIndexTemplate,
  createIndicatorIndex,
  createDetection,
}

const RETRY_SECONDS = 5
const RETRY_ATTEMPTS = 120
const BATCH_SIZE = 1000

const axiosConfig = {
  headers: {
    'content-type': 'application/json',
  },
  httpsAgent: new https.Agent ({
    rejectUnauthorized: false
  })
}

const httpClient = axios.create(axiosConfig)

/** @type { (scenario: string, esUrl: string, batchSize: number) => Promise<EventLogRecord[]> } */
async function getEventLog(scenario, esUrl, batchSize = BATCH_SIZE) {
  const docs = await retry(RETRY_ATTEMPTS, RETRY_SECONDS, `getting event log for ${scenario}`, async () =>
      await getEventLogScrolled(esUrl, batchSize)
  )

  return docs.map(doc => {
    const _source = doc._source || {}
    const event = _source.event || {}
    const kibana = _source.kibana || {}
    const savedObjects = kibana.saved_objects || []

    let alert
    let action
    for (const { type, id } of savedObjects) {
      if (type === 'alert') alert = { alert: `${id}` }
      if (type === 'action') action = { action: `${id}` }
    }

    return {
      scenario,
      provider: event.provider || 'unknown',
      date: event.start || new Date().toISOString(),
      duration: Math.round((event.duration || 0) / 1000 / 1000),
      outcome: event.outcome,
      ...alert,
      ...action
    }
  })
}

/** @type { (esUrl: string) => Promise<any[]> } */
async function getEsStatus(esUrl) {
  const response = await retry(10, 2, `getting elasticsearch status`, async () =>
      await httpClient.get(`${esUrl}/_cat/nodes?format=json`)
  )
  return response.data || []
}

/** @type { (esUrl: string, batchSize: number) => Promise<any[]> } */
async function getEventLogScrolled(esUrl, batchSize) {
  const q = 'event.action:execute'
  const scroll = '10m'

  /** @type { any } */
  let qs = {
    size: `${batchSize}`,
    sort: '@timestamp',
    scroll,
    q,
  }

  logger.debug(`es.getEventLogScrolled: getting first batch of ${batchSize}`)
  let uri = `.kibana-event-log-*/_search?${querystring.stringify(qs)}`
  let response = await httpClient.get(`${esUrl}/${uri}`)

  /** @type { any[] } */
  let hits = response.data.hits.hits
  let docs = hits
  let scroll_id = response.data._scroll_id

  while (scroll_id && hits.length !== 0) {
    logger.debug(`es.getEventLogScrolled: getting next batch of ${batchSize}`)
    qs = {
      scroll,
      scroll_id,
    }
    uri = `_search/scroll?${querystring.stringify(qs)}`
    response = await httpClient.get(`${esUrl}/${uri}`)

    hits = response.data.hits.hits
    docs = docs.concat(hits)
    scroll_id = response.data._scroll_id
  }

  logger.debug(`es.getEventLogScrolled: got ${docs.length} docs`)
  return docs
}

/** @type { (esUrl: string) => Promise<any[]> } */
async function putClusterSettings(esUrl) {
  const data = {
    "transient": {
      "indices.lifecycle.poll_interval": "1s"
    }
  }

  const response = await retry(10, 2, `setting cluster setting indices.lifecycle.poll_interval to 1s`, async () =>
      await httpClient.put(`${esUrl}/_cluster/settings`, data)
  )
  return response.data || []
}

/** @type { (esUrl: string, ilmName) => Promise<any[]> } */
async function putILMPolicy(esUrl, ilmName) {
  const data = {
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_docs": 1000
            }
          }
        },
        "cold": {
          "min_age": `1s`,
          "actions": {
            "searchable_snapshot": {
              "snapshot_repository": "found-snapshots"
            }
          }
        }
      }
    }
  }

  const response = await retry(10, 2, `adding ilm policy ${ilmName}\n${data}`, async () =>
      await httpClient.put(`${esUrl}/_ilm/policy/${ilmName}`, data)
  )
  return response.data || []
}

/** @type { (esUrl: string) => Promise<any[]> } */
async function putIndexTemplate(esUrl) {
  const data = {
    "index_patterns": [
      "test-*"
    ],
    "data_stream": {},
    "template": {
      "settings": {
        "index.lifecycle.name": "hot-warm-cold",
        "index.number_of_replicas" : 0
      }
    }
  }

  const response = await retry(10, 2, `adding index template test_indexes`, async () =>
      await httpClient.put(`${esUrl}/_index_template/test_indexes`, data)
  )
  return response.data || []
}

/** @type { (esUrl: string) => Promise<any[]> } */
async function createIndicatorIndex(esUrl, documentCount=1) {
  let data = ''
  for (let i = 0; i < documentCount; i++) {
    const timestamp = new Date().toISOString()
    const threatIndicator = 'ALERT'
    data += `{ "create": {} }\n`
    data += JSON.stringify({
      "@timestamp": timestamp,
      "alert_data": {
        "threat": threatIndicator
      }
    });
    data += "\n"
  }

  const response = await retry(10, 2, `adding documents to index threat-indicator`, async () =>
      await httpClient.post(`${esUrl}/threat-indicator/_bulk`, data)
  )

  return response.data || []
}

/** @type { (esUrl: string, ruleType: string, firing: boolean) => Promise<any[]> } */
async function createDetection(esUrl, ruleType, value="ALERT", numValue=0) {
  const timestamp = new Date().toISOString()
  let data = ''

  if (ruleType === 'threshold') {
    for (let i = 0; i < 7; i++ ) {
      data += `{ "create": {} }\n`
      data += JSON.stringify({
        "@timestamp": timestamp,
        "value": value,
        "num_value": numValue,
        "event": {
          "category": "process"
        }
      })
      data += "\n"
    }
  } else {
    data += `{ "create": {} }\n`
    data += JSON.stringify({
      "@timestamp": timestamp,
      "value": value,
      "num_value": numValue,
      "event": {
        "category": "process"
      }
    })
    data += "\n"
  }

  const response = await retry(10, 2, `creating detection`, async () =>
      await httpClient.post(`${esUrl}/test-index/_bulk`, data)
  )
  return response.data || []
}

// @ts-ignore
if (require.main === module) test()

async function test() {
  logger.printTime(true)
  const url = process.argv[2]
  if (url == null) logger.logErrorAndExit('expecting es url argument')
  try {
    const result = await getEventLog('test', url, 10000)
    console.log(JSON.stringify(result, null, 4))
  } catch (err) {
    console.log('error:', err.message, err.response.data)
  }
}