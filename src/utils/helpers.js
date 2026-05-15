const { v4: uuidv4 } = require('uuid');

function generateTrackingId() {
  const prefix = 'QK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { offset: (p - 1) * l, limit: l, page: p };
}

function formatResponse(success, data = null, message = '', meta = null) {
  const resp = { success };
  if (message) resp.message = message;
  if (data !== null) resp.data = data;
  if (meta) resp.meta = meta;
  return resp;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  generateTrackingId,
  generateOTP,
  paginate,
  formatResponse,
  calculateDistance,
  uuidv4
};
