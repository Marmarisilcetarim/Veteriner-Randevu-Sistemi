const { Pool } = require('pg');

// Render'dan gelecek ortam değişkeni (Environment variable) üzerinden bağlanıyoruz
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect()
  .then(() => {
    console.log('PostgreSQL (Supabase) veritabanina baglanildi');
    initializeDatabase();
  })
  .catch(err => console.error('Veritabanina baglanirken hata:', err.stack));

async function initializeDatabase() {
  try {
    // Randevular tablosu
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        appointment_number VARCHAR(255) UNIQUE NOT NULL,
        appointment_type VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        country VARCHAR(255),
        animal_type VARCHAR(255) NOT NULL,
        animal_count INTEGER NOT NULL,
        appointment_date VARCHAR(255) NOT NULL,
        appointment_time VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Appointments tablosu hazir');

    // Tatiller tablosu
    await db.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        holiday_date VARCHAR(255) NOT NULL UNIQUE,
        holiday_name VARCHAR(255) NOT NULL
      )
    `);
    console.log('Holidays tablosu hazir');

    // Tatilleri ekle (Varsa atlar)
    seedHolidays();
  } catch (err) {
    console.error('Veritabani tablolarini olustururken hata:', err.message);
  }
}

async function seedHolidays() {
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

  for (const holiday of holidays) {
    await db.query(
      'INSERT INTO holidays (holiday_date, holiday_name) VALUES ($1, $2) ON CONFLICT (holiday_date) DO NOTHING',
      [holiday.date, holiday.name]
    );
  }
}

module.exports = db;
