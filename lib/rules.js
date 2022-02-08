'use strict'

module.exports = {
    eqlRule,
    indicatorRule,
    queryRule,
    thresholdRule
}

function queryRule(ruleName, value="ALERT", enabled=true, alertInterval='1m') {
    return {
        "type": "query",
        "index": [
            "test-*"
        ],
        "filters": [],
        "language": "kuery",
        "query": `value: "${value}"`,
        "author": [],
        "false_positives": [],
        "references": [],
        "risk_score": 21,
        "risk_score_mapping": [],
        "severity": "low",
        "severity_mapping": [],
        "threat": [],
        "name": ruleName,
        "description": "a simple rule",
        "tags": [],
        "license": "",
        "interval": alertInterval,
        "from": "now-36000s",
        "to": "now",
        "actions": [],
        "enabled": enabled,
        "throttle": "no_actions"
    }
}

function indicatorRule(ruleName, field, entriesCount=1, enabled=true, alertInterval='1m') {
    let threatMappingEntries = []
    for (let i = 0; i< entriesCount; i++){
        const entry = {
            "entries": [
                {
                    "field": field,
                    "type": "mapping",
                    "value": `alert_data.threat_${i}.keyword`
                }
            ]
        }
        threatMappingEntries.push(entry)
    }
    return {
        "type": "threat_match",
        "index": [
            "test-*"
        ],
        "filters": [],
        "language": "kuery",
        "query": "*:*",
        "threat_index": [
            "threat-*"
        ],
        "threat_query": "*:*",
        "threat_mapping": threatMappingEntries,
        "threat_language": "kuery",
        "author": [],
        "false_positives": [],
        "references": [],
        "risk_score": 21,
        "risk_score_mapping": [],
        "severity": "low",
        "severity_mapping": [],
        "threat": [],
        "name": ruleName,
        "description": "looking for threats",
        "tags": [],
        "license": "",
        "interval": alertInterval,
        "from": "now-36000s",
        "to": "now",
        "actions": [],
        "enabled": enabled,
        "throttle": "no_actions"
    }
}

function eqlRule(ruleName, value="ALERT", enabled=true, alertInterval='1m') {
    return {
        "type": "eql",
        "index": [
            "test*"
        ],
        "filters": [],
        "language": "eql",
        "query": `any where value == "${value}"`,
        "author": [],
        "false_positives": [],
        "references": [],
        "risk_score": 21,
        "risk_score_mapping": [],
        "severity": "low",
        "severity_mapping": [],
        "threat": [],
        "name": ruleName,
        "description": "a description",
        "tags": [],
        "license": "",
        "interval": alertInterval,
        "from": "now-36000s",
        "to": "now",
        "actions": [],
        "enabled": enabled,
        "throttle": "no_actions"
    }
}

function thresholdRule(ruleName, thresholdField= ["num_value_0"], thresholdValue=10, enabled=true, alertInterval='1m') {
    return {
        "type": "threshold",
        "index": [
            "test-*"
        ],
        "filters": [],
        "language": "kuery",
        "query": "*:*",
        "threshold": {
            "field": thresholdField,
            "value": thresholdValue
        },
        "author": [],
        "false_positives": [],
        "references": [],
        "risk_score": 21,
        "risk_score_mapping": [],
        "severity": "low",
        "severity_mapping": [],
        "threat": [],
        "name": ruleName,
        "description": "threshold rule",
        "tags": [],
        "license": "",
        "interval": alertInterval,
        "from": "now-36000s",
        "to": "now",
        "actions": [],
        "enabled": enabled,
        "throttle": "no_actions"
    }

}