const { getDb, saveDb } = require('../db/connection');
const { formatResponse } = require('../utils/helpers');

exports.getNotifications = async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    let notifications = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      notifications = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    }

    const unread = db.exec(
      'SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json(formatResponse(true, { notifications, unread_count: unread[0]?.values[0][0] || 0 }));
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get notifications'));
  }
};

exports.markRead = async (req, res) => {
  try {
    const db = await getDb();
    if (req.params.id === 'all') {
      db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    } else {
      db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    }
    saveDb();
    res.json(formatResponse(true, null, 'Marked as read'));
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to update'));
  }
};

exports.createReport = async (req, res) => {
  try {
    const { parcel_id, subject, description } = req.body;
    const db = await getDb();

    db.run(
      'INSERT INTO reports (parcel_id, reporter_id, subject, description) VALUES (?, ?, ?, ?)',
      [parcel_id || null, req.user.id, subject, description]
    );

    saveDb();
    res.status(201).json(formatResponse(true, null, 'Report submitted'));
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to submit report'));
  }
};
