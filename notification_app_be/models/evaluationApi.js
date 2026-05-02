const axios = require('axios')
const { getToken, Log } = require('../../logging_middleware/src')

const URL = 'http://20.207.122.201/evaluation-service/notifications'

async function fetchNotifications() {
    const token = await getToken()
    try {
        const res = await axios.get(URL, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000
        })
        const items = res.data.notifications || []
        await Log('backend', 'debug', 'repository', `got ${items.length} notifications`)
        return items
    } catch (error) {
        const status = error.response ? error.response.status : 'no-response'
        await Log('backend', 'error', 'repository',
            `fetchNotifications failed (${status}): ${error.message}`)
        throw error
    }
}

module.exports = { fetchNotifications }
