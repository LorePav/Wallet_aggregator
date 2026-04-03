import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';

const GlobalModals = () => {
    const {
        selectedAsset, handleCloseDeepDive, handleOpenDeepDive, formatCurrency, assetHistory, transactions, handleDeleteTransaction, handleEditTransaction,
        selectedAccount, handleCloseAccountDeepDive, displayCurrency, fxRates,
        groupSmallDeepDiveAssets, setGroupSmallDeepDiveAssets, pieAccountOrder, COLORS, customColors, hiddenDeepDiveAssets, handleColorChange,
        handleDeepDiveLegendClick, setHoveredDeepDiveAsset, hoveredDeepDiveAsset, setPieAccountOrder, focusedDeepDiveAsset, setFocusedDeepDiveAsset, CustomLegend,
        isTransferModalOpen, setIsTransferModalOpen, handleTransferSubmit, accountBalances
    } = usePortfolioContext();

    const convertedAssetHistory = React.useMemo(() => {
        if (!assetHistory || assetHistory.length === 0 || !selectedAsset) return [];
        const baseCur = selectedAsset.currency || 'EUR';

        return assetHistory.map(point => {
            let convertedPrice = point.price;
            if (baseCur !== displayCurrency) {
                if (baseCur === 'USD' && displayCurrency === 'EUR') {
                    convertedPrice = point.price / (fxRates['USD'] || 1.0);
                } else if (baseCur === 'EUR' && displayCurrency === 'USD') {
                    convertedPrice = point.price * (fxRates['USD'] || 1.0);
                } else {
                    const fxBaseToEur = (baseCur === 'EUR') ? 1.0 : (1 / (fxRates[baseCur] || 1.0));
                    const eurAmount = point.price * fxBaseToEur;
                    const targetRate = fxRates[displayCurrency] || 1.0;
                    convertedPrice = (displayCurrency === 'EUR') ? eurAmount : (eurAmount * targetRate);
                }
            }
            return { ...point, convertedPrice };
        });
    }, [assetHistory, selectedAsset, displayCurrency, fxRates]);

    return (
        <>
            {/* Modal Deep Dive Singolo Asset */}
            {selectedAsset && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {selectedAsset.symbol} <span className="text-secondary" style={{ fontSize: '1rem', fontWeight: 'normal' }}>{selectedAsset.name}</span>
                                </h2>
                                <span style={{
                                    padding: '4px 10px',
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500'
                                }}>
                                    {selectedAsset.category}
                                </span>
                            </div>
                            <button className="close-btn" onClick={handleCloseDeepDive}>&times;</button>
                        </div>

                        <div className="modal-body">
                            {/* Statistiche Asset */}
                            <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '1.5rem' }}>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Prezzo Attuale</h3>
                                    <div className="value" style={{ fontSize: '1.4rem' }}>{formatCurrency(selectedAsset.live_price, selectedAsset.currency, 4)}</div>
                                </div>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Quantità</h3>
                                    <div className="value" style={{ fontSize: '1.4rem' }}>{selectedAsset.quantity.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                                </div>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>PMC</h3>
                                    <div className="value" style={{ fontSize: '1.4rem' }}>{formatCurrency(selectedAsset.pmc, selectedAsset.currency, 4)}</div>
                                </div>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Valore Posizione</h3>
                                    <div className="value" style={{ fontSize: '1.4rem' }}>{formatCurrency(selectedAsset.current_value, selectedAsset.currency)}</div>
                                </div>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Profitto/Perdita</h3>
                                    <div className={`value ${selectedAsset.unrealized_gain >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.4rem' }}>
                                        {selectedAsset.unrealized_gain >= 0 ? '+' : ''}{formatCurrency(selectedAsset.unrealized_gain, selectedAsset.currency)}
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                            ({selectedAsset.unrealized_gain_percent > 0 ? '+' : ''}{selectedAsset.unrealized_gain_percent.toFixed(2)}%)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Grafico Andamento Asset */}
                            <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Andamento Storico (Ultimo Anno)</h3>
                                {assetHistory.length > 0 ? (
                                    <div style={{ width: '100%', height: 250 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={convertedAssetHistory} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="rgba(255,255,255,0.4)"
                                                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                                    tickFormatter={(label) => new Date(label).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })}
                                                />
                                                <YAxis
                                                    stroke="rgba(255,255,255,0.4)"
                                                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                                    domain={['auto', 'auto']}
                                                />
                                                <Tooltip
                                                    formatter={(value) => [`${formatCurrency(value, displayCurrency, 2)}`, 'Prezzo']}
                                                    labelFormatter={(label) => `Data: ${new Date(label).toLocaleDateString('it-IT')}`}
                                                    contentStyle={{ backgroundColor: 'var(--surface-hover)', border: 'none', borderRadius: '8px', color: 'white' }}
                                                />
                                                <Area type="monotone" dataKey="convertedPrice" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        Recupero dati storici in corso o dati non disponibili per questo asset...
                                    </div>
                                )}
                            </div>

                            {/* Transazioni per questo Asset */}
                            <div className="glass-panel">
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Transazioni Correlate</h3>
                                <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <table>
                                        <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 1 }}>
                                            <tr>
                                                <th style={{ padding: '0.6rem' }}>Data</th>
                                                <th style={{ padding: '0.6rem' }}>Tipo</th>
                                                <th style={{ padding: '0.6rem' }}>Quantità</th>
                                                <th style={{ padding: '0.6rem' }}>Prezzo</th>
                                                <th style={{ padding: '0.6rem' }}>Totale</th>
                                                <th style={{ padding: '0.6rem', textAlign: 'right' }}>Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.filter(tx => tx.symbol === selectedAsset.symbol).map(tx => {
                                                const c = tx.currency || 'EUR';
                                                const sym = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' }[c] || c + ' ';
                                                return (
                                                    <tr key={tx.id}>
                                                        <td style={{ padding: '0.6rem' }}>{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                                                        <td style={{ padding: '0.6rem' }}>
                                                            <span style={{ color: tx.type === 'Buy' ? 'var(--success)' : (tx.type === 'Sell' ? 'var(--danger)' : 'var(--accent)') }}>
                                                                {tx.type}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.6rem' }}>{tx.quantity}</td>
                                                        <td style={{ padding: '0.6rem' }}>{sym}{(tx.price || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                                        <td style={{ padding: '0.6rem' }}>{sym}{(tx.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                                                        <td style={{ padding: '0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.2rem 0.4rem', marginRight: '0.5rem', fontSize: '0.8rem' }}
                                                                title="Modifica Transazione"
                                                                onClick={() => {
                                                                    handleCloseDeepDive();
                                                                    handleEditTransaction(tx);
                                                                }}
                                                            >✏️</button>
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.2rem 0.4rem', borderColor: 'rgba(239, 68, 68, 0.5)', color: 'var(--danger)', fontSize: '0.8rem' }}
                                                                title="Elimina Transazione"
                                                                onClick={() => {
                                                                    handleCloseDeepDive();
                                                                    handleDeleteTransaction(tx.id);
                                                                }}
                                                            >❌</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {transactions.filter(tx => tx.symbol === selectedAsset.symbol).length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                                                        Nessuna transazione trovata (Asset importato forse?)
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Deep Dive Conto (Account) */}
            {selectedAccount && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🏦 {selectedAccount.name}
                                </h2>
                                <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                                    Dettaglio Conto
                                </span>
                            </div>
                            <button className="close-btn" onClick={handleCloseAccountDeepDive}>&times;</button>
                        </div>

                        <div className="modal-body">
                            {/* Statistiche Conto */}
                            <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Valore Totale MTM</h3>
                                    <div className="value" style={{ fontSize: '1.6rem' }}>{formatCurrency(selectedAccount.data.total, displayCurrency)}</div>
                                </div>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Totale Investito</h3>
                                    <div className="value" style={{ fontSize: '1.6rem' }}>{formatCurrency(selectedAccount.data.totalInvested, displayCurrency)}</div>
                                </div>
                                <div className="glass-panel summary-card" style={{ padding: '1rem' }}>
                                    <h3>Profitto/Perdita</h3>
                                    <div className={`value ${(selectedAccount.data.total - selectedAccount.data.totalInvested) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.6rem' }}>
                                        {(selectedAccount.data.total - selectedAccount.data.totalInvested) >= 0 ? '+' : ''}{formatCurrency(selectedAccount.data.total - selectedAccount.data.totalInvested, 'EUR')}
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                            ({selectedAccount.data.totalInvested > 0 ? (((selectedAccount.data.total - selectedAccount.data.totalInvested) / selectedAccount.data.totalInvested) * 100).toFixed(2) : '0.00'}%)
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Asset del Conto Cliccabili */}
                            <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'left' }}>Asset nel Conto</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                    {selectedAccount.data.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '1rem',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '12px',
                                                cursor: item.isLiquidity ? 'default' : 'pointer',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!item.isLiquidity) {
                                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!item.isLiquidity) {
                                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                }
                                            }}
                                            onClick={() => {
                                                if (!item.isLiquidity) {
                                                    handleCloseAccountDeepDive();
                                                    handleOpenDeepDive(item);
                                                }
                                            }}
                                            title={item.isLiquidity ? "La liquidità puran non ha un grafico storico" : "Clicca per aprire il Deep Dive e il grafico"}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.symbol} {item.isLiquidity && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>(Cassa)</span>}</strong>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {item.quantity.toLocaleString('it-IT', { maximumFractionDigits: 4 })}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '1.2rem' }}>
                                                {formatCurrency(item.current_value, item.currency)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Grafico Diversificazione Conto */}
                            <div className="glass-panel" style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', textAlign: 'left' }}>Composizione del Conto</h3>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', opacity: groupSmallDeepDiveAssets ? 1 : 0.6 }}
                                        onClick={() => setGroupSmallDeepDiveAssets(!groupSmallDeepDiveAssets)}
                                        title="Raggruppa asset < 2%"
                                    >
                                        {groupSmallDeepDiveAssets ? '🪄 Separa Asset' : '🪄 Raggruppa "Altri"'}
                                    </button>
                                </div>
                                {(() => {
                                    const rawAccountData = selectedAccount.data.items
                                        .filter(d => d.current_value > 0)
                                        .map(item => ({ name: item.isLiquidity ? 'Cassa' : item.symbol, value: item.current_value }));

                                    const totalAccountValue = rawAccountData.reduce((sum, item) => sum + item.value, 0);

                                    let accountData = rawAccountData.map(item => ({
                                        ...item,
                                        customPercent: totalAccountValue > 0 ? (item.value / totalAccountValue) * 100 : 0
                                    }));

                                    if (groupSmallDeepDiveAssets) {
                                        const threshold = 2.0;
                                        const largeAssets = accountData.filter(d => d.customPercent >= threshold);
                                        const smallAssets = accountData.filter(d => d.customPercent < threshold);

                                        if (smallAssets.length > 0) {
                                            const othersValue = smallAssets.reduce((sum, item) => sum + item.value, 0);
                                            const othersPercent = smallAssets.reduce((sum, item) => sum + item.customPercent, 0);
                                            largeAssets.push({ name: 'Altri', value: othersValue, customPercent: othersPercent });
                                            accountData = largeAssets;
                                        }
                                    }

                                    accountData.sort((a, b) => {
                                        if (a.name === 'Altri') return 1;
                                        if (b.name === 'Altri') return -1;
                                        const idxA = pieAccountOrder.indexOf(a.name);
                                        const idxB = pieAccountOrder.indexOf(b.name);
                                        if (idxA === -1 && idxB === -1) return 0;
                                        if (idxA === -1) return 1;
                                        if (idxB === -1) return -1;
                                        return idxA - idxB;
                                    });

                                    return (
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <defs>
                                                        <filter id="shadow-acc" x="-20%" y="-20%" width="140%" height="140%">
                                                            <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.3" />
                                                        </filter>
                                                        {accountData.map((entry, idx) => {
                                                            const defaultColor = entry.name === 'Cassa' ? '#3B82F6' : (entry.name === 'Altri' ? '#6B7280' : (COLORS[idx % COLORS.length] || `hsl(${(idx * 137.5) % 360}, 70%, 50%)`));
                                                            const color = customColors[entry.name] || defaultColor;
                                                            return (
                                                                <linearGradient key={`grad-acc-${idx}`} id={`colorGrad-acc-${idx}`} x1="0" y1="0" x2="1" y2="1">
                                                                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                                                                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                                                                </linearGradient>
                                                            );
                                                        })}
                                                    </defs>
                                                    <Legend
                                                        layout="vertical"
                                                        verticalAlign="middle"
                                                        align="left"
                                                        content={
                                                            <CustomLegend
                                                                customPayload={accountData.map((item, index) => {
                                                                    const defaultColor = item.name === 'Cassa' ? '#3B82F6' : (item.name === 'Altri' ? '#6B7280' : (COLORS[index % COLORS.length] || `hsl(${(index * 137.5) % 360}, 70%, 50%)`));
                                                                    return {
                                                                        value: item.name,
                                                                        color: customColors[item.name] || defaultColor
                                                                    };
                                                                })}
                                                                hiddenItems={hiddenDeepDiveAssets}
                                                                onColorChange={handleColorChange}
                                                                onToggle={(val) => handleDeepDiveLegendClick({ value: val })}
                                                                onHover={(val) => setHoveredDeepDiveAsset(val)}
                                                                onHoverLeave={() => setHoveredDeepDiveAsset(null)}
                                                                onReorder={(dragIndex, hoverIndex) => {
                                                                    const newOrderNames = accountData.map(d => d.name).filter(n => n !== 'Altri');
                                                                    if (accountData[dragIndex].name === 'Altri' || accountData[hoverIndex].name === 'Altri') return;

                                                                    const draggedName = newOrderNames.splice(dragIndex, 1)[0];
                                                                    newOrderNames.splice(hoverIndex, 0, draggedName);
                                                                    setPieAccountOrder(newOrderNames);
                                                                    localStorage.setItem('pieAccountOrder', JSON.stringify(newOrderNames));
                                                                }}
                                                            />
                                                        }
                                                    />
                                                    <Pie
                                                        data={accountData.filter(d => !hiddenDeepDiveAssets[d.name])}
                                                        innerRadius={55}
                                                        outerRadius={95}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        onClick={(data) => {
                                                            if (data && data.name) {
                                                                setFocusedDeepDiveAsset(focusedDeepDiveAsset === data.name ? null : data.name);
                                                            }
                                                        }}
                                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                                                            if (percent <= 0 || hiddenDeepDiveAssets[name]) return null;
                                                            const radius = outerRadius + 15;
                                                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                                            return (
                                                                <text x={x} y={y} fill="var(--text-primary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fontWeight="500">
                                                                    {(percent * 100).toFixed(1)}%
                                                                </text>
                                                            );
                                                        }}
                                                        style={{ cursor: 'pointer', filter: 'url(#shadow-acc)' }}
                                                    >
                                                        {accountData.filter(d => !hiddenDeepDiveAssets[d.name]).map((entry, index) => {
                                                            const originalIndex = accountData.findIndex(x => x.name === entry.name);
                                                            const isHovered = hoveredDeepDiveAsset === entry.name;
                                                            const isFocused = focusedDeepDiveAsset === entry.name;

                                                            let opacity = 1;
                                                            if (focusedDeepDiveAsset) {
                                                                opacity = isFocused ? 1 : 0.2;
                                                            } else if (hoveredDeepDiveAsset) {
                                                                opacity = isHovered ? 1 : 0.4;
                                                            }

                                                            const transform = isHovered || isFocused ? 'scale(1.05)' : 'scale(1)';
                                                            const zIndex = isHovered || isFocused ? 10 : 0;
                                                            return (
                                                                <Cell
                                                                    key={`cell-acc-${originalIndex}`}
                                                                    fill={`url(#colorGrad-acc-${originalIndex})`}
                                                                    opacity={opacity}
                                                                    stroke={isHovered || isFocused ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.2)'}
                                                                    strokeWidth={isHovered || isFocused ? 3 : 1}
                                                                    style={{ transformOrigin: 'center', transform, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer', zIndex }}
                                                                />
                                                            );
                                                        })}
                                                    </Pie>

                                                    {(() => {
                                                        const activeItemName = focusedDeepDiveAsset || hoveredDeepDiveAsset;
                                                        const activeItem = activeItemName ? accountData.find(d => d.name === activeItemName && !hiddenDeepDiveAssets[activeItemName]) : null;

                                                        if (activeItem) {
                                                            return (
                                                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                                                                    <tspan x="50%" dy="-10" fontSize="14" fill="var(--text-secondary)" fontWeight="600">{activeItem.name}</tspan>
                                                                    <tspan x="50%" dy="22" fontSize="16" fill="var(--text-primary)" fontWeight="bold">{formatCurrency(activeItem.value, displayCurrency)}</tspan>
                                                                </text>
                                                            );
                                                        }
                                                        return null;
                                                    })()}

                                                    <Tooltip
                                                        formatter={(value) => `${formatCurrency(value, displayCurrency)}`}
                                                        contentStyle={{ backgroundColor: 'var(--surface-hover)', border: 'none', borderRadius: '8px', color: 'white', zIndex: 100 }}
                                                        itemStyle={{ color: 'white' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Transazioni del Conto */}
                            <div className="glass-panel">
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Cronologia Transazioni nel Conto</h3>
                                <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <table>
                                        <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 1 }}>
                                            <tr>
                                                <th style={{ padding: '0.6rem' }}>Data</th>
                                                <th style={{ padding: '0.6rem' }}>Tipo</th>
                                                <th style={{ padding: '0.6rem' }}>Asset</th>
                                                <th style={{ padding: '0.6rem' }}>Quantità</th>
                                                <th style={{ padding: '0.6rem' }}>Prezzo</th>
                                                <th style={{ padding: '0.6rem' }}>Totale</th>
                                                <th style={{ padding: '0.6rem', textAlign: 'right' }}>Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.filter(tx => tx.account === selectedAccount.name || (!tx.account && selectedAccount.name === 'Default')).map(tx => {
                                                const c = tx.currency || 'EUR';
                                                const sym = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' }[c] || c + ' ';
                                                return (
                                                    <tr key={tx.id}>
                                                        <td style={{ padding: '0.6rem' }}>{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                                                        <td style={{ padding: '0.6rem' }}>
                                                            <span style={{ color: tx.type === 'Buy' || tx.type === 'Deposit' ? 'var(--success)' : (tx.type === 'Sell' || tx.type === 'Withdrawal' ? 'var(--danger)' : 'var(--accent)') }}>
                                                                {tx.type}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.6rem' }}>{tx.symbol}</td>
                                                        <td style={{ padding: '0.6rem' }}>{tx.quantity}</td>
                                                        <td style={{ padding: '0.6rem' }}>{sym}{(tx.price || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                                        <td style={{ padding: '0.6rem' }}>{sym}{(tx.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                                                        <td style={{ padding: '0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.2rem 0.4rem', marginRight: '0.5rem', fontSize: '0.8rem' }}
                                                                title="Modifica Transazione"
                                                                onClick={() => {
                                                                    handleCloseAccountDeepDive();
                                                                    handleEditTransaction(tx);
                                                                }}
                                                            >✏️</button>
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.2rem 0.4rem', borderColor: 'rgba(239, 68, 68, 0.5)', color: 'var(--danger)', fontSize: '0.8rem' }}
                                                                title="Elimina Transazione"
                                                                onClick={() => {
                                                                    handleCloseAccountDeepDive();
                                                                    handleDeleteTransaction(tx.id);
                                                                }}
                                                            >❌</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {transactions.filter(tx => tx.account === selectedAccount.name || (!tx.account && selectedAccount.name === 'Default')).length === 0 && (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                                                        Nessuna transazione registrata su questo conto.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Trasferimento Fondi (Giroconto) */}
            {isTransferModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>⇄ Giroconto / Transfer</h2>
                            <button className="close-btn" onClick={() => setIsTransferModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => {
                                const target = e.target;
                                handleTransferSubmit(e, {
                                    sourceAccount: target.sourceAccount.value,
                                    destAccount: target.destAccount.value,
                                    amount: target.amount.value,
                                    currency: target.currency.value,
                                    date: target.date.value
                                });
                            }}>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Conto di Origine (Da dove prelevare)</label>
                                    <input type="text" className="form-control" name="sourceAccount" list="accounts-list-transfer" required placeholder="es. Fineco" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--accent)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    ⬇
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Conto di Destinazione (Dove depositare)</label>
                                    <input type="text" className="form-control" name="destAccount" list="accounts-list-transfer" required placeholder="es. Interactive Brokers" />
                                </div>
                                <datalist id="accounts-list-transfer">
                                    {Object.keys(accountBalances || {}).map(acc => (
                                        <option key={acc} value={acc} />
                                    ))}
                                </datalist>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Importo</label>
                                        <input type="number" step="any" className="form-control" name="amount" required />
                                    </div>
                                    <div className="form-group">
                                        <label>Valuta</label>
                                        <select className="form-control" name="currency" required defaultValue="EUR">
                                            <option value="EUR">Euro (€)</option>
                                            <option value="USD">Dollaro ($)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Data</label>
                                    <input type="date" className="form-control" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>

                                <div className="form-actions" style={{ marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setIsTransferModalOpen(false)}>Annulla</button>
                                    <button type="submit" className="btn" style={{ background: 'var(--accent)' }}>Conferma Trasferimento</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalModals;
