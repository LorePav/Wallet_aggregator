import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ComposedChart, Bar, Scatter, ReferenceLine } from 'recharts'
import '../index.css'


export const PortfolioContext = createContext();

export const usePortfolioContext = () => useContext(PortfolioContext);

// Global Palette
export const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#1e40af', '#047857', '#b91c1c', '#6d28d9',
  '#d946ef', '#0ea5e9', '#64748b', '#22c55e', '#a855f7'
];

export const CustomLegend = ({ customPayload, hiddenItems, onToggle, onHover, onHoverLeave, onColorChange, onReorder }) => {
  return (
    <div className="legend-scrollable" style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {customPayload.map((entry, index) => {
        const isHidden = hiddenItems && hiddenItems[entry.value];
        return (
          <div
            key={`item-${index}`}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', index); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
              if (!isNaN(dragIndex) && onReorder) {
                onReorder(dragIndex, index);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px', borderRadius: '6px',
              background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
              cursor: 'grab', opacity: isHidden ? 0.5 : 1, transition: 'all 0.2s'
            }}
            onMouseEnter={() => onHover && onHover(entry.value)}
            onMouseLeave={() => onHoverLeave && onHoverLeave()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onToggle && onToggle(entry.value)}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: isHidden ? '#4b5563' : entry.color }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{entry.value}</span>
            </div>
            <input
              type="color"
              value={entry.color}
              onChange={(e) => onColorChange && onColorChange(entry.value, e.target.value)}
              style={{ width: '20px', height: '20px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              title="Cambia colore"
            />
          </div>
        );
      })}
    </div>
  );
};

