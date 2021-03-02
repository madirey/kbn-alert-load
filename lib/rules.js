'use strict'

module.exports = {
    eqlRule,
    indicatorRule,
    queryRule,
    thresholdRule
}

function queryRule(ruleName, value="ALERT") {
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
        "interval": "1m",
        "from": "now-6000s",
        "to": "now",
        "actions": [],
        "enabled": true,
        "throttle": "no_actions"
    }
}

function indicatorRule(ruleName, field="value") {
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
        "threat_mapping": [
            {
                "entries": [
                    {
                        "field": field,
                        "type": "mapping",
                        "value": "alert_data.threat"
                    }
                ]
            }
        ],
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
        "interval": "1m",
        "from": "now-6000s",
        "to": "now",
        "actions": [],
        "enabled": true,
        "throttle": "no_actions"
    }
}

function eqlRule(ruleName, value="ALERT") {
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
        "interval": "1m",
        "from": "now-6000s",
        "to": "now",
        "actions": [],
        "enabled": true,
        "throttle": "no_actions"
    }
}

function thresholdRule(ruleName, thresholdField= "num_value", thresholdValue=10) {
    return {
        "type": "threshold",
        "index": [
            "test-*"
        ],
        "filters": [],
        "language": "kuery",
        "query": "num_value : *",
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
        "interval": "1m",
        "from": "now-6000s",
        "to": "now",
        "actions": [],
        "enabled": true,
        "throttle": "no_actions"
    }

}