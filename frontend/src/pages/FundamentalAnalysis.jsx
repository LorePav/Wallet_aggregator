import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, Download, FileText, TrendingUp, DollarSign, Activity, PieChart, Info } from 'lucide-react';
import PageTransition from '../components/PageTransition';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FundamentalAnalysis = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearchAutocomplete = async (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/search-tickers?q=${val}`);
      setSearchResults(response.data || []);
    } catch (err) {
      console.error("Errore autocomplete ticker:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadTickerData = async (tickerSymbol) => {
    setSearchResults([]);
    setQuery('');
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await axios.get(`${API_URL}/api/fundamental/${tickerSymbol}`);
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Errore durante il recupero dei dati fondamentali.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    loadTickerData(query);
  };

  const handleExport = async (format) => {
    if (!data || !data.ticker) return;
    try {
      const response = await axios.get(`${API_URL}/api/fundamental/${data.ticker}/export/${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analisi_${data.ticker}.${format === 'word' ? 'docx' : 'pdf'}`);
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

  const metricDescriptions = {
    "P/E (TTM)": "Price to Earnings: indica quanto il mercato è disposto a pagare per 1$ di utile. Un valore alto può indicare un'azienda sopravvalutata o con alte aspettative di crescita.",
    "P/B": "Price to Book: confronta il valore di mercato dell'azienda con il suo valore contabile. Utile per individuare aziende potenzialmente sottovalutate.",
    "ROE %": "Return on Equity: misura la redditività del capitale proprio. Indica in percentuale quanto profitto l'azienda genera con i soldi degli azionisti.",
    "Margine Netto %": "Margine di Profitto: percentuale di ricavi che si traduce in utile netto dopo tutte le spese. Misura l'efficienza complessiva dell'azienda.",
    "Debt/Equity": "Rapporto Debito/Capitale: indica la proporzione di debito rispetto al capitale degli azionisti. Valori alti (spesso > 2) indicano maggior rischio finanziario.",
    "Div. Yield %": "Rendimento del Dividendo: il rapporto percentuale tra il dividendo annuale per azione e il prezzo dell'azione. Indica il flusso di cassa annuo generato dall'investimento."
  };

  const renderSkeleton = () => (
    <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
      <div className="glass-panel" style={{ height: '200px', position: 'relative', overflow: 'hidden' }}>
        <div className="skeleton-shimmer"></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
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
          <h1 className="gradient-text" style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>Analisi Fondamentali</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Analizza azioni e aziende con metriche finanziarie dettagliate.</p>
        </div>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="search-bar-glass" 
                placeholder="Inserisci Ticker (es. AAPL)" 
                value={query}
                onChange={handleSearchAutocomplete}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
              {isSearching && <div className="spinner" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}></div>}
            </div>
            <button type="submit" className="btn" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {isLoading ? <div className="spinner"></div> : <span>Cerca</span>}
            </button>
          </form>

          {/* Risultati Ricerca Autocomplete */}
          {searchResults.length > 0 && (
            <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map((ticker, idx) => (
                <div 
                  key={`${ticker.symbol}-${idx}`} 
                  onClick={() => loadTickerData(ticker.symbol)}
                  style={{ padding: '0.8rem', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold' }}>{ticker.symbol}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{ticker.name}</span>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 'bold' }}>{ticker.exchange}</span>
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
          {/* Intestazione Azienda & Export */}
          <div className="glass-panel" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ margin: 0 }}>{data.name} ({data.ticker})</h2>
                <span className={`rating-badge ${getRatingClass(data.summary)}`}>
                  {data.summary.split('—')[0].replace(/[*]/g, '').trim()}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                {data.sector} • {data.industry} • {data.country}
              </p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prezzo Corrente</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${data.price?.current?.toFixed(2) || 'N/D'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Market Cap</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.market_cap_formatted || 'N/D'}</div>
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

          {/* Griglia Metriche Chiave */}
          <h3 style={{ marginBottom: '1rem' }}>Metriche Chiave</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {data.key_metrics && data.key_metrics.map((metric, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div className="metric-tooltip-container" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>{metric.label}</span>
                  {metricDescriptions[metric.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[metric.label]}</div>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{metric.value_formatted}</div>
                <span className={`rating-badge ${getRatingClass(metric.rating)}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                  {metric.rating}
                </span>
              </div>
            ))}
          </div>

          {/* Commenti Automatici */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            {data.comments && (
              <>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}><DollarSign size={20}/> Valutazione</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.valuation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}><TrendingUp size={20}/> Redditività</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.profitability.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}><Activity size={20}/> Salute Finanziaria</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.health.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="glass-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}><PieChart size={20}/> Dividendi</h3>
                  <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comments.dividends.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              </>
            )}
          </div>
          
          {/* Giudizio Complessivo */}
          <div className="glass-panel" style={{ marginTop: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
             <h3 style={{ marginBottom: '1rem' }}>Verdetto Finale</h3>
             <div style={{ fontSize: '1.1rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: data.summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>

        </motion.div>
      )}
    </PageTransition>
  );
};

export default FundamentalAnalysis;
