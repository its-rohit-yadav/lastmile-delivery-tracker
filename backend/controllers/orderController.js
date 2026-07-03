const db = require('../config/db');
const { detectZone, calculateCharge } = require('../utils/rateEngine');
const { autoAssignAgent } = require('../utils/agentAssignment');
const { sendEmail, statusEmailTemplate, rescheduleEmailTemplate } = require('../utils/mailer');

// Calculate charge preview before order confirmation
const previewCharge = async (req, res) => {
  const { pickupAddress, dropAddress, length, breadth, height, actualWeight, orderType, paymentType } = req.body;

  try {
    const pickupZoneId = await detectZone(pickupAddress);
    const dropZoneId = await detectZone(dropAddress);

    if (!pickupZoneId || !dropZoneId) {
      return res.status(400).json({ message: 'Could not detect zones from the provided addresses. Please include a valid pincode.' });
    }

    const chargeInfo = await calculateCharge({
      pickupZoneId, dropZoneId,
      length, breadth, height,
      actualWeight, orderType, paymentType
    });

    return res.json({ pickupZoneId, dropZoneId, ...chargeInfo });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// Create a new order
const createOrder = async (req, res) => {
  const { pickupAddress, dropAddress, length, breadth, height, actualWeight, orderType, paymentType, customerId } = req.body;

  // Admin can create on behalf of customer using customerId param
  const resolvedCustomerId = req.user.role === 'admin' && customerId ? customerId : req.user.id;

  try {
    const pickupZoneId = await detectZone(pickupAddress);
    const dropZoneId = await detectZone(dropAddress);

    if (!pickupZoneId || !dropZoneId) {
      return res.status(400).json({ message: 'Zone detection failed. Ensure addresses include valid pincodes.' });
    }

    const chargeInfo = await calculateCharge({
      pickupZoneId, dropZoneId,
      length, breadth, height,
      actualWeight, orderType, paymentType
    });

    const [result] = await db.query(
      `INSERT INTO orders 
       (customer_id, pickup_address, drop_address, pickup_zone_id, drop_zone_id,
        length, breadth, height, actual_weight, volumetric_weight, billed_weight,
        order_type, payment_type, delivery_charge, cod_surcharge, total_charge, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Pending')`,
      [
        resolvedCustomerId, pickupAddress, dropAddress, pickupZoneId, dropZoneId,
        length, breadth, height, actualWeight,
        chargeInfo.volumetricWeight, chargeInfo.billedWeight,
        orderType, paymentType,
        chargeInfo.deliveryCharge, chargeInfo.codSurcharge, chargeInfo.totalCharge
      ]
    );

    const orderId = result.insertId;

    // Log initial tracking entry
    await db.query(
      `INSERT INTO order_tracking (order_id, status, updated_by, actor_role, note)
       VALUES (?, 'Pending', ?, ?, 'Order placed successfully')`,
      [orderId, resolvedCustomerId, req.user.role]
    );

    // Fetch customer email for notification
    const [customerRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [resolvedCustomerId]);
    const customer = customerRows[0];

    await sendEmail(
      customer.email,
      `Order #${orderId} Placed Successfully`,
      statusEmailTemplate(customer.name, orderId, 'Order Placed', 'Your order has been placed and is pending agent assignment.')
    );

    return res.status(201).json({
      message: 'Order created successfully.',
      orderId,
      chargeBreakdown: chargeInfo
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// Get all orders 
const getOrders = async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'admin') {
      const { status, zone, agentId } = req.query;
      let conditions = [];
      if (status) { conditions.push('o.status = ?'); params.push(status); }
      if (zone) { conditions.push('(o.pickup_zone_id = ? OR o.drop_zone_id = ?)'); params.push(zone, zone); }
      if (agentId) { conditions.push('o.agent_id = ?'); params.push(agentId); }

      query = `SELECT o.*, u.name as customer_name, u.email as customer_email,
               pz.name as pickup_zone, dz.name as drop_zone,
               da.id as agent_db_id
               FROM orders o
               LEFT JOIN users u ON o.customer_id = u.id
               LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
               LEFT JOIN zones dz ON o.drop_zone_id = dz.id
               LEFT JOIN delivery_agents da ON o.agent_id = da.id
               ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
               ORDER BY o.created_at DESC`;

    } else if (req.user.role === 'customer') {
      query = `SELECT o.*, pz.name as pickup_zone, dz.name as drop_zone
               FROM orders o
               LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
               LEFT JOIN zones dz ON o.drop_zone_id = dz.id
               WHERE o.customer_id = ?
               ORDER BY o.created_at DESC`;
      params = [req.user.id];

    } else if (req.user.role === 'agent') {
      const [agentRow] = await db.query('SELECT id FROM delivery_agents WHERE user_id = ?', [req.user.id]);
      if (agentRow.length === 0) return res.status(404).json({ message: 'Agent profile not found.' });
      query = `SELECT o.*, pz.name as pickup_zone, dz.name as drop_zone
               FROM orders o
               LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
               LEFT JOIN zones dz ON o.drop_zone_id = dz.id
               WHERE o.agent_id = ?
               ORDER BY o.created_at DESC`;
      params = [agentRow[0].id];
    }

    const [orders] = await db.query(query, params);
    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};

// Get single order with tracking history
const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email,
       pz.name as pickup_zone, dz.name as drop_zone
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
       LEFT JOIN zones dz ON o.drop_zone_id = dz.id
       WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) return res.status(404).json({ message: 'Order not found.' });

    const [tracking] = await db.query(
      `SELECT ot.*, u.name as actor_name FROM order_tracking ot
       LEFT JOIN users u ON ot.updated_by = u.id
       WHERE ot.order_id = ? ORDER BY ot.created_at ASC`,
      [id]
    );

    return res.json({ order: orders[0], tracking });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch order.' });
  }
};

// Update order status 
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const [orderRows] = await db.query(
      'SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o LEFT JOIN users u ON o.customer_id = u.id WHERE o.id = ?',
      [id]
    );
    if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found.' });

    const order = orderRows[0];

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    
    await db.query(
      'INSERT INTO order_tracking (order_id, status, updated_by, actor_role, note) VALUES (?,?,?,?,?)',
      [id, status, req.user.id, req.user.role, note || null]
    );

    
    if (status === 'Delivered' && order.agent_id) {
      await db.query('UPDATE delivery_agents SET is_available = TRUE WHERE id = ?', [order.agent_id]);
    }

    // Send email notification
    await sendEmail(
      order.customer_email,
      `Order #${id} Update: ${status}`,
      statusEmailTemplate(order.customer_name, id, status, note)
    );

    return res.json({ message: `Order status updated to "${status}".` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update order status.' });
  }
};

// Assign agent manually 
const assignAgent = async (req, res) => {
  const { id } = req.params;
  const { agentId, auto } = req.body;

  try {
    const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found.' });

    const order = orderRows[0];
    let assignedAgentId;

    if (auto) {
      assignedAgentId = await autoAssignAgent(id, order.pickup_zone_id);
    } else {
      if (!agentId) return res.status(400).json({ message: 'agentId is required for manual assignment.' });
      await db.query("UPDATE orders SET agent_id = ?, status = 'Assigned' WHERE id = ?", [agentId, id]);
      await db.query('UPDATE delivery_agents SET is_available = FALSE WHERE id = ?', [agentId]);
      await db.query(
        "INSERT INTO order_tracking (order_id, status, updated_by, actor_role, note) VALUES (?, 'Assigned', ?, 'admin', 'Agent manually assigned')",
        [id, req.user.id]
      );
      assignedAgentId = agentId;
    }

    return res.json({ message: 'Agent assigned successfully.', agentId: assignedAgentId });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Reschedule failed delivery
const rescheduleOrder = async (req, res) => {
  const { id } = req.params;
  const { newDate } = req.body;

  try {
    const [orderRows] = await db.query(
      'SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o LEFT JOIN users u ON o.customer_id = u.id WHERE o.id = ?',
      [id]
    );
    if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found.' });

    const order = orderRows[0];
    if (order.status !== 'Failed') {
      return res.status(400).json({ message: 'Only failed orders can be rescheduled.' });
    }

    // Save reschedule
    await db.query('INSERT INTO reschedules (order_id, new_date) VALUES (?,?)', [id, newDate]);
    await db.query("UPDATE orders SET status = 'Pending', scheduled_date = ?, agent_id = NULL WHERE id = ?", [newDate, id]);

    // Free previous agent
    if (order.agent_id) {
      await db.query('UPDATE delivery_agents SET is_available = TRUE WHERE id = ?', [order.agent_id]);
    }

    await db.query(
      "INSERT INTO order_tracking (order_id, status, updated_by, actor_role, note) VALUES (?, 'Rescheduled', ?, ?, ?)",
      [id, req.user.id, req.user.role, `Rescheduled for ${newDate}`]
    );

    await sendEmail(
      order.customer_email,
      `Order #${id} Rescheduled`,
      rescheduleEmailTemplate(order.customer_name, id, newDate)
    );

    return res.json({ message: 'Order rescheduled successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to reschedule order.' });
  }
};

module.exports = { previewCharge, createOrder, getOrders, getOrderById, updateOrderStatus, assignAgent, rescheduleOrder };
