import { useState, useEffect } from 'react';

function App() {
  // ==========================================
  // --- 1. NEW: AUTHENTICATION STATE ---
  // ==========================================
  // Check if we already have a saved token in the browser's memory
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  
  // States for the Login/Register form
  const [isLoginMode, setIsLoginMode] = useState(true); // Toggle between Login and Register
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // --- EXISTING DASHBOARD STATE ---
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]); 

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  // --- FETCH DATA (Only if logged in!) ---
  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/patients').then(res => res.json()).then(data => setPatients(data));
      fetch('http://localhost:5000/api/appointments').then(res => res.json()).then(data => setAppointments(data));
      fetch('http://localhost:5000/api/doctors').then(res => res.json()).then(data => setDoctors(data));
    }
  }, [token]); // The [token] here means: "Run this fetch again if the token changes"

  // ==========================================
  // --- 2. NEW: AUTHENTICATION FUNCTIONS ---
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(''); // Clear any old errors

    // Decide which URL to call based on the mode
    const url = isLoginMode ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/register';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Something went wrong!');
        return;
      }

      if (isLoginMode) {
        // We logged in successfully! Save the badge to the browser and React state
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        // We registered successfully! Switch to login mode so they can log in
        alert("Registration successful! Please log in.");
        setIsLoginMode(true);
      }
      
      // Clear the form boxes
      setAuthUsername('');
      setAuthPassword('');

    } catch (error) {
      setAuthError("Failed to connect to the server.");
    }
  };

  const handleLogout = () => {
    // Delete the badge and kick them back to the login screen
    localStorage.removeItem('token');
    setToken('');
  };

  // --- EXISTING DASHBOARD FUNCTIONS ---
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    const newPatientData = { name, phone, blood_group: bloodGroup };
    try {
      const response = await fetch('http://localhost:5000/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPatientData),
      });
      const addedPatient = await response.json();
      setPatients([...patients, addedPatient]);
      setName(''); setPhone(''); setBloodGroup('');
    } catch (error) { console.error("Error:", error); }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    const newAppointmentData = { patient_id: selectedPatient, doctor_id: selectedDoctor, appointment_date: appointmentDate };
    try {
      await fetch('http://localhost:5000/api/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAppointmentData),
      });
      const refresh = await fetch('http://localhost:5000/api/appointments');
      const updatedAppointments = await refresh.json();
      setAppointments(updatedAppointments);
      setSelectedPatient(''); setSelectedDoctor(''); setAppointmentDate('');
    } catch (error) { console.error("Error:", error); }
  };

  const handleCompleteAppointment = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/appointments/${id}/complete`, { method: 'PUT' });
      const refresh = await fetch('http://localhost:5000/api/appointments');
      const updatedAppointments = await refresh.json();
      setAppointments(updatedAppointments);
    } catch (error) { console.error("Error:", error); }
  };

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return patient.name.toLowerCase().includes(searchLower) || patient.phone.includes(searchLower);
  });

  // ==========================================
  // --- 3. CONDITIONAL RENDERING ---
  // ==========================================

  // If there is NO token, show the Login Screen
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '350px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
            {isLoginMode ? 'Hospital CRM Login' : 'Register Staff Account'}
          </h2>
          
          {authError && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>{authError}</p>}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" placeholder="Username" required value={authUsername} 
              onChange={(e) => setAuthUsername(e.target.value)} 
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
            <input 
              type="password" placeholder="Password" required value={authPassword} 
              onChange={(e) => setAuthPassword(e.target.value)} 
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
            <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {isLoginMode ? 'Login' : 'Register'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', color: '#666' }}>
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} 
              style={{ color: '#007BFF', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLoginMode ? 'Register here' : 'Login here'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // If there IS a token, show the Medical Dashboard
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* --- HEADER WITH LOGOUT BUTTON --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>Hospital CRM Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      
      {/* Analytics Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#e0f7fa', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#006064' }}>Total Patients</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#00838f' }}>{patients.length}</p>
        </div>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4a148c' }}>Total Doctors</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#6a1b9a' }}>{doctors.length}</p>
        </div>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#e65100' }}>Appointments</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#ef6c00' }}>{appointments.length}</p>
        </div>
      </div>

      {/* Forms */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
          <h3>Register New Patient</h3>
          <form onSubmit={handlePatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Patient Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '8px' }}/>
            <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ padding: '8px' }}/>
            <input type="text" placeholder="Blood Group (e.g., O+)" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required style={{ padding: '8px' }}/>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Add Patient</button>
          </form>
        </div>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
          <h3>Book Appointment</h3>
          <form onSubmit={handleAppointmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} required style={{ padding: '8px' }}>
              <option value="" disabled>Select a Patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
            </select>
            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} required style={{ padding: '8px' }}>
              <option value="" disabled>Select a Doctor...</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name} - {d.specialty}</option>)}
            </select>
            <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required style={{ padding: '8px' }}/>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Book Appointment</button>
          </form>
        </div>
      </div>

      {/* Search & Patients */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
        <h2>Patient Directory</h2>
        <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }} />
      </div>
      <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
        <thead style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
          <tr><th>ID</th><th>Name</th><th>Phone</th><th>Blood Group</th></tr>
        </thead>
        <tbody>
          {filteredPatients.map((patient) => (
            <tr key={patient.id}>
              <td>{patient.id}</td><td>{patient.name}</td><td>{patient.phone}</td><td>{patient.blood_group}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredPatients.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>No patients found.</p>}

      {/* Appointments */}
      <h2 style={{ marginTop: '50px' }}>Upcoming Appointments</h2>
      <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
        <thead style={{ backgroundColor: '#e6f7ff', textAlign: 'left' }}>
          <tr><th>Appt ID</th><th>Patient Name</th><th>Doctor</th><th>Date</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {appointments.map((appt) => (
            <tr key={appt.id}>
              <td>{appt.id}</td>
              <td>{appt.patient_name}</td>
              <td>{appt.doctor_name}</td>
              <td>{new Date(appt.appointment_date).toLocaleDateString()}</td>
              <td>
                <span style={{ 
                  padding: '5px 10px', backgroundColor: appt.status === 'Completed' ? '#d4edda' : '#fff3cd', 
                  color: appt.status === 'Completed' ? '#155724' : '#856404', 
                  borderRadius: '15px', fontSize: '14px', fontWeight: 'bold' 
                }}>
                  {appt.status}
                </span>
              </td>
              <td>
                {appt.status !== 'Completed' && (
                  <button onClick={() => handleCompleteAppointment(appt.id)} style={{ padding: '5px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                    Mark Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {appointments.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>No appointments scheduled.</p>}

    </div>
  );
}

export default App;