import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Search, ExternalLink, Globe, FileText, Copy, 
  Check, MessageCircle, AlertTriangle, Info
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Area
} from 'recharts';
import { supabase } from '../supabaseClient';
import PageTransition from '../components/PageTransition';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getAuthHeaders = async () => {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  return { Authorization: `Bearer ${token}` };
};

const CRYPTO_METRIC_DESCRIPTIONS = {
  // --- SEZIONE PREZZI ---
  "Cap. di mercato": "Capitalizzazione di mercato: il valore totale di tutte le monete attualmente in circolazione. Si calcola moltiplicando il prezzo attuale per l'offerta circolante.",
  "Valore dei token in circolazione": "Il valore complessivo di tutti i token attualmente in circolazione nel mercato, calcolato al prezzo corrente.",
  "Valut. 100% diluita": "Fully Diluted Valuation (FDV): la capitalizzazione teorica se l'intera offerta massima fosse già in circolazione. Indica il valore massimo potenziale del progetto.",
  "Volume scambi 24h": "Il volume totale di scambi registrato su tutti gli exchange nelle ultime 24 ore. Un volume alto rispetto alla market cap indica buona liquidità.",
  "Valore totale bloccato (TVL)": "Total Value Locked: il valore complessivo degli asset depositati nei contratti smart del protocollo (staking, lending, pool di liquidità). Misura l'adozione del protocollo DeFi.",
  // --- SEZIONE SUPPLY ---
  "Offerta in circ.": "Offerta Circolante: il numero di token attualmente disponibili nel mercato e scambiabili liberamente. Esclude i token bloccati, bruciati o non ancora rilasciati.",
  "Quantità in circolazione": "La quantità di token attualmente in circolazione nel mercato, identica all'offerta circolante. Usata per calcolare la market cap.",
  "Offerta totale": "Total Supply: il numero totale di token esistenti, inclusi quelli non ancora in circolazione (bloccati in vesting o da rilasciare). Esclude i token bruciati.",
  "Offerta massima": "Max Supply: il numero massimo assoluto di token che esisteranno mai per questo progetto. Se non è definito, l'offerta è illimitata (es. Ethereum).",
  "Partecipazioni totali della tesoreria": "Il numero di token detenuti dalla tesoreria del progetto o della fondazione. Questi token sono generalmente usati per finanziare lo sviluppo futuro.",
  // --- SEZIONE ATH/ATL ---
  "Massimo storico (ATH)": "All Time High: il prezzo più alto mai raggiunto da questo token nella sua storia. La percentuale indica di quanto il prezzo attuale è al di sotto del massimo.",
  "Minimo storico (ATL)": "All Time Low: il prezzo più basso mai raggiunto da questo token. La percentuale indica di quanto il prezzo attuale è al di sopra del minimo storico.",
  // --- VARIAZIONI PREZZO ---
  "1h": "Variazione percentuale del prezzo nell'ultima ora.",
  "24h": "Variazione percentuale del prezzo nelle ultime 24 ore.",
  "7g": "Variazione percentuale del prezzo negli ultimi 7 giorni.",
  "14g": "Variazione percentuale del prezzo negli ultimi 14 giorni.",
  "30g": "Variazione percentuale del prezzo negli ultimi 30 giorni.",
  "1a": "Variazione percentuale del prezzo nell'ultimo anno.",
  // --- SEZIONE INFO ---
  "Contratto": "Indirizzo del contratto smart del token sulla blockchain. Cliccando puoi verificarlo sull'explorer ufficiale della rete.",
  "Sito web": "Il sito ufficiale del progetto dove trovare documentazione, roadmap e aggiornamenti.",
  "Str. esploraz.": "Block explorer: uno strumento pubblico per verificare transazioni, saldi e attività on-chain in tempo reale su questa blockchain.",
  "Blockchain": "La rete blockchain su cui è costruito o distribuito questo token. Determina le fee di transazione, la velocità e la compatibilità con i wallet.",
  "Categorie": "Le categorie di mercato a cui appartiene questo token (es. DeFi, Layer 1, DEX, Stablecoin). Utili per confrontarlo con progetti simili.",
  // --- SEZIONE TOKENOMICS ---
  "In Circolazione": "La porzione di supply già rilasciata e liberamente scambiabile nel mercato.",
  "Non in Circolazione": "La porzione di supply ancora bloccata: include token in vesting, riserve della tesoreria e token non ancora rilasciati.",
  // --- SEZIONE FINANCIAL ---
  "Commissioni in 24 ore": "Le commissioni totali pagate dagli utenti del protocollo nelle ultime 24 ore. Misura l'utilizzo reale della piattaforma.",
  "Ricavi in 24 ore": "La quota di commissioni trattenuta dal protocollo (la fondazione o i detentori di token). La differenza tra fees e revenue va ai liquidity provider.",
  // --- EXCHANGE TABLE ---
  "Trust Score": "Punteggio di affidabilità assegnato da CoinGecko all'exchange: verde = alta fiducia, giallo = media, rosso = bassa.",
};

