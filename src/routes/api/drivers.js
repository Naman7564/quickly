const router = require('express').Router();
const driverController = require('../../controllers/driverController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.put('/toggle-online', authorize('driver'), driverController.toggleOnline);
router.put('/location', authorize('driver'), driverController.updateLocation);
router.get('/available-parcels', authorize('driver'), driverController.getAvailableParcels);
router.get('/stats', authorize('driver'), driverController.getDriverStats);
router.get('/nearby', authorize('shop_owner', 'admin'), driverController.getNearbyDrivers);
router.put('/profile', authorize('driver'), driverController.updateProfile);

module.exports = router;
