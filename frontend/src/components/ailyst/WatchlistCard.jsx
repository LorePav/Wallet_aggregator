import React from 'react';

const fmtPrice = (p) => {
  if (p == null) return '—';
  if (p >= 1000)  return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1)     return `$${p.toFixed(2)}`;
  return `$${p.toFixed(6)}`;
};

const fmtChange = (c) => {
  if (c == null) return null;
  return { value: Math.abs(c).toFixed(2), up: c >= 0 };
};

export default function WatchlistCard({ item, priceData, onRemove }) {
  const ch = fmtChange(priceData?.change_24h);
  
  return (
    <div className="glass-panel" style={{
      display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
      marginBottom: '12px'
    }}>
      {/* Symbol Icon */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: '800', fontSize: '14px', flexShrink: 0,
      }}>
        {item.symbol.slice(0, 4)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '16px', color: 'white' }}>{item.symbol}</span>
          <span style={{
            fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: '20px',
            backgroundColor: item.asset_type === 'crypto' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: item.asset_type === 'crypto' ? '#60A5FA' : '#6EE7B7',
            border: `1px solid ${item.asset_type === 'crypto' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
          }}>
            {item.asset_type}
          </span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name || '—'}
        </div>
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right', flexShrink: 0, paddingRight: '16px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: '700', fontSize: '17px', color: 'white' }}>
          {fmtPrice(priceData?.price_usd)}
        </div>
        {ch && (
          <div style={{ fontSize: '13px', fontWeight: '600', color: ch.up ? 'var(--success)' : 'var(--danger)', marginTop: '4px' }}>
            {ch.up ? '▲' : '▼'} {ch.value}%
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        title="Rimuovi"
        style={{
          background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px',
          width: '36px', height: '36px', cursor: 'pointer', color: 'var(--text-secondary)',
          fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = 'var(--danger)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        ×
      </button>
    </div>
  );
}
