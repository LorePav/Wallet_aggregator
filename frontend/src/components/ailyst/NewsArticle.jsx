import React from 'react';

export default function NewsArticle({ article }) {
  const getSentimentStyle = (label) => {
    switch (label) {
      case 'bullish': return { color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'bearish': return { color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
      default: return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' }; // neutral
    }
  };

  const sentiment = getSentimentStyle(article.sentiment_label);
  const dateStr = new Date(article.published_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
      <div className="glass-panel" style={{
        marginBottom: '16px', padding: '20px', transition: 'all 0.2s',
        display: 'flex', flexDirection: 'column', gap: '12px',
        borderLeft: `4px solid ${sentiment.color}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{article.source}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{dateStr}</span>
          </div>
          <div style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '20px',
            backgroundColor: sentiment.bg, color: sentiment.color, border: `1px solid ${sentiment.border}`,
            display: 'flex', gap: '6px', alignItems: 'center'
          }}>
            {article.sentiment_label}
            {article.sentiment_score && (
              <span style={{ opacity: 0.8 }}>({(article.sentiment_score > 0 ? '+' : '')}{article.sentiment_score.toFixed(2)})</span>
            )}
          </div>
        </div>

        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'white', lineHeight: '1.4' }}>
          {article.title}
        </h3>
        
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          {article.summary}
        </p>

        {article.assets_mentioned && article.assets_mentioned.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {article.assets_mentioned.map(asset => (
              <span key={asset} style={{
                fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
                padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                ${asset}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
