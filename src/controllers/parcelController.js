const { getDb, saveDb } = require('../db/connection');
const { generateTrackingId, generateOTP, paginate, formatResponse, calculateDistance } = require('../utils/helpers');

exports.createParcel = async (req, res) => {
  try {
    const { pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng,
      customer_name, customer_phone, parcel_type, weight, description, delivery_charge, notes } = req.body;

    if (!pickup_address || !delivery_address || !customer_name || !customer_phone || !delivery_charge) {
      return res.status(400).json(formatResponse(false, null, 'Required fields missing'));
    }

    const db = await getDb();
    const trackingId = generateTrackingId();
    const otp = generateOTP();

    db.run(
      `INSERT INTO parcels (tracking_id, shop_id, pickup_address, pickup_latitude, pickup_longitude,
       delivery_address, delivery_latitude, delivery_longitude, customer_name, customer_phone,
       parcel_type, weight, description, delivery_charge, otp, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [trackingId, req.user.id, pickup_address, pickup_lat || null, pickup_lng || null,
       delivery_address, delivery_lat || null, delivery_lng || null, customer_name, customer_phone,
       parcel_type || 'general', weight || 0, description || '', delivery_charge, otp, notes || '']
    );

    const parcelId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

    // Add to history
    db.run(
      'INSERT INTO parcel_history (parcel_id, status, note) VALUES (?, ?, ?)',
      [parcelId, 'pending', 'Parcel created']
    );

    // Create payment record
    db.run(
      'INSERT INTO payments (parcel_id, amount, payment_status) VALUES (?, ?, ?)',
      [parcelId, delivery_charge, 'pending']
    );

    // Notify nearby drivers
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link)
       SELECT dp.user_id, 'New Delivery Available', 'A new delivery request near you: ' || ?, 'new_parcel', ?
       FROM driver_profiles dp WHERE dp.is_online = 1 AND dp.is_approved = 1`,
      [pickup_address, `/driver`]
    );

    saveDb();
    res.status(201).json(formatResponse(true, { id: parcelId, tracking_id: trackingId, otp }, 'Parcel created successfully'));
  } catch (err) {
    console.error('Create parcel error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to create parcel'));
  }
};

exports.getParcels = async (req, res) => {
  try {
    const { status, page, limit, search } = req.query;
    const { offset, limit: pgLimit, page: pg } = paginate(page, limit);
    const db = await getDb();

    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'shop_owner') {
      where += ' AND p.shop_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'driver') {
      where += ' AND p.driver_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        where += ` AND p.status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      } else {
        where += ' AND p.status = ?';
        params.push(status);
      }
    }

    if (search) {
      where += ' AND (p.tracking_id LIKE ? OR p.customer_name LIKE ? OR p.customer_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = db.exec(`SELECT COUNT(*) FROM parcels p ${where}`, params);
    const total = countResult[0].values[0][0];

    const result = db.exec(
      `SELECT p.*, u.full_name as shop_name, d.full_name as driver_name
       FROM parcels p
       LEFT JOIN users u ON p.shop_id = u.id
       LEFT JOIN users d ON p.driver_id = d.id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pgLimit, offset]
    );

    let parcels = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      parcels = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    res.json(formatResponse(true, parcels, '', { total, page: pg, limit: pgLimit, pages: Math.ceil(total / pgLimit) }));
  } catch (err) {
    console.error('Get parcels error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get parcels'));
  }
};

exports.getParcelById = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT p.*, u.full_name as shop_name, u.phone as shop_phone,
       d.full_name as driver_name, d.phone as driver_phone
       FROM parcels p
       LEFT JOIN users u ON p.shop_id = u.id
       LEFT JOIN users d ON p.driver_id = d.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'Parcel not found'));
    }

    const columns = result[0].columns;
    const parcel = {};
    columns.forEach((col, i) => parcel[col] = result[0].values[0][i]);

    // Get history
    const history = db.exec(
      'SELECT * FROM parcel_history WHERE parcel_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    parcel.history = [];
    if (history.length > 0) {
      const hCols = history[0].columns;
      parcel.history = history[0].values.map(row => {
        const obj = {};
        hCols.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    res.json(formatResponse(true, parcel));
  } catch (err) {
    console.error('Get parcel error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get parcel'));
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, note, latitude, longitude } = req.body;
    const db = await getDb();

    const parcel = db.exec('SELECT * FROM parcels WHERE id = ?', [req.params.id]);
    if (parcel.length === 0 || parcel[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'Parcel not found'));
    }

    const pCols = parcel[0].columns;
    const pVals = parcel[0].values[0];
    const p = {};
    pCols.forEach((col, i) => p[col] = pVals[i]);

    // Status transition validation
    const validTransitions = {
      pending: ['accepted', 'cancelled'],
      accepted: ['picked_up', 'cancelled'],
      picked_up: ['in_transit'],
      in_transit: ['delivered']
    };

    if (!validTransitions[p.status] || !validTransitions[p.status].includes(status)) {
      return res.status(400).json(formatResponse(false, null, `Cannot transition from ${p.status} to ${status}`));
    }

    // Update parcel
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'accepted') updates.accepted_at = new Date().toISOString();
    if (status === 'picked_up') updates.picked_up_at = new Date().toISOString();
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      // Update driver stats
      db.run(
        `UPDATE driver_profiles SET total_deliveries = total_deliveries + 1,
         total_earnings = total_earnings + ? WHERE user_id = ?`,
        [p.delivery_charge * 0.85, p.driver_id]
      );
      // Update payment
      db.run(
        `UPDATE payments SET payment_status = 'completed', driver_payout = ?, commission = ? WHERE parcel_id = ?`,
        [p.delivery_charge * 0.85, p.delivery_charge * 0.15, p.id]
      );
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.run(`UPDATE parcels SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);

    // Add history
    db.run(
      'INSERT INTO parcel_history (parcel_id, status, note, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, status, note || `Status updated to ${status}`, latitude || null, longitude || null]
    );

    // Notify
    const notifyUserId = req.user.role === 'driver' ? p.shop_id : p.driver_id;
    if (notifyUserId) {
      db.run(
        'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [notifyUserId, 'Delivery Update', `Parcel ${p.tracking_id} is now ${status.replace('_', ' ')}`, 'status_update', '/dashboard']
      );
    }

    saveDb();
    res.json(formatResponse(true, null, `Status updated to ${status}`));
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update status'));
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const { driver_id } = req.body;
    const db = await getDb();

    const parcel = db.exec('SELECT * FROM parcels WHERE id = ? AND shop_id = ?', [req.params.id, req.user.id]);
    if (parcel.length === 0 || parcel[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'Parcel not found'));
    }

    db.run('UPDATE parcels SET driver_id = ?, status = ?, updated_at = ? WHERE id = ?',
      [driver_id, 'accepted', new Date().toISOString(), req.params.id]);

    db.run(
      'INSERT INTO parcel_history (parcel_id, status, note) VALUES (?, ?, ?)',
      [req.params.id, 'accepted', 'Driver assigned']
    );

    db.run(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [driver_id, 'New Delivery Assigned', 'You have a new delivery assignment', 'new_parcel', '/driver']
    );

    saveDb();
    res.json(formatResponse(true, null, 'Driver assigned successfully'));
  } catch (err) {
    console.error('Assign driver error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to assign driver'));
  }
};

