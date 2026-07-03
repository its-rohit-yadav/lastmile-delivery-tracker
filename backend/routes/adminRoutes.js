const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  createZone, getZones, deleteZone,
  createArea, getAreas, deleteArea,
  createRateCard, getRateCards, updateRateCard, deleteRateCard,
  createAgent, getAgents, updateAgentLocation,
  getUsers
} = require('../controllers/adminController');

router.use(verifyToken);

// Zones
router.post('/zones', authorizeRoles('admin'), createZone);
router.get('/zones', getZones); // visible to all roles for dropdowns
router.delete('/zones/:id', authorizeRoles('admin'), deleteZone);

// Areas
router.post('/areas', authorizeRoles('admin'), createArea);
router.get('/areas', getAreas);
router.delete('/areas/:id', authorizeRoles('admin'), deleteArea);

// Rate Cards
router.post('/rate-cards', authorizeRoles('admin'), createRateCard);
router.get('/rate-cards', authorizeRoles('admin'), getRateCards);
router.put('/rate-cards/:id', authorizeRoles('admin'), updateRateCard);
router.delete('/rate-cards/:id', authorizeRoles('admin'), deleteRateCard);

// Agents
router.post('/agents', authorizeRoles('admin'), createAgent);
router.get('/agents', authorizeRoles('admin'), getAgents);
router.patch('/agents/location', authorizeRoles('agent'), updateAgentLocation);

// Users
router.get('/users', authorizeRoles('admin'), getUsers);

module.exports = router;
