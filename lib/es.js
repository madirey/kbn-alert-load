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
const baseDocument = {
  "cloud" : {
    "availability_zone" : "us-central1-a",
    "instance" : {
      "name" : "gamera",
      "id" : "4513117836447354264"
    },
    "provider" : "gcp",
    "machine" : {
      "type" : "e2-small"
    },
    "project" : {
      "id" : "elastic-siem"
    },
    "account" : {
      "id" : "elastic-siem"
    }
  },
  "agent" : {
    "hostname" : "gamera",
    "name" : "gamera",
    "id" : "5ef50331-da74-448d-bc8b-e62fbe6e9e35",
    "ephemeral_id" : "8b2f19c2-2d5d-4e50-ae3b-53f98983a8a0",
    "type" : "auditbeat",
    "version" : "7.12.0",
    "user" : {
      "name" : "mac"
    }
  },
  "file" : {
    "owner" : "root",
    "inode" : "500",
    "mode" : "0777",
    "path" : "/etc/mtab",
    "uid" : "0",
    "gid" : "0",
    "ctime" : "2021-02-24T09:43:52.174Z",
    "mtime" : "2021-02-24T09:35:31.038Z",
    "type" : "symlink",
    "target_path" : "/proc/31755/mounts",
    "group" : "root"
  },
  "ecs" : {
    "version" : "1.8.0"
  },
  "service" : {
    "type" : "file_integrity"
  },
  "host" : {
    "hostname" : "gamera",
    "os" : {
      "kernel" : "4.15.0-1093-gcp",
      "codename" : "xenial",
      "name" : "Ubuntu",
      "family" : "debian",
      "type" : "linux",
      "version" : "16.04.7 LTS (Xenial Xerus)",
      "platform" : "ubuntu"
    },
    "containerized" : false,
    "ip" : [
      "10.128.0.64",
      "fe80::4001:aff:fe80:40"
    ],
    "name" : "gamera",
    "id" : "d463a359c87fdf5af772e588a0808280",
    "mac" : [
      "42:01:0a:80:00:40"
    ],
    "architecture" : "x86_64"
  },
  "event" : {
    "kind" : "event",
    "module" : "file_integrity",
    "action" : [
      "attributes_modified"
    ],
    "category" : [
      "file"
    ],
    "type" : [
      "change"
    ],
    "dataset" : "file"
  },
}

/** @type { (scenario: string, esUrl: string, batchSize: number) => Promise<EventLogRecord[]> } */
async function getEventLog(scenario, esUrl, gteTime, batchSize = BATCH_SIZE) {
  const docs = await retry(RETRY_ATTEMPTS, RETRY_SECONDS, `getting event log for ${scenario}`, async () =>
      await getEventLogScrolled(esUrl, gteTime, batchSize)
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
async function getEventLogScrolled(esUrl, gteTime, batchSize) {
  let q = 'event.action:execute'
  if (gteTime !== undefined) {
    q += ` @timestamp:>${gteTime}`
  }
  const scroll = '10m'

  /** @type { any } */
  let qs = {
    size: `${batchSize}`,
    sort: '@timestamp',
    default_operator: 'AND',
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
              "max_docs": 1000,
              "max_age": `1ms`,
            }
          }
        },
        "cold": {
          "min_age": `1ms`,
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
async function putIndexTemplate(esUrl, indexPattern, ilmName) {
  const data = {
    "index_patterns": [
      indexPattern
    ],
    "data_stream": {},
    "template": {
      "settings": {
        "index.number_of_replicas" : 0,
        "index.requests.cache.enable": false,
      }
    }
  }
  if ( ilmName !== undefined ) {
    data.template.settings["index.lifecycle.name"] = ilmName
  }

  const response = await retry(10, 2, `adding index template test_indexes`, async () =>
      await httpClient.put(`${esUrl}/_index_template/test_indexes`, data)
  )
  return response.data || []
}

/** @type { (esUrl: string) => Promise<any[]> } */
async function createIndicatorIndex(esUrl, documentCount=1, fieldCount=1) {
  const interval = 5000
  let docsSent = interval
  while (docsSent <= documentCount) {
    let data = ''

    for (let i = 0; i < interval; i++) {
      const timestamp = new Date().toISOString()
      let document = {
        ...baseDocument,
        "@timestamp": timestamp,
        "alert_data": {}
      }
      for (let j = 0; j < fieldCount; j++) {
        document["alert_data"][`threat_${j}`] = `ALERT_${i}_${j}`
      }
      data += `{ "create": {} }\n`
      data += JSON.stringify(document);
      data += "\n"
    }
    docsSent += interval

    await retry(10, 2, `adding documents to index threat-indicator`, async () =>
        await httpClient.post(`${esUrl}/threat-indicator/_bulk`, data)
    )
  }

  if (documentCount % interval > 0) {
    let data = ''

    for (let i = 0; i < documentCount % interval; i++) {
      const timestamp = new Date().toISOString()
      let document = {
        "@timestamp": timestamp,
        "alert_data": {}
      }
      for (let j = 0; j < fieldCount; j++) {
        document["alert_data"][`threat_${j}`] = `ALERT_${i}_${j}`
      }
      data += `{ "create": {} }\n`
      data += JSON.stringify(document);
      data += "\n"
    }

    await retry(10, 2, `adding documents to index threat-indicator`, async () =>
        await httpClient.post(`${esUrl}/threat-indicator/_bulk`, data)
    )
  }

  // return response.data || []
}

/** @type { (esUrl: string, ruleType: string, valueL string, numValue: number) => Promise<any[]> } */
async function createDetection(esUrl, ruleType, value="ALERT", numValue=0) {
  const timestamp = new Date().toISOString()
  let data = ''
  const document = {
    ...baseDocument,
    "@timestamp" : timestamp,
    "value": value,
    "num_value": numValue,
    "indicator_value": "ALERT_0_0",
  }

  if (ruleType === 'threshold') {
    for (let i = 0; i < 11; i++ ) {
      data += `{ "create": {} }\n` + JSON.stringify(document) + "\n"
    }
  } else {
    data += `{ "create": {} }\n` + JSON.stringify(document) + "\n"
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