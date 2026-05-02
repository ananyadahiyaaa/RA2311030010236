const express = require('express')
const router = express.Router()
const scheduleController = require('../controllers/scheduleController')

router.get('/', scheduleController.getAllDepotSchedules)
router.get('/:depotId', scheduleController.getDepotSchedule)
router.post('/custom', scheduleController.getCustomSchedule)

module.exports = router
