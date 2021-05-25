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
    - When running against Cloud it is possible to run into provisioning limitations on cluster size 
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
If the traffic generator is not configured the test will run with no background traffic.

Currently a traffic generator is set up at
    
    ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com 

Using a t3.medium ec2 instance the generator is able to push ~10MB/s traffic.  When specifying scenarios care should be taken not to exceed the traffic capacity of the generator. 

The pem file is located here https://p.elstc.co/paste/K1xYee+5#g8U8YZb1QZ0b6pf0alc+FNYT4RiOX9P49dKnAw6vbjK.  Permissions on the pem file should be restricted to read only by owner.

    chmod 400 identity_file.pem

Specify the traffic generator with the parameters
    
    kbn-alert-load run create-indicator-rules -G ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com -I identity_file.pem

Use environment variables to specify 
    
    export KBN_ALERT_LOAD_GENERATOR=ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com
    export KBN_ALERT_LOAD_GENERATOR_ID_FILE=identity_file.pem
    
## running test suites
List the available test suites
    
    kbn-alert-load ls
    
Specify the test suite with run

    kbn-alert-load run create-indicator-rules
    
Specify the length of the test suite with -M for minutes.  By default the length of the test is 10 minutes.
    
    kbn-alert-load run -M 30 create-indicator-rules

When running a test suite the against the staging ESS it may take more time for the staging cloud to provision enough backend resources to run the test than the timeout to wait for the deployment to be healthy.  In the case this happens cleanup to the existing deployments and try again:

    kbn-alert-load rmdall

Several test suites are batched in the runSuites.sh script to run for 30 minutes which are:

    indicator-index-50000-es-2x64GB-kb-16x8GB-rules-100,200,300 
    indicator-index-50000-es-2x64GB-kb-16x8GB-rules-400,600,800 
    indicator-index-100000-es-2x64GB-kb-16x8GB-rules-100,200,300
    indicator-index-250000-es-2x64GB-kb-16x8GB-rules-25,50,75   
    indicator-index-250000-es-2x64GB-kb-16x8GB-rules-100,200,300
    indicator-index-50000-es-4x64GB-kb-16x8GB-rules-400,600,800 
    indicator-index-100000-es-4x64GB-kb-16x8GB-rules-100,200,300
    indicator-index-100000-es-4x64GB-kb-16x8GB-rules-400,600,800
    indicator-index-250000-es-4x64GB-kb-16x8GB-rules-25,50,75   
    indicator-index-250000-es-4x64GB-kb-16x8GB-rules-100,200,300

## running against an existing deployment
tests can be run against an existing cluster by passing arguments for elasticsearch and kibana.  To initialize the test existing rules are deleting and the index threat-index is deleted.

    kbn-alert-load run create-indicator-rules -e ESURL -k KBURL  
    
By default the first scenario of a suite will be selected but other scenarios in a suite can be selected

    kbn-alert-load run create-indicator-rules -e ESURL -k KBURL -s 3 


## Specifying new test suites
Test suites are defined under suites.js

