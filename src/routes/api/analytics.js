const router = require('express').Router();
const analyticsController = require('../../controllers/analyticsController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/admin', authorize('admin'), analyticsController.getAdminStats);

module.exports = router;
