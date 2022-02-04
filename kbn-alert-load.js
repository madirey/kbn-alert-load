#!/usr/bin/env node

'use strict'

/** @typedef { import('./lib/types').CommandHandler } CommandHandler */

const logger = require('./lib/logger')
const { commands } = require('./lib/commands')
const { parseArgs } = require('./lib/parse_args')

module.exports = {
  main,
}

/** @type { Map<string, CommandHandler> } */
const CommandMap = new Map()
for (const command of commands) {
  CommandMap.set(command.name, command)
}

// @ts-ignore
if (require.main === module) main()

function main() {
  console.log(parseArgs())
  const { config, minutes, percentFiring, esUrl, kbUrl, scenario, trafficGenerator, trafficGeneratorId, command, commandArgs, reportFileName, configSequence, outputFolder, waitMore } = parseArgs()
  logger.debug(`cliArguments: ${JSON.stringify({ config, command, commandArgs })}`)

  logger.debug(`using config: ${config}`)

  const commandHandler = CommandMap.get(command || 'help')
  if (commandHandler == null) {
    logger.logErrorAndExit(`command not implemented: "${command}"`)
    return
  }
 
  try {
    commandHandler({ config, minutes, percentFiring, esUrl, kbUrl, scenario, trafficGenerator, trafficGeneratorId, reportFileName, configSequence, outputFolder, waitMore }, commandArgs)
  } catch (err) {
    logger.logErrorAndExit(`error running "${command} ${commandArgs.join(' ')}: ${err}`)
  }
}