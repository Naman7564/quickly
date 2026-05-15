const router = require('express').Router();
const profileController = require('../../controllers/profileController');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.put('/', profileController.updateProfile);
router.put('/password', profileController.updatePassword);
router.put('/shop', profileController.updateShopProfile);
router.get('/reviews/:userId', profileController.getReviews);
router.post('/reviews', profileController.createReview);

module.exports = router;
