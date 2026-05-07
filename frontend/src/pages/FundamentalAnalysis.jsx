import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, Download, FileText, TrendingUp, DollarSign, Activity, PieChart, Info } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import PageTransition from '../components/PageTransition';

const WickShape = (props) => {
  const { x, y, width, height, payload } = props;
  const isGrowing = payload.close >= payload.open;
  const color = isGrowing ? 'var(--success)' : 'var(--danger)';
  return (
    <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke={color} strokeWidth={2} />
  );
};

const BodyShape = (props) => {
  const { x, y, width, height, payload } = props;
  const isGrowing = payload.close >= payload.open;
  const color = isGrowing ? 'var(--success)' : 'var(--danger)';
  return (
    <rect x={x} y={y} width={width} height={Math.max(height, 1)} fill={color} stroke={color} />
  );
};

const formatLargeNumber = (num) => {
  if (num === null || num === undefined) return 'N/D';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  return num.toLocaleString();
};

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const metricDescriptions = {
  "P/E (TTM)": "Price to Earnings: indica quanto il mercato è disposto a pagare per 1$ di utile. Un valore alto può indicare un'azienda sopravvalutata o con alte aspettative di crescita.",
  "P/B": "Price to Book: confronta il valore di mercato dell'azienda con il suo valore contabile. Utile per individuare aziende potenzialmente sottovalutate.",
  "ROE %": "Return on Equity: misura la redditività del capitale proprio. Indica in percentuale quanto profitto l'azienda genera con i soldi degli azionisti.",
  "Margine Netto %": "Margine di Profitto: percentuale di ricavi che si traduce in utile netto dopo tutte le spese. Misura l'efficienza complessiva dell'azienda.",
  "Debt/Equity": "Rapporto Debito/Capitale: indica la proporzione di debito rispetto al capitale degli azionisti. Valori alti (spesso > 2) indicano maggior rischio finanziario.",
  "Div. Yield %": "Rendimento del Dividendo: il rapporto percentuale tra il dividendo annuale per azione e il prezzo dell'azione. Indica il flusso di cassa annuo generato dall'investimento.",

  "Prezzo Corrente": "L'ultimo prezzo a cui è stata scambiata l'azione nel mercato.",
  "Prezzo Precedente (52W Max)": "Il prezzo più alto raggiunto dall'azione nelle ultime 52 settimane (1 anno).",
  "Prezzo Precedente (52W Min)": "Il prezzo più basso raggiunto dall'azione nelle ultime 52 settimane.",
  "Media Mobile 50 giorni": "Il prezzo medio dell'azione calcolato sugli ultimi 50 giorni di contrattazione. Utilizzato per individuare il trend di breve/medio termine.",
  "Media Mobile 200 giorni": "Il prezzo medio dell'azione calcolato sugli ultimi 200 giorni. È uno degli indicatori principali per definire il trend di lungo termine.",
  "Market Cap": "Capitalizzazione di Mercato: il valore totale di tutte le azioni in circolazione. Si calcola moltiplicando il prezzo attuale per il numero totale di azioni.",
  "Enterprise Value": "Valore dell'Impresa (EV): una stima completa del valore dell'azienda. Somma la Market Cap al debito totale e sottrae la cassa disponibile.",
  "Volume (media 10gg)": "Il numero medio di azioni scambiate giornalmente negli ultimi 10 giorni. Indica la liquidità e l'interesse a breve termine.",
  "Beta (volatilità vs mercato)": "Misura la volatilità dell'azione rispetto all'intero mercato. Un Beta > 1 indica che l'azione è più volatile del mercato, < 1 meno volatile.",
  "Numero Azioni in Circolazione": "Il totale complessivo delle azioni emesse dalla società e detenute dagli investitori.",
  "Float (azioni liberamente scambiabili)": "La porzione di azioni in circolazione che è effettivamente disponibile per la compravendita sul mercato pubblico (esclude le azioni bloccate).",
  "Short Ratio (% azioni vendute allo scoperto)": "La percentuale di azioni float che sono state vendute allo scoperto da investitori che scommettono su un ribasso del prezzo.",

  "P/E Ratio (TTM)": "Price to Earnings calcolato sugli utili degli ultimi 12 mesi (Trailing Twelve Months). Indica quanto si paga per 1 dollaro di utili passati.",
  "P/E Ratio (Forward)": "Price to Earnings calcolato sulle stime degli utili futuri (prossimo anno fiscale). Indica quanto si paga per 1 dollaro di utili previsti.",
  "P/B Ratio": "Price to Book: confronta il valore di mercato dell'azienda con il valore netto dei suoi asset iscritti a bilancio.",
  "P/S Ratio": "Price to Sales: confronta il valore di mercato con i ricavi (vendite) generati. Utile per valutare aziende che non fanno ancora utili.",
  "EV/EBITDA": "Enterprise Value su EBITDA: valuta l'azienda indipendentemente dalla struttura del capitale e dalle tasse. Multiplo molto usato per le acquisizioni.",
  "EV/Revenue": "Enterprise Value su Ricavi: valuta l'intero business (incluso il debito) rispetto al fatturato generato. Usato spesso per startup e aziende growth.",
  "PEG Ratio": "Price/Earnings to Growth: unisce il P/E ratio alla crescita attesa degli utili. Un PEG < 1 suggerisce che l'azione potrebbe essere sottovalutata rispetto alla sua crescita.",

  "ROE (Return on Equity)": "Ritorno sul capitale proprio: quanto utile netto l'azienda genera per ogni dollaro investito dagli azionisti.",
  "ROA (Return on Assets)": "Ritorno sugli asset: l'efficienza con cui l'azienda utilizza le sue risorse (asset) totali per generare profitti.",
  "Margine Lordo (Gross Margin)": "La percentuale di ricavi che rimane dopo aver sottratto i costi diretti dei beni venduti (COGS). Misura l'efficienza produttiva base.",
  "Margine Operativo (Op. Margin)": "La percentuale di ricavi che rimane dopo aver pagato tutti i costi operativi (es. stipendi, affitti, marketing). Esclude tasse e interessi.",
  "Margine Netto (Profit Margin)": "L'utile netto espresso come percentuale del fatturato. Rappresenta quanto l'azienda guadagna effettivamente da ogni dollaro incassato.",
  "EBITDA": "Earnings Before Interest, Taxes, Depreciation, and Amortization. Misura la redditività operativa pura, escludendo oneri finanziari, tasse e svalutazioni.",

  "Debito Totale": "La somma di tutti i debiti (a breve e lungo termine) che l'azienda deve ripagare a banche o obbligazionisti.",
  "Cassa Totale": "Tutta la liquidità e gli equivalenti (investimenti a brevissimo termine) immediatamente disponibili per l'azienda.",
  "Debt/Equity Ratio": "Rapporto Debito/Capitale: misura la leva finanziaria. Un valore alto indica che la società è pesantemente finanziata dai creditori.",
  "Current Ratio": "Indice di liquidità corrente (Attività correnti / Passività correnti). Misura la capacità di ripagare i debiti a breve termine. Idealmente > 1.",
  "Quick Ratio": "Indice di liquidità secca: simile al Current Ratio ma esclude il magazzino (le scorte) che potrebbe non essere rapidamente liquidabile.",
  "Free Cash Flow": "Il flusso di cassa libero: i soldi che rimangono dopo aver pagato le spese operative e investimenti di capitale (CapEx).",
  "Operating Cash Flow": "Il flusso di cassa generato dalle attività operative core (vendita di prodotti o servizi), al netto dei costi di gestione.",

  "Crescita Ricavi (YoY)": "Year-over-Year Revenue Growth: l'incremento percentuale dei ricavi rispetto all'anno precedente.",
  "Crescita Utile Netto (YoY)": "Incremento percentuale dell'utile netto rispetto allo stesso periodo dell'anno precedente.",
  "Crescita EPS (5Y)": "Crescita media annuale dell'utile per azione (EPS) negli ultimi 5 anni.",
  "Ricavi Totali (TTM)": "Il totale delle vendite generate dall'azienda negli ultimi 12 mesi (Trailing Twelve Months).",
  "Utile Netto (TTM)": "Il profitto totale (ricavi meno tutte le spese e tasse) realizzato dall'azienda negli ultimi 12 mesi.",
  "EPS (TTM)": "Utile per Azione degli ultimi 12 mesi. Quanto utile spetta a ogni singola azione in circolazione.",
  "EPS (Forward)": "Utile per Azione stimato per il prossimo anno. Si basa sulle previsioni degli analisti.",

  "Dividend Yield (%)": "Il rendimento percentuale annuale del dividendo rispetto al prezzo corrente dell'azione. Indica quanto l'azienda paga in dividendi in rapporto al suo valore.",
  "Dividend Rate (annuo)": "La stima dell'importo totale del dividendo che verrà pagato per ogni singola azione nel corso dell'anno.",
  "Payout Ratio": "La percentuale degli utili netti che l'azienda distribuisce agli azionisti sotto forma di dividendi. Un valore troppo alto (es. > 80%) può indicare che il dividendo non è sostenibile.",
  "Ex-Dividend Date": "La data di stacco del dividendo. Per aver diritto a ricevere il prossimo dividendo, devi possedere l'azione prima di questa data.",
  "5Y Avg Dividend Yield": "Il rendimento medio annuo del dividendo calcolato sugli ultimi 5 anni. Utile per capire se il rendimento attuale è anomalo o in linea con lo storico."
};
const MercatoTab = ({ ticker, isActive }) => {
  const [period, setPeriod] = useState('1y');
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
        const [historyRes, marketRes] = await Promise.all([
          axios.get(`${API_URL}/api/fundamental/${ticker}/price-history?period=${period}`),
          axios.get(`${API_URL}/api/fundamental/${ticker}/market`)
        ]);
        
        const history = historyRes.data.map(d => ({
          ...d,
          wick: [d.low, d.high],
          body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
          isGrowing: d.close >= d.open
        }));
        
        setData({ period, history, market: marketRes.data.metrics || [] });
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati di mercato");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, period, data]);

  if (!isActive) return null;

  if (isLoading && !data) {
    return (
      <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
        <div className="glass-panel" style={{ height: '400px', position: 'relative', overflow: 'hidden' }}>
          <div className="skeleton-shimmer"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="glass-panel text-danger">{error}</div>;
  }

  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button className={`btn ${period === '1y' ? '' : 'btn-outline'}`} onClick={() => setPeriod('1y')}>1 Anno</button>
        <button className={`btn ${period === '5y' ? '' : 'btn-outline'}`} onClick={() => setPeriod('5y')}>5 Anni</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ height: '400px', width: '100%' }}>
          <h3 style={{ marginBottom: '1rem' }}>Prezzo & Medie Mobili</h3>
          <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={data.history} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Legend />
              
              <Bar dataKey="wick" shape={<WickShape />} isAnimationActive={false} name="Range (H/L)" />
              <Bar dataKey="body" shape={<BodyShape />} isAnimationActive={false} name="Corpo (O/C)" />
              
              <Line type="monotone" dataKey="ma_50" stroke="#f97316" dot={false} strokeWidth={2} name="MA 50" />
              <Line type="monotone" dataKey="ma_200" stroke="#3b82f6" dot={false} strokeWidth={2} name="MA 200" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={{ height: '250px', width: '100%' }}>
          <h3 style={{ marginBottom: '1rem' }}>Volume</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={data.history} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fontSize: 12}} hide />
              <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
              />
              <Bar dataKey="volume" fill="rgba(148, 163, 184, 0.5)" name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Dati di Mercato Aggiuntivi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {data.market.map((m, i) => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {metricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ValutazioneTab = ({ ticker, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/valuation`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati di valutazione");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ flex: '1 1 300px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Metriche di Valutazione</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {metricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ flex: '1 1 400px', height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1rem' }}>Score Normalizzato (100 = Conveniente)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.radar_data}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Valutazione" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.5} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
            </RadarChart>
          </ResponsiveContainer>
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

const RedditivitaTab = ({ ticker, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/profitability`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati di redditività");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Metriche di Redditività</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {metricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ height: '350px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Trend Ricavi & Utile</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.annual_pl_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="year" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
              <Legend />
              <Bar dataKey="revenue_b" name="Ricavi (B)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net_income_b" name="Utile Netto (B)" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Analisi Redditività</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const SaluteTab = ({ ticker, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/health`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati di salute");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  const deMetric = data.metrics?.find(m => m.label.includes('Debt/Equity'));
  const deValue = deMetric ? Math.min(parseFloat(deMetric.value) || 0, 5) : 0;
  const gaugeData = [
    { name: 'Value', value: deValue, fill: deValue > 2 ? 'var(--danger)' : (deValue > 1 ? '#f59e0b' : 'var(--success)') },
    { name: 'Remaining', value: Math.max(5 - deValue, 0), fill: 'rgba(255,255,255,0.05)' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1rem' }}>Metriche e Debt/Equity</h3>
          <div style={{ display: 'flex', justifyContent: 'center', height: '150px', marginBottom: '1rem', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={gaugeData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                  {gaugeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '70%', textAlign: 'center', transform: 'translateY(-50%)' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{deMetric ? deMetric.formatted : 'N/D'}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Debt / Equity</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {metricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ height: '350px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Trend Cash Flow</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.annual_cashflow_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="year" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
              <Legend />
              <Bar dataKey="operating_cf_b" name="Operating CF (B)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="free_cf_b" name="Free CF (B)" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: '#f59e0b' }}>Analisi Salute Finanziaria</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const CrescitaTab = ({ ticker, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/growth`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati di crescita");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  const epsData = [
    { name: 'EPS TTM', value: data.eps?.trailing || 0, fill: 'var(--accent)' },
    { name: 'EPS Forward', value: data.eps?.forward || 0, fill: 'var(--success)' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Metriche di Crescita</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {metricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
          <h3 style={{ margin: '2rem 0 1rem 0' }}>EPS Attuale vs Stimato</h3>
          <div style={{ height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={epsData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {epsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Ricavi Trimestrali</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.quarterly_revenue} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="quarter" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
              <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} tickFormatter={v => (v/1e9).toFixed(1)+'B'} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                formatter={(val, name, props) => [props.payload.revenue_formatted || val, "Ricavi"]}
              />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

const DividendiTab = ({ ticker, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/dividends`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati dividendi");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Metriche Dividendo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {data.metrics && data.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div className="metric-tooltip-container" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.label}</span>
                  {metricDescriptions[m.label] && (
                    <>
                      <Info size={14} style={{ opacity: 0.7 }} />
                      <div className="metric-tooltip-text">{metricDescriptions[m.label]}</div>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 'bold' }}>{m.formatted || m.value || 'N/D'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ height: '350px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Dividendi Annuali Storici</h3>
          {data.annual_dividends && data.annual_dividends.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={data.annual_dividends} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="year" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Bar dataKey="value" name="Dividendo ($)" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
              Nessun dividendo distribuito
            </div>
          )}
        </div>
      </div>
      {data.comment && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', color: '#8b5cf6' }}>Analisi Dividendi</h3>
          <div className="analysis-comment-box" dangerouslySetInnerHTML={{ __html: data.comment.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </motion.div>
  );
};

const BilanciTab = ({ ticker, isActive }) => {
  const [type, setType] = useState('income');
  const [cache, setCache] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive) return;
    if (cache[type]) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/financials?type=${type}`);
        setCache(prev => ({ ...prev, [type]: res.data }));
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento bilanci");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, type, cache]);

  if (!isActive) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button className={`btn ${type === 'income' ? '' : 'btn-outline'}`} onClick={() => setType('income')}>Conto Economico</button>
        <button className={`btn ${type === 'balance' ? '' : 'btn-outline'}`} onClick={() => setType('balance')}>Stato Patrimoniale</button>
        <button className={`btn ${type === 'cashflow' ? '' : 'btn-outline'}`} onClick={() => setType('cashflow')}>Cash Flow</button>
      </div>
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Tutti i valori in miliardi di unità valutaria (B = Miliardi)</div>
        {isLoading && !cache[type] ? (
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>
        ) : error ? (
          <div className="text-danger">{error}</div>
        ) : cache[type] ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 'bold' }}>Voce</th>
                {cache[type].columns.map(col => (
                  <th key={col} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(cache[type].rows).map(([rowName, values], idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{rowName}</td>
                  {values.map((v, i) => (
                    <td key={i} style={{ padding: '0.8rem 1rem' }}>{formatLargeNumber(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </motion.div>
  );
};

const AzionistiTab = ({ ticker, isActive }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || data) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/fundamental/${ticker}/holders`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Errore caricamento dati azionisti");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker, isActive, data]);

  if (!isActive) return null;
  if (isLoading && !data) return <div className="glass-panel" style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  if (error) return <div className="glass-panel text-danger">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Raccomandazioni Analisti</h3>
        {data.recommendations && data.recommendations.length > 0 ? (
          <div style={{ height: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.recommendations} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="period" type="category" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Legend />
                <Bar dataKey="strongBuy" name="Strong Buy" stackId="a" fill="#064e3b" />
                <Bar dataKey="buy" name="Buy" stackId="a" fill="var(--success)" />
                <Bar dataKey="hold" name="Hold" stackId="a" fill="#f59e0b" />
                <Bar dataKey="sell" name="Sell" stackId="a" fill="#f97316" />
                <Bar dataKey="strongSell" name="Strong Sell" stackId="a" fill="var(--danger)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)' }}>Nessuna raccomandazione disponibile</div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>Azionisti Principali</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <tbody>
              {data.major_holders && data.major_holders.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{(parseFloat(h.Breakdown) * 100).toFixed(2)}%</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>{h.Value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>Azionisti Istituzionali (Top 10)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>Azionista</th>
                <th style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {data.institutional_holders && data.institutional_holders.slice(0, 10).map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{h.Holder}</td>
                  <td style={{ padding: '0.8rem' }}>{(h.Shares / 1e6).toFixed(2)} M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const EsportaTab = ({ ticker, handleExport, isActive }) => {
  if (!isActive) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleExport('pdf')} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}>
          <FileText size={64} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3>Scarica Report PDF</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Genera un report formattato e impaginato, ideale per la stampa e la condivisione.</p>
          <button className="btn" style={{ width: '100%' }}>Esporta PDF</button>
        </div>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleExport('word')} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}>
          <Download size={64} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
          <h3>Scarica Report Word</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Genera un report editabile in formato DOCX, ideale per modifiche e presentazioni.</p>
          <button className="btn" style={{ width: '100%' }}>Esporta Word</button>
        </div>
      </div>
    </motion.div>
  );
};

const FundamentalAnalysis = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sommario');
  const [tabDataCache, setTabDataCache] = useState({});

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
    setActiveTab('sommario');
    setTabDataCache({});

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
              { id: 'mercato', label: 'Mercato' },
              { id: 'valutazione', label: 'Valutazione' },
              { id: 'redditivita', label: 'Redditività' },
              { id: 'salute', label: 'Salute Finanziaria' },
              { id: 'crescita', label: 'Crescita' },
              { id: 'dividendi', label: 'Dividendi' },
              { id: 'bilanci', label: 'Bilanci' },
              { id: 'azionisti', label: 'Azionisti' },
              { id: 'esporta', label: 'Esporta' }
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
                  borderLeft: activeTab === tab.id ? '4px solid var(--accent)' : '4px solid transparent',
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
          
          <MercatoTab ticker={data.ticker} isActive={activeTab === 'mercato'} />
          <ValutazioneTab ticker={data.ticker} isActive={activeTab === 'valutazione'} />
          <RedditivitaTab ticker={data.ticker} isActive={activeTab === 'redditivita'} />
          <SaluteTab ticker={data.ticker} isActive={activeTab === 'salute'} />
          <CrescitaTab ticker={data.ticker} isActive={activeTab === 'crescita'} />
          <DividendiTab ticker={data.ticker} isActive={activeTab === 'dividendi'} />
          <BilanciTab ticker={data.ticker} isActive={activeTab === 'bilanci'} />
          <AzionistiTab ticker={data.ticker} isActive={activeTab === 'azionisti'} />
          <EsportaTab ticker={data.ticker} handleExport={handleExport} isActive={activeTab === 'esporta'} />

        </motion.div>
      )}
    </PageTransition>
  );
};

export default FundamentalAnalysis;
