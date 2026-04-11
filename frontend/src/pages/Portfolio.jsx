import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Bar, Scatter, ReferenceLine, PieChart, Pie, Cell, Tooltip, Line } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';
import PageTransition from '../components/PageTransition';


const Portfolio = () => {
  const ctx = usePortfolioContext();
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);

  // Separa gli asset in visibili e nascosti (usando la key unica uniqueId)
  const visiblePortfolio = ctx.sortedPortfolio.filter(item => !ctx.visuallyHiddenAssets[item.uniqueId]);
  const hiddenPortfolio = ctx.sortedPortfolio.filter(item => ctx.visuallyHiddenAssets[item.uniqueId]);

  return (
    <PageTransition>
      <div className="portfolio-page">
      {/* Tabella degli Asset */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div onClick={() => ctx.toggleSection('portfolio')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ctx.sections.portfolio ? '1.5rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>💼 Portafoglio Asset Corrente</h2>
            {ctx.sortConfig.key === 'manual' && <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'var(--accent)', borderRadius: '12px', color: 'white' }}>Ordinamento Manuale Base</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <select
              className="form-control"
              value={ctx.displayCurrency}
              onChange={(e) => { e.stopPropagation(); ctx.setDisplayCurrency(e.target.value); localStorage.setItem('displayCurrency', e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '0.4rem 0.8rem', width: 'auto', backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '0.85rem' }}
              title="Cambia valuta di visualizzazione"
            >
              <option value="EUR">🇪🇺 EUR</option>
              <option value="USD">🇺🇸 USD</option>
            </select>
            <span style={{ fontSize: '1.4rem', transition: 'transform 0.3s', transform: ctx.sections.portfolio ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </div>
        </div>
        {ctx.sections.portfolio && (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => ctx.requestSort('symbol')} style={{ cursor: 'pointer', userSelect: 'none' }}>Asset {ctx.getSortIcon('symbol')}</th>
                    <th>Trend (7d)</th>
                    <th onClick={() => ctx.requestSort('category')} style={{ cursor: 'pointer', userSelect: 'none' }}>Categoria {ctx.getSortIcon('category')}</th>
                    <th onClick={() => ctx.requestSort('account')} style={{ cursor: 'pointer', userSelect: 'none' }}>Conto {ctx.getSortIcon('account')}</th>
                    <th onClick={() => ctx.requestSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>Quantità {ctx.getSortIcon('quantity')}</th>
                    <th onClick={() => ctx.requestSort('pmc')} style={{ cursor: 'pointer', userSelect: 'none' }}>PMC {ctx.getSortIcon('pmc')}</th>
                    <th onClick={() => ctx.requestSort('live_price')} style={{ cursor: 'pointer', userSelect: 'none' }}>Live {ctx.getSortIcon('live_price')}</th>
                    <th onClick={() => ctx.requestSort('current_value')} style={{ cursor: 'pointer', userSelect: 'none' }}>Valore Attuale {ctx.getSortIcon('current_value')}</th>
                    <th onClick={() => ctx.requestSort('unrealized_gain')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>Profitto / Perdita {ctx.getSortIcon('unrealized_gain')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePortfolio.map((item, index) => {
                    const trendData = ctx.sparklineData[item.symbol] || [];
                    const isPositiveTrend = trendData.length > 1 && trendData[trendData.length - 1].price >= trendData[0].price;
                    return (
                      <tr
                        key={item.uniqueId}
                        draggable={true}
                        onDragStart={(e) => {
                          ctx.setDraggedItemIdx(index);
                          e.dataTransfer.effectAllowed = "move";
                          if (ctx.sortConfig.key !== 'manual') {
                            const currentOrder = ctx.sortedPortfolio.map(p => p.uniqueId);
                            ctx.setCustomAssetOrder(currentOrder);
                            setSortConfig({ key: 'manual', direction: 'ascending' });
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (ctx.draggedItemIdx === null || ctx.draggedItemIdx === index) {
                            ctx.setDragOverItemIdx(null);
                            return;
                          }
                          ctx.setDragOverItemIdx(index);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (ctx.draggedItemIdx !== null && ctx.dragOverItemIdx !== null && ctx.draggedItemIdx !== ctx.dragOverItemIdx) {
                            const newOrder = [...ctx.sortedPortfolio];
                            const draggedItem = newOrder.splice(ctx.draggedItemIdx, 1)[0];
                            newOrder.splice(ctx.dragOverItemIdx, 0, draggedItem);

                            // Assicuriamoci che non ci siano undefined o rotture, e salviamo array di uniqueId
                            const newIdOrder = newOrder.map(p => p?.uniqueId).filter(Boolean);
                            ctx.setCustomAssetOrder(newIdOrder);
                            localStorage.setItem('customAssetOrder', JSON.stringify(newIdOrder));
                          }
                          ctx.setDraggedItemIdx(null);
                          ctx.setDragOverItemIdx(null);
                        }}
                        onDragEnd={(e) => {
                          ctx.setDraggedItemIdx(null);
                          ctx.setDragOverItemIdx(null);
                          setTimeout(() => ctx.setDragInteraction({ isDragging: false, isClicking: false }), 50);
                        }}
                        onMouseDown={() => ctx.setDragInteraction({ isDragging: false, isClicking: true })}
                        onMouseUp={() => {
                          if (ctx.dragInteraction.isClicking && !ctx.dragInteraction.isDragging && !ctx.draggedItemIdx) {
                            ctx.handleOpenDeepDive(item);
                          }
                          ctx.setDragInteraction({ isDragging: false, isClicking: false });
                        }}
                        onMouseMove={() => {
                          if (ctx.dragInteraction.isClicking) {
                            ctx.setDragInteraction(prev => ({ ...prev, isDragging: true }));
                          }
                        }}
                        style={{
                          cursor: ctx.draggedItemIdx !== null ? 'grabbing' : (item.isLiquidity ? 'default' : 'pointer'),
                          opacity: ctx.draggedItemIdx === index ? 0.3 : 1,
                          backgroundColor: ctx.draggedItemIdx === index ? 'rgba(255,255,255,0.02)' : (ctx.dragOverItemIdx === index ? 'rgba(59, 130, 246, 0.15)' : ''),
                          borderTop: ctx.dragOverItemIdx === index && ctx.draggedItemIdx > index ? '2px solid var(--accent)' : 'none',
                          borderBottom: ctx.dragOverItemIdx === index && ctx.draggedItemIdx < index ? '2px solid var(--accent)' : 'none',
                          transform: ctx.draggedItemIdx === index ? 'scale(0.99)' : 'scale(1)',
                          transition: 'background-color 0.2s, opacity 0.2s, transform 0.2s'
                        }}
                        title={item.isLiquidity ? 'Trascina per ordinare l\'asset' : 'Trascina per ordinare manualmente o clicca la riga per i dettagli'}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ cursor: 'grab', color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem', paddingRight: '4px', userSelect: 'none' }}>⋮⋮</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); ctx.toggleVisualHiddenAsset(item.uniqueId); }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', opacity: 0.6 }}
                              title="Nascondi dalla lista"
                            >
                              ✕
                            </button>

                            {/* ASSET LOGO */}
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: item.isLiquidity ? 'rgba(16, 185, 129, 0.2)' : 'var(--surface-hover)',
                              border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
                            }}>
                              {item.isLiquidity ? (
                                <span style={{ fontSize: '1.2rem' }}>💵</span>
                              ) : (
                                item.category === 'Crypto' ? (
                                  <img src={`https://assets.coincap.io/assets/icons/${item.symbol.toLowerCase()}@2x.png`}
                                    alt={item.symbol}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                ) : (
                                  <img src={`https://logo.clearbit.com/${item.name.split(' ')[0].toLowerCase()}.com`}
                                    alt={item.symbol}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                )
                              )}
                              {/* Fallback in caso l'immagine fallisca (hidden finchè img non errora) */}
                              {!item.isLiquidity && (
                                <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                  {ctx.getInitials(item.symbol)}
                                </div>
                              )}
                            </div>

                            <div>
                              <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.symbol}</div>
                              <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {item.isLiquidity ? (
                            <div className="sparkline-container text-secondary" style={{ fontSize: '0.8rem', lineHeight: '45px', textAlign: 'center' }}>-</div>
                          ) : (
                            <div className="sparkline-container">
                              {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                    <defs>
                                      <linearGradient id={`spark-${item.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositiveTrend ? "var(--success)" : "var(--danger)"} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={isPositiveTrend ? "var(--success)" : "var(--danger)"} stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <YAxis domain={['auto', 'auto']} hide={true} />
                                    <Area type="monotone" dataKey="price" stroke={isPositiveTrend ? 'var(--success)' : 'var(--danger)'} strokeWidth={2} fill={`url(#spark-${item.symbol})`} isAnimationActive={false} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', opacity: 0.3 }}><span style={{ fontSize: '0.7rem' }}>•••</span></div>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 10px',
                            background: item.isLiquidity ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.08)',
                            color: item.isLiquidity ? 'var(--success)' : 'white',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.account || 'Default'}</td>
                        <td style={{ fontWeight: '500' }}>{item.quantity.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                        <td>{ctx.formatCurrency(item.pmc, item.currency, 4)}</td>
                        <td>{ctx.formatCurrency(item.live_price, item.currency, 4)}</td>
                        <td style={{ fontWeight: '600', color: 'white' }}>{ctx.formatCurrency(item.current_value, item.currency)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {item.isLiquidity ? '-' : (
                            <div className={item.unrealized_gain >= 0 ? 'profit-badge' : 'loss-badge'}>
                              {item.unrealized_gain >= 0 ? '▲ ' : '▼ '}
                              {item.unrealized_gain >= 0 ? '+' : ''}{ctx.formatCurrency(item.unrealized_gain, item.currency)}
                              <span style={{ fontSize: '0.75rem', opacity: 0.9, marginLeft: '4px', display: 'block' }}>
                                ({item.unrealized_gain_percent > 0 ? '+' : ''}{item.unrealized_gain_percent.toFixed(2)}%)
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visiblePortfolio.length === 0 && ctx.combinedPortfolio.length > 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Tutti gli asset sono attualmente nascosti.
                      </td>
                    </tr>
                  )}
                  {ctx.combinedPortfolio.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Nessun asset inserito in portafoglio
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pannello Asset Nascosti (Spostato fuori dal container della tabella) */}
            {hiddenPortfolio.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Hai {hiddenPortfolio.length} asset nascosti dalla lista. Il loro valore rimane incluso nei saldi totali.</span>
                  <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowHiddenPanel(!showHiddenPanel)}>
                    {showHiddenPanel ? 'Nascondi' : 'Mostra Asset Nascosti'}
                  </button>
                </div>
                {showHiddenPanel && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {hiddenPortfolio.map(item => (
                      <div key={item.uniqueId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>✕</span>
                          <strong style={{ color: 'var(--text-secondary)' }}>{item.symbol}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.name}</span>
                        </div>
                        <button
                          className="btn"
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'var(--surface-hover)', borderColor: 'rgba(255,255,255,0.1)' }}
                          onClick={() => {
                            ctx.toggleVisualHiddenAsset(item.uniqueId);
                            if (hiddenPortfolio.length === 1) setShowHiddenPanel(false);
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>↺ Ripristina</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </PageTransition>
  );
};
export default Portfolio;
