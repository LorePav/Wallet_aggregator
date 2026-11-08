import React, { useState, useEffect } from 'react';

export default function AilystSettings({ settings, loading, onSave, showToast }) {
  const [formData, setFormData] = useState({
    email_enabled: false,
    email_address: '',
    report_hour: 7,
    report_minute: 30
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        email_enabled: settings.email_enabled ?? false,
        email_address: settings.email_address || '',
        report_hour: settings.report_hour ?? 7,
        report_minute: settings.report_minute ?? 30
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      showToast('Impostazioni salvate con successo');
    } catch {
      showToast('Errore durante il salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
        Caricamento impostazioni...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '600', color: 'white' }}>
        Impostazioni Ailyst
      </h2>

      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="email_enabled"
            checked={formData.email_enabled}
            onChange={handleChange}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
          />
          <span style={{ color: 'white', fontSize: '16px', fontWeight: '500' }}>Abilita Report via Email</span>
        </label>
        <p style={{ margin: '4px 0 0 30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Ricevi il report mattutino direttamente nella tua casella di posta.
        </p>
      </div>

      <div className="form-group" style={{ marginBottom: '24px', opacity: formData.email_enabled ? 1 : 0.5, pointerEvents: formData.email_enabled ? 'auto' : 'none' }}>
        <label>Indirizzo Email</label>
        <input
          type="email"
          name="email_address"
          className="form-control"
          value={formData.email_address}
          onChange={handleChange}
          placeholder="tu@email.com"
          required={formData.email_enabled}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '32px' }}>
        <label>Orario di Generazione Report</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="number"
            name="report_hour"
            className="form-control"
            value={formData.report_hour}
            onChange={handleChange}
            min="0" max="23"
            style={{ width: '80px', textAlign: 'center' }}
          />
          <span style={{ color: 'white', fontWeight: '700' }}>:</span>
          <input
            type="number"
            name="report_minute"
            className="form-control"
            value={formData.report_minute}
            onChange={handleChange}
            min="0" max="59"
            style={{ width: '80px', textAlign: 'center' }}
          />
          <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Orario locale in cui l'analisi viene eseguita.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button type="submit" className="btn" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saving ? <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}/> Salvataggio...</> : 'Salva Impostazioni'}
        </button>
      </div>
    </form>
  );
}
