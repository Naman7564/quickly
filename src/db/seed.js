require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb } = require('./connection');
const { initDatabase } = require('./init');

async function seed() {
  await initDatabase();
  const db = await getDb();

  // Seed admin user
  const adminExists = db.exec("SELECT id FROM users WHERE role='admin'");
  if (adminExists.length === 0 || adminExists[0].values.length === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    db.run(
      `INSERT INTO users (uuid, email, password, full_name, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, 'admin', 1, 1)`,
      [uuidv4(), process.env.ADMIN_EMAIL || 'admin@quickly.com', hash, 'Admin', '9999999999']
    );
    console.log('Admin user created');
  }

  // Seed delivery zones
  const zonesExist = db.exec("SELECT id FROM delivery_zones");
  if (zonesExist.length === 0 || zonesExist[0].values.length === 0) {
    const zones = [
      ['Central Zone', 'City Center', 30, 10],
      ['North Zone', 'City North', 35, 12],
      ['South Zone', 'City South', 35, 12],
      ['East Zone', 'City East', 40, 14],
      ['West Zone', 'City West', 40, 14]
    ];
    zones.forEach(z => {
      db.run(
        'INSERT INTO delivery_zones (name, city, base_charge, per_km_charge) VALUES (?, ?, ?, ?)',
        z
      );
    });
    console.log('Delivery zones seeded');
  }

  // Seed settings
  const settingsExist = db.exec("SELECT id FROM settings");
  if (settingsExist.length === 0 || settingsExist[0].values.length === 0) {
    const settings = [
      ['app_name', 'Quickly'],
      ['currency', 'INR'],
      ['commission_rate', '15'],
      ['otp_required', 'true'],
      ['max_parcel_weight', '50'],
      ['support_email', 'support@quickly.com'],
      ['support_phone', '9999999999']
    ];
    settings.forEach(s => {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', s);
    });
    console.log('Settings seeded');
  }

  // Seed demo shop owner
  const shopExists = db.exec("SELECT id FROM users WHERE email='shop@demo.com'");
  if (shopExists.length === 0 || shopExists[0].values.length === 0) {
    const hash = bcrypt.hashSync('demo123', 10);
    const uuid = uuidv4();
    db.run(
      `INSERT INTO users (uuid, email, password, full_name, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, 'shop_owner', 1, 1)`,
      [uuid, 'shop@demo.com', hash, 'Demo Shop', '9876543210']
    );
    const userId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    db.run(
      `INSERT INTO shop_profiles (user_id, shop_name, shop_address, shop_type, city)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, 'Demo General Store', '123 Main Street', 'General Store', 'City Center']
    );
    console.log('Demo shop owner created');
  }

  // Seed demo driver
  const driverExists = db.exec("SELECT id FROM users WHERE email='driver@demo.com'");
  if (driverExists.length === 0 || driverExists[0].values.length === 0) {
    const hash = bcrypt.hashSync('demo123', 10);
    const uuid = uuidv4();
    db.run(
      `INSERT INTO users (uuid, email, password, full_name, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, 'driver', 1, 1)`,
      [uuid, 'driver@demo.com', hash, 'Demo Driver', '9876543211']
    );
    const userId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    db.run(
      `INSERT INTO driver_profiles (user_id, vehicle_type, vehicle_number, license_number, is_approved)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, 'auto', 'KA-01-AB-1234', 'DL1234567890']
    );
    console.log('Demo driver created');
  }

  saveDb();
  console.log('Database seeded successfully');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
