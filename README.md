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

## setup traffic generator
Currently background traffic is created by a python script triggered using ssh.  Pointing to the traffic generator can be done using environment variables or parameters when running kbn-alert-load 

Currently a traffic generator is set up at
    
    ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com 

Using a t3.medium ec2 instance the generator is able to push ~10MB/s traffic.  When specifying scenarios care should be taken not to exceed the traffic capacity of the generator. 

The pem file is located here https://p.elstc.co/paste/K1xYee+5#g8U8YZb1QZ0b6pf0alc+FNYT4RiOX9P49dKnAw6vbjK.  Permissions on the pem file should be restricted to read only by owner.

    chmod 400 identity_file.pem

Specify the traffic generator with the parameters
    
    kbn-alert-load run simple-test -G ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com -I identity_file.pem

Use environment variables to specify 
    
    export KBN_ALERT_LOAD_GENERATOR=ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com
    export KBN_ALERT_LOAD_GENERATOR_ID_FILE=identity_file.pem
    
## running test suites
List the available test suites
    
    kbn-alert-load ls
    
Specify the test suite with run

    kbn-alert-load run simple-test
    
## Specifying new test suites
Test suites are defined under suites.js

