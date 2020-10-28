#!/usr/bin/env node

'use strict'

/** @typedef { import('./lib/types').CommandHandler } CommandHandler */

const logger = require('./lib/logger')
const commands = require('./lib/commands')
const { parseArgs } = require('./lib/parse_args')

module.exports = {
  main,
}

// @ts-ignore
if (require.main === module) main()

function main() {
  const { config, command, commandArgs } = parseArgs()
  logger.debug(`cliArguments: ${JSON.stringify({ config, command, commandArgs })}`)

  logger.debug(`using config: ${config || '(default)'}`)

  /** @type { Map<string, CommandHandler> } */
  const commandMap = new Map()
  commandMap.set('run', commands.run)
  commandMap.set('help', commands.help)

  const commandHandler = commandMap.get(command || 'help')
  if (commandHandler == null) {
    logger.logErrorAndExit(`command not implemented: "${command}"`)
    return
  }
 
  try {
    commandHandler(config, commandArgs)
  } catch (err) {
    logger.logErrorAndExit(`error runninng "${command} ${commandArgs.join(' ')}: ${err}`)
  }
}