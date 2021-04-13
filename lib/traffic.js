'use strict'

const { execFile } = require('child_process')
const { delay } = require('./utils')
const logger = require('./logger')

module.exports = {
    runTraffic
}

const trafficGenerator = ['ssh', 'ubuntu@ec2-3-238-23-222.compute-1.amazonaws.com']

async function runTraffic(deployment, duration) {
    if (deployment.scenario.trafficRate !== undefined) {
        let args = trafficGenerator
        const interval = 10
        args.push('python3')
        args.push('load_index3.py')
        args.push('-e')
        args.push(deployment.esUrl)
        args.push('-d')
        args.push(duration)
        args.push('--interval')
        args.push(interval.toString())
        args.push('-c')
        args.push('30')
        args.push('-r')
        args.push(deployment.scenario.trafficRate)

        const file = args.shift()
        const execFileSSH = execFile(file, args, (err, stdout, stderr) => {
            if (err) {
                logger.debug(`$stderr:\n${stderr}`)
            }
        })
        await delay((duration + interval) * 1000)
        process.kill(execFileSSH.pid, 'SIGINT')
    }
}