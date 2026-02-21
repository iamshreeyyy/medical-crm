import { useState, useEffect } from 'react';

function App() {
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

  useEffect(() => {
    fetch('http://localhost:5000/api/patients').then(res => res.json()).then(data => setPatients(data));
    fetch('http://localhost:5000/api/appointments').then(res => res.json()).then(data => setAppointments(data));
    fetch('http://localhost:5000/api/doctors').then(res => res.json()).then(data => setDoctors(data));
  }, []);

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

  // 1. NEW: Function to Mark Appointment as Completed
  const handleCompleteAppointment = async (id) => {
    try {
      // Send the PUT request to update the database
      await fetch(`http://localhost:5000/api/appointments/${id}/complete`, {
        method: 'PUT',
      });

      // Refresh the appointments list instantly
      const refresh = await fetch('http://localhost:5000/api/appointments');
      const updatedAppointments = await refresh.json();
      setAppointments(updatedAppointments);
    } catch (error) {
      console.error("Error completing appointment:", error);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return patient.name.toLowerCase().includes(searchLower) || patient.phone.includes(searchLower);
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>Hospital CRM Dashboard</h1>
      
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
                {/* 2. NEW: Conditional CSS based on the status! */}
                <span style={{ 
                  padding: '5px 10px', 
                  backgroundColor: appt.status === 'Completed' ? '#d4edda' : '#fff3cd', 
                  color: appt.status === 'Completed' ? '#155724' : '#856404', 
                  borderRadius: '15px', fontSize: '14px', fontWeight: 'bold' 
                }}>
                  {appt.status}
                </span>
              </td>
              <td>
                {/* 3. NEW: The Complete Button. It only shows up if the status is NOT completed yet. */}
                {appt.status !== 'Completed' && (
                  <button 
                    onClick={() => handleCompleteAppointment(appt.id)} 
                    style={{ padding: '5px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  >
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