const jwt = require('jsonwebtoken');
const { getDb } = require('../db/connection');
const config = require('../config');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

async function authenticateDriver(req, res, next) {
  authenticate(req, res, async () => {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Driver access required' });
    }
    const db = await getDb();
    const result = db.exec(
      'SELECT is_approved FROM driver_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (result.length === 0 || result[0].values[0][0] !== 1) {
      return res.status(403).json({ success: false, message: 'Driver account not yet approved' });
    }
    next();
  });
}

module.exports = { authenticate, authorize, authenticateDriver };
