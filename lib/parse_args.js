'use strict'

/** @typedef { import('./types').CliArguments } CliArguments */

const meow = require('meow')
const pkg = require('../package.json')

const DEFAULT_CONFIG = 'config'
const DEFAULT_MINUTES = 10
const DEFAULT_PERCENT_FIRING = 0

const ENV_CONFIG_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_CONFIG`
const ENV_MINUTES_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_MINUTES`
const ENV_PERCENT_FIRING_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_ACTIONS`
const ENV_ES_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_ACTIONS`
const ENV_KB_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_ACTIONS`
const ENV_GENERATOR_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_GENERATOR`
const ENV_GENERATOR_ID_FILE_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_GENERATOR_ID_FILE`

const ENV_CONFIG = process.env[ENV_CONFIG_NAME]
const ENV_MINUTES = parseInt(process.env[ENV_MINUTES_NAME], 10) || undefined
const ENV_PERCENT_FIRING = parseInt(process.env[ENV_PERCENT_FIRING_NAME], 10) || undefined
const ENV_ES = process.env[ENV_ES_NAME] || undefined
const ENV_KB = process.env[ENV_KB_NAME] || undefined
const ENV_GENERATOR = process.env[ENV_GENERATOR_NAME] || undefined
const ENV_GENERATOR_ID_FILE = process.env[ENV_GENERATOR_ID_FILE_NAME] || undefined

const help = getHelp()

module.exports = {
  parseArgs,
  help,
}

/** @type { () => CliArguments } */
function parseArgs() {
  const { input, flags } = meow({
    pkg,
    help,
    flags: {
      config: { alias: 'C', type: 'string' },
      minutes: { alias: 'M', type: 'number' },
      percentFiring: { type: 'number' },
      esUrl: {alias: 'e', type: 'string' },
      kbUrl: {alias: 'k', type: 'string' },
      scenario: {alias: 's', type: 'string' },
      generator: {alias: 'G', type: 'string' },
      identity: {alias: 'I', type: 'string' },
      reportFileName: {alias: 'r', type: 'string' },
      outputFolder: {alias: 'o', type: 'string' },
      configSequence: {alias: 'cs', type: 'string' },
      waitMore: {alias: 'w', type: 'number' }
    }
  })

  const config = flags.config || ENV_CONFIG || DEFAULT_CONFIG
  const minutes = flags.minutes || ENV_MINUTES || DEFAULT_MINUTES
  const percentFiring = flags.percentFiring || ENV_PERCENT_FIRING || DEFAULT_PERCENT_FIRING
  const esUrl = flags.esUrl || ENV_ES
  const kbUrl = flags.kbUrl || ENV_KB
  const scenario = flags.scenario || 1
  const trafficGenerator = flags.generator || ENV_GENERATOR
  const trafficGeneratorId = flags.identity || ENV_GENERATOR_ID_FILE
  const reportFileName = flags.reportFileName || 'report-template.html';
  const outputFolder = flags.outputFolder || '';
  const configSequence = flags.configSequence || null;
  const waitMore = flags.waitMore || 0;

  const [command, ...commandArgs] = input
  return {
    command,
    commandArgs,
    config,
    minutes,
    percentFiring,
    esUrl,
    kbUrl,
    scenario,
    trafficGenerator,
    trafficGeneratorId,
    reportFileName,
    configSequence,
    outputFolder,
    waitMore
  }
}

function getHelp () {
  return`
${pkg.name}: ${pkg.description}
v${pkg.version}

usage: ${pkg.name} <options> <cmd> <arguments>

options:
  -C --config       use the specified ecctl config in $HOME/.ecctl/[name].json (default: ${DEFAULT_CONFIG})
  -M --minutes      override the number of minutes to run the test  (default: ${DEFAULT_MINUTES})
  --percentFiring   use to specify the percentages of alerts firing actions (default: ${DEFAULT_PERCENT_FIRING})
  -G --generator    specify a traffic generator to use
  -I --identity     specify identity file to use with traffic generator
  -e --esurl        specify an existing elasticsearch instance to connect to
  -k --kburl        specify an existing kibana instance to connect to
  -s --scenario     specify a scenario from a suite to run when targeting an existing cluster (default: 1)

commands:
  run <scenarioId> run scenario with specified id
  ls               list suites
  lsv              list suites verbosely
  lsd              list existing deployments, by name and id
  rmd <name>       delete existing deployments match the specified name
  rmdall           delete all existing deployments
  env              print settings given options and env vars

You may also use the following environment variables as the value of the
respective config options:

- ${ENV_CONFIG_NAME}
- ${ENV_MINUTES_NAME}
- ${ENV_ES_NAME}
- ${ENV_KB_NAME}
- ${ENV_GENERATOR_NAME}
- ${ENV_GENERATOR_ID_FILE_NAME}
`.trim()
}