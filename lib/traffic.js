'use strict'

const { execFile } = require('child_process')
const { delay } = require('./utils')
const logger = require('./logger')

module.exports = {
    runTraffic
}

async function runTraffic(trafficGenerator, trafficGeneratorIdFile, esUrl, trafficRate, duration) {
    const interval = 10
    const children = 30
    const file = 'ssh'
    let args = []
    args.push(trafficGenerator)
    args.push('python3')
    args.push('load_index3.py')
    if (trafficGeneratorIdFile !== undefined) {
        args.push('-i')
        args.push(trafficGeneratorIdFile)
    }
    args.push('-e')
    args.push(esUrl)
    args.push('-d')
    args.push(duration)
    args.push('--interval')
    args.push(interval.toString())
    args.push('-c')
    args.push(children.toString())
    args.push('-r')
    args.push(trafficRate)
    const execFileSSH = execFile(file, args, (err, stdout, stderr) => {
        if (err) {
            logger.debug(`$stderr:\n${stderr}`)
        }
    })
    await delay((duration + interval) * 1000)
    try {
        process.kill(execFileSSH.pid, 'SIGINT')
    }
    catch {}
}