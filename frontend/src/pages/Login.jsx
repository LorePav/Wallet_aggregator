import React, { useState } from 'react';
import axios from 'axios';
import '../index.css';

const Login = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Test the password against the backend
      await axios.get('http://localhost:8000/', {
        headers: {
          'x-api-password': password
        }
      });
      // se ok, lo salviamo in locale
      localStorage.setItem('api_password', password);
      
      // configuriamo subito l'istanza axios in modo globale
      axios.defaults.headers.common['x-api-password'] = password;
      
      onLoginSuccess();
    } catch (err) {
      setError('Password non valida o server irraggiungibile.');
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', background: 'var(--bg-color)'
    }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Wallet Aggregator</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
          Inserisci la Master Password per accedere al portafoglio
        </p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}
              title={showPassword ? "Nascondi password" : "Mostra password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="custom-button primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 'bold' }}>Accedi</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
