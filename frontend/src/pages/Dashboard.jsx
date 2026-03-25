import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Bar, Scatter, ReferenceLine, PieChart, Pie, Cell, Tooltip, Line, Brush } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';


const Dashboard = () => {
    const ctx = usePortfolioContext();
    return (
        <div className="dashboard-page">
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                <h1>La Mia Dashboard</h1>
                <p className="text-secondary">Benvenuto nel tuo tracker di portafoglio di nuova generazione.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select
                    className="form-control"
                    value={ctx.displayCurrency}
                    onChange={(e) => {
                        ctx.setDisplayCurrency(e.target.value);
                        localStorage.setItem('displayCurrency', e.target.value);
                    }}
                    style={{ padding: '0.6rem 1rem', width: 'auto', backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}
                    title="Cambia valuta di visualizzazione"
                >
                    <option value="EUR">🇪🇺 EUR</option>
                    <option value="USD">🇺🇸 USD</option>
                </select>
                <button
                    className="btn btn-outline"
                    onClick={() => ctx.setIsSettingsOpen(true)}
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center' }}
                    title="Impostazioni"
                >
                    ⚙️ Menu
                </button>
                <button
                    className={`btn ${ctx.autoRefresh ? 'pulse-button' : 'btn-outline'}`}
                    onClick={() => ctx.setAutoRefresh(!ctx.autoRefresh)}
                    style={ctx.autoRefresh ? { background: 'var(--accent)', color: 'white', border: 'none' } : { borderColor: 'var(--accent)', color: 'var(--accent)' }}
                >
                    {ctx.autoRefresh ? '🔄 Auto-Refresh: ON' : '⏸ Auto-Refresh: OFF'}
                </button>
                <button className="btn" onClick={() => { ctx.setEditingTxId(null); ctx.setIsModalOpen(true); }} style={{ background: 'var(--success)' }}>
                    + Nuova Transazione
                </button>
                <button className="btn" onClick={() => { ctx.fetchPortfolio(); ctx.fetchTransactions(); ctx.fetchLiquidity(); }}>
                    Aggiorna Prezzi Live
                </button>
                </div>
            </header>

            <div style={{ textAlign: 'right', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {ctx.lastUpdated ? `Ultimo aggiornamento: ${ctx.lastUpdated.toLocaleTimeString('it-IT')}` : 'Aggiornamento in corso...'}
            </div>

            {ctx.loading ? (
                <div style={{ textAlign: 'center', padding: '5rem', fontSize: '1.2rem', color: 'var(--accent)' }}>
                Caricamento Dati e Prezzi Live in corso...
                </div>
            ) : (
                <>

          {/* Griglia Valori Globali */}
          <div className="summary-grid">
            <div className="glass-panel summary-card">
              <h3>Valore Totale MTM</h3>
              <div className="value">{ctx.formatCurrency(ctx.totalValue, ctx.displayCurrency)}</div>
            </div>

            <div className="glass-panel summary-card" style={{ padding: '1.2rem' }}>
              <h3><span style={{ fontSize: '1.2rem', marginRight: '8px' }}>🏦</span> Saldi per Conto</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {Object.keys(ctx.accountBalances).length === 0 ? (
                  <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Nessun conto registrato</span>
                ) : (
                  (() => {
                    const entries = Object.entries(ctx.accountBalances);
                    entries.sort((a, b) => {
                      const idxA = ctx.accountBalancesOrder.indexOf(a[0]);
                      const idxB = ctx.accountBalancesOrder.indexOf(b[0]);
                      if (idxA === -1 && idxB === -1) return b[1].total - a[1].total;
                      if (idxA === -1) return 1;
                      if (idxB === -1) return -1;
                      return idxA - idxB;
                    });

                    return entries.map(([accName, data], index) => (
                      <div
                        key={accName}
                        draggable={true}
                        onDragStart={(e) => {
                          ctx.setDraggedAccountIdx(index);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (ctx.draggedAccountIdx === null || ctx.draggedAccountIdx === index) {
                            ctx.setDragOverAccountIdx(null);
                            return;
                          }
                          ctx.setDragOverAccountIdx(index);
                        }}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (ctx.draggedAccountIdx !== null && ctx.dragOverAccountIdx !== null && ctx.draggedAccountIdx !== ctx.dragOverAccountIdx) {
                            const newOrderNames = entries.map(d => d[0]);
                            const draggedName = newOrderNames.splice(ctx.draggedAccountIdx, 1)[0];
                            newOrderNames.splice(ctx.dragOverAccountIdx, 0, draggedName);
                            ctx.setAccountBalancesOrder(newOrderNames);
                            localStorage.setItem('accountBalancesOrder', JSON.stringify(newOrderNames));
                          }
                          ctx.setDraggedAccountIdx(null);
                          ctx.setDragOverAccountIdx(null);
                        }}
                        onDragEnd={() => {
                          ctx.setDraggedAccountIdx(null);
                          ctx.setDragOverAccountIdx(null);
                        }}
                        onClick={() => ctx.handleOpenAccountDeepDive(accName, data)}
                        style={{
                          paddingBottom: '0.8rem',
                          cursor: ctx.draggedAccountIdx !== null ? 'grabbing' : 'grab',
                          opacity: ctx.draggedAccountIdx === index ? 0.5 : 1,
                          borderTop: (ctx.dragOverAccountIdx === index && ctx.draggedAccountIdx > index) ? `2px solid var(--accent)` : 'none',
                          borderBottom: (ctx.dragOverAccountIdx === index && ctx.draggedAccountIdx < index) ? `2px solid var(--accent)` : '1px solid rgba(255,255,255,0.05)',
                          backgroundColor: ctx.dragOverAccountIdx === index ? 'rgba(255,255,255,0.05)' : 'transparent',
                          transition: 'all 0.2s',
                          padding: '0.5rem',
                          borderRadius: '8px'
                        }}
                        title="Trascina per riordinare, clicca per il Deep Dive"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ cursor: 'grab', opacity: 0.5, fontSize: '0.8rem' }}>::</span>
                            {accName}
                          </strong>
                          <span style={{ fontWeight: '600', color: data.total >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {ctx.formatCurrency(data.total, ctx.displayCurrency)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '22px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                          {data.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span className="text-secondary">{item.symbol} {item.isLiquidity ? '(Cassa)' : ''}</span>
                              <span>{ctx.formatCurrency(item.current_value, item.currency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>

            <div className="glass-panel summary-card">
              <h3>Totale Investito</h3>
              <div className="value">{ctx.formatCurrency(ctx.totalInvested, ctx.displayCurrency)}</div>
            </div>
            <div className="glass-panel summary-card">
              <h3>Guadagno Netto Totale</h3>
              <div className={`value ${ctx.totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                {ctx.totalGain >= 0 ? '+' : ''}{ctx.formatCurrency(ctx.totalGain, ctx.displayCurrency)}
                <span style={{ fontSize: '1.1rem', marginLeft: '0.8rem', opacity: 0.9 }}>
                  ({ctx.totalGainPercent > 0 ? '+' : ''}{ctx.totalGainPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Grafico Andamento nel Tempo */}
          {ctx.snapshots.length > 0 && (
            <div className="glass-panel" style={{ marginBottom: '2.5rem' }}>
              <div onClick={() => ctx.toggleSection('chart')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: ctx.sections.chart ? '1.5rem' : 0 }}>
                  <h3 style={{ margin: 0 }}>📈 Andamento Storico Portafoglio</h3>
                  {ctx.sections.chart && ctx.historyPeriod !== 'ALL' && ctx.filteredSnapshots.length > 0 && (
                    <span style={{ fontSize: '0.9rem', color: ctx.periodGain >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {ctx.periodGain >= 0 ? '▲' : '▼'} {ctx.formatCurrency(Math.abs(ctx.periodGain), ctx.displayCurrency)} ({ctx.periodGain >= 0 ? '+' : ''}{ctx.periodGainPercent.toFixed(2)}%)
                    </span>
                  )}
                  {ctx.sections.chart && ctx.chartMode === 'percentage' && ctx.maxDrawdown < 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Max Drawdown: {ctx.maxDrawdown.toFixed(2)}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1.4rem', transition: 'transform 0.3s', transform: ctx.sections.chart ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </div>
              {ctx.sections.chart && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={`btn ${ctx.chartMode === 'absolute' ? '' : 'btn-outline'}`} onClick={(e) => { e.stopPropagation(); ctx.setChartMode('absolute'); }} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>💶 Assoluto</button>
                      <button className={`btn ${ctx.chartMode === 'percentage' ? '' : 'btn-outline'}`} onClick={(e) => { e.stopPropagation(); ctx.setChartMode('percentage'); }} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>% TWR Rendimento</button>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['1G', '1S', '1M', '3M', '6M', '1Y', 'ALL'].map(period => (
                        <button
                          key={period}
                          className={`btn ${ctx.historyPeriod === period ? '' : 'btn-secondary'}`}
                          style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                          onClick={(e) => { e.stopPropagation(); ctx.setHistoryPeriod(period); }}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart key={`${ctx.historyPeriod}-${ctx.chartMode}`} data={ctx.filteredSnapshots} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorTwr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        {(() => {
                          const showDots = ['1G', '1S', '1M'].includes(ctx.historyPeriod);
                          let customTicks = undefined;
                          if (ctx.historyPeriod === '1S' || ctx.historyPeriod === '1G') {
                            customTicks = ctx.filteredSnapshots.map(d => d.time);
                          } else if (ctx.historyPeriod === '1M') {
                            customTicks = [];
                            for (let i = 0; i < ctx.filteredSnapshots.length; i += 7) {
                              customTicks.push(ctx.filteredSnapshots[i].time);
                            }
                            if (ctx.filteredSnapshots.length > 0) {
                              // Assicura che l'ultimo tracciato (oggi) abbia sempre l'etichetta visibile
                              const lastTime = ctx.filteredSnapshots[ctx.filteredSnapshots.length - 1].time;
                              if (!customTicks.includes(lastTime)) customTicks.push(lastTime);
                            }
                          }
                          
                          return (
                            <XAxis
                              dataKey="time"
                              type="number"
                              domain={['dataMin', 'dataMax']}
                              stroke="rgba(255,255,255,0.4)"
                              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                              minTickGap={customTicks ? 0 : 30}
                              ticks={customTicks}
                              tickFormatter={(unixTime) => {
                                if (ctx.historyPeriod === '1G') {
                                  return new Date(unixTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                                }
                                return new Date(unixTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                              }}
                              tickMargin={10}
                            />
                          );
                        })()}

                        {ctx.chartMode === 'absolute' ? (
                          <>
                            <YAxis
                              yAxisId="left"
                              stroke="rgba(255,255,255,0.4)"
                              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                              tickFormatter={(value) => { const prefix = ctx.displayCurrency === 'USD' ? '$' : '€'; return `${prefix}${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`; }}
                              domain={['auto', 'auto']}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              domain={['auto', 'auto']}
                              hide={true} // Hidden axis just for the Bar scale
                            />
                            <YAxis yAxisId="events" domain={[-1, 10]} hide={true} />
                            <Area yAxisId="left" type="monotone" dataKey="total_invested" stroke="var(--accent)" fillOpacity={1} fill="url(#colorInvested)" name="total_invested" isAnimationActive={ctx.historyPeriod === 'ALL' ? false : true} dot={['1G', '1S', '1M'].includes(ctx.historyPeriod) ? { r: 3, fill: 'var(--surface-hover)', strokeWidth: 2 } : false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Area yAxisId="left" type="monotone" dataKey="total_value" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name="total_value" isAnimationActive={ctx.historyPeriod === 'ALL' ? false : true} dot={['1G', '1S', '1M'].includes(ctx.historyPeriod) ? { r: 4, strokeWidth: 2 } : false} activeDot={{ r: 7, strokeWidth: 0 }} />
                            {/* Volumi stile crypto per depositi */}
                            <Bar yAxisId="right" dataKey="daily_deposit" fill="rgba(59, 130, 246, 0.3)" barSize={20} />
                          </>
                        ) : (
                          <>
                            <YAxis
                              yAxisId="twr"
                              stroke="rgba(255,255,255,0.4)"
                              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                              tickFormatter={(value) => `${value.toFixed(1)}%`}
                              domain={['auto', 'auto']}
                            />
                            <YAxis yAxisId="events" domain={[-1, 10]} hide={true} />
                            <ReferenceLine yAxisId="twr" y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                            {ctx.benchmarkData.length > 0 && (
                              <Line yAxisId="twr" type="monotone" dataKey="benchmark_percent" stroke="rgba(255,255,255,0.3)" strokeWidth={2} dot={['1G', '1S', '1M'].includes(ctx.historyPeriod) ? { r: 3 } : false} strokeDasharray="5 5" name="S&P 500" isAnimationActive={ctx.historyPeriod === 'ALL' ? false : true} />
                            )}
                            <Area yAxisId="twr" type="monotone" dataKey="twr_percent" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTwr)" name="TWR%" isAnimationActive={ctx.historyPeriod === 'ALL' ? false : true} dot={['1G', '1S', '1M'].includes(ctx.historyPeriod) ? { r: 4, strokeWidth: 2 } : false} activeDot={{ r: 7, strokeWidth: 0 }} />
                          </>
                        )}

                        <Scatter yAxisId="events" dataKey="has_event" fill="#f59e0b" shape="circle" style={{ filter: 'url(#glow)', cursor: 'pointer' }} r={5} />

                        <Tooltip content={<ctx.CustomHistoryTooltip />} />
                        <Brush 
                          dataKey="time" 
                          height={40} 
                          stroke="var(--accent)" 
                          fill="rgba(139, 92, 246, 0.05)" 
                          travellerWidth={14}
                          tickFormatter={(unixTime) => ctx.historyPeriod === '1G' 
                            ? new Date(unixTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) 
                            : new Date(unixTime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                          }
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            fontFamily: 'Inter'
                          }}
                        >
                          <AreaChart>
                            <Area type="monotone" dataKey={ctx.chartMode === 'absolute' ? "total_value" : "twr_percent"} stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
                          </AreaChart>
                        </Brush>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grafici a Torta (Statistiche) */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: ctx.sections.pies ? '0' : '0', borderRadius: ctx.sections.pies ? '16px 16px 0 0' : '16px', cursor: 'pointer' }} onClick={() => ctx.toggleSection('pies')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>🥧 Diversificazione Portafoglio</h3>
                <span style={{ fontSize: '1.4rem', transition: 'transform 0.3s', transform: ctx.sections.pies ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </div>
            </div>
            {ctx.sections.pies && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, textAlign: 'left' }}>Diversificazione per Asset</h3>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', opacity: ctx.groupSmallAssets ? 1 : 0.6 }}
                      onClick={() => ctx.setGroupSmallAssets(!ctx.groupSmallAssets)}
                      title="Raggruppa asset < 2%"
                    >
                      {ctx.groupSmallAssets ? '🪄 Separa Asset' : '🪄 Raggruppa "Altri"'}
                    </button>
                  </div>
                  <div className="pie-chart-container" style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.3" />
                          </filter>
                          {/* Palette espansa per tanti asset */}
                          {ctx.processedAssetData.map((entry, idx) => {
                            // Genera colori HSL se la palette fissa finisce
                            const defaultColor = entry.name === 'Altri' ? '#6B7280' :
                              (ctx.COLORS[idx % ctx.COLORS.length] || `hsl(${(idx * 137.5) % 360}, 70%, 50%)`);
                            const color = ctx.customColors[entry.name] || defaultColor;
                            return (
                              <linearGradient key={`grad-asset-${idx}`} id={`colorGrad-asset-${idx}`} x1="0" y1="0" x2="1" y2="1">
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
                            <ctx.CustomLegend
                              customPayload={ctx.processedAssetData.map((item, index) => {
                                const defaultColor = item.name === 'Altri' ? '#6B7280' :
                                  (ctx.COLORS[index % ctx.COLORS.length] || `hsl(${(index * 137.5) % 360}, 70%, 50%)`);
                                return {
                                  value: item.name,
                                  color: ctx.customColors[item.name] || defaultColor
                                };
                              })}
                              hiddenItems={ctx.hiddenAssets}
                              onColorChange={ctx.handleColorChange}
                              onToggle={(val) => ctx.handleAssetLegendClick({ value: val })}
                              onHover={(val) => ctx.setHoveredAsset(val)}
                              onHoverLeave={() => ctx.setHoveredAsset(null)}
                              onReorder={(dragIndex, hoverIndex) => {
                                const newOrderNames = ctx.processedAssetData.map(d => d.name).filter(n => n !== 'Altri'); // Non spostiamo gli "Altri"
                                if (ctx.processedAssetData[dragIndex].name === 'Altri' || ctx.processedAssetData[hoverIndex].name === 'Altri') return;

                                const draggedName = newOrderNames.splice(dragIndex, 1)[0];
                                newOrderNames.splice(hoverIndex, 0, draggedName);
                                ctx.setPieAssetOrder(newOrderNames);
                                localStorage.setItem('pieAssetOrder', JSON.stringify(newOrderNames));
                              }}
                            />
                          }
                        />
                        <Pie
                          data={ctx.processedAssetData.filter(d => !ctx.hiddenAssets[d.name])}
                          innerRadius={65}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data, index) => {
                            if (data && data.name) {
                              ctx.setFocusedAsset(ctx.focusedAsset === data.name ? null : data.name);
                            }
                          }}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                            // Recharts provides `percent` come decimale (0 to 1). Mostriamo tutto ciò che non è nascosto.
                            if (percent <= 0 || ctx.hiddenAssets[name]) return null;
                            const radius = outerRadius + 15;
                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                            return (
                              <text x={x} y={y} fill="var(--text-primary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fontWeight="500">
                                {(percent * 100).toFixed(1)}%
                              </text>
                            );
                          }}
                          style={{ cursor: 'pointer', filter: 'url(#shadow)' }}
                        >
                          {ctx.processedAssetData.filter(d => !ctx.hiddenAssets[d.name]).map((entry, index) => {
                            const originalIndex = ctx.processedAssetData.findIndex(x => x.name === entry.name);
                            const isHovered = ctx.hoveredAsset === entry.name;
                            const isFocused = ctx.focusedAsset === entry.name;

                            // Logica opacità con focus
                            let opacity = 1;
                            if (ctx.focusedAsset) {
                              opacity = isFocused ? 1 : 0.2;
                            } else if (ctx.hoveredAsset) {
                              opacity = isHovered ? 1 : 0.4;
                            }

                            const transform = isHovered || isFocused ? 'scale(1.05)' : 'scale(1)';
                            const zIndex = isHovered || isFocused ? 10 : 0;
                            return (
                              <Cell
                                key={`cell-asset-${originalIndex}`}
                                fill={`url(#colorGrad-asset-${originalIndex})`}
                                opacity={opacity}
                                stroke={isHovered || isFocused ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.2)'}
                                strokeWidth={isHovered || isFocused ? 3 : 1}
                                style={{ transformOrigin: 'center', transform, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer', zIndex }}
                              />
                            );
                          })}
                        </Pie>

                        {/* Etichetta Centrale Dinamica */}
                        {(() => {
                          const activeItemName = ctx.focusedAsset || ctx.hoveredAsset;
                          const activeItem = activeItemName ? ctx.processedAssetData.find(d => d.name === activeItemName && !ctx.hiddenAssets[activeItemName]) : null;

                          if (activeItem) {
                            return (
                              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                                <tspan x="50%" dy="-10" fontSize="14" fill="var(--text-secondary)" fontWeight="600">{activeItem.name}</tspan>
                                <tspan x="50%" dy="22" fontSize="16" fill="var(--text-primary)" fontWeight="bold">{ctx.formatCurrency(activeItem.value, ctx.displayCurrency)}</tspan>
                              </text>
                            );
                          }
                          return null;
                        })()}

                        <Tooltip
                          formatter={(value) => `${ctx.formatCurrency(value, ctx.displayCurrency)}`}
                          contentStyle={{ backgroundColor: 'var(--surface-hover)', border: 'none', borderRadius: '8px', color: 'white', zIndex: 100 }}
                          itemStyle={{ color: 'white' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, textAlign: 'left' }}>Allocazione per Categoria</h3>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', opacity: ctx.groupSmallCategories ? 1 : 0.6 }}
                      onClick={() => ctx.setGroupSmallCategories(!ctx.groupSmallCategories)}
                      title="Raggruppa categorie < 2%"
                    >
                      {ctx.groupSmallCategories ? '🪄 Separa Categoria' : '🪄 Raggruppa "Altri"'}
                    </button>
                  </div>
                  <div className="pie-chart-container" style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <filter id="shadow-cat" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.3" />
                          </filter>
                          {ctx.categoryData.map((entry, idx) => {
                            const defaultColor = entry.name === 'Altri' ? '#6B7280' :
                              (ctx.COLORS[(idx + 3) % ctx.COLORS.length] || `hsl(${((idx + 3) * 137.5) % 360}, 70%, 50%)`);
                            const color = ctx.customColors[entry.name] || defaultColor;
                            return (
                              <linearGradient key={`grad-cat-${idx}`} id={`colorGradCat-${idx}`} x1="0" y1="0" x2="1" y2="1">
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
                            <ctx.CustomLegend
                              customPayload={ctx.categoryData.map((item, index) => {
                                const defaultColor = item.name === 'Altri' ? '#6B7280' :
                                  (ctx.COLORS[(index + 3) % ctx.COLORS.length] || `hsl(${((index + 3) * 137.5) % 360}, 70%, 50%)`);
                                return {
                                  value: item.name,
                                  color: ctx.customColors[item.name] || defaultColor
                                };
                              })}
                              hiddenItems={ctx.hiddenCategories}
                              onColorChange={ctx.handleColorChange}
                              onToggle={(val) => ctx.handleCategoryLegendClick({ value: val })}
                              onHover={(val) => ctx.setHoveredCategory(val)}
                              onHoverLeave={() => ctx.setHoveredCategory(null)}
                              onReorder={(dragIndex, hoverIndex) => {
                                const newOrderNames = ctx.categoryData.map(d => d.name).filter(n => n !== 'Altri');
                                if (ctx.categoryData[dragIndex].name === 'Altri' || ctx.categoryData[hoverIndex].name === 'Altri') return;

                                const draggedName = newOrderNames.splice(dragIndex, 1)[0];
                                newOrderNames.splice(hoverIndex, 0, draggedName);
                                ctx.setPieCategoryOrder(newOrderNames);
                                localStorage.setItem('pieCategoryOrder', JSON.stringify(newOrderNames));
                              }}
                            />
                          }
                        />
                        <Pie
                          data={ctx.categoryData.filter(d => !ctx.hiddenCategories[d.name])}
                          innerRadius={65}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data, index) => {
                            if (data && data.name) {
                              ctx.setFocusedCategory(ctx.focusedCategory === data.name ? null : data.name);
                            }
                          }}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                            if (percent <= 0 || ctx.hiddenCategories[name]) return null;
                            const radius = outerRadius + 15;
                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                            return (
                              <text x={x} y={y} fill="var(--text-primary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fontWeight="500">
                                {(percent * 100).toFixed(1)}%
                              </text>
                            );
                          }}
                          style={{ cursor: 'pointer', filter: 'url(#shadow-cat)' }}
                        >
                          {ctx.categoryData.filter(d => !ctx.hiddenCategories[d.name]).map((entry, index) => {
                            const originalIndex = ctx.categoryData.findIndex(x => x.name === entry.name);
                            const isHovered = ctx.hoveredCategory === entry.name;
                            const isFocused = ctx.focusedCategory === entry.name;

                            let opacity = 1;
                            if (ctx.focusedCategory) {
                              opacity = isFocused ? 1 : 0.2;
                            } else if (ctx.hoveredCategory) {
                              opacity = isHovered ? 1 : 0.4;
                            }

                            const transform = isHovered || isFocused ? 'scale(1.05)' : 'scale(1)';
                            const colorIndex = originalIndex;
                            const zIndex = isHovered || isFocused ? 10 : 0;
                            return (
                              <Cell
                                key={`cell-cat-${originalIndex}`}
                                fill={`url(#colorGradCat-${colorIndex})`}
                                opacity={opacity}
                                stroke={isHovered || isFocused ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.2)'}
                                strokeWidth={isHovered || isFocused ? 3 : 1}
                                style={{ transformOrigin: 'center', transform, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer', zIndex }}
                              />
                            );
                          })}
                        </Pie>

                        {(() => {
                          const activeItemName = ctx.focusedCategory || ctx.hoveredCategory;
                          const activeItem = activeItemName ? ctx.categoryData.find(d => d.name === activeItemName && !ctx.hiddenCategories[activeItemName]) : null;

                          if (activeItem) {
                            return (
                              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                                <tspan x="50%" dy="-10" fontSize="14" fill="var(--text-secondary)" fontWeight="600">{activeItem.name}</tspan>
                                <tspan x="50%" dy="22" fontSize="16" fill="var(--text-primary)" fontWeight="bold">{ctx.formatCurrency(activeItem.value, ctx.displayCurrency)}</tspan>
                              </text>
                            );
                          }
                          return null;
                        })()}

                        <Tooltip
                          formatter={(value) => `${ctx.formatCurrency(value, ctx.displayCurrency)}`}
                          contentStyle={{ backgroundColor: 'var(--surface-hover)', border: 'none', borderRadius: '8px', color: 'white', zIndex: 100 }}
                          itemStyle={{ color: 'white' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
                </>
            )}
        </div>
    );
};
export default Dashboard;
