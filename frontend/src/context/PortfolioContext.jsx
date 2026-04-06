import React, { createContext, useContext, useEffect, useMemo } from 'react'
import '../index.css'

import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import { useUIState } from '../hooks/useUIState';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { useSnapshots } from '../hooks/useSnapshots';
import { useSnapshotOverrides } from '../hooks/useSnapshotOverrides';

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
              if (!isNaN(dragIndex) && onReorder) onReorder(dragIndex, index);
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
  // --- Compose Hooks ---
  const currency = useCurrencyConversion();
  const ui = useUIState();
  const data = usePortfolioData(ui);
  const snapshotOverrides = useSnapshotOverrides();

  // Apply theme
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ui.themeColor);
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(ui.themeColor)) {
      c = ui.themeColor.substring(1).split('');
      if (c.length === 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; }
      c = '0x' + c.join('');
      const rgbaStrong = 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',0.4)';
      document.documentElement.style.setProperty('--accent-glow', rgbaStrong);
    }
    document.documentElement.style.setProperty('--bg-color', ui.themeBg);
    document.documentElement.style.setProperty('--font-family', ui.themeFont);
  }, [ui.themeColor, ui.themeBg, ui.themeFont]);

  // Fetch dati all'avvio
  useEffect(() => {
    currency.fetchFxRates();
    data.fetchPortfolio();
    data.fetchTransactions();
    data.fetchLiquidity();
    data.fetchSnapshots();
    data.fetchBenchmark();
  }, []);

  // Auto-Refresh
  useEffect(() => {
    let intervalId;
    if (ui.autoRefresh) {
      intervalId = setInterval(() => { data.fetchPortfolio(); }, ui.refreshInterval);
    }
    return () => clearInterval(intervalId);
  }, [ui.autoRefresh, ui.refreshInterval]);

  // --- Computed Data ---
  // Combiniamo portafoglio con la Cassa
  const combinedPortfolio = [...data.portfolio].map(item => ({ ...item, uniqueId: item.symbol }));
  combinedPortfolio.forEach(item => {
    const assetTxs = data.transactions.filter(t => t.symbol === item.symbol && t.type === 'Buy');
    item.account = assetTxs.length > 0 ? (assetTxs[0].account || 'Default') : 'Default';
  });

  Object.entries(data.liquidity).forEach(([key, amount]) => {
    if (amount !== 0) {
      const parts = key.split(' - ');
      const accountName = parts[0];
      const cur = parts.length > 1 ? parts[1] : 'EUR';
      const fxRate = currency.fxRates[cur] || 1.0;
      const usdRate = currency.fxRates['USD'] || 1.0;
      const valueEur = amount / fxRate;
      const valueUsd = valueEur * usdRate;
      combinedPortfolio.push({
        uniqueId: `LIQ-${accountName}-${cur}`, symbol: cur,
        name: `${accountName} Liquidità`, category: 'Liquidità', currency: cur,
        quantity: amount, pmc: 1.0, total_invested: amount,
        total_invested_eur: valueEur, total_invested_usd: valueUsd,
        realized_gain: 0, live_price: 1.0, current_value: amount,
        current_value_eur: valueEur, current_value_usd: valueUsd,
        unrealized_gain: 0, unrealized_gain_percent: 0,
        isLiquidity: true, account: accountName
      });
    }
  });

  // Raggruppamento per Conto
  const accountBalances = combinedPortfolio.reduce((acc, item) => {
    if (item.current_value === 0 && item.quantity === 0) return acc;
    const accountName = item.account || 'Default';
    if (!acc[accountName]) acc[accountName] = { total: 0, items: [], totalInvested: 0 };
    acc[accountName].total += item.current_value;
    acc[accountName].totalInvested += item.total_invested || 0;
    acc[accountName].items.push(item);
    return acc;
  }, {});

  // Helper per conversione valori
  const convertValue = (amount, itemCurrency) => {
    if (itemCurrency === currency.displayCurrency) return amount;
    if (itemCurrency === 'USD' && currency.displayCurrency === 'EUR') return amount / (currency.fxRates['USD'] || 1.0);
    if (itemCurrency === 'EUR' && currency.displayCurrency === 'USD') return amount * (currency.fxRates['USD'] || 1.0);
    const eurValue = amount * ((itemCurrency === 'EUR') ? 1.0 : (1 / (currency.fxRates[itemCurrency] || 1.0)));
    return (currency.displayCurrency === 'EUR') ? eurValue : (eurValue * (currency.fxRates[currency.displayCurrency] || 1.0));
  };

  // Calcoli Globali (in display currency, per UI cards)
  const totalValue = combinedPortfolio.reduce((acc, item) => acc + convertValue(item.current_value, item.currency), 0);
  const totalInvested = combinedPortfolio.reduce((acc, item) => acc + convertValue(item.total_invested || 0, item.currency), 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Totali SEMPRE in EUR per il punto live del grafico storico.
  // Gli snapshot del DB sono salvati in EUR — il punto live deve usare la stessa valuta.
  const toEur = (amount, itemCurrency) => {
    if (itemCurrency === 'EUR') return amount;
    return amount / (currency.fxRates[itemCurrency] || 1.0);
  };
  const totalValueEur = combinedPortfolio.reduce((acc, item) => acc + toEur(item.current_value, item.currency), 0);
  const totalInvestedEur = combinedPortfolio.reduce((acc, item) => acc + toEur(item.total_invested || 0, item.currency), 0);

  // Pie Chart - Asset
  const assetMap = combinedPortfolio.reduce((acc, item) => {
    const key = item.isLiquidity ? `${item.account} Liquido ${item.symbol}` : item.name;
    acc[key] = (acc[key] || 0) + convertValue(item.current_value, item.currency);
    return acc;
  }, {});
  const totalAssetValue = Object.values(assetMap).reduce((sum, val) => sum + val, 0);
  const assetData = Object.keys(assetMap).map(k => ({
    name: k, value: assetMap[k],
    customPercent: totalAssetValue > 0 ? (assetMap[k] / totalAssetValue) * 100 : 0
  })).filter(d => d.value > 0);

  let processedAssetData = [...assetData];
  if (ui.groupSmallAssets) {
    const threshold = 2.0;
    const large = processedAssetData.filter(d => d.customPercent >= threshold);
    const small = processedAssetData.filter(d => d.customPercent < threshold);
    if (small.length > 0) {
      large.push({ name: 'Altri', value: small.reduce((s, i) => s + i.value, 0), customPercent: small.reduce((s, i) => s + i.customPercent, 0) });
      processedAssetData = large;
    }
  }
  processedAssetData.sort((a, b) => {
    if (a.name === 'Altri') return 1;
    if (b.name === 'Altri') return -1;
    const idxA = ui.pieAssetOrder.indexOf(a.name);
    const idxB = ui.pieAssetOrder.indexOf(b.name);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Sorted Transactions
  const sortedTransactions = useMemo(() => {
    let sortableTxs = [...data.transactions];
    if (ui.txSearchTerm) {
      const lowerTerm = ui.txSearchTerm.toLowerCase();
      sortableTxs = sortableTxs.filter(tx => (tx.symbol && tx.symbol.toLowerCase().includes(lowerTerm)) || (tx.account && tx.account.toLowerCase().includes(lowerTerm)));
    }
    if (ui.txTypeFilter) sortableTxs = sortableTxs.filter(tx => tx.type === ui.txTypeFilter);
    if (ui.txAssetFilter) sortableTxs = sortableTxs.filter(tx => tx.symbol === ui.txAssetFilter);
    if (ui.txPeriodFilter !== 'all') {
      const now = new Date(); let cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0); now.setHours(23, 59, 59, 999);
      if (ui.txPeriodFilter === '30d') cutoff.setDate(now.getDate() - 30);
      else if (ui.txPeriodFilter === 'ytd') cutoff = new Date(now.getFullYear(), 0, 1);
      else if (ui.txPeriodFilter === '1y') cutoff.setFullYear(now.getFullYear() - 1);
      sortableTxs = sortableTxs.filter(tx => { const d = new Date(tx.date); return d >= cutoff && d <= now; });
    }
    if (ui.txSortConfig.key) {
      sortableTxs.sort((a, b) => {
        let aVal = a[ui.txSortConfig.key], bVal = b[ui.txSortConfig.key];
        if (ui.txSortConfig.key === 'date') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
        if (aVal < bVal) return ui.txSortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return ui.txSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableTxs;
  }, [data.transactions, ui.txSortConfig, ui.txSearchTerm, ui.txTypeFilter, ui.txAssetFilter, ui.txPeriodFilter]);

  // Category Data
  const categoryMap = combinedPortfolio.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + convertValue(item.current_value, item.currency);
    return acc;
  }, {});
  const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] })).filter(d => d.value > 0);
  categoryData.sort((a, b) => {
    const idxA = ui.pieCategoryOrder.indexOf(a.name);
    const idxB = ui.pieCategoryOrder.indexOf(b.name);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Snapshot Processing
  // Fattore di conversione EUR → displayCurrency per il tooltip
  const eurToDisplay = currency.displayCurrency === 'EUR' ? 1.0 : (currency.fxRates[currency.displayCurrency] || 1.0);

  const snapshotResult = useSnapshots({
    snapshots: data.snapshots,
    historyPeriod: ui.historyPeriod,
    benchmarkData: data.benchmarkData,
    transactions: data.transactions,
    totalValue: totalValueEur,      // sempre in EUR — come gli snapshot DB
    totalInvested: totalInvestedEur, // sempre in EUR
    overrides: snapshotOverrides.overrides
  });

  // Sorted Portfolio
  const sortedPortfolio = [...combinedPortfolio].sort((a, b) => {
    if (!ui.sortConfig || !ui.sortConfig.key) return 0;
    const key = ui.sortConfig.key;
    if (key === 'manual') {
      const idxA = ui.customAssetOrder.indexOf(a.uniqueId);
      const idxB = ui.customAssetOrder.indexOf(b.uniqueId);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }
    const getConvertedValue = (item, valKey) => {
      let rawVal = item[valKey] || 0;
      return convertValue(rawVal, item.currency);
    };
    let aVal = a[key], bVal = b[key];
    if (key === 'symbol') { aVal = a.symbol.toLowerCase(); bVal = b.symbol.toLowerCase(); }
    else if (key === 'account') { aVal = (a.account || 'default').toLowerCase(); bVal = (b.account || 'default').toLowerCase(); }
    else if (['current_value', 'total_invested', 'live_price', 'realized_gain', 'unrealized_gain'].includes(key)) { aVal = getConvertedValue(a, key); bVal = getConvertedValue(b, key); }
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';
    if (aVal < bVal) return ui.sortConfig.direction === 'ascending' ? -1 : 1;
    if (aVal > bVal) return ui.sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'ascending';
    if (ui.sortConfig && ui.sortConfig.key === key && ui.sortConfig.direction === 'ascending') direction = 'descending';
    ui.setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (!ui.sortConfig || ui.sortConfig.key !== columnName) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return ui.sortConfig.direction === 'ascending' ? <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>▲</span> : <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>▼</span>;
  };

  // Custom Tooltip
  const CustomHistoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
            {new Date(label).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Valore: {currency.formatCurrency(d.total_value * eurToDisplay, currency.displayCurrency)}</span>
            <span style={{ color: 'var(--accent)' }}>Investito: {currency.formatCurrency(d.total_invested * eurToDisplay, currency.displayCurrency)}</span>
            {d.daily_deposit !== 0 && (
              <span style={{ color: d.daily_deposit > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
                {d.daily_deposit > 0 ? 'Dep. Netto:' : 'Prelievo:'} {currency.formatCurrency(d.daily_deposit * eurToDisplay, currency.displayCurrency)}
              </span>
            )}
            <span style={{ color: (d.total_value - d.total_invested) >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
              Profitto Pura MTM: {currency.formatCurrency((d.total_value - d.total_invested) * eurToDisplay, currency.displayCurrency)}
            </span>
            {ui.chartMode === 'percentage' && (
              <span style={{ color: 'var(--text-main)', marginTop: '4px' }}>
                TWR Netto: {d.twr_percent > 0 ? '+' : ''}{d.twr_percent.toFixed(2)}%
                {d.benchmark_percent ? ` (S&P 500: ${d.benchmark_percent > 0 ? '+' : ''}${d.benchmark_percent.toFixed(2)}%)` : ''}
              </span>
            )}
            {d.eventMarker && (
              <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem' }}>
                {d.eventMarker}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Passive Income Stats
  const passiveIncomeStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const stats = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2000, i, 1).toLocaleString('it-IT', { month: 'short' }),
      Dividendi: 0, Farming: 0, Totale: 0
    }));
    let totalDividends = 0, totalFarming = 0;
    data.transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === currentYear) {
        const m = txDate.getMonth();
        if (tx.type === 'Dividend') { stats[m].Dividendi += tx.total; stats[m].Totale += tx.total; totalDividends += tx.total; }
        else if (tx.type === 'Farming DeFi') { stats[m].Farming += tx.total; stats[m].Totale += tx.total; totalFarming += tx.total; }
      }
    });
    return { monthly: stats, totalDividends, totalFarming, year: currentYear };
  }, [data.transactions]);

  // --- Build the Context Value ---
  const contextValue = {
    COLORS, CustomHistoryTooltip, CustomLegend,
    // Currency
    fxRates: currency.fxRates, setFxRates: currency.setFxRates,
    displayCurrency: currency.displayCurrency, setDisplayCurrency: currency.setDisplayCurrency,
    formatCurrency: currency.formatCurrency, handleCurrencyChange: currency.handleCurrencyChange,
    // UI State (spread all)
    ...ui,
    // Data
    portfolio: data.portfolio, transactions: data.transactions,
    assetHistory: data.assetHistory, sparklineData: data.sparklineData,
    snapshots: data.snapshots, benchmarkData: data.benchmarkData,
    // Data Actions
    fetchPortfolio: data.fetchPortfolio, fetchTransactions: data.fetchTransactions,
    fetchLiquidity: data.fetchLiquidity,
    handleSubmit: data.handleSubmit, handleTransferSubmit: data.handleTransferSubmit,
    handleEditTransaction: data.handleEditTransaction, handleDeleteTransaction: data.handleDeleteTransaction,
    handleResetPortfolio: data.handleResetPortfolio,
    handleOpenDeepDive: data.handleOpenDeepDive, handleCloseDeepDive: data.handleCloseDeepDive,
    handleOpenAccountDeepDive: data.handleOpenAccountDeepDive, handleCloseAccountDeepDive: data.handleCloseAccountDeepDive,
    // Computed
    combinedPortfolio, accountBalances,
    totalValue, totalInvested, totalGain, totalGainPercent,
    processedAssetData, categoryData,
    sortedPortfolio, sortedTransactions,
    requestSort, getSortIcon,
    passiveIncomeStats,
    // Snapshot Results
    filteredSnapshots: snapshotResult.filteredSnapshots,
    maxDrawdown: snapshotResult.maxDrawdown,
    periodGain: snapshotResult.periodGain,
    periodGainPercent: snapshotResult.periodGainPercent,
    // Snapshot Overrides
    snapshotOverrides: snapshotOverrides.overrides,
    setSnapshotOverride: snapshotOverrides.setOverride,
    removeSnapshotOverride: snapshotOverrides.removeOverride,
    clearAllSnapshotOverrides: snapshotOverrides.clearAllOverrides,
    hasSnapshotOverrides: snapshotOverrides.hasOverrides,
  };

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};
