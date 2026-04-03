import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../index.css';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            setMessage('Password aggiornata con successo! Ritorno in corso...');
            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err) {
            setError(err.message || 'Errore durante l\'aggiornamento della password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--bg-color)', width: '100vw', margin: 0, padding: 0
        }}>
            <div className="glass-panel" style={{ padding: '2.5rem', width: '380px', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: '800' }}>Nuova Password</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
                    Inserisci la nuova password per il tuo account.
                </p>

                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

                    <input
                        type="password"
                        placeholder="Nuova Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
                        required
                    />

                    {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '0.5rem', background: 'rgba(255,0,0,0.1)', borderRadius: '6px' }}>{error}</p>}
                    {message && <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '0.5rem', background: 'rgba(0,255,0,0.1)', borderRadius: '6px' }}>{message}</p>}

                    <button type="submit" className="custom-button primary" disabled={loading} style={{ width: '100%', padding: '0.85rem', fontWeight: 'bold' }}>
                        {loading ? 'Attendere...' : 'Aggiorna Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
