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

const ADMIN_PASSWORD = 'Marmaris4848*';

const TIME_SLOTS = [
    '10:00', '10:30', '11:00', '11:30', '12:00',
    '14:00', '14:30', '15:00', '15:30', '16:00'
];

async function generateAppointmentNumber() {
    const result = await db.query('SELECT MAX(id