const WithTooltip = ({ label }) => {
  const tooltipText = CRYPTO_METRIC_DESCRIPTIONS[label];
  if (!tooltipText) return <span>{label}</span>;

  return (
    <div className="metric-tooltip-container">
      <span>{label}</span>
      <Info size={13} style={{ opacity: 0.6 }} />
      <div className="metric-tooltip-text">
        {tooltipText}
      </div>
    </div>
  );
};

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

const formatCurrency = (num, decimals = 2) => {
  if (num === null || num === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// ==========================================
// TABS COMPONENTS
// ==========================================

const InfoTab = ({ info, symbol }) => {
  const [expanded, setExpanded] = useState(false);
  const desc = info?.description?.it || info?.description?.en || '';
  const isEnglish = !info?.description?.it && !!info?.description?.en;
  
  if (!desc) {
    return (
      <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>
        Descrizione non disponibile per questo token.
      </div>
    );
  }

  return (
    <div className="glass-panel">
      {isEnglish && (
        <span className="text-xs text-gray-500 mb-2 block" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
          Descrizione disponibile solo in inglese
        </span>
      )}
      <p className="text-gray-300 text-sm leading-relaxed" style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
        <span dangerouslySetInnerHTML={{ __html: expanded ? desc : desc.slice(0, 600) + (desc.length > 600 ? '...' : '') }} />
        {desc.length > 600 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-400 ml-1 hover:underline"
            style={{ color: '#60a5fa', marginLeft: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? 'Mostra meno' : 'Leggi di più'}
          </button>
        )}
      </p>
    </div>
  );
};

const TokenomicsTab = ({ coinId, symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/allocation`, { headers });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore durante il caricamento dell'allocazione");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [coinId]);

  if (loading) return <div className="glass-panel" style={{height:'300px', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  const chartData = data.allocation_chart || [];
  const COLORS = ['#22c55e', '#64748b', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Allocazione {symbol?.toUpperCase()}</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {symbol?.toUpperCase()} ha una disponibilità totale di <strong style={{color:'white'}}>{data.supply?.total_formatted || 'N/A'}</strong> token, 
            con <strong style={{color:'white'}}>{data.supply?.circulating_formatted || 'N/A'}</strong> attualmente in circolazione.
            ({formatNumber(data.supply?.circ_pct_of_total)}% del totale)
          </p>
        </div>
        <div style={{ flex: '1 1 300px', height: '250px', display: 'flex', alignItems: 'center' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value, name, props) => [`${props.payload.formatted} (${formatNumber(props.payload.percentage)}%)`, name]}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '0.85rem' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{width:'100%', textAlign:'center', color:'var(--text-secondary)'}}>Dati grafici non disponibili</div>
          )}
        </div>
      </div>

      {data.ico_data && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Dati ICO</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Inizio ICO</span>
              <div style={{ fontWeight: 'bold' }}>{data.ico_data.start_date ? new Date(data.ico_data.start_date).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fine ICO</span>
              <div style={{ fontWeight: 'bold' }}>{data.ico_data.end_date ? new Date(data.ico_data.end_date).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Capitale Raccolto</span>
              <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>{data.ico_data.raised_formatted || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {data.vesting_note && (
        <div className="glass-panel" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <strong>Nota:</strong> {data.vesting_note}
        </div>
      )}
    </div>
  );
};

const FinancialTab = ({ coinId, symbol, volumeFormatted }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('1M'); // 1M, 3M, 6M, Max

  const getSlug = (sym, id) => {
    const s = (sym || '').toUpperCase();
    if(s === 'HYPE') return 'hyperliquid';
    if(s === 'AAVE') return 'aave-v3';
    if(s === 'RAY') return 'raydium';
    if(s === 'JUP') return 'jupiter';
    return id;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const slug = getSlug(symbol, coinId);
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/financial?slug=${slug}`, { headers });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore durante il caricamento dati finanziari");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [coinId, symbol]);

  if (loading) return <div className="glass-panel" style={{height:'300px', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  
  if (!data || !data.available) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 1rem' }}>
        <AlertTriangle size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Dati finanziari non disponibili</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '1.5rem' }}>
          Questo endpoint è riservato ai protocolli DeFi con dati su DeFiLlama (Hyperliquid, Aave, Raydium, Jupiter, ecc.).
        </p>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem 2rem', borderRadius: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Volume 24h</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{volumeFormatted || 'N/A'}</div>
        </div>
      </div>
    );
  }

  // Filter chart data
  const filterData = (dataArray, tf) => {
    if (!dataArray || dataArray.length === 0) return [];
    const now = Date.now();
    let days = 30;
    if (tf === '3M') days = 90;
    if (tf === '6M') days = 180;
    if (tf === 'Max') return dataArray;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return dataArray.filter(d => d.timestamp >= cutoff);
  };

  const chartFees = filterData(data.chart_fees, timeframe);
  const chartRevenue = filterData(data.chart_revenue, timeframe);
  
  // Combine for composed chart
  const combinedChart = chartFees.map(f => {
    const rev = chartRevenue.find(r => r.timestamp === f.timestamp);
    return {
      dateStr: new Date(f.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      fees: f.value,
      revenue: rev ? rev.value : 0
    };
  });

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Commissioni (Fees) in 24 ore</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f97316', marginTop: '0.5rem' }}>
            {data.summary?.fees_24h ? `$${formatNumber(data.summary.fees_24h, 0)}` : 'N/A'}
          </div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ricavi (Revenue) in 24 ore</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginTop: '0.5rem' }}>
            {data.summary?.revenue_24h ? `$${formatNumber(data.summary.revenue_24h, 0)}` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Grafico Fees e Revenue</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['1M', '3M', '6M', 'Max'].map(tf => (
              <button 
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  background: timeframe === tf ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        
        {combinedChart.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="dateStr" stroke="var(--text-secondary)" tick={{fontSize: 12}} minTickGap={30} />
              <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} tickFormatter={(v) => `$${formatLargeNumber(v)}`} />
              <RechartsTooltip 
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(val) => `$${formatNumber(val, 0)}`}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '5px' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="fees" name="Fees" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            Dati insufficienti per il periodo selezionato
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Powered by DeFiLlama
      </div>
    </div>
  );
};

