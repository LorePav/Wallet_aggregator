import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Bar, Scatter, ReferenceLine, PieChart, Pie, Cell, Tooltip, Line } from 'recharts';
import { usePortfolioContext } from '../context/PortfolioContext';
import PageTransition from '../components/PageTransition';


const Transactions = () => {
  const ctx = usePortfolioContext();

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [ctx.txSearchTerm, ctx.txTypeFilter, ctx.txAssetFilter, ctx.txPeriodFilter, ctx.sortedTransactions.length]);

  const totalPages = Math.ceil(ctx.sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTxs = ctx.sortedTransactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <PageTransition>
      <div className="transactions-page">
      {/* Tabella Cronologia Transazioni */}
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '1.5rem' }}>📜 Cronologia Transazioni</h2>
        <>
          {/* TRANSACTION FILTERS UI */}
          <div className="glass-panel" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1rem', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>Filtra:</span>
            <select
              className="form-control"
              value={ctx.txPeriodFilter}
              onChange={e => ctx.setTxPeriodFilter(e.target.value)}
              style={{ minWidth: '150px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <option value="30d">📅 Ultimi 30 Giorni</option>
              <option value="ytd">📅 Da Inizio Anno (YTD)</option>
              <option value="1y">📅 Ultimi 12 Mesi</option>
              <option value="all">📅 Tutto lo Storico</option>
            </select>
            <input
              type="text"
              placeholder="🔍 Cerca asset o conto..."
              className="form-control"
              value={ctx.txSearchTerm}
              onChange={e => ctx.setTxSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select
              className="form-control"
              value={ctx.txTypeFilter}
              onChange={e => ctx.setTxTypeFilter(e.target.value)}
              style={{ minWidth: '150px', cursor: 'pointer' }}
            >
              <option value="">Tutti i Tipi</option>
              <option value="Buy">Compra</option>
              <option value="Sell">Vendi</option>
              <option value="Dividend">Dividendo</option>
              <option value="Deposit">Deposito</option>
              <option value="Withdrawal">Prelievo</option>
            </select>
            <select
              className="form-control"
              value={ctx.txAssetFilter}
              onChange={e => ctx.setTxAssetFilter(e.target.value)}
              style={{ minWidth: '150px', cursor: 'pointer' }}
            >
              <option value="">Tutti gli Asset</option>
              {[...new Set(ctx.transactions.map(tx => tx.symbol))].sort().map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => ctx.requestTxSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>Data {ctx.getTxSortIcon('date')}</th>
                  <th onClick={() => ctx.requestTxSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>Tipo {ctx.getTxSortIcon('type')}</th>
                  <th onClick={() => ctx.requestTxSort('symbol')} style={{ cursor: 'pointer', userSelect: 'none' }}>Asset {ctx.getTxSortIcon('symbol')}</th>
                  <th onClick={() => ctx.requestTxSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>Quantità {ctx.getTxSortIcon('quantity')}</th>
                  <th onClick={() => ctx.requestTxSort('price')} style={{ cursor: 'pointer', userSelect: 'none' }}>Prezzo {ctx.getTxSortIcon('price')}</th>
                  <th onClick={() => ctx.requestTxSort('fees')} style={{ cursor: 'pointer', userSelect: 'none' }}>Commissioni {ctx.getTxSortIcon('fees')}</th>
                  <th onClick={() => ctx.requestTxSort('total')} style={{ cursor: 'pointer', userSelect: 'none' }}>Totale {ctx.getTxSortIcon('total')}</th>
                  <th onClick={() => ctx.requestTxSort('account')} style={{ cursor: 'pointer', userSelect: 'none' }}>Conto {ctx.getTxSortIcon('account')}</th>
                  <th style={{ textAlign: 'right' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {currentTxs.map(tx => {
                  const c = tx.currency || 'EUR';
                  const sym = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' }[c] || c + ' ';
                  return (
                    <tr key={tx.id}>
                      <td style={{ padding: '0.8rem' }}>{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{
                          padding: '4px 10px',
                          background: tx.type === 'Buy' ? 'rgba(16, 185, 129, 0.2)' : (tx.type === 'Sell' ? 'rgba(239, 68, 68, 0.2)' : (tx.type === 'Dividend' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)')),
                          color: tx.type === 'Buy' ? 'var(--success)' : (tx.type === 'Sell' ? 'var(--danger)' : (tx.type === 'Dividend' ? '#c084fc' : 'var(--accent)')),
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          display: 'inline-block',
                          minWidth: '70px',
                          textAlign: 'center'
                        }}>
                          {tx.type === 'Buy' ? 'Compra' : (tx.type === 'Sell' ? 'Vendi' : (tx.type === 'Dividend' ? 'Dividendo' : tx.type))}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: ['EUR', 'USD', 'GBP', 'CHF'].includes(tx.symbol) ? 'rgba(16, 185, 129, 0.2)' : 'var(--surface-hover)',
                            border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)'
                          }}>
                            {['EUR', 'USD', 'GBP', 'CHF'].includes(tx.symbol) ? '💵' : ctx.getInitials(tx.symbol)}
                          </div>
                          <span style={{ fontWeight: '600' }}>{tx.symbol}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.8rem', fontWeight: '500' }}>{tx.quantity}</td>
                      <td style={{ padding: '0.8rem' }}>{sym}{(tx.price || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td style={{ padding: '0.8rem' }}>{sym}{(tx.fees || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.8rem', fontWeight: '600', color: 'white' }}>{sym}{(tx.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{tx.account || 'Default'}</td>
                      <td style={{ padding: '0.8rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }}
                          title="Modifica Transazione"
                          onClick={() => ctx.handleEditTransaction(tx)}
                        >✏️</button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.5rem', borderColor: 'rgba(239, 68, 68, 0.5)', color: 'var(--danger)', fontSize: '0.8rem' }}
                          title="Elimina Transazione"
                          onClick={() => ctx.handleDeleteTransaction(tx.id)}
                        >❌</button>
                      </td>
                    </tr>
                  );
                })}
                {ctx.transactions.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      Nessuna transazione in cronologia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION UI */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                Pagina {currentPage} di {totalPages}
                <span style={{ marginLeft: '12px', opacity: 0.7 }}>({ctx.sortedTransactions.length} risultati filtrati)</span>
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '0.4rem 0.8rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  &lt; Prec
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: 'var(--text-secondary)', alignSelf: 'center' }}>...</span>}
                        <button
                          className={`btn ${p === currentPage ? '' : 'btn-outline'}`}
                          onClick={() => setCurrentPage(p)}
                          style={{ padding: '0.4rem 0.8rem', minWidth: '36px' }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))
                  }
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.4rem 0.8rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Succ &gt;
                </button>
              </div>
            </div>
          )}
        </>
      </div>
    </div>
    </PageTransition>
  );
};
export default Transactions;
