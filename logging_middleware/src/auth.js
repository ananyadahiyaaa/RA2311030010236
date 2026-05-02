const axios = require('axios')

const AUTH_URL = 'http://20.207.122.201/evaluation-service/auth'

// in-memory token cache so we don't slam /auth on every Log call
// (later: maybe persist to disk so a restart doesn't lose the token)
let cachedToken = null
let expAt = 0

async function fetchToken(creds) {
    const res = await axios.post(AUTH_URL, creds, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
    })

    const { access_token, expires_in } = res.data
    cachedToken = access_token

    // this server returns expires_in as an ABSOLUTE unix epoch (in seconds),
    // not as a ttl. so figure out the ttl from (expires_in - now).
    // fallback to 1h if the field is missing/weird.
    const nowSec = Math.floor(Date.now() / 1000)
    let ttlSec
    if (typeof expires_in === 'number' && expires_in > nowSec) {
        ttlSec = expires_in - nowSec       // absolute epoch case
    } else if (typeof expires_in === 'number' && expires_in > 0) {
        ttlSec = expires_in                // plain ttl case
    } else {
        ttlSec = 3600                      // safety net
    }

    expAt = Date.now() + (ttlSec * 1000) - 60_000   // refresh a minute early
    return cachedToken
}

const getToken = async () => {
    const creds = {
        email: process.env.LOG_EMAIL,
        name: process.env.LOG_NAME,
        rollNo: process.env.LOG_ROLL_NO,
        accessCode: process.env.LOG_ACCESS_CODE,
        clientID: process.env.LOG_CLIENT_ID,
        clientSecret: process.env.LOG_CLIENT_SECRET
    }

    const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k)
    if (missing.length) {
        throw new Error(`logging middleware missing env vars: ${missing.join(', ')}`)
    }

    if (cachedToken && Date.now() < expAt) return cachedToken
    return fetchToken(creds)
}

const resetToken = () => {
    cachedToken = null
    expAt = 0
}

module.exports = { getToken, resetToken }
