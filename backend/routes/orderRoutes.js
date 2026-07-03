const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  previewCharge, createOrder, getOrders, getOrderById,
  updateOrderStatus, assignAgent, rescheduleOrder
} = require('../controllers/orderController');

router.use(verifyToken);

router.post('/preview-charge', authorizeRoles('customer', 'admin'), previewCharge);
router.post('/', authorizeRoles('customer', 'admin'), createOrder);
router.get('/', getOrders); // role-based filtering handled in controller
router.get('/:id', getOrderById);
router.patch('/:id/status', authorizeRoles('agent', 'admin'), updateOrderStatus);
router.patch('/:id/assign', authorizeRoles('admin'), assignAgent);
router.patch('/:id/reschedule', authorizeRoles('customer', 'admin'), rescheduleOrder);

module.exports = router;
