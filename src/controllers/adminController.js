const { getDb, saveDb } = require('../db/connection');
const { formatResponse, paginate } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const { role, status, page, limit, search } = req.query;
    const { offset, limit: pgLimit, page: pg } = paginate(page, limit);
    const db = await getDb();

    let where = 'WHERE 1=1';
    const params = [];

    if (role) { where += ' AND role = ?'; params.push(role); }
    if (status === 'active') { where += ' AND is_active = 1'; }
    if (status === 'inactive') { where += ' AND is_active = 0'; }
    if (search) {
      where += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = db.exec(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = countResult[0].values[0][0];

    const result = db.exec(
      `SELECT id, uuid, email, full_name, phone, role, is_active, is_verified, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pgLimit, offset]
    );

    let users = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      users = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    res.json(formatResponse(true, users, '', { total, page: pg, limit: pgLimit }));
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get users'));
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const { approved, page, limit } = req.query;
    const { offset, limit: pgLimit, page: pg } = paginate(page, limit);
    const db = await getDb();

    let where = '';
    const params = [];
    if (approved === 'true') { where = 'WHERE dp.is_approved = 1'; }
    else if (approved === 'false') { where = 'WHERE dp.is_approved = 0'; }

    const countResult = db.exec(`SELECT COUNT(*) FROM driver_profiles dp ${where}`, params);
    const total = countResult[0].values[0][0];

    const result = db.exec(
      `SELECT dp.*, u.full_name, u.email, u.phone, u.is_active
       FROM driver_profiles dp
       JOIN users u ON dp.user_id = u.id
       ${where} ORDER BY dp.user_id DESC LIMIT ? OFFSET ?`,
      [...params, pgLimit, offset]
    );

    let drivers = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      drivers = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    res.json(formatResponse(true, drivers, '', { total, page: pg, limit: pgLimit }));
  } catch (err) {
    console.error('Get drivers error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get drivers'));
  }
};

exports.approveDriver = async (req, res) => {
  try {
    const db = await getDb();
    db.run('UPDATE driver_profiles SET is_approved = ? WHERE user_id = ?', [1, req.params.id]);
    db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Account Approved', 'Your driver account has been approved!', 'success']);
    saveDb();
    res.json(formatResponse(true, null, 'Driver approved'));
  } catch (err) {
    console.error('Approve driver error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to approve driver'));
  }
};

exports.rejectDriver = async (req, res) => {
  try {
    const db = await getDb();
    db.run('UPDATE driver_profiles SET is_approved = 0 WHERE user_id = ?', [req.params.id]);
    db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Account Rejected', 'Your driver account application was rejected.', 'error']);
    saveDb();
    res.json(formatResponse(true, null, 'Driver rejected'));
  } catch (err) {
    console.error('Reject driver error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to reject driver'));
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const db = await getDb();
    const user = db.exec('SELECT is_active FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) return res.status(404).json(formatResponse(false, null, 'User not found'));

    const newStatus = user[0].values[0][0] ? 0 : 1;
    db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    saveDb();
    res.json(formatResponse(true, null, `User ${newStatus ? 'activated' : 'deactivated'}`));
  } catch (err) {
    console.error('Toggle user status error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update user'));
  }
};

exports.getAllParcels = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const { offset, limit: pgLimit, page: pg } = paginate(page, limit);
    const db = await getDb();

    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND p.status = ?'; params.push(status); }

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

    res.json(formatResponse(true, parcels, '', { total, page: pg, limit: pgLimit }));
  } catch (err) {
    console.error('Get all parcels error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get parcels'));
  }
};

exports.getReports = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT r.*, u.full_name as reporter_name
       FROM reports r
       JOIN users u ON r.reporter_id = u.id
       ORDER BY r.created_at DESC`
    );

    let reports = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      reports = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    res.json(formatResponse(true, reports));
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get reports'));
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const db = await getDb();

    const updates = {};
    if (status) updates.status = status;
    if (admin_note) updates.admin_note = admin_note;
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.run(`UPDATE reports SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    saveDb();

    res.json(formatResponse(true, null, 'Report updated'));
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update report'));
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const db = await getDb();
    const settings = req.body;

    Object.entries(settings).forEach(([key, value]) => {
      db.run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
        [key, String(value), String(value)]
      );
    });

    saveDb();
    res.json(formatResponse(true, null, 'Settings updated'));
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update settings'));
  }
};

exports.getSettings = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT key, value FROM settings');

    let settings = {};
    if (result.length > 0) {
      result[0].values.forEach(row => {
        settings[row[0]] = row[1];
      });
    }

    res.json(formatResponse(true, settings));
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get settings'));
  }
};
