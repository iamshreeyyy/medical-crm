const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
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

// ==========================================
// --- 1. NEW: THE BOUNCER (MIDDLEWARE) ---
// ==========================================
const authenticateToken = (req, res, next) => {
    // 1. Look for the badge in the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // It comes in as "Bearer <token>"

    // 2. If there is no badge, kick them out (401 Unauthorized)
    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided!" });

    // 3. If there is a badge, verify it isn't fake or expired
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Access Denied: Invalid Token!" });
        
        // 4. Badge is good! Let them pass to the database route
        req.user = user;
        next(); 
    });
};

// ==========================================
// --- 2. PROTECTED MEDICAL ROUTES ---
// Notice how we put "authenticateToken" in the middle of every route!
// ==========================================

app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients');
        res.json(result.rows); 
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
    try {
        const { name, phone, blood_group } = req.body;
        const newPatient = await pool.query(
            'INSERT INTO patients (name, phone, blood_group) VALUES ($1, $2, $3) RETURNING *',
            [name, phone, blood_group]
        );
        res.json(newPatient.rows[0]);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/doctors', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctors');
        res.json(result.rows);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
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

app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date } = req.body;
        await pool.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date) VALUES ($1, $2, $3)', [patient_id, doctor_id, appointment_date]);
        res.json({ message: "Appointment booked successfully!" });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.put('/api/appointments/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE appointments SET status = 'Completed' WHERE id = $1", [id]);
        res.json({ message: "Appointment marked as completed!" });
    } catch (err) { res.status(500).send('Server Error'); }
});

// ==========================================
// --- PUBLIC AUTHENTICATION ROUTES ---
// (These DO NOT have the bouncer, because you need to access them to GET the badge!)
// ==========================================

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        res.json({ message: "Staff member registered successfully!", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).send('Server Error (Username might already exist)');
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) return res.status(401).json({ error: "User not found!" });
        
        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ error: "Incorrect password!" });

        const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: "Login successful!", token: token });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Fully Secured Server is running on http://localhost:${PORT}`);
});