import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function SearchResult({ result, onAdd, alreadyAdded }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'var(--surface-hover)',
      transition: 'background 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-hover)'}
    >
      {result.thumb && (
        <img src={result.thumb} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '15px', color: 'white' }}>
          {result.symbol} <span style={{ fontWeight: '400', color: 'var(--text-secondary)', fontSize: '14px', marginLeft: '6px' }}>{result.name}</span>
        </div>
        {result.market_cap_rank && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Rank #{result.market_cap_rank}</div>
        )}
      </div>
      <button
        onClick={() => onAdd(result)}
        disabled={alreadyAdded}
        style={{
          background: alreadyAdded ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
          color: alreadyAdded ? 'var(--text-secondary)' : 'white',
          border: 'none', borderRadius: '8px', padding: '8px 16px',
          fontSize: '13px', fontWeight: '600', cursor: alreadyAdded ? 'default' : 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => { if(!alreadyAdded) e.currentTarget.style.boxShadow = 'var(--glow-shadow)' }}
        onMouseLeave={e => { if(!alreadyAdded) e.currentTarget.style.boxShadow = 'none' }}
      >
        {alreadyAdded ? 'Aggiunto ✓' : '+ Aggiungi'}
      </button>
    </div>
  );
}

export default function AssetSearch({ onAddAsset, addedSymbols }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('crypto'); // 'crypto' | 'stock'
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const endpoint = searchMode === 'crypto'
          ? `/api/ailyst/search/crypto?q=${encodeURIComponent(searchQuery)}`
          : `/api/ailyst/search/stock?q=${encodeURIComponent(searchQuery)}`;
        const res = await axios.get(`${API}${endpoint}`);
        setSearchResults(res.data.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const handleAdd = (result) => {
    const payload = searchMode === 'crypto'
      ? {
          symbol:       result.symbol,
          name:         result.name,
          asset_type:   'crypto',
          coingecko_id: result.coingecko_id || result.id,
          yahoo_ticker: result.yahoo_ticker || `${result.symbol}-USD`,
        }
      : {
          symbol:       result.symbol || result.ticker,
          name:         result.name || result.longname,
          asset_type:   'stock',
          yahoo_ticker: result.symbol || result.ticker,
        };
    
    onAddAsset(payload);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="glass-panel" style={{ marginBottom: '24px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'white' }}>
          Aggiungi Asset
        </h2>
        {/* Toggle crypto / stock */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px' }}>
          {['crypto', 'stock'].map(mode => (
            <button
              key={mode}
              onClick={() => { setSearchMode(mode); setSearchQuery(''); setSearchResults([]); }}
              style={{
                border: 'none', borderRadius: '8px', padding: '6px 16px',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                background: searchMode === mode ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: searchMode === mode ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {mode === 'crypto' ? '🪙 Crypto' : '📈 Azioni'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="search-bar-glass"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          placeholder={searchMode === 'crypto' ? 'Cerca crypto: bitcoin, ethereum...' : 'Cerca azione: AAPL, ENI.MI, Tesla...'}
          style={{ width: '100%', maxWidth: 'none', paddingRight: '48px' }}
          onBlurCapture={() => { setTimeout(() => setSearchOpen(false), 200); }}
        />
        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
          {searching ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}/> : '🔍'}
        </span>

        {/* Dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)', marginTop: '8px',
            maxHeight: '350px', overflowY: 'auto',
            backdropFilter: 'blur(16px)',
          }}>
            {searchResults.map((r, i) => (
              <SearchResult
                key={r.id || r.symbol || i}
                result={r}
                onAdd={handleAdd}
                alreadyAdded={addedSymbols.has((r.symbol || '').toUpperCase())}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
