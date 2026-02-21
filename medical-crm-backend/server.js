const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// --- 1. NEW: Import the Security Tools ---
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

// This is the master key that locks and unlocks your JWT badges.
// (In a real enterprise app, this is hidden in a secret file!)
const SECRET_KEY = "super_secret_hospital_key"; 

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_crm',
    password: '',
    port: 5432,
});

// --- PATIENT ROUTES ---
app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients');
        res.json(result.rows); 
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { name, phone, blood_group } = req.body;
        const newPatient = await pool.query(
            'INSERT INTO patients (name, phone, blood_group) VALUES ($1, $2, $3) RETURNING *',
            [name, phone, blood_group]
        );
        res.json(newPatient.rows[0]);
    } catch (err) { res.status(500).send('Server Error'); }
});

// --- DOCTOR & APPOINTMENT ROUTES ---
app.get('/api/doctors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctors');
        res.json(result.rows);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const query = `
            SELECT appointments.id, patients.name AS patient_name, doctors.name AS doctor_name, appointments.appointment_date, appointments.status
            FROM appointments
            JOIN patients ON appointments.patient_id = patients.id
            JOIN doctors ON appointments.doctor_id = doctors.id
            ORDER BY appointments.appointment_date ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date } = req.body;
        await pool.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date) VALUES ($1, $2, $3)', [patient_id, doctor_id, appointment_date]);
        res.json({ message: "Appointment booked successfully!" });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.put('/api/appointments/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE appointments SET status = 'Completed' WHERE id = $1", [id]);
        res.json({ message: "Appointment marked as completed!" });
    } catch (err) { res.status(500).send('Server Error'); }
});

// ==========================================
// --- 2. NEW: AUTHENTICATION ROUTES ---
// ==========================================

// Route A: Register a new staff member
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Scramble the password using bcrypt (10 "salt rounds" makes it very secure)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the scrambled password to the database
        const newUser = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );

        res.json({ message: "Staff member registered successfully!", user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error (Username might already exist)');
    }
});

// Route B: Login for existing staff
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Check if the user exists in the database
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "User not found!" });
        }
        
        const user = userResult.rows[0];

        // 2. Compare the typed password with the scrambled one in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Incorrect password!" });
        }

        // 3. If correct, generate the digital ID badge (JWT)
        const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });

        // Send the badge back to React!
        res.json({ message: "Login successful!", token: token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Secured Server is running beautifully on http://localhost:${PORT}`);
});