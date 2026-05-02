require('dotenv').config()
const express = require('express')

const { Log } = require('../logging_middleware/src')
const notificationRoutes = require('./routes/notificationRoutes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(express.json())
app.use('/api/notifications', notificationRoutes)

app.get('/health', function (req, res) {
    res.json({ ok: true })
})

// 404 fallthrough
app.use(function (req, res) {
    Log('backend', 'warn', 'route', `404 ${req.method} ${req.originalUrl}`)
    res.status(404).json({ message: 'not found' })
})

app.use(errorHandler)

const port = process.env.PORT || 3001
if (require.main === module) {
    app.listen(port, function () {
        Log('backend', 'info', 'config', `notif service started :${port}`)
        process.stdout.write(`listening on ${port}\n`)
    })
}

module.exports = app
