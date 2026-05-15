const { getDb, saveDb } = require('../db/connection');
const { formatResponse, calculateDistance } = require('../utils/helpers');

exports.toggleOnline = async (req, res) => {
  try {
    const { is_online, latitude, longitude } = req.body;
    const db = await getDb();

    db.run(
      'UPDATE driver_profiles SET is_online = ?, current_latitude = ?, current_longitude = ? WHERE user_id = ?',
      [is_online ? 1 : 0, latitude || null, longitude || null, req.user.id]
    );

    saveDb();
    res.json(formatResponse(true, null, is_online ? 'You are now online' : 'You are now offline'));
  } catch (err) {
    console.error('Toggle online error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update status'));
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const db = await getDb();

    db.run(
      'UPDATE driver_profiles SET current_latitude = ?, current_longitude = ? WHERE user_id = ?',
      [latitude, longitude, req.user.id]
    );

    saveDb();
    res.json(formatResponse(true, null, 'Location updated'));
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update location'));
  }
};

exports.getAvailableParcels = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT p.*, u.full_name as shop_name, sp.shop_name as shop_title
       FROM parcels p
       LEFT JOIN users u ON p.shop_id = u.id
       LEFT JOIN shop_profiles sp ON p.shop_id = sp.user_id
       WHERE p.status = 'pending' AND p.driver_id IS NULL
       ORDER BY p.created_at DESC LIMIT 50`
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

    res.json(formatResponse(true, parcels));
  } catch (err) {
    console.error('Get available parcels error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get parcels'));
  }
};

exports.getDriverStats = async (req, res) => {
  try {
    const db = await getDb();

    const profile = db.exec(
      'SELECT * FROM driver_profiles WHERE user_id = ?',
      [req.user.id]
    );

    const todayDeliveries = db.exec(
      `SELECT COUNT(*) FROM parcels WHERE driver_id = ? AND status = 'delivered' AND date(delivered_at) = date('now')`,
      [req.user.id]
    );

    const todayEarnings = db.exec(
      `SELECT COALESCE(SUM(driver_payout), 0) FROM payments p
       JOIN parcels pr ON p.parcel_id = pr.id
       WHERE pr.driver_id = ? AND p.payment_status = 'completed' AND date(pr.delivered_at) = date('now')`,
      [req.user.id]
    );

    const activeParcels = db.exec(
      `SELECT COUNT(*) FROM parcels WHERE driver_id = ? AND status IN ('accepted', 'picked_up', 'in_transit')`,
      [req.user.id]
    );

    const weeklyEarnings = db.exec(
      `SELECT COALESCE(SUM(driver_payout), 0) FROM payments p
       JOIN parcels pr ON p.parcel_id = pr.id
       WHERE pr.driver_id = ? AND p.payment_status = 'completed' AND pr.delivered_at >= datetime('now', '-7 days')`,
      [req.user.id]
    );

    let profileData = {};
    if (profile.length > 0) {
      const cols = profile[0].columns;
      const vals = profile[0].values[0];
      cols.forEach((col, i) => profileData[col] = vals[i]);
    }

    res.json(formatResponse(true, {
      ...profileData,
      today_deliveries: todayDeliveries[0]?.values[0][0] || 0,
      today_earnings: todayEarnings[0]?.values[0][0] || 0,
      active_parcels: activeParcels[0]?.values[0][0] || 0,
      weekly_earnings: weeklyEarnings[0]?.values[0][0] || 0
    }));
  } catch (err) {
    console.error('Get driver stats error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get stats'));
  }
};

exports.getNearbyDrivers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;
    const db = await getDb();

    const result = db.exec(
      `SELECT dp.*, u.full_name, u.phone, u.email
       FROM driver_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.is_online = 1 AND dp.is_approved = 1`,
      []
    );

    let drivers = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      drivers = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      }).filter(d => {
        if (!latitude || !longitude || !d.current_latitude || !d.current_longitude) return true;
        const dist = calculateDistance(parseFloat(latitude), parseFloat(longitude), d.current_latitude, d.current_longitude);
        return dist <= parseFloat(radius);
      });
    }

    res.json(formatResponse(true, drivers));
  } catch (err) {
    console.error('Get nearby drivers error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get drivers'));
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { vehicle_type, vehicle_number, license_number } = req.body;
    const db = await getDb();

    db.run(
      'UPDATE driver_profiles SET vehicle_type = ?, vehicle_number = ?, license_number = ? WHERE user_id = ?',
      [vehicle_type, vehicle_number, license_number, req.user.id]
    );

    saveDb();
    res.json(formatResponse(true, null, 'Profile updated'));
  } catch (err) {
    console.error('Update driver profile error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update profile'));
  }
};
