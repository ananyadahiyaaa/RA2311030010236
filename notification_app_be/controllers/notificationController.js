const notificationService = require('../services/notificationService')
const { Log } = require('../../logging_middleware/src')

// helper - throw HTTP-style error
function bad(status, message) {
    const e = new Error(message)
    e.status = status
    return e
}

async function list(req, res, next) {
    try {
        await Log('backend', 'info', 'handler', 'GET /api/notifications')
        const data = await notificationService.fetchAll()
        res.status(200).json({ count: data.length, notifications: data })
    } catch (error) {
        next(error)
    }
}

async function priorityInbox(req, res, next) {
    try {
        const n = parseInt(req.query.n, 10) || 10
        if(n <= 0 || n > 100) throw bad(400, 'n must be between 1 and 100')

        await Log('backend', 'info', 'handler', `GET /api/notifications/priority?n=${n}`)
        const top = await notificationService.getPriorityInbox(n)
        res.status(200).json({ n: n, count: top.length, notifications: top })
    } catch (error) {
        next(error)
    }
}

module.exports = { list, priorityInbox }
