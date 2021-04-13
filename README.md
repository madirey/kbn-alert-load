kbn-alert-load: command-line utility for doing kibana alerting load tests
===============================================================================
Modified for use with detection rules

## usage

    kbn-alert-load <args> <options>

TBD; run `kbn-alert-load` with no parameters for help.


## install pre-reqs

- install Node.js - the current version Kibana uses
- have an account set up at https://cloud.elastic.co or equivalent
- create an API key at the cloud site for use with `ecctl`
- install `ecctl` - https://www.elastic.co/guide/en/ecctl/current/ecctl-installing.html
- create an initial config for `ecctl` with `ecctl init`, providing your API key 
    - Currently using GCP due to hard coding the deployment_template to "gcp-io-optimized"
    - Staging can be used by updating ~/.ecctl/config.json
    ```
    {
      "host": "https://api.staging.foundit.no",
      "api_key": $API_KEY,
      "region": "gcp-us-central1",
      "output": "text",
      "timeout": 30000000000,
      "insecure": true
    }
    ```


## install

    npm install -g kbn-alert-load


## run via npx without installing

    npx kbn-alert-load <args> <opts>


