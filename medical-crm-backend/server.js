const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;

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
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { name, phone, blood_group } = req.body;
        const newPatient = await pool.query(
            'INSERT INTO patients (name, phone, blood_group) VALUES ($1, $2, $3) RETURNING *',
            [name, phone, blood_group]
        );
        res.json(newPatient.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- DOCTOR ROUTES ---
app.get('/api/doctors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM doctors');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- APPOINTMENT ROUTES ---
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
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date } = req.body;
        await pool.query(
            'INSERT INTO appointments (patient_id, doctor_id, appointment_date) VALUES ($1, $2, $3)',
            [patient_id, doctor_id, appointment_date]
        );
        res.json({ message: "Appointment booked successfully!" });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 1. NEW: PUT Route to UPDATE the status to 'Completed'
app.put('/api/appointments/:id/complete', async (req, res) => {
    try {
        const { id } = req.params; // Grab the specific ID from the URL
        
        await pool.query(
            "UPDATE appointments SET status = 'Completed' WHERE id = $1",
            [id]
        );
        
        res.json({ message: "Appointment marked as completed!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});