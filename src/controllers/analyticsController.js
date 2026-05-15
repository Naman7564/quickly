const { getDb } = require('../db/connection');
const { formatResponse } = require('../utils/helpers');

exports.getDashboardStats = async (req, res) => {
  try {
    const db = await getDb();
    const role = req.user.role;

    if (role === 'shop_owner') {
      const totalParcels = db.exec('SELECT COUNT(*) FROM parcels WHERE shop_id = ?', [req.user.id]);
      const activeParcels = db.exec("SELECT COUNT(*) FROM parcels WHERE shop_id = ? AND status IN ('pending', 'accepted', 'picked_up', 'in_transit')", [req.user.id]);
      const delivered = db.exec("SELECT COUNT(*) FROM parcels WHERE shop_id = ? AND status = 'delivered'", [req.user.id]);
      const totalSpent = db.exec("SELECT COALESCE(SUM(delivery_charge), 0) FROM parcels WHERE shop_id = ? AND status = 'delivered'", [req.user.id]);
      const monthlyParcels = db.exec("SELECT COUNT(*) FROM parcels WHERE shop_id = ? AND created_at >= datetime('now', '-30 days')", [req.user.id]);
      const monthlySpent = db.exec("SELECT COALESCE(SUM(delivery_charge), 0) FROM parcels WHERE shop_id = ? AND status = 'delivered' AND created_at >= datetime('now', '-30 days')", [req.user.id]);

      res.json(formatResponse(true, {
        total_parcels: totalParcels[0]?.values[0][0] || 0,
        active_parcels: activeParcels[0]?.values[0][0] || 0,
        delivered: delivered[0]?.values[0][0] || 0,
        total_spent: totalSpent[0]?.values[0][0] || 0,
        monthly_parcels: monthlyParcels[0]?.values[0][0] || 0,
        monthly_spent: monthlySpent[0]?.values[0][0] || 0
      }));
    } else if (role === 'driver') {
      const profile = db.exec('SELECT * FROM driver_profiles WHERE user_id = ?', [req.user.id]);
      const todayDeliveries = db.exec("SELECT COUNT(*) FROM parcels WHERE driver_id = ? AND status = 'delivered' AND date(delivered_at) = date('now')", [req.user.id]);
      const todayEarnings = db.exec("SELECT COALESCE(SUM(driver_payout), 0) FROM payments p JOIN parcels pr ON p.parcel_id = pr.id WHERE pr.driver_id = ? AND p.payment_status = 'completed' AND date(pr.delivered_at) = date('now')", [req.user.id]);
      const weeklyEarnings = db.exec("SELECT COALESCE(SUM(driver_payout), 0) FROM payments p JOIN parcels pr ON p.parcel_id = pr.id WHERE pr.driver_id = ? AND p.payment_status = 'completed' AND pr.delivered_at >= datetime('now', '-7 days')", [req.user.id]);
      const monthlyEarnings = db.exec("SELECT COALESCE(SUM(driver_payout), 0) FROM payments p JOIN parcels pr ON p.parcel_id = pr.id WHERE pr.driver_id = ? AND p.payment_status = 'completed' AND pr.delivered_at >= datetime('now', '-30 days')", [req.user.id]);
      const rating = profile[0]?.values[0]?.[profile[0].columns.indexOf('rating')] || 5.0;

      res.json(formatResponse(true, {
        today_deliveries: todayDeliveries[0]?.values[0][0] || 0,
        today_earnings: todayEarnings[0]?.values[0][0] || 0,
        weekly_earnings: weeklyEarnings[0]?.values[0][0] || 0,
        monthly_earnings: monthlyEarnings[0]?.values[0][0] || 0,
        total_deliveries: profile[0]?.values[0]?.[profile[0].columns.indexOf('total_deliveries')] || 0,
        total_earnings: profile[0]?.values[0]?.[profile[0].columns.indexOf('total_earnings')] || 0,
        rating
      }));
    } else {
      res.json(formatResponse(false, null, 'Invalid role'));
    }
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get stats'));
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const db = await getDb();

    const totalUsers = db.exec('SELECT COUNT(*) FROM users');
    const totalDrivers = db.exec("SELECT COUNT(*) FROM users WHERE role = 'driver'");
    const totalShops = db.exec("SELECT COUNT(*) FROM users WHERE role = 'shop_owner'");
    const totalParcels = db.exec('SELECT COUNT(*) FROM parcels');
    const activeParcels = db.exec("SELECT COUNT(*) FROM parcels WHERE status IN ('pending', 'accepted', 'picked_up', 'in_transit')");
    const deliveredToday = db.exec("SELECT COUNT(*) FROM parcels WHERE status = 'delivered' AND date(delivered_at) = date('now')");
    const totalRevenue = db.exec("SELECT COALESCE(SUM(commission), 0) FROM payments WHERE payment_status = 'completed'");
    const pendingDrivers = db.exec('SELECT COUNT(*) FROM driver_profiles WHERE is_approved = 0');

    const weeklyParcels = db.exec(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM parcels
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date
    `);

    let weeklyData = [];
    if (weeklyParcels.length > 0) {
      weeklyData = weeklyParcels[0].values.map(row => ({ date: row[0], count: row[1] }));
    }

    res.json(formatResponse(true, {
      total_users: totalUsers[0]?.values[0][0] || 0,
      total_drivers: totalDrivers[0]?.values[0][0] || 0,
      total_shops: totalShops[0]?.values[0][0] || 0,
      total_parcels: totalParcels[0]?.values[0][0] || 0,
      active_parcels: activeParcels[0]?.values[0][0] || 0,
      delivered_today: deliveredToday[0]?.values[0][0] || 0,
      total_revenue: totalRevenue[0]?.values[0][0] || 0,
      pending_drivers: pendingDrivers[0]?.values[0][0] || 0,
      weekly_data: weeklyData
    }));
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json(formatResponse(false, null, 'Failed to get stats'));
  }
};
