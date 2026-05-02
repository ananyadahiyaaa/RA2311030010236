const express = require('express')
const router = express.Router()
const notificationController = require('../controllers/notificationController')

router.get('/', notificationController.list)
router.get('/priority', notificationController.priorityInbox)

module.exports = router
