const { Log } = require('../../logging_middleware/src')

// global express error handler - everything that throws ends up here
const errorHandler = (err, req, res, next) => {
    const code = err.status || 500
    const lvl = code >= 500 ? 'error' : 'warn'
    Log('backend', lvl, 'middleware',
        `${req.method} ${req.originalUrl} -> ${code}: ${err.message}`)

    res.status(code).json({
        message: err.message || 'something went wrong'
    })
}

module.exports = errorHandler