export const PortfolioProvider = ({ children }) => {

  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem('themeColor') || '#3b82f6';
  });
  const [themeBg, setThemeBg] = useState(() => {
    return localStorage.getItem('themeBg') || '#0b0f19';
  });
  const [themeFont, setThemeFont] = useState(() => {
    return localStorage.getItem('themeFont') || "'Inter', sans-serif";
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', themeColor);

    // Convert hex to Rgba for glow effects matching the theme
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(themeColor)) {
      c = themeColor.substring(1).split('');
      if (c.length === 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; }
      c = '0x' + c.join('');
      const rgba = 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',0.1)';
      const rgbaStrong = 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',0.4)';
      document.documentElement.style.setProperty('--accent-glow', rgbaStrong);
    }

    document.documentElement.style.setProperty('--bg-color', themeBg);
    document.documentElement.style.setProperty('--font-family', themeFont);
  }, [themeColor, themeBg, themeFont]);

  const [portfolio, setPortfolio] = useState([]);
  const [customColors, setCustomColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customColors')) || {};
    } catch (e) {
      return {};
    }
  });

  const handleColorChange = (itemName, newColor) => {
    setCustomColors(prev => {
      const updated = { ...prev, [itemName]: newColor };
      localStorage.setItem('customColors', JSON.stringify(updated));
      return updated;
    });
  };

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null); // Asset selezionato per il Deep Dive
  const [selectedAccount, setSelectedAccount] = useState(null); // Conto selezionato per il Deep Dive
  const [hiddenDeepDiveAssets, setHiddenDeepDiveAssets] = useState({});
  const [hoveredDeepDiveAsset, setHoveredDeepDiveAsset] = useState(null);
  const [groupSmallDeepDiveAssets, setGroupSmallDeepDiveAssets] = useState(false);
  const [focusedDeepDiveAsset, setFocusedDeepDiveAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]); // Storico prezzi per il grafico del Deep Dive
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 secondi di default
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'EUR');
  const [hiddenAssets, setHiddenAssets] = useState({});
  const [hiddenCategories, setHiddenCategories] = useState({});
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const [visuallyHiddenAssets, setVisuallyHiddenAssets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('visuallyHiddenAssets')) || {};
    } catch (e) {
      return {};
    }
  });

  const toggleVisualHiddenAsset = (uniqueId) => {
    setVisuallyHiddenAssets(prev => {
      const updated = { ...prev, [uniqueId]: !prev[uniqueId] };
      localStorage.setItem('visuallyHiddenAssets', JSON.stringify(updated));
      return updated;
    });
  };

  // Sezioni collassabili (default: tutte aperte)
  const [sections, setSections] = useState({
    chart: true,
    pies: true,
    portfolio: true,
    transactions: false, // Transazioni chiuse per default (la tabella è lunga)
    passive: true
  });
  const toggleSection = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Dizionario per contenere lo storico compresso (ultimi 7 item) di tutti gli asset per le sparkline
  const [sparklineData, setSparklineData] = useState({});
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    category: 'Azioni',
    currency: 'EUR',
    date: new Date().toISOString().split('T')[0],
    type: 'Buy',
    quantity: '',
    price: '',
    fees: '0',
    account: 'Broker'
  });

  const [transactions, setTransactions] = useState([]);
  const [editingTxId, setEditingTxId] = useState(null);
  const [liquidity, setLiquidity] = useState({});
  const [fxRates, setFxRates] = useState({});
  const [snapshots, setSnapshots] = useState([]);
  const [benchmarkData, setBenchmarkData] = useState([]);
  const [chartMode, setChartMode] = useState('absolute'); // 'absolute' | 'percentage'
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filtro Temporale Chart
  const [historyPeriod, setHistoryPeriod] = useState('ALL');

  const [dragInteraction, setDragInteraction] = useState({ isDragging: false, isClicking: false });

  // Sorting Table: { key: 'column_name', direction: 'ascending' | 'descending' }
  const [sortConfig, setSortConfig] = useState({ key: 'current_value', direction: 'descending' });
  const [txSortConfig, setTxSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txAssetFilter, setTxAssetFilter] = useState('');
  const [txPeriodFilter, setTxPeriodFilter] = useState('30d');
  const [customAssetOrder, setCustomAssetOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customAssetOrder')) || [];
    } catch (e) {
      return [];
    }
  });
  const [pieAssetOrder, setPieAssetOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pieAssetOrder')) || [];
    } catch (e) {
      return [];
    }
  });
  const [pieCategoryOrder, setPieCategoryOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pieCategoryOrder')) || [];
    } catch (e) {
      return [];
    }
  });
  const [pieAccountOrder, setPieAccountOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pieAccountOrder')) || [];
    } catch (e) {
      return [];
    }
  });
  const [draggedItemIdx, setDraggedItemIdx] = useState(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState(null);

  const [accountBalancesOrder, setAccountBalancesOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('accountBalancesOrder')) || [];
    } catch (e) {
      return [];
    }
  });
  const [draggedAccountIdx, setDraggedAccountIdx] = useState(null);
  const [dragOverAccountIdx, setDragOverAccountIdx] = useState(null);

  // Nuovi stati per i miglioramenti del Pie Chart
  const [groupSmallAssets, setGroupSmallAssets] = useState(false);
  const [focusedAsset, setFocusedAsset] = useState(null);
  const [groupSmallCategories, setGroupSmallCategories] = useState(false);
  const [focusedCategory, setFocusedCategory] = useState(null);

  // Helper per estrarre l'iniziale per i fallback logo
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // Funzioni Sorting Transazioni
  const requestTxSort = (key) => {
    let direction = 'ascending';
    if (txSortConfig.key === key && txSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setTxSortConfig({ key, direction });
  };
  const getTxSortIcon = (columnName) => {
    if (txSortConfig.key !== columnName) return '↕';
    return txSortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  // Scarica dati appena la pagina si apre
  useEffect(() => {
    // Carica impostazioni salvate
    const savedInterval = localStorage.getItem('portfolioRefreshInterval');
    if (savedInterval) {
      setRefreshInterval(parseInt(savedInterval, 10));
    }
    fetchFxRates();
    fetchPortfolio();
    fetchTransactions();
    fetchLiquidity();
    fetchSnapshots();
    fetchBenchmark();
  }, []);

  // Gestione dell'Auto-Refresh
  useEffect(() => {
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchPortfolio();
      }, refreshInterval);
    }
    return () => clearInterval(intervalId); // Cleanup del timer
  }, [autoRefresh, refreshInterval]);

  const handleAssetLegendClick = (data) => {
    setHiddenAssets(prev => ({
      ...prev,
      [data.value]: !prev[data.value]
    }));
  };

  const handleCategoryLegendClick = (data) => {
    setHiddenCategories(prev => ({
      ...prev,
      [data.value]: !prev[data.value]
    }));
  };

  const handleCurrencyChange = (e) => {
    const val = e.target.value;
    setDisplayCurrency(val);
    localStorage.setItem('displayCurrency', val);
  };

  const handleIntervalChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setRefreshInterval(val);
    localStorage.setItem('portfolioRefreshInterval', val.toString());
  };

  const fetchSnapshots = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/snapshots`);
      setSnapshots(res.data);
    } catch (err) {
      console.error("Errore fetch snapshots:", err);
    }
  };

  const fetchBenchmark = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/benchmark`);
      setBenchmarkData(res.data);
    } catch (err) {
      console.error("Errore fetch benchmark:", err);
    }
  };

  const fetchLiquidity = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/liquidity`);
      setLiquidity(res.data);
    } catch (err) {
      console.error("Errore fetch liquidity:", err);
    }
  };

  const fetchFxRates = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/fx_rates`);
      setFxRates(res.data);
    } catch (err) {
      console.error("Errore fetch fx rates:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/transactions`);
      // Ordine Decrescente per Data
      const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sorted);
    } catch (err) {
      console.error("Errore fetch transazioni:", err);
    }
  };

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      // Quando chiedo il portfolio il backend scatena il salvataggio dello snapshot
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/portfolio`);
      setPortfolio(res.data);
      setLoading(false);
      setLastUpdated(new Date());
      // fetchSnapshots deve avvenire DOPO il portfolio, per mostrare lo snapshot appena prodotto
      fetchSnapshots();
      // Fetch le sparkline in background per ogni asset che non è liquidità
      res.data.forEach(item => {
        if (!item.isLiquidity && item.category !== 'Liquidità') {
          fetchSparkline(item.symbol);
        }
      });
    } catch (err) {
      console.error("Errore fetch portfolio", err);
      setLoading(false);
    }
  };

  const fetchSparkline = async (symbol) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/asset-history/${symbol}?period=7d`);
      setSparklineData(prev => ({ ...prev, [symbol]: res.data }));
    } catch (err) {
      // Ignora l'errore per singolo asset
    }
  };

  const fetchAssetHistory = async (symbol) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/asset-history/${symbol}?period=1y`);
      setAssetHistory(res.data);
    } catch (err) {
      console.error("Errore fetch storico asset:", err);
      setAssetHistory([]);
    }
  };

  const handleOpenDeepDive = (asset) => {
    if (asset.isLiquidity) return; // Non ha senso un deep dive sulla liquidità pura
    setSelectedAsset(asset);
    fetchAssetHistory(asset.symbol);
  };

  const handleCloseDeepDive = () => {
    setSelectedAsset(null);
    setAssetHistory([]);
  };

  const handleOpenAccountDeepDive = (accountName, accountData) => {
    setSelectedAccount({ name: accountName, data: accountData });
  };

  const handleCloseAccountDeepDive = () => {
    setSelectedAccount(null);
    setHiddenDeepDiveAssets({}); // reset quando si chiude
    setHoveredDeepDiveAsset(null);
  };

  const handleDeepDiveLegendClick = (data) => {
    setHiddenDeepDiveAssets(prev => ({
      ...prev,
      [data.value]: !prev[data.value]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Se l'utente cambia tipo a Deposit/Withdrawal, reimpostiamo il symbol su una valuta valida se era un ticket normale
    if (name === 'type' && (value === 'Deposit' || value === 'Withdrawal')) {
      if (!['EUR', 'USD', 'GBP', 'JPY'].includes(newFormData.symbol)) {
        newFormData.symbol = 'EUR';
      }
      newFormData.category = 'Liquidità';
    } else if (name === 'type' && formData.category === 'Liquidità' && value !== 'Deposit' && value !== 'Withdrawal') {
      newFormData.category = 'Azioni'; // Reset default se si torna a comprare asset
    }
    setFormData(newFormData);
  };

  const formatCurrency = (amount, baseCurrency = 'EUR', maxFract = 2) => {
    if (amount === undefined || amount === null) return '';

    let convertedAmount = amount;

    // Se la valuta di base dell'asset è diversa da quella di visualizzazione desiderata, convertiamo
    if (baseCurrency !== displayCurrency) {
      if (baseCurrency === 'USD' && displayCurrency === 'EUR') {
        const rate = fxRates['USD'] || 1.0;
        convertedAmount = amount / rate; // Da USD a EUR
      } else if (baseCurrency === 'EUR' && displayCurrency === 'USD') {
        const rate = fxRates['USD'] || 1.0;
        convertedAmount = amount * rate; // Da EUR a USD
      } else {
        // Logica per valute incrociate tramite EUR come base
        const fxBaseToEur = (baseCurrency === 'EUR') ? 1.0 : (1 / (fxRates[baseCurrency] || 1.0));
        const eurAmount = amount * fxBaseToEur;
        const targetRate = fxRates[displayCurrency] || 1.0;
        convertedAmount = (displayCurrency === 'EUR') ? eurAmount : (eurAmount * targetRate);
      }
    }

    const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' };
    const sym = symbols[displayCurrency] || displayCurrency + ' ';
    return `${sym}${convertedAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: maxFract })}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Assicuriamoci che l'asset esista (Solo se NON e' deposito/prelievo)
      if (formData.type !== 'Deposit' && formData.type !== 'Withdrawal') {
        try {
          await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/assets`, {
            symbol: formData.symbol.toUpperCase(),
            name: formData.name || formData.symbol.toUpperCase(),
            category: formData.category,
            currency: formData.currency
          });
        } catch (assetErr) {
          // Ignora se l'asset esiste gia'
        }
      }

      // 2. Crea la transazione
      let q = parseFloat(formData.quantity);
      let p = (formData.type === 'Dividend' || formData.type === 'Farming DeFi') ? 1 : parseFloat(formData.price);
      let f = parseFloat(formData.fees) || 0;

      const txData = {
        date: formData.date,
        type: formData.type,
        symbol: formData.symbol.toUpperCase(),
        quantity: q,
        price: p,
        total: (q * p) + f,
        fees: f,
        account: formData.account
      };

      if (editingTxId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/transactions/${editingTxId}`, txData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/transactions`, txData);
      }

      setIsModalOpen(false);
      setEditingTxId(null);
      fetchPortfolio();
      fetchTransactions();
      fetchLiquidity();

      // Reset dei campi ma manteniamo defaults e la logica della categoria
      setFormData({
        ...formData,
        symbol: '',
        name: '',
        category: 'Azioni', // Torna al default
        quantity: '',
        price: '',
        fees: '0',
        type: 'Buy' // Reset del tipo per evitare che resti bloccato su Deposit
      });
    } catch (err) {
      alert("Errore di rete durante il salvataggio");
      console.error(err);
    }
  };

  const handleTransferSubmit = async (e, transferData) => {
    e.preventDefault();
    try {
      const { sourceAccount, destAccount, amount, currency, date } = transferData;
      let amt = parseFloat(amount);
      if (!sourceAccount || !destAccount || isNaN(amt) || amt <= 0) {
        alert('Dati di trasferimento non validi o mancanti'); return;
      }

      const txWithdrawal = {
        date: date,
        type: 'Withdrawal',
        symbol: currency,
        quantity: amt,
        price: 1,
        total: amt,
        fees: 0,
        account: sourceAccount
      };

      const txDeposit = {
        date: date,
        type: 'Deposit',
        symbol: currency,
        quantity: amt,
        price: 1,
        total: amt,
        fees: 0,
        account: destAccount
      };

      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/transactions`, txWithdrawal);
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/transactions`, txDeposit);

      setIsTransferModalOpen(false);
      fetchPortfolio();
      fetchTransactions();
      fetchLiquidity();
    } catch (err) {
      alert("Errore di rete durante il salvataggio del trasferimento");
      console.error(err);
    }
  };

  const handleEditTransaction = (tx) => {
    setFormData({
      symbol: tx.symbol,
      name: '',
      category: (tx.type === 'Deposit' || tx.type === 'Withdrawal') ? 'Liquidità' : 'Azioni',
      currency: tx.currency || 'EUR',
      date: tx.date,
      type: tx.type,
      quantity: tx.quantity,
      price: tx.price,
      fees: tx.fees,
      account: tx.account
    });
    setEditingTxId(tx.id);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa transazione?\nL'azione cancellerà il record in modo permanente e ricalcolerà il totale del portafoglio.")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/transactions/${id}`);
        fetchPortfolio();
        fetchTransactions();
        fetchLiquidity(); // AGGIUNTO: Aggiorna la liquidità dopo l'eliminazione
      } catch (err) {
        alert("Errore durante l'eliminazione");
        console.error(err);
      }
    }
  };

  const handleResetPortfolio = async () => {
    if (window.confirm("ATTENZIONE! Vuoi davvero cancellare TUTTO il portafoglio? (Asset, Transazioni e Storico)\nQuesta azione è irreversibile!")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/reset`);
        setPortfolio([]);
        setTransactions([]);
        setLiquidity({});
        setSnapshots([]);
        alert("Portafoglio resettato con successo!");
      } catch (err) {
        alert("Errore durante il reset del portafoglio");
        console.error(err);
      }
    }
  };

  // Combiniamo il portafoglio investito con la Cassa
  const combinedPortfolio = [...portfolio].map(item => ({ ...item, uniqueId: item.symbol }));

  // Aggiungiamo ai combined portfolio anche un'informazione sull'account medio per asset (usando i dati delle transazioni)
  // Per semplicità, assegniamo l'account dell'ultima transazione di acquisto a ciascun asset
  combinedPortfolio.forEach(item => {
    const assetTxs = transactions.filter(t => t.symbol === item.symbol && t.type === 'Buy');
    if (assetTxs.length > 0) {
      item.account = assetTxs[0].account || 'Default';
    } else {
      item.account = 'Default';
    }
  });

  Object.entries(liquidity).forEach(([key, amount]) => {
    if (amount !== 0) {
      const parts = key.split(' - ');
      const accountName = parts[0];
      const currency = parts.length > 1 ? parts[1] : 'EUR';

      const fxRate = fxRates[currency] || 1.0;
      const usdRate = fxRates['USD'] || 1.0;

      const valueEur = amount / fxRate;
      const valueUsd = valueEur * usdRate;

      combinedPortfolio.push({
        uniqueId: `LIQ-${accountName}-${currency}`,
        symbol: currency,
        name: `${accountName} Liquidità`,
        category: 'Liquidità',
        currency: currency,
        quantity: amount,
        pmc: 1.0,
        total_invested: amount,
        total_invested_eur: valueEur,
        total_invested_usd: valueUsd,
        realized_gain: 0,
        live_price: 1.0,
        current_value: amount,
        current_value_eur: valueEur,
        current_value_usd: valueUsd,
        unrealized_gain: 0,
        unrealized_gain_percent: 0,
        isLiquidity: true,
        account: accountName
      });
    }
  });

  // Raggruppamento Misto per Conto (Account)
  const accountBalances = combinedPortfolio.reduce((acc, item) => {
    // Escludiamo asset vuoti che potrebbero nascere da bug pregressi (es. USD a zero importato male)
    if (item.current_value === 0 && item.quantity === 0) return acc;

    const accountName = item.account || 'Default';
    if (!acc[accountName]) {
      acc[accountName] = { total: 0, items: [], totalInvested: 0 };
    }
    acc[accountName].total += item.current_value;
    acc[accountName].totalInvested += item.total_invested || 0;
    acc[accountName].items.push(item);
    return acc;
  }, {});

  // Calcoli globali della Dashboard - Ora calcolati dinamicamente convertendo ogni singolo asset nella displayCurrency
  const totalValue = combinedPortfolio.reduce((acc, item) => {
    let itemValue = item.current_value;
    if (item.currency !== displayCurrency) {
      if (item.currency === 'USD' && displayCurrency === 'EUR') itemValue /= (fxRates['USD'] || 1.0);
      else if (item.currency === 'EUR' && displayCurrency === 'USD') itemValue *= (fxRates['USD'] || 1.0);
      else {
        const eurValue = item.current_value * ((item.currency === 'EUR') ? 1.0 : (1 / (fxRates[item.currency] || 1.0)));
        itemValue = (displayCurrency === 'EUR') ? eurValue : (eurValue * (fxRates[displayCurrency] || 1.0));
      }
    }
    return acc + itemValue;
  }, 0);

  const totalInvested = combinedPortfolio.reduce((acc, item) => {
    let itemInvested = item.total_invested;
    if (item.currency !== displayCurrency) {
      if (item.currency === 'USD' && displayCurrency === 'EUR') itemInvested /= (fxRates['USD'] || 1.0);
      else if (item.currency === 'EUR' && displayCurrency === 'USD') itemInvested *= (fxRates['USD'] || 1.0);
      else {
        const eurInvested = item.total_invested * ((item.currency === 'EUR') ? 1.0 : (1 / (fxRates[item.currency] || 1.0)));
        itemInvested = (displayCurrency === 'EUR') ? eurInvested : (eurInvested * (fxRates[displayCurrency] || 1.0));
      }
    }
    return acc + (itemInvested || 0);
  }, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Pie Chart Data - Diversificazione Assoluta
  const assetMap = combinedPortfolio.reduce((acc, item) => {
    const key = item.isLiquidity ? `${item.account} Liquido ${item.symbol}` : item.name;
    let itemValue = item.current_value;
    if (item.currency !== displayCurrency) {
      if (item.currency === 'USD' && displayCurrency === 'EUR') itemValue /= (fxRates['USD'] || 1.0);
      else if (item.currency === 'EUR' && displayCurrency === 'USD') itemValue *= (fxRates['USD'] || 1.0);
      else {
        const eurValue = item.current_value * ((item.currency === 'EUR') ? 1.0 : (1 / (fxRates[item.currency] || 1.0)));
        itemValue = (displayCurrency === 'EUR') ? eurValue : (eurValue * (fxRates[displayCurrency] || 1.0));
      }
    }
    acc[key] = (acc[key] || 0) + itemValue;
    return acc;
  }, {});

  const totalAssetValue = Object.values(assetMap).reduce((sum, val) => sum + val, 0);

  const assetData = Object.keys(assetMap).map(k => {
    const customPercent = totalAssetValue > 0 ? (assetMap[k] / totalAssetValue) * 100 : 0;
    return { name: k, value: assetMap[k], customPercent };
  }).filter(d => d.value > 0);

  // Logica per raggruppare "Altri" se il toggle è attivo
  let processedAssetData = [...assetData];
  if (groupSmallAssets) {
    const threshold = 2.0; // raggruppa sotto il 2%
    const largeAssets = processedAssetData.filter(d => d.customPercent >= threshold);
    const smallAssets = processedAssetData.filter(d => d.customPercent < threshold);

    if (smallAssets.length > 0) {
      const othersValue = smallAssets.reduce((sum, item) => sum + item.value, 0);
      const othersPercent = smallAssets.reduce((sum, item) => sum + item.customPercent, 0);
      largeAssets.push({ name: 'Altri', value: othersValue, customPercent: othersPercent });
      processedAssetData = largeAssets;
    }
  }

  // Sorting assetData based on custom pieAssetOrder
  processedAssetData.sort((a, b) => {
    // 'Altri' sempre alla fine se presente
    if (a.name === 'Altri') return 1;
    if (b.name === 'Altri') return -1;

    const idxA = pieAssetOrder.indexOf(a.name);
    const idxB = pieAssetOrder.indexOf(b.name);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const sortedTransactions = useMemo(() => {
    let sortableTxs = [...transactions];

    if (txSearchTerm) {
      const lowerTerm = txSearchTerm.toLowerCase();
      sortableTxs = sortableTxs.filter(tx =>
        (tx.symbol && tx.symbol.toLowerCase().includes(lowerTerm)) ||
        (tx.account && tx.account.toLowerCase().includes(lowerTerm))
      );
    }

    if (txTypeFilter) {
      sortableTxs = sortableTxs.filter(tx => tx.type === txTypeFilter);
    }

    if (txAssetFilter) {
      sortableTxs = sortableTxs.filter(tx => tx.symbol === txAssetFilter);
    }

    if (txPeriodFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      // Reset the time portion so today's transactions aren't partially filtered out
      cutoff.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 59, 999);

      if (txPeriodFilter === '30d') {
        cutoff.setDate(now.getDate() - 30);
      } else if (txPeriodFilter === 'ytd') {
        cutoff = new Date(now.getFullYear(), 0, 1);
      } else if (txPeriodFilter === '1y') {
        cutoff.setFullYear(now.getFullYear() - 1);
      }
      sortableTxs = sortableTxs.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= cutoff && txDate <= now;
      });
    }

    if (txSortConfig.key) {
      sortableTxs.sort((a, b) => {
        let aVal = a[txSortConfig.key];
        let bVal = b[txSortConfig.key];

        // Handle dates
        if (txSortConfig.key === 'date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (aVal < bVal) {
          return txSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return txSortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTxs;
  }, [transactions, txSortConfig, txSearchTerm, txTypeFilter, txAssetFilter, txPeriodFilter]);

  // Dati per Grafico Categorie - Convertiti dinamicamente
  const categoryMap = combinedPortfolio.reduce((acc, item) => {
    let itemValue = item.current_value;
    if (item.currency !== displayCurrency) {
      if (item.currency === 'USD' && displayCurrency === 'EUR') itemValue /= (fxRates['USD'] || 1.0);
      else if (item.currency === 'EUR' && displayCurrency === 'USD') itemValue *= (fxRates['USD'] || 1.0);
      else {
        const eurValue = item.current_value * ((item.currency === 'EUR') ? 1.0 : (1 / (fxRates[item.currency] || 1.0)));
        itemValue = (displayCurrency === 'EUR') ? eurValue : (eurValue * (fxRates[displayCurrency] || 1.0));
      }
    }
    acc[item.category] = (acc[item.category] || 0) + itemValue;
    return acc;
  }, {});
  const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] })).filter(d => d.value > 0);

  // Sorting categoryData based on custom pieCategoryOrder
  categoryData.sort((a, b) => {
    const idxA = pieCategoryOrder.indexOf(a.name);
    const idxB = pieCategoryOrder.indexOf(b.name);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Filtro Dati Storico Patrimoniale (Net Worth)
  const now = new Date();
  const getPeriodDate = () => {
    const d = new Date();
    if (historyPeriod === '1G') d.setDate(d.getDate() - 1);
    if (historyPeriod === '1S') d.setDate(d.getDate() - 7);
    if (historyPeriod === '1M') d.setMonth(d.getMonth() - 1);
    if (historyPeriod === '3M') d.setMonth(d.getMonth() - 3);
    if (historyPeriod === '6M') d.setMonth(d.getMonth() - 6);
    if (historyPeriod === '1Y') d.setFullYear(d.getFullYear() - 1);
    return historyPeriod === 'ALL' ? null : d;
  };

  const cutOffDate = getPeriodDate();

  const augmentedSnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return { data: [], maxDrawdown: 0 };

    let baseSnapshot = snapshots[0];
    const filteredRaw = [];

    snapshots.forEach(s => {
      const sDate = new Date(s.date);
      if (cutOffDate && sDate < cutOffDate) {
        baseSnapshot = s;
      } else {
        filteredRaw.push(s);
      }
    });

    const paddedSnapshots = [];
    const startDate = cutOffDate ? new Date(cutOffDate) : new Date(snapshots[0].date);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Fino a ieri, oggi è coperto dal Live

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (!cutOffDate && filteredRaw.length > 0) {
      currentDate = new Date(filteredRaw[0].date);
      currentDate.setHours(0, 0, 0, 0);
    }

    let currentRefSnapshot = baseSnapshot;
    let nextRawIdx = 0;

    if (!currentRefSnapshot) {
      currentRefSnapshot = { date: currentDate.toISOString(), total_invested: 0, total_value: 0 };
    }

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      while (nextRawIdx < filteredRaw.length && new Date(filteredRaw[nextRawIdx].date).setHours(0, 0, 0, 0) <= currentDate.getTime()) {
        currentRefSnapshot = filteredRaw[nextRawIdx];
        nextRawIdx++;
      }

      paddedSnapshots.push({
        ...currentRefSnapshot,
        date: dateString
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const filtered = paddedSnapshots;

    // Iniezione Snapshot Live: garantisce che il grafico arrivi sempre ad "adesso" 
    if (totalValue > 0 || totalInvested > 0) {
      filtered.push({
        date: new Date().toISOString(), // Timestamp live
        total_invested: totalInvested,
        total_value: totalValue,
        isLive: true
      });
    }

    if (filtered.length === 0) return { data: [], maxDrawdown: 0 };

    const augmented = [];
    let maxDrawdown = 0;
    let peakValue = 0;

    // Evita divisioni per zero
    const firstBase = filtered[0].total_invested > 0 ? filtered[0].total_invested : 1;
    const firstValue = filtered[0].total_value > 0 ? filtered[0].total_value : 1;

    let baseBenchmarkValue = 1;
    if (benchmarkData && benchmarkData.length > 0) {
      const firstDateString = filtered[0].date;
      const bchMatch = benchmarkData.find(b => b.date >= firstDateString) || benchmarkData[0];
      baseBenchmarkValue = bchMatch.price || 1;
    }

    filtered.forEach((s, i) => {
      const timestamp = new Date(s.date).getTime();

      let daily_deposit = 0;
      if (i > 0) {
        daily_deposit = s.total_invested - filtered[i - 1].total_invested;
      }

      if (s.total_value > peakValue) {
        peakValue = s.total_value;
      }
      const currentDrawdown = peakValue > 0 ? ((s.total_value - peakValue) / peakValue) * 100 : 0;
      if (currentDrawdown < maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }

      // TWR semplificato per le visualizzazioni base
      let twr_percent = 0;
      if (s.total_invested > 0) {
        twr_percent = ((s.total_value / s.total_invested) / (firstValue / firstBase) - 1) * 100;
        if (isNaN(twr_percent) || !isFinite(twr_percent)) twr_percent = 0;
      }

      const sDateStr = s.date.split('T')[0];
      const dayTransactions = transactions.filter(t => t.date === sDateStr);
      let eventMarker = null;
      if (dayTransactions.length > 0) {
        eventMarker = dayTransactions.map(t => `${t.type === 'Buy' ? '🟢 Buy' : (t.type === 'Sell' ? '🔴 Sell' : '📉')} ${t.quantity || ''} ${t.symbol}`).join(' • ');
      }

      let benchmark_percent = 0;
      if (benchmarkData && benchmarkData.length > 0) {
        const bchDaily = benchmarkData.find(b => b.date === s.date);
        if (bchDaily) {
          benchmark_percent = ((bchDaily.price / baseBenchmarkValue) - 1) * 100;
        } else {
          const prevBchs = benchmarkData.filter(b => b.date <= s.date);
          if (prevBchs.length > 0) {
            benchmark_percent = ((prevBchs[prevBchs.length - 1].price / baseBenchmarkValue) - 1) * 100;
          }
        }
      }

      augmented.push({
        ...s,
        time: timestamp,
        daily_deposit,
        daily_drawdown: currentDrawdown,
        twr_percent,
        eventMarker,
        benchmark_percent,
        has_event: eventMarker ? 0 : null
      });
    });

    return { data: augmented, maxDrawdown };
  }, [snapshots, historyPeriod, benchmarkData, transactions]);

  const filteredSnapshots = augmentedSnapshots.data;
  const maxDrawdown = augmentedSnapshots.maxDrawdown;

  // Calcolo Variazione nel periodo selezionato
  let periodGain = 0;
  let periodGainPercent = 0;
  if (filteredSnapshots.length > 0) {
    const firstItem = filteredSnapshots[0];
    const lastItem = filteredSnapshots[filteredSnapshots.length - 1];
    periodGain = lastItem.total_value - firstItem.total_value;
    periodGainPercent = firstItem.total_value > 0 ? (periodGain / firstItem.total_value) * 100 : 0;
  }

  // Ordinamento del Combined Portfolio per la Tabella
  const sortedPortfolio = [...combinedPortfolio].sort((a, b) => {
    if (!sortConfig || !sortConfig.key) return 0;
    const key = sortConfig.key;

    if (key === 'manual') {
      const idxA = customAssetOrder.indexOf(a.uniqueId);
      const idxB = customAssetOrder.indexOf(b.uniqueId);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }

    // Creiamo una funzione helper interna per ottenere il valore convertito per l'ordinamento
    const getConvertedValue = (item, valKey) => {
      let rawVal = item[valKey] || 0;
      if (item.currency !== displayCurrency) {
        if (item.currency === 'USD' && displayCurrency === 'EUR') rawVal /= (fxRates['USD'] || 1.0);
        else if (item.currency === 'EUR' && displayCurrency === 'USD') rawVal *= (fxRates['USD'] || 1.0);
        else {
          const eurVal = rawVal * ((item.currency === 'EUR') ? 1.0 : (1 / (fxRates[item.currency] || 1.0)));
          rawVal = (displayCurrency === 'EUR') ? eurVal : (eurVal * (fxRates[displayCurrency] || 1.0));
        }
      }
      return rawVal;
    };

    let aVal = a[key];
    let bVal = b[key];

    // Gestione Casi Specifici per Sorting
    if (key === 'symbol') {
      aVal = a.symbol.toLowerCase();
      bVal = b.symbol.toLowerCase();
    } else if (key === 'account') {
      aVal = (a.account || 'default').toLowerCase();
      bVal = (b.account || 'default').toLowerCase();
    } else if (key === 'current_value' || key === 'total_invested' || key === 'live_price') {
      aVal = getConvertedValue(a, key);
      bVal = getConvertedValue(b, key);
    } else if (key === 'realized_gain' || key === 'unrealized_gain') {
      // Per i gain calcolati in app, o li convertiamo o usiamo i campi nativi, qui assumiamo siano nella valuta base dell'asset
      aVal = getConvertedValue(a, key);
      bVal = getConvertedValue(b, key);
    }

    // fallback for undefined or null
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';

    if (aVal < bVal) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aVal > bVal) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (!sortConfig || sortConfig.key !== columnName) {
      return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    }
    return sortConfig.direction === 'ascending' ? <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>▲</span> : <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>▼</span>;
  };



  const CustomHistoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
            {new Date(label).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Valore: {formatCurrency(data.total_value, displayCurrency)}</span>
            <span style={{ color: 'var(--accent)' }}>Investito: {formatCurrency(data.total_invested, displayCurrency)}</span>
            {data.daily_deposit !== 0 && (
              <span style={{ color: data.daily_deposit > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
                {data.daily_deposit > 0 ? 'Dep. Netto:' : 'Prelievo:'} {formatCurrency(data.daily_deposit, displayCurrency)}
              </span>
            )}
            <span style={{ color: data.total_value - data.total_invested >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
              Profitto Pura MTM: {formatCurrency(data.total_value - data.total_invested, displayCurrency)}
            </span>
            {chartMode === 'percentage' && (
              <span style={{ color: 'var(--text-main)', marginTop: '4px' }}>
                TWR Netto: {data.twr_percent > 0 ? '+' : ''}{data.twr_percent.toFixed(2)}%
                {data.benchmark_percent ? ` (S&P 500: ${data.benchmark_percent > 0 ? '+' : ''}${data.benchmark_percent.toFixed(2)}%)` : ''}
              </span>
            )}
            {data.eventMarker && (
              <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem' }}>
                {data.eventMarker}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const passiveIncomeStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const stats = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2000, i, 1).toLocaleString('it-IT', { month: 'short' }),
      Dividendi: 0,
      Farming: 0,
      Totale: 0
    }));

    let totalDividends = 0;
    let totalFarming = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === currentYear) {
        const m = txDate.getMonth();
        let amount = tx.total;
        if (tx.type === 'Dividend') {
          stats[m].Dividendi += amount;
          stats[m].Totale += amount;
          totalDividends += amount;
        } else if (tx.type === 'Farming DeFi') {
          stats[m].Farming += amount;
          stats[m].Totale += amount;
          totalFarming += amount;
        }
      }
    });

    return { monthly: stats, totalDividends, totalFarming, year: currentYear };
  }, [transactions]);
  return (
    <PortfolioContext.Provider value={{
      COLORS,
      CustomHistoryTooltip,
      CustomLegend,
      accountBalances,
      accountBalancesOrder,
      assetHistory,
      autoRefresh,
      benchmarkData,
      categoryData,
      chartMode,
      combinedPortfolio,
      customColors,
      displayCurrency,
      dragInteraction,
      dragOverAccountIdx,
      dragOverItemIdx,
      draggedAccountIdx,
      draggedItemIdx,
      editingTxId,
      fetchLiquidity,
      fetchPortfolio,
      fetchTransactions,
      filteredSnapshots,
      focusedAsset,
      focusedCategory,
      focusedDeepDiveAsset,
      formData,
      formatCurrency,
      fxRates,
      getInitials,
      getSortIcon,
      getTxSortIcon,
      groupSmallAssets,
      groupSmallCategories,
      groupSmallDeepDiveAssets,
      handleAssetLegendClick,
      handleCategoryLegendClick,
      handleCloseAccountDeepDive,
      handleCloseDeepDive,
      handleColorChange,
      handleCurrencyChange,
      handleDeepDiveLegendClick,
      handleDeleteTransaction,
      handleEditTransaction,
      handleInputChange,
      handleIntervalChange,
      handleOpenAccountDeepDive,
      handleOpenDeepDive,
      handleResetPortfolio,
      handleSubmit,
      hiddenAssets,
      hiddenCategories,
      hiddenDeepDiveAssets,
      themeColor,
      setThemeColor,
      themeBg,
      setThemeBg,
      themeFont,
      setThemeFont,
      historyPeriod,
      hoveredAsset,
      hoveredCategory,
      hoveredDeepDiveAsset,
      isModalOpen,
      setIsModalOpen,
      isSettingsOpen,
      setIsSettingsOpen,
      isTransferModalOpen,
      setIsTransferModalOpen,
      handleTransferSubmit,
      lastUpdated,
      loading,
      maxDrawdown,
      periodGain,
      periodGainPercent,
      passiveIncomeStats,
      pieAccountOrder,
      portfolio,
      processedAssetData,
      refreshInterval,
      requestSort,
      requestTxSort,
      sections,
      selectedAccount,
      selectedAsset,
      setAccountBalancesOrder,
      setAutoRefresh,
      setChartMode,
      setCustomAssetOrder,
      setDisplayCurrency,
      setDragInteraction,
      setDragOverAccountIdx,
      setDragOverItemIdx,
      setDraggedAccountIdx,
      setDraggedItemIdx,
      setEditingTxId,
      setFocusedAsset,
      setFocusedCategory,
      setFocusedDeepDiveAsset,
      setFormData,
      setFxRates,
      setGroupSmallAssets,
      setGroupSmallCategories,
      setGroupSmallDeepDiveAssets,
      setHistoryPeriod,
      setHoveredAsset,
      setHoveredCategory,
      setHoveredDeepDiveAsset,
      setPieAccountOrder,
      setPieAssetOrder,
      setPieCategoryOrder,
      setRefreshInterval,
      setSections,
      setTxAssetFilter,
      setTxSearchTerm,
      setTxTypeFilter,
      snapshots,
      sortConfig,
      sortedPortfolio,
      sortedTransactions,
      sparklineData,
      toggleSection,
      totalGain,
      totalGainPercent,
      totalInvested,
      totalValue,
      transactions,
      txAssetFilter,
      txPeriodFilter,
      setTxPeriodFilter,
      txSearchTerm,
      txTypeFilter,
      visuallyHiddenAssets,
      toggleVisualHiddenAsset
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};
