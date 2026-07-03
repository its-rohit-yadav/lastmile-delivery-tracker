const db = require('../config/db');

// Haversine formula to calculate distance between two lat/lng points (in km)
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Auto assign nearest available agent to an order
const autoAssignAgent = async (orderId, pickupZoneId) => {
  // First prefer agents in the same pickup zone
  const [agents] = await db.query(
    `SELECT da.id, da.current_lat, da.current_lng, da.zone_id
     FROM delivery_agents da
     WHERE da.is_available = TRUE
     ORDER BY (da.zone_id = ?) DESC, da.id ASC`,
    [pickupZoneId]
  );

  if (agents.length === 0) {
    throw new Error('No available delivery agents at this time.');
  }

  // Pick first agent (zone-matched preferred; if lat/lng available, sort by distance)
  const agentsWithCoords = agents.filter(a => a.current_lat && a.current_lng);

  let selectedAgent;

  if (agentsWithCoords.length > 0) {
    // Get pickup area approximate center (use first area in zone)
    const [zoneAreas] = await db.query(
      'SELECT name FROM areas WHERE zone_id = ? LIMIT 1',
      [pickupZoneId]
    );

    // Default center coords if no GPS data available
    const centerLat = 12.9716;
    const centerLng = 77.5946;

    agentsWithCoords.sort((a, b) => {
      const distA = haversineDistance(centerLat, centerLng, a.current_lat, a.current_lng);
      const distB = haversineDistance(centerLat, centerLng, b.current_lat, b.current_lng);
      return distA - distB;
    });

    selectedAgent = agentsWithCoords[0];
  } else {
    // Fallback: pick same zone agent or first available
    selectedAgent = agents[0];
  }

  // Assign agent to order
  await db.query(
    "UPDATE orders SET agent_id = ?, status = 'Assigned' WHERE id = ?",
    [selectedAgent.id, orderId]
  );

  // Mark agent as unavailable
  await db.query(
    'UPDATE delivery_agents SET is_available = FALSE WHERE id = ?',
    [selectedAgent.id]
  );

  return selectedAgent.id;
};

module.exports = { autoAssignAgent };
