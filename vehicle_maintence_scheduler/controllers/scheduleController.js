const scheduleService = require('../services/scheduleService')
const { Log } = require('../../logging_middleware/src')

const getAllDepotSchedules = async (req, res, next) => {
    try {
        await Log('backend', 'info', 'handler', 'GET /api/schedule')
        let result = await scheduleService.scheduleAllDepots()
        res.status(200).json(result)
    } catch (err) {
        next(err)
    }
}

async function getDepotSchedule(req, res, next) {
    try {
        const id = parseInt(req.params.depotId, 10)
        if (Number.isNaN(id)) {
            // bad path param, kick back 400
            const e = new Error('depotId must be an integer')
            e.status = 400
            throw e
        }
        await Log('backend', 'info', 'handler', `GET /api/schedule/${id}`)
        const data = await scheduleService.scheduleForDepot(id)
        res.status(200).json(data)
    } catch (error) {
        next(error)
    }
}

const getCustomSchedule = async (req, res, next) => {
    try {
        const { budget } = req.body
        if (typeof budget !== "number" || budget < 0) {
            const err = new Error("budget must be a non-negative number")
            err.status = 400
            throw err
        }
        await Log('backend', 'info', 'handler', `POST /api/schedule/custom budget=${budget}`)
        const result = await scheduleService.scheduleForBudget(budget)
        res.status(200).json(result)
    } catch (err) {
        next(err)
    }
}

module.exports = { getAllDepotSchedules, getDepotSchedule, getCustomSchedule }
