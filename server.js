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
async function generateAppointmentNumber() {
    const result = await db.query('SELECT MAX(id) as max_id FROM appointments');
    const nextId = (result.rows[0].max_id || 0) + 1;
    return `RND48${String(nextId).padStart(5, '0')}`;
}

// Helper function to check if date is weekend
function isWeekend(dateString) {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// API Routes

// Check if a date is available (not weekend or holiday)
app.get('/api/check-date', async (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    if (isWeekend(date)) {
        return res.json({ available: false, reason: 'weekend' });
    }

    try {
        const result = await db.query('SELECT * FROM holidays WHERE holiday_date = $1', [date]);
        if (result.rows.length > 0) {
            return res.json({
                available: false,
                reason: 'holiday',
                holidayName: result.rows[0].holiday_name
            });
        }
        res.json({ available: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get available time slots for a specific date
app.get('/api/available-slots', async (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    try {
        const result = await db.query(
            'SELECT appointment_time FROM appointments WHERE appointment_date = $1 AND status = $2',
            [date, 'active']
        );
        const bookedSlots = result.rows.map(row => row.appointment_time);
        const availableSlots = TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));

        res.json({ availableSlots, bookedSlots });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new appointment
app.post('/api/appointments', async (req, res) => {
    const {
        appointmentType, fullName, phone, country,
        animalType, animalCount, appointmentDate, appointmentTime
    } = req.body;

    if (!appointmentType || !fullName || !phone || !animalType || !animalCount || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (appointmentType === 'health_certificate' && !country) {
        return res.status(400).json({ error: 'Country is required for health certificate' });
    }
    if (!TIME_SLOTS.includes(appointmentTime)) {
        return res.status(400).json({ error: 'Invalid time slot' });
    }

    try {
        const checkConflict = await db.query(
            'SELECT * FROM appointments WHERE appointment_date = $1 AND appointment_time = $2 AND status = $3',
            [appointmentDate, appointmentTime, 'active']
        );

        if (checkConflict.rows.length > 0) {
            return res.status(409).json({ error: 'This time slot is already booked' });
        }

        const appointmentNumber = await generateAppointmentNumber();

        await db.query(
            `INSERT INTO appointments 
            (appointment_number, appointment_type, full_name, phone, country, animal_type, animal_count, appointment_date, appointment_time, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [appointmentNumber, appointmentType, fullName, phone, country || null, animalType, animalCount, appointmentDate, appointmentTime, 'active']
        );

        res.json({
            success: true,
            appointmentNumber,
            message: 'Appointment created successfully'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});

// Get appointment by number
app.get('/api/appointments/:number', async (req, res) => {
    const { number } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM appointments WHERE appointment_number = $1 AND status = $2',
            [number, 'active']
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Cancel appointment
app.post('/api/appointments/:number/cancel', async (req, res) => {
    const { number } = req.params;
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        const result = await db.query(
            'SELECT * FROM appointments WHERE appointment_number = $1 AND status = $2',
            [number, 'active']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (result.rows[0].phone !== phone) {
            return res.status(403).json({ error: 'Phone number does not match' });
        }

        await db.query(
            'UPDATE appointments SET status = $1 WHERE appointment_number = $2',
            ['cancelled', number]
        );
        res.json({ success: true, message: 'Appointment cancelled successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-authenticated' });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get all appointments (admin only)
app.get('/api/admin/appointments', async (req, res) => {
    const { status } = req.query;
    try {
        let query = 'SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC';
        let params = [];
        if (status) {
            query = 'SELECT * FROM appointments WHERE status = $1 ORDER BY appointment_date DESC, appointment_time DESC';
            params = [status];
        }
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Update appointment (admin only)
app.put('/api/admin/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName, phone, country, animalType, animalCount, appointmentDate, appointmentTime } = req.body;

    try {
        const result = await db.query(
            `UPDATE appointments
             SET full_name = $1, phone = $2, country = $3, animal_type = $4, animal_count = $5, appointment_date = $6, appointment_time = $7
             WHERE id = $8`,
            [fullName, phone, country, animalType, animalCount, appointmentDate, appointmentTime, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json({ success: true, message: 'Appointment updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Delete appointment (admin only)
app.delete('/api/admin/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM appointments WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
