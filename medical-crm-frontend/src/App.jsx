import { useState, useEffect, useRef } from 'react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

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

  // AI Triage State
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // ==========================================
  // --- 1. NEW: 🎤 VOICE DICTATION STATE ---
  // ==========================================
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [dictatedText, setDictatedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const authHeaders = { 'Authorization': `Bearer ${token}` };
  const jsonAuthHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/patients', { headers: authHeaders })
        .then(res => res.json())
        .then(data => setPatients(data))
        .catch(err => console.error(err));
        
      fetch('http://localhost:5000/api/appointments', { headers: authHeaders })
        .then(res => res.json())
        .then(data => setAppointments(data))
        .catch(err => console.error(err));
        
      fetch('http://localhost:5000/api/doctors', { headers: authHeaders })
        .then(res => res.json())
        .then(data => setDoctors(data))
        .catch(err => console.error(err));
    }
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const url = isLoginMode ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/register';

    try {
      const response = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });
      const data = await response.json();
      if (!response.ok) { setAuthError(data.error || 'Something went wrong!'); return; }

      if (isLoginMode) {
        localStorage.setItem('token', data.token); 
        setToken(data.token);
      } else {
        alert("Registration successful! Please log in."); 
        setIsLoginMode(true);
      }
      setAuthUsername(''); setAuthPassword('');
    } catch (error) { setAuthError("Failed to connect to the server."); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(''); };

  // ==========================================
  // --- 2. NEW: 🎤 VOICE DICTATION FUNCTIONS ---
  // ==========================================
  const startListening = (patientId, currentNotes) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support AI Voice Dictation. Please use Google Chrome or Edge.");
      return;
    }

    setEditingPatientId(patientId);
    setDictatedText(currentNotes || '');
    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setDictatedText(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const saveNotes = async (patientId) => {
    try {
      await fetch(`http://localhost:5000/api/patients/${patientId}/notes`, {
        method: 'PUT',
        headers: jsonAuthHeaders,
        body: JSON.stringify({ notes: dictatedText })
      });
      // Refresh patients list silently
      const res = await fetch('http://localhost:5000/api/patients', { headers: authHeaders });
      const data = await res.json();
      setPatients(data);
      setEditingPatientId(null);
      stopListening();
    } catch (error) {
      console.error("Failed to save notes", error);
    }
  };

  const handleAITriage = async () => {
    if (!symptoms) { setAiMessage("Please enter symptoms first!"); return; }
    setIsAnalyzing(true);
    setAiMessage('Agentic AI is analyzing symptoms and searching database...');
    try {
      const response = await fetch('http://localhost:5000/api/triage', {
        method: 'POST', headers: jsonAuthHeaders, body: JSON.stringify({ symptoms }),
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedDoctor(data.doctor_id);
        setAiMessage(`✅ ${data.message}`);
      } else { setAiMessage(`❌ Error: ${data.error}`); }
    } catch (error) { setAiMessage("❌ Failed to connect to AI server."); } 
    finally { setIsAnalyzing(false); }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/patients', {
        method: 'POST', headers: jsonAuthHeaders, body: JSON.stringify({ name, phone, blood_group: bloodGroup }),
      });
      const addedPatient = await response.json();
      setPatients([...patients, addedPatient]);
      setName(''); setPhone(''); setBloodGroup('');
    } catch (error) { console.error("Error:", error); }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/appointments', {
        method: 'POST', headers: jsonAuthHeaders, body: JSON.stringify({ patient_id: selectedPatient, doctor_id: selectedDoctor, appointment_date: appointmentDate }),
      });
      const refresh = await fetch('http://localhost:5000/api/appointments', { headers: authHeaders });
      const updatedAppointments = await refresh.json();
      setAppointments(updatedAppointments);
      setSelectedPatient(''); setSelectedDoctor(''); setAppointmentDate('');
      setSymptoms(''); setAiMessage('');
    } catch (error) { console.error("Error:", error); }
  };

  const handleCompleteAppointment = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/appointments/${id}/complete`, { method: 'PUT', headers: authHeaders });
      const refresh = await fetch('http://localhost:5000/api/appointments', { headers: authHeaders });
      const updatedAppointments = await refresh.json();
      setAppointments(updatedAppointments);
    } catch (error) { console.error("Error:", error); }
  };

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return patient.name.toLowerCase().includes(searchLower) || patient.phone.includes(searchLower);
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-center text-gray-500 mb-8">{isLoginMode ? 'Enter your credentials to access the CRM' : 'Register as a new hospital staff member'}</p>
          {authError && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center mb-6">{authError}</div>}
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Username</label>
              <input type="text" required value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="e.g., admin" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Password</label>
              <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">{isLoginMode ? 'Sign In' : 'Register Staff'}</button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-600">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} className="text-blue-600 font-semibold hover:underline outline-none">{isLoginMode ? 'Register here' : 'Login here'}</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-white font-bold text-xl">+</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Hospital CRM</h1>
          </div>
          <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-6 rounded-lg transition-colors border border-red-100">Logout</button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-100 text-white"><h3 className="text-blue-100 font-medium mb-1">Total Patients</h3><p className="text-4xl font-bold">{patients.length}</p></div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-lg shadow-purple-100 text-white"><h3 className="text-purple-100 font-medium mb-1">Total Doctors</h3><p className="text-4xl font-bold">{doctors.length}</p></div>
          <div className="bg-gradient-to-br from-orange-400 to-red-500 p-6 rounded-2xl shadow-lg shadow-orange-100 text-white"><h3 className="text-orange-100 font-medium mb-1">Appointments</h3><p className="text-4xl font-bold">{appointments.length}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">Register New Patient</h3>
            <form onSubmit={handlePatientSubmit} className="flex flex-col gap-4">
              <input type="text" placeholder="Patient Name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <div className="flex gap-4">
                <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-2/3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <input type="text" placeholder="Blood Group (O+)" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required className="w-1/3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <button type="submit" className="mt-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-colors">Register Patient</button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Book Appointment</h3>
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <label className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2"><span>✨ AI Triage Assistant</span></label>
              <textarea placeholder="Describe patient symptoms here (e.g., severe migraines and blurry vision)..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none h-20 text-sm mb-3" />
              <button type="button" onClick={handleAITriage} disabled={isAnalyzing} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all disabled:opacity-70 text-sm flex justify-center items-center">
                {isAnalyzing ? "🧠 AI is analyzing..." : "Auto-Assign Specialist"}
              </button>
              {aiMessage && <div className="mt-3 text-sm font-medium text-indigo-800 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">{aiMessage}</div>}
            </div>
            <form onSubmit={handleAppointmentSubmit} className="flex flex-col gap-4">
              <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none">
                <option value="" disabled>Select a Patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
              </select>
              <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none">
                <option value="" disabled>Select a Doctor...</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} - {d.specialty}</option>)}
              </select>
              <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md shadow-blue-200">Book Appointment</button>
            </form>
          </div>
        </div>

        {/* ========================================== */}
        {/* --- 3. NEW: 🎤 VOICE ENABLED DIRECTORY --- */}
        {/* ========================================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-10">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">Patient Directory & Medical Notes</h2>
            <input type="text" placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-72 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Blood Group</th>
                  <th className="px-6 py-4 font-semibold w-1/2">Medical Notes (AI Voice Scribe)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors align-top">
                    <td className="px-6 py-4 font-medium text-slate-800">{patient.name} <br/><span className="text-xs text-slate-400">ID: {patient.id} | {patient.phone}</span></td>
                    <td className="px-6 py-4"><span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-bold">{patient.blood_group}</span></td>
                    <td className="px-6 py-4">
                      {editingPatientId === patient.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea 
                            value={dictatedText} 
                            onChange={(e) => setDictatedText(e.target.value)} 
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[100px] text-sm bg-blue-50"
                            placeholder="Click the microphone to speak, or type manually..."
                          />
                          <div className="flex gap-2">
                            {isListening ? (
                              <button onClick={stopListening} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition animate-pulse">
                                🛑 Stop Recording
                              </button>
                            ) : (
                              <button onClick={() => startListening(patient.id, dictatedText)} className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition">
                                🎤 Start Dictation
                              </button>
                            )}
                            <button onClick={() => saveNotes(patient.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition">
                              💾 Save Note
                            </button>
                            <button onClick={() => { setEditingPatientId(null); stopListening(); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start group">
                          <p className="text-slate-600 text-sm whitespace-pre-wrap">{patient.notes || <span className="italic text-gray-400">No notes yet...</span>}</p>
                          <button onClick={() => { setEditingPatientId(patient.id); setDictatedText(patient.notes || ''); }} className="ml-4 opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-1.5 px-3 rounded transition flex-shrink-0">
                            ✏️ Edit / Dictate
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPatients.length === 0 && <div className="p-8 text-center text-slate-500">No patients found.</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-10">
          <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-slate-800">Upcoming Appointments</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider"><th className="px-6 py-4 font-semibold">Appt ID</th><th className="px-6 py-4 font-semibold">Patient Name</th><th className="px-6 py-4 font-semibold">Doctor</th><th className="px-6 py-4 font-semibold">Date</th><th className="px-6 py-4 font-semibold">Status</th><th className="px-6 py-4 font-semibold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 text-slate-500">#{appt.id}</td><td className="px-6 py-4 font-medium text-slate-800">{appt.patient_name}</td><td className="px-6 py-4 text-slate-600">{appt.doctor_name}</td><td className="px-6 py-4 text-slate-600">{new Date(appt.appointment_date).toLocaleDateString()}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm font-bold ${appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{appt.status}</span></td><td className="px-6 py-4">{appt.status !== 'Completed' && (<button onClick={() => handleCompleteAppointment(appt.id)} className="bg-white border border-gray-200 hover:border-green-500 hover:text-green-600 text-gray-600 font-semibold py-1.5 px-4 rounded-lg transition-colors text-sm shadow-sm">Mark Complete</button>)}</td></tr>
                ))}
              </tbody>
            </table>
            {appointments.length === 0 && <div className="p-8 text-center text-slate-500">No appointments scheduled.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;