// Helper for formatting big numbers in YAxis
const formatLargeNumber = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num;
};

const MarketsTab = ({ coinId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('Tutti'); // Tutti, CEX, DEX, Spot
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/exchanges`, { headers });
        setData(res.data || []);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento mercati");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [coinId]);

  if (loading) return <div className="glass-panel" style={{height:'300px', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;

  let filtered = data;
  if (filter === 'DEX') filtered = data.filter(d => d.trust_score === 'green' && !d.is_anomaly); // Semplificazione per DEX (solitamente trust verde e volume organico)
  else if (filter === 'CEX') filtered = data.filter(d => d.trust_score !== 'green' || d.is_anomaly); // Semplificazione
  // Spot è di solito tutti se non abbiamo derivati nei dati

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const totalVolume = data.reduce((sum, d) => sum + (d.volume_usd || 0), 0);

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Mercati</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['Tutti', 'CEX', 'DEX', 'Spot'].map(f => (
            <button 
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              style={{
                background: filter === f ? 'var(--accent)' : 'transparent',
                border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Exchange</th>
              <th>Coppia</th>
              <th>Prezzo</th>
              <th>Volume 24h</th>
              <th>Volume %</th>
              <th>Trust</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => {
              const volPct = totalVolume > 0 ? ((row.volume_usd || 0) / totalVolume) * 100 : 0;
              const isSus = row.is_stale || row.is_anomaly;
              return (
                <tr key={i} style={{ opacity: isSus ? 0.6 : 1 }} title={isSus ? 'Dato anomalo o non aggiornato' : ''}>
                  <td>{(page - 1) * itemsPerPage + i + 1}</td>
                  <td style={{ fontWeight: 'bold' }}>{row.exchange}</td>
                  <td style={{ color: 'var(--accent)' }}>{row.pair}</td>
                  <td>{formatCurrency(row.price_usd, 4)}</td>
                  <td>${formatLargeNumber(row.volume_usd)}</td>
                  <td>{volPct.toFixed(2)}%</td>
                  <td>
                    <div style={{ 
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: row.trust_score === 'green' ? '#22c55e' : (row.trust_score === 'yellow' ? '#f59e0b' : '#64748b')
                    }}></div>
                  </td>
                  <td>
                    {row.trade_url && (
                      <a href={row.trade_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Nessun mercato trovato</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1}
            className="btn btn-outline" style={{ padding: '4px 12px' }}
          >
            &lt;
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pagina {page} di {totalPages}</span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
            disabled={page === totalPages}
            className="btn btn-outline" style={{ padding: '4px 12px' }}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};

const NewsTab = ({ coinId, symbol }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/news?hours=48&limit=20`, { headers });
        setData(res.data?.news || []);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento notizie");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [coinId]);

  if (loading) return <div className="glass-panel" style={{height:'300px', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;

  if (data.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
        Nessuna notizia recente trovata per {symbol?.toUpperCase()}.<br/>
        Lo scheduler Ailyst aggiornerà le notizie a breve.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {data.map((news, i) => (
        <a 
          key={i} 
          href={news.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="glass-panel"
          style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold' }}>{news.source}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {new Date(news.published_at).toLocaleDateString()}
            </span>
          </div>
          <h4 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {news.title}
          </h4>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center' }}>
            {news.sentiment_label && (
              <span style={{
                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold',
                background: news.sentiment_label === 'bullish' ? 'rgba(34,197,94,0.1)' : (news.sentiment_label === 'bearish' ? 'rgba(239,68,68,0.1)' : 'rgba(156,163,175,0.1)'),
                color: news.sentiment_label === 'bullish' ? '#22c55e' : (news.sentiment_label === 'bearish' ? '#ef4444' : '#9ca3af')
              }}>
                {news.sentiment_label.toUpperCase()}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
};

const PriceChart = ({ coinId }) => {
  const [interval, setIntervalState] = useState('1d'); // 1h, 4h, 1d, 1w, 1mo
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/api/charts/crypto/${coinId}/ohlcv?interval=${interval}`, { headers });
        setData(res.data?.candles || []);
      } catch (err) {
        setError("Errore caricamento grafico prezzi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [coinId, interval]);

  if (error) return <div className="glass-panel text-danger" style={{ height: '300px' }}>{error}</div>;

  const isPositive = data && data.length > 1 ? data[data.length - 1].close >= data[0].close : true;
  const color = isPositive ? '#22c55e' : '#ef4444';

  const formatXAxis = (tickItem) => {
    const d = new Date(tickItem);
    if (interval === '1h') return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '5px' }}>{new Date(d.timestamp).toLocaleString()}</div>
          <div style={{ color: 'white' }}>O: {formatCurrency(d.open, 4)}</div>
          <div style={{ color: 'white' }}>H: {formatCurrency(d.high, 4)}</div>
          <div style={{ color: 'white' }}>L: {formatCurrency(d.low, 4)}</div>
          <div style={{ color: color, fontWeight: 'bold' }}>C: {formatCurrency(d.close, 4)}</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>Vol: {formatLargeNumber(d.volume)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: 'calc(45vh - 40px)', minHeight: '350px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '20px' }}>
          {['1h', '4h', '1d', '1w', '1mo'].map(t => (
            <button
              key={t}
              onClick={() => setIntervalState(t)}
              style={{
                background: interval === t ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: interval === t ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: interval === t ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', zIndex: 10, borderRadius: '8px' }}><div className="spinner"></div></div>}
        
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="timestamp" stroke="var(--text-secondary)" tick={{fontSize: 11}} tickFormatter={formatXAxis} minTickGap={30} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{fontSize: 11}} tickFormatter={(v) => formatLargeNumber(v)} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" orientation="left" hide />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area yAxisId="right" type="monotone" dataKey="close" stroke={color} fillOpacity={1} fill="url(#colorClose)" strokeWidth={2} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="volume" fill="rgba(148, 163, 184, 0.2)" maxBarSize={20} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>Dati grafico non disponibili</div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const TokenomicsAnalysis = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null); // id
  
  const [stats, setStats] = useState(null);
  const [info, setInfo] = useState(null);
  const [loadingBase, setLoadingBase] = useState(false);
  const [errorBase, setErrorBase] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  const [copied, setCopied] = useState(false);

  // Search
  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/tokenomics/search?q=${val}`, { headers });
      setSearchResults(response.data || []);
    } catch (err) {
      console.error("Errore search:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadCoin = async (coinId) => {
    setSearchResults([]);
    setQuery('');
    setSelectedCoin(coinId);
    setActiveTab('info');
    setLoadingBase(true);
    setErrorBase(null);
    setStats(null);
    setInfo(null);

    try {
      const headers = await getAuthHeaders();
      const [statsRes, infoRes] = await Promise.all([
        axios.get(`${API_URL}/api/tokenomics/${coinId}/stats`, { headers }),
        axios.get(`${API_URL}/api/tokenomics/${coinId}/info`, { headers })
      ]);
      setStats(statsRes.data);
      setInfo(infoRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setErrorBase("Sessione scaduta, rieffettua il login.");
      } else {
        setErrorBase("Impossibile caricare i dati. Riprova.");
      }
    } finally {
      setLoadingBase(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convertitore (Sezione 5)
  const [convertAmount, setConvertAmount] = useState('1');
  const convertedValue = useMemo(() => {
    const amount = parseFloat(convertAmount) || 0;
    const price = stats?.price?.usd || 0;
    return formatCurrency(amount * price);
  }, [convertAmount, stats]);

  return (
    <PageTransition>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* TOP SEARCH BAR */}
        <div style={{ position: 'relative', zIndex: 50, marginBottom: '2rem' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: selectedCoin ? '0' : '0 auto' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Cerca una criptovaluta (es. Bitcoin)..." 
              value={query}
              onChange={handleSearch}
              style={{ 
                width: '100%', padding: '1rem 1rem 1rem 3rem', 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', color: 'white', fontSize: '1.05rem',
                outline: 'none', transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            {isSearching && <div className="spinner" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px' }}></div>}
            
            {searchResults.length > 0 && (
              <div style={{ 
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, 
                background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
              }}>
                {searchResults.map((coin) => (
                  <div 
                    key={coin.id} 
                    onClick={() => loadCoin(coin.id)}
                    style={{ 
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', 
                      cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {coin.thumb && <img src={coin.thumb} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
                    <span style={{ fontWeight: 'bold', color: 'white' }}>{coin.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{coin.symbol?.toUpperCase()}</span>
                    {coin.market_cap_rank && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>#{coin.market_cap_rank}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {!selectedCoin && !query && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Suggeriti:</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {['bitcoin', 'ethereum', 'hyperliquid', 'solana'].map(id => (
                  <button 
                    key={id} 
                    onClick={() => loadCoin(id)}
                    className="btn btn-outline" 
                    style={{ borderRadius: '20px', padding: '6px 16px', textTransform: 'capitalize' }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorBase && (
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '2rem' }}>
            <p className="text-danger" style={{ margin: 0, fontWeight: 'bold' }}>{errorBase}</p>
            <button className="btn btn-outline" style={{ marginTop: '1rem', padding: '4px 12px' }} onClick={() => loadCoin(selectedCoin)}>Riprova</button>
          </div>
        )}

        {loadingBase && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ height: '600px' }}><div className="skeleton-shimmer"></div></div>
            <div>
              <div className="glass-panel" style={{ height: '350px', marginBottom: '1rem' }}><div className="skeleton-shimmer"></div></div>
              <div className="glass-panel" style={{ height: '200px' }}><div className="skeleton-shimmer"></div></div>
            </div>
          </div>
        )}

        {selectedCoin && stats && !loadingBase && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
            
            {/* LEFT SIDEBAR (w-72 -> ~288px) */}
            <div style={{ width: '100%', maxWidth: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '20px' }}>
              
              {/* Sezione 1: Header */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  {stats.image && <img src={stats.image} alt={stats.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{stats.name}</h2>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{stats.symbol?.toUpperCase()}</span>
                  <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>
                    Rank #{stats.market_cap_rank || '-'}
                  </span>
                </div>
                
                <div style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                  {formatCurrency(stats.price?.usd)}
                  {stats.price?.change_24h_pct !== null && (
                    <span style={{ 
                      fontSize: '1rem', padding: '4px 8px', borderRadius: '8px',
                      background: stats.price.change_24h_pct >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: stats.price.change_24h_pct >= 0 ? '#22c55e' : '#ef4444'
                    }}>
                      {stats.price.change_24h_pct >= 0 ? '▲' : '▼'} {Math.abs(stats.price.change_24h_pct).toFixed(2)}%
                    </span>
                  )}
                </div>
                {stats.price?.btc && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{stats.price.btc} BTC</div>}
              </div>

              {/* Sezione 2: Range 24h */}
              {stats.price?.low_24h && stats.price?.high_24h && (
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    <span>{formatCurrency(stats.price.low_24h)}</span>
                    <span>24h Range</span>
                    <span>{formatCurrency(stats.price.high_24h)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', position: 'relative' }}>
                    {(() => {
                      const range = stats.price.high_24h - stats.price.low_24h;
                      const current = stats.price.usd - stats.price.low_24h;
                      const pct = Math.max(0, Math.min(100, (current / range) * 100));
                      return <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px' }}></div>;
                    })()}
                  </div>
                </div>
              )}

              {/* Sezione 3: Metriche chiave */}
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
                  {[
                    { label: 'Cap. di mercato', value: stats.market_cap?.formatted },
                    { label: 'Valore dei token in circolazione', value: stats.market_cap?.formatted },
                    { label: 'Valut. 100% diluita', value: stats.fdv?.formatted },
                    { label: 'Volume scambi 24h', value: stats.volume_24h?.formatted },
                    { label: 'Valore totale bloccato (TVL)', value: stats.tvl?.formatted },
                    { label: 'Offerta in circ.', value: stats.supply?.circulating_formatted },
                    { label: 'Offerta totale', value: stats.supply?.total_formatted },
                    { label: 'Offerta massima', value: stats.supply?.max_formatted || 'Illimitato' }
                  ].map((m, i) => m.value ? (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><WithTooltip label={m.label} /></span>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{m.value}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Sezione 4: Info */}
              {info && (
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Info Progetto</h4>
                  
                  {info.contracts && info.contracts.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><WithTooltip label="Contratto" /></span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.8rem' }}>{info.contracts[0].address.substring(0,6)}...{info.contracts[0].address.slice(-4)}</span>
                        <button onClick={() => copyToClipboard(info.contracts[0].address)} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}>
                          {copied ? <Check size={14} color="var(--success)"/> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {info.links?.website && (
                      <a href={info.links.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', textDecoration: 'none', fontSize: '0.85rem' }}>
                        <Globe size={14} color="var(--text-secondary)" /> <WithTooltip label="Sito web" /> <ExternalLink size={12} style={{marginLeft:'auto'}}/>
                      </a>
                    )}
                    {info.links?.whitepaper && (
                      <a href={info.links.whitepaper} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', textDecoration: 'none', fontSize: '0.85rem' }}>
                        <FileText size={14} color="var(--text-secondary)" /> Whitepaper <ExternalLink size={12} style={{marginLeft:'auto'}}/>
                      </a>
                    )}
                    {info.links?.explorers && info.links.explorers[0] && (
                      <a href={info.links.explorers[0]} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', textDecoration: 'none', fontSize: '0.85rem' }}>
                        <Search size={14} color="var(--text-secondary)" /> <WithTooltip label="Str. esploraz." /> <ExternalLink size={12} style={{marginLeft:'auto'}}/>
                      </a>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}><WithTooltip label="Comunità" /></span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {info.links?.twitter && <a href={info.links.twitter} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>Twitter</a>}
                      {info.links?.telegram && <a href={info.links.telegram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}><MessageCircle size={16} /></a>}
                    </div>
                  </div>

                  {info.categories && info.categories.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}><WithTooltip label="Categorie" /></span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {info.categories.slice(0,3).map(c => (
                          <span key={c} style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sezione 5: Convertitore */}
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Convertitore</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                  <img src={stats.image} alt="" style={{width:'20px', borderRadius:'50%'}}/>
                  <span style={{fontWeight:'bold'}}>{stats.symbol?.toUpperCase()}</span>
                  <input 
                    type="number" 
                    value={convertAmount} 
                    onChange={e => setConvertAmount(e.target.value)}
                    style={{ background:'transparent', border:'none', color:'white', width:'100%', textAlign:'right', outline:'none', fontSize:'1rem' }}
                  />
                </div>
                <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-secondary)' }}>=</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                  <span style={{fontWeight:'bold'}}>USD</span>
                  <div style={{ width:'100%', textAlign:'right', fontSize:'1rem' }}>{convertedValue}</div>
                </div>
              </div>

              {/* Sezione 6: Prezzo storico */}
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Storico</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}><WithTooltip label="Massimo storico (ATH)" /></span>
                  <div style={{ textAlign: 'right' }}>
                    <div>{formatCurrency(stats.ath?.usd)} <span style={{ color: '#ef4444' }}>{formatNumber(stats.ath?.change_pct)}%</span></div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stats.ath?.date ? new Date(stats.ath.date).toLocaleDateString() : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}><WithTooltip label="Minimo storico (ATL)" /></span>
                  <div style={{ textAlign: 'right' }}>
                    <div>{formatCurrency(stats.atl?.usd)} <span style={{ color: '#22c55e' }}>+{formatNumber(stats.atl?.change_pct)}%</span></div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stats.atl?.date ? new Date(stats.atl.date).toLocaleDateString() : ''}</div>
                  </div>
                </div>
              </div>

              {/* Sezione 7: Sentiment */}
              {stats.sentiment && (stats.sentiment.up_pct > 0 || stats.sentiment.down_pct > 0) && (
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sentiment Community</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: '#22c55e' }}>Bullish {Math.round(stats.sentiment.up_pct)}%</span>
                    <span style={{ color: '#ef4444' }}>Bearish {Math.round(stats.sentiment.down_pct)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.sentiment.up_pct}%`, background: '#22c55e' }}></div>
                    <div style={{ width: `${stats.sentiment.down_pct}%`, background: '#ef4444' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* MAIN PANEL (flex-1) */}
            <div style={{ flex: 1, minWidth: '0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* PRICE CHART */}
              <PriceChart coinId={selectedCoin} />

              {/* Variazioni percentuali barra */}
              {stats.price_changes && (
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                  {[
                    { label: '1h', val: stats.price_changes['1h'] },
                    { label: '24h', val: stats.price_changes['24h'] },
                    { label: '7g', val: stats.price_changes['7d'] },
                    { label: '14g', val: stats.price_changes['14d'] },
                    { label: '30g', val: stats.price_changes['30d'] },
                    { label: '1a', val: stats.price_changes['1y'] }
                  ].map(c => c.val !== null && c.val !== undefined && (
                    <div key={c.label} style={{ 
                      background: 'var(--surface)', border: '1px solid var(--border)', 
                      padding: '8px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}><WithTooltip label={c.label} /></span>
                      <span style={{ 
                        fontWeight: 'bold', fontSize: '0.9rem',
                        color: c.val >= 0 ? '#22c55e' : '#ef4444' 
                      }}>
                        {c.val >= 0 ? '+' : ''}{formatNumber(c.val)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* TABS NAV */}
              <div style={{ 
                display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none'
              }}>
                {[
                  { id: 'info', label: 'Informazioni' },
                  { id: 'tokenomics', label: 'Tokenomics' },
                  { id: 'financial', label: 'Dati Finanziari' },
                  { id: 'markets', label: 'Mercati' },
                  { id: 'news', label: 'Notizie' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                      color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                      padding: '12px 16px',
                      fontSize: '1rem',
                      fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT */}
              <div style={{ minHeight: '400px' }}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeTab === 'info' && <InfoTab info={info} symbol={stats.symbol} />}
                  {activeTab === 'tokenomics' && <TokenomicsTab coinId={selectedCoin} symbol={stats.symbol} />}
                  {activeTab === 'financial' && <FinancialTab coinId={selectedCoin} symbol={stats.symbol} volumeFormatted={stats.volume_24h?.formatted} />}
                  {activeTab === 'markets' && <MarketsTab coinId={selectedCoin} />}
                  {activeTab === 'news' && <NewsTab coinId={selectedCoin} symbol={stats.symbol} />}
                </motion.div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PageTransition>
  );
};

export default TokenomicsAnalysis;
