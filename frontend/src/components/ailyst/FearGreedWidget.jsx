import React from 'react';

export default function FearGreedWidget({ data, loading }) {
  if (!data) return null;

  const fgColor = (v) => {
    if (v == null) return 'var(--text-secondary)';
    if (v <= 29)  return 'var(--danger)'; // Extreme Fear
    if (v <= 49)  return '#f97316';       // Fear
    if (v <= 69)  return '#f59e0b';       // Greed
    return 'var(--success)';              // Extreme Greed
  };

  const color = fgColor(data.value);

  return (
    <div className="glass-panel" style={{
      marginBottom: '28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '24px 32px',
      background: 'linear-gradient(135deg, rgba(21, 27, 43, 0.8), rgba(11, 15, 25, 0.9))',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: '600' }}>
            Market Sentiment
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ color, fontSize: '42px', fontWeight: '800', lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
              {data.value}
            </span>
            <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-secondary)' }}>/100</span>
          </div>
        </div>
        
        <div style={{ 
          color, fontSize: '20px', fontWeight: '700', 
          backgroundColor: `${color}15`, padding: '8px 16px', borderRadius: '12px',
          border: `1px solid ${color}30`
        }}>
          {data.label}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        {data.yesterday_value != null && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
            Ieri: <strong style={{ color: 'white', fontWeight: '600' }}>{data.yesterday_value}/100</strong>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          {loading ? (
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}/> Aggiornamento...
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Aggiornato in tempo reale
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
