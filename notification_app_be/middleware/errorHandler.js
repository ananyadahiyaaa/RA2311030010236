const { Log } = require('../../logging_middleware/src')

function errorHandler(error, req, res, next) {
    const status = error.status || 500
    const level = status >= 500 ? 'error' : 'warn'

    Log('backend', level, 'middleware',
        `${req.method} ${req.originalUrl} ${status} - ${error.message}`)

    res.status(status).json({
        message: error.message || 'something broke'
    })
}

module.exports = errorHandler
