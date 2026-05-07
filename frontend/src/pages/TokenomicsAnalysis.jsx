import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, Download, FileText, Database, Users, GitCommit, DollarSign, Info } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import PageTransition from '../components/PageTransition';

const formatLargeNumber = (num) => {
  if (num === null || num === undefined) return 'N/D';
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  return num.toLocaleString();
};

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const cryptoMetricDescriptions = {
  "Market Cap": "Capitalizzazione di mercato: il valore totale di tutte le monete attualmente in circolazione. Si calcola moltiplicando il prezzo attuale per la circulating supply.",
  "Fully Diluted Valuation": "Valutazione Completamente Diluita (FDV): la capitalizzazione di mercato teorica se l'intera fornitura massima (Max Supply) fosse già in circolazione.",
  "Volume (24h)": "Il volume totale di scambi per questa criptovaluta in tutti gli exchange tracciati nelle ultime 24 ore.",
  "Rapporto Vol/MCap": "Il rapporto tra il volume scambiato in 24h e la capitalizzazione di mercato. Un valore alto indica alta liquidità.",
  
  "Circulating Supply": "La quantità di monete che circolano attualmente nel mercato e sono negoziabili dal pubblico.",
  "Total Supply": "La quantità totale di monete che sono state create, meno quelle che sono state 'bruciate' (distrutte).",
  "Max Supply": "Il numero massimo assoluto di monete che esisteranno mai nella vita della criptovaluta.",
  
  "All Time High (ATH)": "Il prezzo più alto mai raggiunto dalla criptovaluta nella sua storia.",
  "Distanza da ATH": "La percentuale di perdita rispetto al prezzo massimo storico (All Time High).",
  "All Time Low (ATL)": "Il prezzo più basso mai raggiunto nella sua storia.",
  "Distanza da ATL": "La percentuale di guadagno rispetto al prezzo minimo storico (All Time Low).",
  "Variazione Prezzo (24h)": "La variazione percentuale del prezzo nelle ultime 24 ore.",
  "Variazione Prezzo (7d)": "La variazione percentuale del prezzo negli ultimi 7 giorni.",
  "Variazione Prezzo (30d)": "La variazione percentuale del prezzo negli ultimi 30 giorni.",
  "Variazione Prezzo (1y)": "La variazione percentuale del prezzo nell'ultimo anno.",
  
  "Forks": "Il numero di volte in cui il codice sorgente del progetto è stato 'clonato' da altri sviluppatori su GitHub.",
  "Stars": "Il numero di 'Mi piace' (Stelle) ricevuti dal repository del codice sorgente su GitHub, indice di popolarità tra gli sviluppatori.",
  "Subscribers": "Il numero di sviluppatori che seguono attivamente gli aggiornamenti del codice sorgente.",
  "Total Issues": "Il numero di problemi segnalati, bug o richieste di funzionalità nel tracker del progetto.",
  "Closed Issues": "Il numero di problemi risolti e chiusi. Un alto tasso di chiusura indica uno sviluppo attivo e tempestivo.",
  "Pull Requests Merged": "Le proposte di modifica al codice scritte da vari collaboratori che sono state revisionate ed integrate con successo.",
  "Commit Count (4 Weeks)": "Il numero totale di aggiornamenti/salvataggi di codice effettuati dagli sviluppatori nelle ultime 4 settimane. Misura l'attività di programmazione recente.",
  
  "Twitter Followers": "Il numero di follower dell'account Twitter ufficiale del progetto.",
  "Reddit Subscribers": "Il numero di utenti iscritti al subreddit ufficiale (community Reddit).",
  "Telegram Users": "Il numero di membri nel canale/gruppo Telegram principale del progetto."
};

