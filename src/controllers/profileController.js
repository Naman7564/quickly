const { getDb, saveDb } = require('../db/connection');
const { formatResponse } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const db = await getDb();

    db.run('UPDATE users SET full_name = ?, phone = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [full_name, phone, req.user.id]);

    saveDb();
    res.json(formatResponse(true, null, 'Profile updated'));
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update profile'));
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const db = await getDb();

    const user = db.exec('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (user.length === 0) return res.status(404).json(formatResponse(false, null, 'User not found'));

    const valid = bcrypt.compareSync(current_password, user[0].values[0][0]);
    if (!valid) return res.status(400).json(formatResponse(false, null, 'Current password is incorrect'));

    const hash = bcrypt.hashSync(new_password, 10);
    db.run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [hash, req.user.id]);
    saveDb();

    res.json(formatResponse(true, null, 'Password updated'));
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update password'));
  }
};

exports.updateShopProfile = async (req, res) => {
  try {
    const { shop_name, shop_address, shop_type, city } = req.body;
    const db = await getDb();

    const exists = db.exec('SELECT id FROM shop_profiles WHERE user_id = ?', [req.user.id]);
    if (exists.length > 0 && exists[0].values.length > 0) {
      db.run('UPDATE shop_profiles SET shop_name = ?, shop_address = ?, shop_type = ?, city = ? WHERE user_id = ?',
        [shop_name, shop_address, shop_type, city, req.user.id]);
    } else {
      db.run('INSERT INTO shop_profiles (user_id, shop_name, shop_address, shop_type, city) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, shop_name, shop_address, shop_type, city]);
    }

    saveDb();
    res.json(formatResponse(true, null, 'Shop profile updated'));
  } catch (err) {
    console.error('Update shop profile error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update shop profile'));
  }
};

exports.getReviews = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT r.*, u.full_name as reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewee_id = u.id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.userId || req.user.id]
    );

    let reviews = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      reviews = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    res.json(formatResponse(true, reviews));
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get reviews'));
  }
};

exports.createReview = async (req, res) => {
  try {
    const { parcel_id, reviewee_id, rating, comment } = req.body;
    const db = await getDb();

    db.run(
      'INSERT INTO reviews (parcel_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [parcel_id, req.user.id, reviewee_id, rating, comment || '']
    );

    saveDb();
    res.status(201).json(formatResponse(true, null, 'Review submitted'));
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to submit review'));
  }
};
