const axios = require('axios')
const { getToken, Log } = require('../../logging_middleware/src')

const BASE = 'http://20.207.122.201/evaluation-service'

// thin wrapper for any GET against the test server - just adds auth + logging
async function authedGet(path) {
    const token = await getToken()
    try {
        const res = await axios.get(`${BASE}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000
        })
        return res.data
    } catch (err) {
        const status = err.response ? err.response.status : 'no-response'
        await Log('backend', 'error', 'repository', `GET ${path} failed: ${status} ${err.message}`)
        throw err
    }
}

const fetchDepots = async () => {
    const data = await authedGet('/depots')
    return data.depots || []
}

const fetchVehicles = async () => {
    const data = await authedGet('/vehicles')
    return data.vehicles || []
}

module.exports = { fetchDepots, fetchVehicles }
