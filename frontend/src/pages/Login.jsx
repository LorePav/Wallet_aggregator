import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../index.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isForgotPasswordMode) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (resetError) throw resetError;
        setMessage('Controlla la tua email per il link di ripristino!');
      } else if (isRegisterMode) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Controlla la tua email per confermare la registrazione!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || 'Errore durante l\'operazione');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(`Errore con il login ${provider}: ${err.message}`);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-color)', width: '100vw', margin: 0, padding: 0
    }}>
      <div className="glass-panel" style={{ padding: '2.5rem', width: '380px', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: '800' }}>Wallet Aggregator</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
          {isForgotPasswordMode ? 'Ripristina la tua password' : (isRegisterMode ? 'Crea il tuo account' : 'Accedi al tuo portafoglio')}
        </p>

        {!isForgotPasswordMode && (
          <>
            {/* OAuth Buttons */}
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button type="button" onClick={() => handleOAuthLogin('google')} className="panel-module" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>
                Google
              </button>
              <button type="button" onClick={() => handleOAuthLogin('twitter')} className="panel-module" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>
                X
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OPPURE</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>
          </>
        )}

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
              required
            />
          </div>

          {!isForgotPasswordMode && (
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}
              >
                {showPassword ? "Nascondi" : "Mostra"}
              </button>
            </div>
          )}

          {!isRegisterMode && !isForgotPasswordMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={() => { setIsForgotPasswordMode(true); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Password dimenticata?
              </button>
            </div>
          )}

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '0.5rem', background: 'rgba(255,0,0,0.1)', borderRadius: '6px' }}>{error}</p>}
          {message && <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '0.5rem', background: 'rgba(0,255,0,0.1)', borderRadius: '6px' }}>{message}</p>}

          <button type="submit" className="custom-button primary" disabled={loading} style={{ width: '100%', padding: '0.85rem', fontWeight: 'bold', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Attendere...' : (isForgotPasswordMode ? 'Invia link di recupero' : (isRegisterMode ? 'Registrati' : 'Accedi'))}
          </button>
        </form>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
          {isForgotPasswordMode ? 'Ti sei ricordato la password? ' : (isRegisterMode ? 'Hai già un account? ' : 'Non hai un account? ')}
          <button
            onClick={() => { setIsRegisterMode(isForgotPasswordMode ? false : !isRegisterMode); setIsForgotPasswordMode(false); setError(''); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontWeight: 'bold' }}
          >
            {isForgotPasswordMode ? 'Torna al Login' : (isRegisterMode ? 'Accedi' : 'Registrati')}
          </button>
        </p>

      </div>
    </div>
  );
};

export default Login;
