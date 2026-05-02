const express = require('express')
const dotenv = require('dotenv')
dotenv.config()

const { Log } = require('../logging_middleware/src')
const scheduleRoutes = require('./routes/scheduleRoutes')
const errorHandler = require('./middleware/errorHandler')

const app = express()
app.use(express.json())
// const cors = require('cors')
// app.use(cors())   // TODO add this if a fe ever consumes the api

app.use('/api/schedule', scheduleRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

// catch-all 404
app.use((req, res) => {
    Log('backend', 'warn', 'route', `404 ${req.method} ${req.originalUrl}`)
    res.status(404).json({ message: 'route not found' })
})

app.use(errorHandler)

let PORT = process.env.PORT || 3000

if (require.main === module) {
    app.listen(PORT, () => {
        Log('backend', 'info', 'config', `scheduler up on ${PORT}`)
        process.stdout.write(`server up on ${PORT}\n`)
    })
}

module.exports = app
