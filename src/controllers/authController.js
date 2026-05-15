const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db/connection');
const { uuidv4, formatResponse } = require('../utils/helpers');
const config = require('../config');

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, phone, role, shop_name, shop_address, shop_type, city, vehicle_type, vehicle_number, license_number } = req.body;

    if (!email || !password || !full_name || !phone || !role) {
      return res.status(400).json(formatResponse(false, null, 'All fields are required'));
    }

    if (!['shop_owner', 'driver'].includes(role)) {
      return res.status(400).json(formatResponse(false, null, 'Invalid role'));
    }

    const db = await getDb();

    // Check existing user
    const existing = db.exec('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json(formatResponse(false, null, 'Email already registered'));
    }

    const hash = bcrypt.hashSync(password, config.saltRounds);
    const uuid = uuidv4();

    db.run(
      `INSERT INTO users (uuid, email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, email, hash, full_name, phone, role]
    );

    const userIdResult = db.exec('SELECT last_insert_rowid()');
    const userId = userIdResult[0].values[0][0];

    if (role === 'shop_owner') {
      db.run(
        `INSERT INTO shop_profiles (user_id, shop_name, shop_address, shop_type, city) VALUES (?, ?, ?, ?, ?)`,
        [userId, shop_name || '', shop_address || '', shop_type || '', city || '']
      );
    } else if (role === 'driver') {
      db.run(
        `INSERT INTO driver_profiles (user_id, vehicle_type, vehicle_number, license_number) VALUES (?, ?, ?, ?)`,
        [userId, vehicle_type || 'auto', vehicle_number || '', license_number || '']
      );
    }

    saveDb();

    const token = jwt.sign({ id: userId, uuid, email, role }, config.jwtSecret, { expiresIn: config.jwtExpiry });

    res.status(201).json(formatResponse(true, { token, user: { id: userId, uuid, email, full_name, phone, role } }, 'Registration successful'));
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json(formatResponse(false, null, 'Registration failed'));
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatResponse(false, null, 'Email and password required'));
    }

    const db = await getDb();
    const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json(formatResponse(false, null, 'Invalid credentials'));
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    const user = {};
    columns.forEach((col, i) => user[col] = values[i]);

    if (!user.is_active) {
      return res.status(403).json(formatResponse(false, null, 'Account is deactivated'));
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json(formatResponse(false, null, 'Invalid credentials'));
    }

    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry }
    );

    const { password: _, ...safeUser } = user;

    res.json(formatResponse(true, { token, user: safeUser }, 'Login successful'));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json(formatResponse(false, null, 'Login failed'));
  }
};

exports.getMe = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT id, uuid, email, full_name, phone, role, avatar, is_active, is_verified, created_at FROM users WHERE id = ?', [req.user.id]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json(formatResponse(false, null, 'User not found'));
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    const user = {};
    columns.forEach((col, i) => user[col] = values[i]);

    // Get profile data
    if (user.role === 'shop_owner') {
      const profile = db.exec('SELECT * FROM shop_profiles WHERE user_id = ?', [user.id]);
      if (profile.length > 0) {
        const pCols = profile[0].columns;
        const pVals = profile[0].values[0];
        user.profile = {};
        pCols.forEach((col, i) => user.profile[col] = pVals[i]);
      }
    } else if (user.role === 'driver') {
      const profile = db.exec('SELECT * FROM driver_profiles WHERE user_id = ?', [user.id]);
      if (profile.length > 0) {
        const pCols = profile[0].columns;
        const pVals = profile[0].values[0];
        user.profile = {};
        pCols.forEach((col, i) => user.profile[col] = pVals[i]);
      }
    }

    res.json(formatResponse(true, user));
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get user'));
  }
};
