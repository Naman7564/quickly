const router = require('express').Router();
const notificationController = require('../../controllers/notificationController');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markRead);
router.post('/report', notificationController.createReport);

module.exports = router;
