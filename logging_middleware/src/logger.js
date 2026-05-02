const axios = require('axios')
const { STACKS, LEVELS, PACKAGES_BY_STACK } = require('./constants')
const { getToken, resetToken } = require('./auth')

const LOG_URL = 'http://20.207.122.201/evaluation-service/logs'

function validate(stack, level, pkg, message) {
    if (!STACKS.has(stack)) throw new Error(`Log: invalid stack "${stack}"`)
    if (!LEVELS.has(level)) throw new Error(`Log: invalid level "${level}"`)
    if (!PACKAGES_BY_STACK[stack].has(pkg)) {
        throw new Error(`Log: package "${pkg}" not allowed for stack "${stack}"`)
    }
    if (typeof message !== 'string' || message.length === 0) {
        throw new Error('Log: message must be a non-empty string')
    }
}

const send = (token, payload) => axios.post(LOG_URL, payload, {
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    },
    timeout: 10000
})

// the reusable Log(stack, level, package, message) function
// never throws - logging shouldn't crash the caller
const Log = async (stack, level, pkg, message) => {
    try {
        validate(stack, level, pkg, message)
        const payload = { stack, level, package: pkg, message }

        let token = await getToken()
        try {
            const res = await send(token, payload)
            return res.data
        } catch (error) {
            // token might have expired between fetch and use - retry once
            if (error.response && error.response.status === 401) {
                resetToken()
                token = await getToken()
                const res = await send(token, payload)
                return res.data
            }
            throw error
        }
    } catch (err) {
        // last-ditch fallback so nothing in the app dies because of a log call
        process.stderr.write(`[Log fallback] ${err.message}\n`)
        return null
    }
}

module.exports = { Log }
