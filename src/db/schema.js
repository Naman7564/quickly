module.exports = `
-- Users table (shop owners, drivers, admins)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('shop_owner', 'driver', 'admin')),
  avatar TEXT,
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Shop owner profiles
CREATE TABLE IF NOT EXISTS shop_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  shop_name TEXT NOT NULL,
  shop_address TEXT,
  shop_type TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  business_license TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Driver profiles
CREATE TABLE IF NOT EXISTS driver_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'auto',
  vehicle_number TEXT,
  license_number TEXT,
  license_document TEXT,
  vehicle_document TEXT,
  id_proof TEXT,
  is_online INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 0,
  current_latitude REAL,
  current_longitude REAL,
  rating REAL DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  commission_rate REAL DEFAULT 15.0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Delivery zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  base_charge REAL NOT NULL DEFAULT 30,
  per_km_charge REAL NOT NULL DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Parcels / Delivery requests
CREATE TABLE IF NOT EXISTS parcels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id TEXT UNIQUE NOT NULL,
  shop_id INTEGER NOT NULL,
  driver_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  pickup_address TEXT NOT NULL,
  pickup_latitude REAL,
  pickup_longitude REAL,
  delivery_address TEXT NOT NULL,
  delivery_latitude REAL,
  delivery_longitude REAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  parcel_type TEXT,
  weight REAL,
  description TEXT,
  delivery_charge REAL NOT NULL,
  distance REAL,
  otp TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT,
  picked_up_at TEXT,
  delivered_at TEXT,
  FOREIGN KEY (shop_id) REFERENCES users(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- Parcel status history
CREATE TABLE IF NOT EXISTS parcel_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  commission REAL DEFAULT 0,
  driver_payout REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'completed', 'refunded', 'failed')),
  transaction_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  reviewee_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parcel_id) REFERENCES parcels(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id)
);

-- Reports / Issues
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id INTEGER,
  reporter_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'resolved', 'closed')),
  admin_note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (parcel_id) REFERENCES parcels(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

-- Wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('credit', 'debit', 'withdrawal', 'commission')),
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parcels_shop ON parcels(shop_id);
CREATE INDEX IF NOT EXISTS idx_parcels_driver ON parcels(driver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_tracking ON parcels(tracking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_parcel ON payments(parcel_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_online ON driver_profiles(is_online);
`;
