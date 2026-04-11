import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { usePortfolioContext } from '../context/PortfolioContext';

const AccountSettings = () => {
  const { themeColor } = usePortfolioContext();
  const [user, setUser] = useState(null);
  const [identities, setIdentities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      setUser(user);
      
      // Get identities
      if (user && user.identities) {
        setIdentities(user.identities);
      } else {
        const { data: idData, error: idErr } = await supabase.auth.getUserIdentities();
        if (!idErr && idData) {
          setIdentities(idData.identities || []);
        }
      }
    } catch (err) {
      console.error("Errore nel recupero dati utente:", err);
      setActionError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Errore durante il logout:", err);
    }
  };

  const handleLinkProvider = async (provider) => {
    try {
      setActionError(null);
      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/account`
        }
      });
      if (error) throw error;
      // Il salvataggio/redirect avverrà in automatico gestito da Supabase JS per OAuth.
    } catch (err) {
      console.error(`Errore nel collegamento di ${provider}:`, err);
      setActionError(err.message);
    }
  };

  const handleUnlinkProvider = async (identity) => {
    if (identities.length <= 1) {
      setActionError("Non puoi rimuovere l'unica identità collegata. Verresti bloccato fuori.");
      return;
    }
    
    // Mostriamo un alert di conferma
    if (!window.confirm(`Sei sicuro di voler scollegare l'accesso con ${identity.provider}?`)) {
      return;
    }

    try {
      setActionError(null);
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      
      // Ricarichiamo le identità
      await fetchUserData();
    } catch (err) {
      console.error(`Errore nello scollegamento di ${identity.provider}:`, err);
      setActionError(err.message);
    }
  };

  const hasProvider = (providerName) => {
    return identities.some(id => id.provider === providerName);
  };

  const formatLastSignIn = (dateString) => {
    if (!dateString) return 'Mai';
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="account-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p className="text-secondary">Caricamento dati account...</p>
      </div>
    );
  }

  return (
    <>
      {actionError && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', marginBottom: '1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', gridColumn: '1 / -1' }}>
          <span><span style={{color: 'var(--danger)', fontWeight:'bold'}}>Attenzione:</span> {actionError}</span>
          <button style={{background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer'}} onClick={() => setActionError(null)}>×</button>
        </div>
      )}

      {/* Box Dati Generali Utente */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: themeColor, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
          Profilo & Account
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '50%', background: `linear-gradient(135deg, ${themeColor}, #000)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold'
          }}>
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.2rem' }}>{user?.email || 'Nessuna Email'}</h2>
            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>ID: {user?.id}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
            <span className="text-secondary">Ultimo Accesso</span>
            <span>{formatLastSignIn(user?.last_sign_in_at)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.8rem' }}>
            <span className="text-secondary">Creato Il</span>
            <span>{formatLastSignIn(user?.created_at)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
            <span className="text-secondary">Stato Email</span>
            <span style={{ color: user?.email_confirmed_at ? 'var(--success)' : 'var(--warning)' }}>
              {user?.email_confirmed_at ? '✓ Verificata' : 'In attesa'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleLogout}
            className="btn"
            style={{
              background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)',
              padding: '0.6rem 1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center'
            }}
          >
            🚪 Disconnetti (Logout)
          </button>
        </div>
      </div>

      {/* Gestione Identità (Social Logins) */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: themeColor, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
          Connessioni e Accesso (SSO)
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Collega altri account per poter accedere utilizzando piattaforme alternative (come Google o Twitter).
        </p>

        <div style={{ flex: 1 }}>
          {/* Lista identità attive */}
          <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>Identità Collegate:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
            {identities.map(id => (
              <div key={id.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  {id.provider === 'email' && <span style={{ fontSize: '1.2rem' }}>📧</span>}
                  {id.provider === 'google' && <span style={{ fontSize: '1.2rem' }}>🌐</span>}
                  {id.provider === 'twitter' && <span style={{ fontSize: '1.2rem' }}>🐦</span>}
                  <div>
                    <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{id.provider}</div>
                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Collegato il {new Date(id.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnlinkProvider(id)}
                  className="btn btn-outline" 
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--danger)' }}
                  title={`Scollega ${id.provider}`}
                >
                  Scollega
                </button>
              </div>
            ))}
          </div>

          {/* Provider Disattivabili in un click se non presenti */}
          <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>Collega a:</h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              disabled={hasProvider('google')}
              onClick={() => handleLinkProvider('google')}
              className="btn" 
              style={{ 
                flex: 1, 
                background: hasProvider('google') ? 'rgba(255,255,255,0.05)' : '#ffffff', 
                color: hasProvider('google') ? 'rgba(255,255,255,0.3)' : '#000000',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                border: 'none', cursor: hasProvider('google') ? 'not-allowed' : 'pointer'
              }}
            >
              🌐 Google {hasProvider('google') && '(Collegato)'}
            </button>

            <button 
              disabled={hasProvider('twitter')}
              onClick={() => handleLinkProvider('twitter')}
              className="btn" 
              style={{ 
                flex: 1, 
                background: hasProvider('twitter') ? 'rgba(255,255,255,0.05)' : '#1DA1F2', 
                color: hasProvider('twitter') ? 'rgba(255,255,255,0.3)' : '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                border: 'none', cursor: hasProvider('twitter') ? 'not-allowed' : 'pointer'
              }}
            >
              🐦 Twitter {hasProvider('twitter') && '(Collegato)'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountSettings;
