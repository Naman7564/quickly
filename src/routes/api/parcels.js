const router = require('express').Router();
const parcelController = require('../../controllers/parcelController');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);

router.post('/', authorize('shop_owner'), parcelController.createParcel);
router.get('/', parcelController.getParcels);
router.get('/:id', parcelController.getParcelById);
router.put('/:id/status', authorize('driver', 'shop_owner'), parcelController.updateStatus);
router.put('/:id/accept', authorize('driver'), parcelController.acceptParcel);
router.put('/:id/cancel', parcelController.cancelParcel);
router.post('/:id/verify-otp', authorize('driver'), parcelController.verifyOTP);

module.exports = router;
