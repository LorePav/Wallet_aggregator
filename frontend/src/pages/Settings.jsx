import React from 'react';
import axios from 'axios';
import { usePortfolioContext } from '../context/PortfolioContext';
import AccountSettings from '../components/AccountSettings';

const Settings = () => {
  const {
    displayCurrency, handleCurrencyChange,
    refreshInterval, handleIntervalChange,
    handleResetPortfolio,
    themeColor, setThemeColor,
    themeBg, setThemeBg,
    themeFont, setThemeFont,
    hiddenAssets, hiddenCategories, hiddenDeepDiveAssets,
    handleAssetLegendClick, handleCategoryLegendClick, handleDeepDiveLegendClick
  } = usePortfolioContext();

  const themeOptions = [
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Cyan', hex: '#06b6d4' }
  ];

  const bgOptions = [
    { name: 'Midnight', hex: '#0b0f19' },
    { name: 'Deep Space', hex: '#000000' },
    { name: 'Nordic', hex: '#0f172a' },
    { name: 'Mocha', hex: '#1c1917' }
  ];

  const fontOptions = [
    { name: 'Inter (Clean & Tech)', value: "'Inter', sans-serif", fontFamily: "'Inter', sans-serif" },
    { name: 'Poppins (Round & Friendly)', value: "'Poppins', sans-serif", fontFamily: "'Poppins', sans-serif" },
    { name: 'Outfit (Modern & Minimal)', value: "'Outfit', sans-serif", fontFamily: "'Outfit', sans-serif" },
    { name: 'Space Mono (Developer)', value: "'Space Mono', monospace", fontFamily: "'Space Mono', monospace" }
  ];

  const handleThemeChange = (hex) => {
    setThemeColor(hex);
    localStorage.setItem('themeColor', hex);
  };
  
  const handleBgChange = (hex) => {
    setThemeBg(hex);
    localStorage.setItem('themeBg', hex);
  };

  const handleFontChange = (e) => {
    setThemeFont(e.target.value);
    localStorage.setItem('themeFont', e.target.value);
  };

  return (
    <div className="settings-page">
      <h1 style={{ marginBottom: '2.5rem' }}>⚙️ Impostazioni App</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Pannello Profilo e Identità */}
        <AccountSettings />
        

        {/* Preferenze Generali */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Preferenze Generali</h3>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Valuta Base</label>
            <select className="form-control" value={displayCurrency} onChange={handleCurrencyChange} style={{ marginTop: '0.5rem' }}>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollaro ($)</option>
            </select>
            <span className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>
              Incide su totali, performance e grafici storici.
            </span>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Auto-Refresh</label>
            <select className="form-control" value={refreshInterval} onChange={handleIntervalChange} style={{ marginTop: '0.5rem' }}>
              <option value={15000}>Ogni 15 Secondi</option>
              <option value={30000}>Ogni 30 Secondi</option>
              <option value={60000}>Ogni Minuto</option>
              <option value={300000}>Ogni 5 Minuti</option>
            </select>
            <span className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>
              Frequenza con cui si prelevano i prezzi in diretta.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Stile Tipografico (Font)</label>
            <select className="form-control" value={themeFont} onChange={handleFontChange} style={{ marginTop: '0.5rem', fontFamily: themeFont }}>
              {fontOptions.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.fontFamily }}>{f.name}</option>
              ))}
            </select>
            <span className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>
              Cambia il carattere dell'intera applicazione.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Colore di Sfondo</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.8rem', flexWrap: 'wrap' }}>
              {bgOptions.map((opt) => (
                <button
                  key={opt.hex}
                  onClick={() => handleBgChange(opt.hex)}
                  title={opt.name}
                  style={{
                    width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer',
                    backgroundColor: opt.hex,
                    border: themeBg === opt.hex ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.2)',
                    transform: themeBg === opt.hex ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: themeBg === opt.hex ? `0 0 10px rgba(255,255,255,0.2)` : 'none',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {themeBg === opt.hex && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>}
                </button>
              ))}
            </div>
            <span className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>
              Sfondo principale (i riflessi di luce si adatteranno al colore dell'accento).
            </span>
          </div>

          <div className="form-group">
            <label>Tema e Colore Accento</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.8rem', flexWrap: 'wrap' }}>
              {themeOptions.map((opt) => (
                <button
                  key={opt.hex}
                  onClick={() => handleThemeChange(opt.hex)}
                  title={opt.name}
                  style={{
                    width: '35px', height: '35px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                    backgroundColor: opt.hex,
                    transform: themeColor === opt.hex ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: themeColor === opt.hex ? `0 0 10px ${opt.hex}` : 'none',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {themeColor === opt.hex && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gestione Filtri e Dati  */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Elementi Nascosti (Filtri)</h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            Gli asset disattivati ciccando sulla legenda dei grafici a torta appariranno qui. Cliccaci per ripristinarli.
          </p>
          <div style={{ flex: 1, maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            {Object.keys(hiddenAssets).filter(k => hiddenAssets[k]).map(asset => (
              <div key={asset} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>👁️ {asset} (Asset)</span>
                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => handleAssetLegendClick({ value: asset })}>Ripristina</button>
              </div>
            ))}
            {Object.keys(hiddenCategories).filter(k => hiddenCategories[k]).map(cat => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>👁️ {cat} (Categoria)</span>
                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => handleCategoryLegendClick({ value: cat })}>Ripristina</button>
              </div>
            ))}
            {Object.keys(hiddenDeepDiveAssets).filter(k => hiddenDeepDiveAssets[k]).map(asset => (
              <div key={asset} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>👁️ {asset} (Conto Specifico)</span>
                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => handleDeepDiveLegendClick({ value: asset })}>Ripristina</button>
              </div>
            ))}
            {(!Object.values(hiddenAssets).some(v=>v) && !Object.values(hiddenCategories).some(v=>v) && !Object.values(hiddenDeepDiveAssets).some(v=>v)) && (
              <div className="text-secondary" style={{ textAlign: 'center', marginTop: '1rem' }}>Nessun elemento attualmente nascosto dai grafici.</div>
            )}
          </div>
        </div>

        {/* Zona Avanzata ed Export */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--success)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Sicurezza & Export</h3>
          
          <div style={{ marginBottom: '2rem' }}>
            <p className="text-secondary" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
              Crea un foglio Google collegato con i tuoi dati per un invio in cloud dei massimali.
            </p>
            <button
              className="btn btn-outline"
              onClick={async (e) => {
                const btn = e.target;
                btn.textContent = '⏳ Esportazione...';
                btn.disabled = true;
                try {
                  const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/export-sheets`);
                  alert(`✅ ${res.data.message}\n\n📊 Asset esportati: ${res.data.assets_exported}\n💰 Voci liquidità: ${res.data.liquidity_entries}\n🕐 Ora: ${res.data.timestamp}`);
                } catch (err) {
                  alert('❌ Errore durante l\'esportazione: ' + (err.response?.data?.detail || err.message));
                } finally {
                  btn.textContent = '📤 Esporta su Google Sheets';
                  btn.disabled = false;
                }
              }}
              style={{ width: '100%', borderColor: 'rgba(59, 130, 246, 0.5)', color: 'var(--success)' }}
            >
              📤 Esporta su Google Sheets
            </button>
          </div>

          <div style={{ marginTop: 'auto', border: '1px dashed rgba(239, 68, 68, 0.4)', padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)' }}>
            <h4 style={{ color: 'var(--danger)', margin: '0 0 0.5rem 0' }}>Zona Pericolosa</h4>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Elimina irreversibilmente tutto il database corrente.
            </p>
            <button
              className="btn"
              onClick={handleResetPortfolio}
              style={{ width: '100%', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: 'none' }}
            >
              ⚠️ Reset Database Completo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
