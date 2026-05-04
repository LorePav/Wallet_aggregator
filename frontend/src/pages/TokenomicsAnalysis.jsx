import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, Download, FileText, Database, Users, GitCommit, DollarSign } from 'lucide-react';
import PageTransition from '../components/PageTransition';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const TokenomicsAnalysis = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search tokens from backend (CoinGecko)
  const handleSearchAutocomplete = async (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/tokenomics/search?q=${val}`);
      setSearchResults(response.data || []);
    } catch (err) {
      console.error("Errore autocomplete:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadCoinData = async (coinId) => {
    setSearchResults([]);
    setQuery('');
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await axios.get(`${API_URL}/api/tokenomics/${coinId}`);
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Errore durante il recupero dei dati crypto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!data || !data.coin_id) return;
    try {
      const response = await axios.get(`${API_URL}/api/tokenomics/${data.coin_id}/export/${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tokenomics_${data.coin_id}.${format === 'word' ? 'docx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(`Errore esportazione ${format}:`, err);
      alert(`Errore durante l'esportazione in ${format.toUpperCase()}`);
    }
  };

  const getRatingClass = (rating) => {
    if (!rating) return 'nd';
    if (rating.includes('Buono') || rating.includes('POSITIVO')) return 'good';
    if (rating.includes('media') || rating.includes('MISTO') || rating.includes('RISERVE')) return 'average';
    if (rating.includes('Attenzione') || rating.includes('NEGATIVO')) return 'bad';
    return 'nd';
  };

  const renderSkeleton = () => (
    <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
      <div className="glass-panel" style={{ height: '200px', position: 'relative', overflow: 'hidden' }}>
        <div className="skeleton-shimmer"></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel" style={{ height: '100px', position: 'relative', overflow: 'hidden' }}>
            <div className="skeleton-shimmer"></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="portfolio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>Analisi Tokenomics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Indaga la fornitura, la community e lo sviluppo dei progetti Crypto.</p>
        </div>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="search-bar-glass" 
              placeholder="Cerca coin (es. Bitcoin)" 
              value={query}
              onChange={handleSearchAutocomplete}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
            {isSearching && <div className="spinner" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}></div>}
          </div>
          
          {/* Risultati Ricerca Autocomplete */}
          {searchResults.length > 0 && (
            <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map((coin) => (
                <div 
                  key={coin.id} 
                  onClick={() => loadCoinData(coin.id)}
                  style={{ padding: '0.8rem', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {coin.thumb && <img src={coin.thumb} alt={coin.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
                    <span style={{ fontWeight: 'bold' }}>{coin.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{coin.symbol.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
          <p className="text-danger" style={{ margin: 0, fontWeight: 'bold' }}>{error}</p>
        </div>
      )}

      {isLoading && renderSkeleton()}

      {data && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Intestazione Coin & Export */}
          <div className="glass-panel" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ margin: 0 }}>{data.name} ({data.symbol})</h2>
                <span className={`rating-badge ${getRatingClass(data.summary)}`}>
                  {data.summary.split('—')[0].replace(/[*]/g, '').trim()}
                </span>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prezzo Corrente</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${data.price?.current?.toFixed(2) || 'N/D'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Market Cap</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.market_cap_formatted || 'N/D'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rank</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>#{data.rank || 'N/D'}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} /> PDF
              </button>
              <button className="btn btn-outline" onClick={() => handleExport('word')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={18} /> Word
              </button>
            </div>
          </div>

          {/* Commenti Automatici Tokenomics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {data.comments && (
              <>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}><DollarSign size={20}/> Valutazione</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.valuation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}><Database size={20}/> Tokenomics & Supply</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.tokenomics.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}><GitCommit size={20}/> Attività Sviluppatori</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.developer.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}><Users size={20}/> Community</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.community.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              </>
            )}
          </div>
          
          {/* Giudizio Complessivo */}
          <div className="glass-panel" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
             <h3 style={{ marginBottom: '1rem' }}>Sintesi Tokenomics</h3>
             <div style={{ fontSize: '1.1rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: data.summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>

        </motion.div>
      )}
    </PageTransition>
  );
};

export default TokenomicsAnalysis;