exports.acceptParcel = async (req, res) => {
  try {
    const db = await getDb();

    const parcel = db.exec('SELECT * FROM parcels WHERE id = ? AND status = ?', [req.params.id, 'pending']);
    if (parcel.length === 0 || parcel[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'Parcel not available'));
    }

    db.run('UPDATE parcels SET driver_id = ?, status = ?, accepted_at = ?, updated_at = ? WHERE id = ?',
      [req.user.id, 'accepted', new Date().toISOString(), new Date().toISOString(), req.params.id]);

    db.run(
      'INSERT INTO parcel_history (parcel_id, status, note) VALUES (?, ?, ?)',
      [req.params.id, 'accepted', 'Accepted by driver']
    );

    saveDb();
    res.json(formatResponse(true, null, 'Parcel accepted'));
  } catch (err) {
    console.error('Accept parcel error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to accept parcel'));
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const db = await getDb();

    const parcel = db.exec('SELECT * FROM parcels WHERE id = ?', [req.params.id]);
    if (parcel.length === 0 || parcel[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'Parcel not found'));
    }

    const pCols = parcel[0].columns;
    const pVals = parcel[0].values[0];
    const p = {};
    pCols.forEach((col, i) => p[col] = pVals[i]);

    if (p.otp !== otp) {
      return res.status(400).json(formatResponse(false, null, 'Invalid OTP'));
    }

    res.json(formatResponse(true, null, 'OTP verified'));
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to verify OTP'));
  }
};

exports.cancelParcel = async (req, res) => {
  try {
    const db = await getDb();
    const parcel = db.exec('SELECT * FROM parcels WHERE id = ?', [req.params.id]);
    if (parcel.length === 0 || parcel[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'Parcel not found'));
    }

    const pCols = parcel[0].columns;
    const pVals = parcel[0].values[0];
    const p = {};
    pCols.forEach((col, i) => p[col] = pVals[i]);

    if (['delivered', 'cancelled'].includes(p.status)) {
      return res.status(400).json(formatResponse(false, null, 'Cannot cancel this parcel'));
    }

    db.run('UPDATE parcels SET status = ?, updated_at = ? WHERE id = ?',
      ['cancelled', new Date().toISOString(), req.params.id]);

    db.run(
      'INSERT INTO parcel_history (parcel_id, status, note) VALUES (?, ?, ?)',
      [req.params.id, 'cancelled', 'Parcel cancelled']
    );

    saveDb();
    res.json(formatResponse(true, null, 'Parcel cancelled'));
  } catch (err) {
    console.error('Cancel parcel error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to cancel parcel'));
  }
};
