const router = require('express').Router();
const adminController = require('../../controllers/adminController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/users', adminController.getUsers);
router.get('/drivers', adminController.getDrivers);
router.put('/drivers/:id/approve', adminController.approveDriver);
router.put('/drivers/:id/reject', adminController.rejectDriver);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);
router.get('/parcels', adminController.getAllParcels);
router.get('/reports', adminController.getReports);
router.put('/reports/:id', adminController.updateReport);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
