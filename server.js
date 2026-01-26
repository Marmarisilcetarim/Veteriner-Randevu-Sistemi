const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Admin password
const ADMIN_PASSWORD = 'Marmaris4848*';

// Available time slots
const TIME_SLOTS = [
    '10:00', '10:30', '11:00', '11:30', '12:00',
    '14:00', '14:30', '15:00', '15:30', '16:00'
];

// Helper function to generate appointment number
function generateAppointmentNumber() {
    return new Promise((resolve, reject) => {
        db.get('SELECT MAX(id) as maxId FROM appointments', (err, row) => {
            if (err) {
                reject(err);
            } else {
                const nextId = (row.maxId || 0) + 1;
                // User requested RND4800001 format (5 digits padding after RND48)
                const appointmentNumber = `RND48${String(nextId).padStart(5, '0')}`;
                resolve(appointmentNumber);
            }
        });
    });
}

// Helper function to check if date is weekend
function isWeekend(dateString) {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// API Routes

// Check if a date is available (not weekend or holiday)
app.get('/api/check-date', (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Check if weekend
    if (isWeekend(date)) {
        return res.json({
            available: false,
            reason: 'weekend'
        });
    }

    // Check if holiday
    db.get('SELECT * FROM holidays WHERE holiday_date = ?', [date], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
            return res.json({
                available: false,
                reason: 'holiday',
                holidayName: row.holiday_name
            });
        }

        res.json({ available: true });
    });
});

// Get available time slots for a specific date
app.get('/api/available-slots', (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get all active appointments for this date
    db.all(
        'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status = ?',
        [date, 'active'],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            const bookedSlots = rows.map(row => row.appointment_time);
            const availableSlots = TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));

            res.json({
                availableSlots,
                bookedSlots
            });
        }
    );
});

// Create new appointment
app.post('/api/appointments', async (req, res) => {
    const {
        appointmentType,
        fullName,
        phone,
        country,
        animalType,
        animalCount,
        appointmentDate,
        appointmentTime
    } = req.body;

    // Validation
    if (!appointmentType || !fullName || !phone || !animalType || !animalCount || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (appointmentType === 'health_certificate' && !country) {
        return res.status(400).json({ error: 'Country is required for health certificate' });
    }

    // Check if time slot is valid
    if (!TIME_SLOTS.includes(appointmentTime)) {
        return res.status(400).json({ error: 'Invalid time slot' });
    }

    // Check for conflicts
    db.get(
        'SELECT * FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status = ?',
        [appointmentDate, appointmentTime, 'active'],
        async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(409).json({ error: 'This time slot is already booked' });
            }

            try {
                // Generate appointment number
                const appointmentNumber = await generateAppointmentNumber();

                // Insert appointment
                db.run(
                    `INSERT INTO appointments 
          (appointment_number, appointment_type, full_name, phone, country, animal_type, animal_count, appointment_date, appointment_time, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [appointmentNumber, appointmentType, fullName, phone, country || null, animalType, animalCount, appointmentDate, appointmentTime, 'active'],
                    function (err) {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to create appointment' });
                        }

                        res.json({
                            success: true,
                            appointmentNumber,
                            message: 'Appointment created successfully'
                        });
                    }
                );
            } catch (error) {
                res.status(500).json({ error: 'Failed to generate appointment number' });
            }
        }
    );
});

// Get appointment by number
app.get('/api/appointments/:number', (req, res) => {
    const { number } = req.params;

    db.get(
        'SELECT * FROM appointments WHERE appointment_number = ? AND status = ?',
        [number, 'active'],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Appointment not found' });
            }

            res.json(row);
        }
    );
});

// Cancel appointment
app.post('/api/appointments/:number/cancel', (req, res) => {
    const { number } = req.params;
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    // Verify phone number matches
    db.get(
        'SELECT * FROM appointments WHERE appointment_number = ? AND status = ?',
        [number, 'active'],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Appointment not found' });
            }

            if (row.phone !== phone) {
                return res.status(403).json({ error: 'Phone number does not match' });
            }

            // Cancel appointment
            db.run(
                'UPDATE appointments SET status = ? WHERE appointment_number = ?',
                ['cancelled', number],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to cancel appointment' });
                    }

                    res.json({ success: true, message: 'Appointment cancelled successfully' });
                }
            );
        }
    );
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        res.json({
            success: true,
            token: 'admin-authenticated' // Simple token for demo
        });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get all appointments (admin only)
app.get('/api/admin/appointments', (req, res) => {
    const { status } = req.query;

    let query = 'SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC';
    let params = [];

    if (status) {
        query = 'SELECT * FROM appointments WHERE status = ? ORDER BY appointment_date DESC, appointment_time DESC';
        params = [status];
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(rows);
    });
});

// Update appointment (admin only)
app.put('/api/admin/appointments/:id', (req, res) => {
    const { id } = req.params;
    const {
        fullName,
        phone,
        country,
        animalType,
        animalCount,
        appointmentDate,
        appointmentTime
    } = req.body;

    db.run(
        `UPDATE appointments 
    SET full_name = ?, phone = ?, country = ?, animal_type = ?, animal_count = ?, appointment_date = ?, appointment_time = ?
    WHERE id = ?`,
        [fullName, phone, country, animalType, animalCount, appointmentDate, appointmentTime, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update appointment' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Appointment not found' });
            }

            res.json({ success: true, message: 'Appointment updated successfully' });
        }
    );
});

// Delete appointment (admin only)
app.delete('/api/admin/appointments/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM appointments WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete appointment' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ success: true, message: 'Appointment deleted successfully' });
    });
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
