module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'quickly_secret',
  jwtExpiry: '7d',
  saltRounds: 10,
  roles: {
    SHOP_OWNER: 'shop_owner',
    DRIVER: 'driver',
    ADMIN: 'admin'
  },
  parcelStatus: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    PICKED_UP: 'picked_up',
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};