const ValutazioneTab = ({ coinId, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/valuation`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coinId, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Metriche di Valutazione</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {data.metrics && data.metrics.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{m.label}</span>
                {cryptoMetricDescriptions[m.label] && (
                  <>
                    <Info size={14} style={{ opacity: 0.7 }} />
                    <div className="metric-tooltip-text">{cryptoMetricDescriptions[m.label]}</div>
                  </>
                )}
              </div>
              <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
            </div>
          ))}
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Analisi Valutazione</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const TokenomicsTab = ({ coinId, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/tokenomics`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coinId, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  let circ = 0;
  let total = 0;
  data.metrics?.forEach(m => {
    if (m.label.toLowerCase().includes('circolante')) circ = parseFloat(m.value) || 0;
    if (m.label.toLowerCase().includes('totale')) total = parseFloat(m.value) || 0;
  });
  const locked = total > circ ? total - circ : 0;
  
  const pieData = [
    { name: 'Supply Circolante', value: circ, fill: '#00E5FF' },
    { name: 'Supply Bloccata/Futura', value: locked, fill: 'rgba(255,255,255,0.1)' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Metriche Supply</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {cryptoMetricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{cryptoMetricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ height: '300px' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Distribuzione Supply</h3>
          {circ > 0 && total > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <RechartsPieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} formatter={(val) => formatLargeNumber(val)} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
             <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                Dati supply non completi
             </div>
          )}
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: '#f59e0b' }}>Analisi Tokenomics</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const OnChainTab = ({ coinId, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/onchain`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coinId, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Metriche On-Chain & Mercato</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {data.metrics && data.metrics.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{m.label}</span>
                {cryptoMetricDescriptions[m.label] && (
                  <>
                    <Info size={14} style={{ opacity: 0.7 }} />
                    <div className="metric-tooltip-text">{cryptoMetricDescriptions[m.label]}</div>
                  </>
                )}
              </div>
              <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
            </div>
          ))}
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Analisi On-Chain</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const DeveloperTab = ({ coinId, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/developer`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coinId, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  const barData = data.metrics?.filter(m => !m.label.includes('Commits')).map(m => ({
    name: m.label,
    value: parseFloat(m.value) || 0
  })) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Metriche Sviluppatori</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {cryptoMetricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{cryptoMetricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ height: '300px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Statistiche GitHub</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
              Nessun dato GitHub disponibile
            </div>
          )}
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: '#8b5cf6' }}>Analisi Attività Developer</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const CommunityTab = ({ coinId, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/community`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coinId, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  const barData = data.metrics?.map(m => ({
    name: m.label.split(' ')[0],
    value: parseFloat(m.value) || 0
  })) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Metriche Community</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {cryptoMetricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{cryptoMetricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ height: '300px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Followers / Utenti</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <BarChart layout="vertical" data={barData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" tick={{fontSize: 12}} tickFormatter={(v) => formatLargeNumber(v)} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} formatter={(val) => formatLargeNumber(val)} />
                <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
              Nessun dato community disponibile
            </div>
          )}
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: '#ec4899' }}>Analisi Community</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const StoricoPrezziTab = ({ coinId, isActive }) => {
  const [period, setPeriod] = useState(365);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive) return;
    if (data && data.period === period) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/tokenomics/${coinId}/price-history?days=${period}`);
        setData({ period, history: res.data });
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati storici");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coinId, isActive, period, data]);

  if (!isActive) return null;

  if (isLoading && !data) {
    return (
      <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button className={`btn ${period === 30 ? '' : 'btn-outline'}`} onClick={() => setPeriod(30)}>30 Giorni</button>
        <button className={`btn ${period === 90 ? '' : 'btn-outline'}`} onClick={() => setPeriod(90)}>90 Giorni</button>
        <button className={`btn ${period === 365 ? '' : 'btn-outline'}`} onClick={() => setPeriod(365)}>1 Anno</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ height: '400px', width: '100%' }}>
          <h3 style={{ marginBottom: '1rem' }}>Prezzo</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.history} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                formatter={(val) => `$${parseFloat(val).toFixed(2)}`}
              />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#00E5FF" dot={false} strokeWidth={2} name="Prezzo ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={{ height: '250px', width: '100%' }}>
          <h3 style={{ marginBottom: '1rem' }}>Volume</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={data.history} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fontSize: 12}} hide />
              <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} tickFormatter={(v) => formatLargeNumber(v)} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                formatter={(val) => formatLargeNumber(val)}
              />
              <Bar dataKey="volume" fill="rgba(148, 163, 184, 0.5)" name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

const TokenomicsAnalysis = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sommario');

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
    setActiveTab('sommario');

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

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '0.5rem',
            marginBottom: '2rem',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border) transparent'
          }}>
            {[
              { id: 'sommario', label: 'Sommario' },
              { id: 'valutazione', label: 'Valutazione' },
              { id: 'tokenomics', label: 'Tokenomics & Supply' },
              { id: 'onchain', label: 'On-Chain & Mercato' },
              { id: 'developer', label: 'Developer Activity' },
              { id: 'community', label: 'Community' },
              { id: 'storico', label: 'Storico Prezzi' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'var(--surface)',
                  border: 'none',
                  borderRadius: '8px',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  borderLeft: activeTab === tab.id ? '4px solid #00E5FF' : '4px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'sommario' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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

          <ValutazioneTab coinId={data.coin_id} isActive={activeTab === 'valutazione'} />
          <TokenomicsTab coinId={data.coin_id} isActive={activeTab === 'tokenomics'} />
          <OnChainTab coinId={data.coin_id} isActive={activeTab === 'onchain'} />
          <DeveloperTab coinId={data.coin_id} isActive={activeTab === 'developer'} />
          <CommunityTab coinId={data.coin_id} isActive={activeTab === 'community'} />
          <StoricoPrezziTab coinId={data.coin_id} isActive={activeTab === 'storico'} />

        </motion.div>
      )}
    </PageTransition>
  );
};

export default TokenomicsAnalysis;
