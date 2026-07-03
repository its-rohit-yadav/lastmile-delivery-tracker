const db = require('../config/db');
const bcrypt = require('bcrypt');

// ---- ZONES ----
const createZone = async (req, res) => {
  const { name, description } = req.body;
  try {
    const [result] = await db.query('INSERT INTO zones (name, description) VALUES (?,?)', [name, description]);
    return res.status(201).json({ message: 'Zone created.', zoneId: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create zone.' });
  }
};

const getZones = async (req, res) => {
  const [zones] = await db.query('SELECT * FROM zones ORDER BY name');
  return res.json(zones);
};

const deleteZone = async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM zones WHERE id = ?', [id]);
  return res.json({ message: 'Zone deleted.' });
};

// ---- AREAS ----
const createArea = async (req, res) => {
  const { zoneId, name, pincode } = req.body;
  try {
    const [result] = await db.query('INSERT INTO areas (zone_id, name, pincode) VALUES (?,?,?)', [zoneId, name, pincode]);
    return res.status(201).json({ message: 'Area added to zone.', areaId: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create area.' });
  }
};

const getAreas = async (req, res) => {
  const [areas] = await db.query(
    'SELECT a.*, z.name as zone_name FROM areas a LEFT JOIN zones z ON a.zone_id = z.id ORDER BY z.name'
  );
  return res.json(areas);
};

const deleteArea = async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM areas WHERE id = ?', [id]);
  return res.json({ message: 'Area deleted.' });
};

// ---- RATE CARDS ----
const createRateCard = async (req, res) => {
  const { fromZoneId, toZoneId, orderType, ratePerKg, minCharge, codSurcharge } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO rate_cards (from_zone_id, to_zone_id, order_type, rate_per_kg, min_charge, cod_surcharge) VALUES (?,?,?,?,?,?)',
      [fromZoneId, toZoneId, orderType, ratePerKg, minCharge || 0, codSurcharge || 0]
    );
    return res.status(201).json({ message: 'Rate card created.', rateCardId: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create rate card.' });
  }
};

const getRateCards = async (req, res) => {
  const [cards] = await db.query(
    `SELECT rc.*, fz.name as from_zone_name, tz.name as to_zone_name
     FROM rate_cards rc
     LEFT JOIN zones fz ON rc.from_zone_id = fz.id
     LEFT JOIN zones tz ON rc.to_zone_id = tz.id
     ORDER BY rc.order_type`
  );
  return res.json(cards);
};

const updateRateCard = async (req, res) => {
  const { id } = req.params;
  const { ratePerKg, minCharge, codSurcharge } = req.body;
  await db.query(
    'UPDATE rate_cards SET rate_per_kg=?, min_charge=?, cod_surcharge=? WHERE id=?',
    [ratePerKg, minCharge, codSurcharge, id]
  );
  return res.json({ message: 'Rate card updated.' });
};

const deleteRateCard = async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM rate_cards WHERE id = ?', [id]);
  return res.json({ message: 'Rate card deleted.' });
};

// ---- AGENTS ----
const createAgent = async (req, res) => {
  const { name, email, password, phone, zoneId } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [userResult] = await db.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES (?,?,?,?,'agent')",
      [name, email, hashed, phone]
    );
    const [agentResult] = await db.query(
      'INSERT INTO delivery_agents (user_id, zone_id) VALUES (?,?)',
      [userResult.insertId, zoneId]
    );
    return res.status(201).json({ message: 'Agent created.', agentId: agentResult.insertId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create agent. Email may already exist.' });
  }
};

const getAgents = async (req, res) => {
  const [agents] = await db.query(
    `SELECT da.*, u.name, u.email, u.phone, z.name as zone_name
     FROM delivery_agents da
     LEFT JOIN users u ON da.user_id = u.id
     LEFT JOIN zones z ON da.zone_id = z.id
     ORDER BY da.is_available DESC`
  );
  return res.json(agents);
};

const updateAgentLocation = async (req, res) => {
  const { lat, lng } = req.body;
  try {
    const [agentRow] = await db.query('SELECT id FROM delivery_agents WHERE user_id = ?', [req.user.id]);
    if (agentRow.length === 0) return res.status(404).json({ message: 'Agent not found.' });
    await db.query('UPDATE delivery_agents SET current_lat=?, current_lng=? WHERE id=?', [lat, lng, agentRow[0].id]);
    return res.json({ message: 'Location updated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update location.' });
  }
};

// ---- USERS (Admin view) ----
const getUsers = async (req, res) => {
  const [users] = await db.query("SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC");
  return res.json(users);
};

module.exports = {
  createZone, getZones, deleteZone,
  createArea, getAreas, deleteArea,
  createRateCard, getRateCards, updateRateCard, deleteRateCard,
  createAgent, getAgents, updateAgentLocation,
  getUsers
};
