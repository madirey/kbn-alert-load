#!/bin/bash

# Indicator index size
./kbn-alert-load.js run im-rules-10-indicatorSize-100-ruleIntervalMinutes-1-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'
./kbn-alert-load.js run im-rules-10-indicatorSize-1000-ruleIntervalMinutes-1-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'
./kbn-alert-load.js run im-rules-10-indicatorSize-9000-ruleIntervalMinutes-1-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'

# Rule count
./kbn-alert-load.js run im-rules-100-indicatorSize-1000-ruleIntervalMinutes-1-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'
./kbn-alert-load.js run im-rules-1000-indicatorSize-1000-ruleIntervalMinutes-1-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'

# Alert counts
./kbn-alert-load.js run im-rules-10-indicatorSize-1000-ruleIntervalMinutes-1-indicatorCount-10 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'
./kbn-alert-load.js run im-rules-10-indicatorSize-1000-ruleIntervalMinutes-1-indicatorCount-100 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 3 -r 'report-im.html'

# Interval
./kbn-alert-load.js run im-rules-10-indicatorSize-1000-ruleIntervalMinutes-10-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 30 -r 'report-im.html'
./kbn-alert-load.js run im-rules-10-indicatorSize-1000-ruleIntervalMinutes-30-indicatorCount-1 -e http://elastic:changeme@localhost:9200 -k http://elastic:changeme@localhost:5601 -M 90 -r 'report-im.html'