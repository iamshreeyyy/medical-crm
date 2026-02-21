const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- AI SETUP ---
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Put your actual Gemini API key inside the quotes below!
const genAI = new GoogleGenerativeAI('AIzaSyDzUTfckQfr5HFH0BGr8lHBYmV7NxIkRYg'); 

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

// --- THE BOUNCER (MIDDLEWARE) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided!" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Access Denied: Invalid Token!" });
        req.user = user;
        next(); 
    });
};

// --- PROTECTED MEDICAL ROUTES ---
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



// --- AI TRIAGE ROUTE ---
app.post('/api/triage', authenticateToken, async (req, res) => {
    try {
        const { symptoms } = req.body;
        
        const docResult = await pool.query('SELECT DISTINCT specialty FROM doctors');
        const specialties = docResult.rows.map(r => r.specialty).join(', ');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `You are an AI medical triage routing agent. Match these patient symptoms: "${symptoms}" to the most appropriate medical specialty from this exact list: [${specialties}]. Reply with ONLY the exact name of the specialty, nothing else.`;
        
        const aiResult = await model.generateContent(prompt);
        const recommendedSpecialty = aiResult.response.text().trim(); 

        const targetDoctor = await pool.query('SELECT * FROM doctors WHERE specialty = $1 LIMIT 1', [recommendedSpecialty]);

        if (targetDoctor.rows.length > 0) {
            res.json({ doctor_id: targetDoctor.rows[0].id, specialty: recommendedSpecialty, message: `AI routed to ${recommendedSpecialty} based on symptoms.` });
        } else {
            res.status(404).json({ error: "No available doctors for this specialty." });
        }
    } catch (error) {
        console.error("AI Triage Error:", error);
        res.status(500).json({ error: "AI Triage Failed" });
    }
});

// --- PUBLIC AUTHENTICATION ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username', [username, hashedPassword]);
        res.json({ message: "Staff member registered successfully!", user: newUser.rows[0] });
    } catch (err) { res.status(500).send('Server Error (Username might already exist)'); }
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
    } catch (err) { res.status(500).send('Server Error'); }
});
// --- NEW: UPDATE PATIENT NOTES ---
app.put('/api/patients/:id/notes', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        await pool.query(
            "UPDATE patients SET notes = $1 WHERE id = $2",
            [notes, id]
        );
        
        res.json({ message: "Patient notes updated successfully!" });
    } catch (err) { 
        console.error(err.message);
        res.status(500).send('Server Error updating notes'); 
    }
});
app.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});