import React from 'react';
import NewsArticle from './NewsArticle';

export default function NewsFeed({ news, loading, onRefresh, filter, setFilter, watchlist }) {
  // Extract unique symbols from watchlist for filtering
  const symbols = watchlist ? Array.from(new Set(watchlist.map(w => w.symbol))) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'white' }}>
            News Feed Intelligence
          </h2>
          {/* Tag Filter */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setFilter('')}
              style={{
                background: filter === '' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: filter === '' ? 'white' : 'var(--text-secondary)',
                border: filter === '' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              Tutte
            </button>
            {symbols.map(sym => (
              <button
                key={sym}
                onClick={() => setFilter(sym)}
                style={{
                  background: filter === sym ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: filter === sym ? 'white' : 'var(--text-secondary)',
                  border: filter === sym ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                ${sym}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn"
          onClick={() => onRefresh(true)}
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {loading ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}/> : '↻ Aggiorna'}
        </button>
      </div>

      {loading && news.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
          Caricamento notizie in corso...
        </div>
      ) : news.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📰</div>
          <h3 style={{ color: 'white', marginBottom: '8px' }}>Nessuna notizia trovata</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Non ci sono notizie recenti per i tuoi asset.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {news.map((article, idx) => (
            <NewsArticle key={article.id || idx} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
