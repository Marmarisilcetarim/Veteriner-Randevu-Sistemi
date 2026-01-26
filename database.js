const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'appointments.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  // Create appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_number TEXT UNIQUE NOT NULL,
      appointment_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      country TEXT,
      animal_type TEXT NOT NULL,
      animal_count INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating appointments table:', err.message);
    } else {
      console.log('Appointments table ready');
    }
  });

  // Create holidays table
  db.run(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT NOT NULL UNIQUE,
      holiday_name TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating holidays table:', err.message);
    } else {
      console.log('Holidays table ready');
      seedHolidays();
    }
  });
}

// Seed initial holidays (2026 Turkish public holidays)
function seedHolidays() {
  const holidays = [
    { date: '2026-01-01', name: 'Yılbaşı' },
    { date: '2026-03-31', name: 'Ramazan Bayramı 1. Gün' },
    { date: '2026-04-01', name: 'Ramazan Bayramı 2. Gün' },
    { date: '2026-04-02', name: 'Ramazan Bayramı 3. Gün' },
    { date: '2026-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { date: '2026-05-01', name: 'İşçi Bayramı' },
    { date: '2026-05-19', name: 'Gençlik ve Spor Bayramı' },
    { date: '2026-06-07', name: 'Kurban Bayramı 1. Gün' },
    { date: '2026-06-08', name: 'Kurban Bayramı 2. Gün' },
    { date: '2026-06-09', name: 'Kurban Bayramı 3. Gün' },
    { date: '2026-06-10', name: 'Kurban Bayramı 4. Gün' },
    { date: '2026-07-15', name: 'Demokrasi ve Milli Birlik Günü' },
    { date: '2026-08-30', name: 'Zafer Bayramı' },
    { date: '2026-10-29', name: 'Cumhuriyet Bayramı' }
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO holidays (holiday_date, holiday_name) VALUES (?, ?)');
  holidays.forEach(holiday => {
    stmt.run(holiday.date, holiday.name);
  });
  stmt.finalize();
}

module.exports = db;
