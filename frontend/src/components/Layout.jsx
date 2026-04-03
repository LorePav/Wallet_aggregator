import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import { usePortfolioContext } from '../context/PortfolioContext';
import GlobalModals from './GlobalModals';

const Layout = () => {
  const {
    isModalOpen, setIsModalOpen,
    formData, setFormData, handleInputChange, handleSubmit,
    editingTxId, accountBalances
  } = usePortfolioContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/search-tickers?q=${encodeURIComponent(searchTerm)}`);
        if (res.data) {
          setSearchResults(res.data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Errore ricerca ticker:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectTicker = (result) => {
    setFormData(prev => ({
      ...prev,
      symbol: result.symbol,
      name: result.name || ''
    }));
    setSearchTerm(''); // Puliamo il campo di ricerca: i campi sotto sono già compilati
    setShowDropdown(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="app-container" style={{ margin: 0, width: '100%', maxWidth: 'none', padding: '2rem 3rem' }}>
          <Outlet />
        </div>
      </main>

      <GlobalModals />

      {/* Global Transaction Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingTxId ? 'Modifica Transazione' : 'Aggiungi Transazione'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tipo Operazione</label>
                    <select className="form-control" name="type" value={formData.type} onChange={handleInputChange} required>
                      <option value="Buy">Acquisto Asset (Buy)</option>
                      <option value="Sell">Vendita Asset (Sell)</option>
                      <option value="Dividend" style={{ color: 'var(--accent)' }}>Incasso Dividendo</option>
                      <option value="Farming DeFi" style={{ color: 'var(--accent)' }}>Farming (DeFi)</option>
                      <option value="Deposit" style={{ color: 'var(--success)', fontWeight: 'bold' }}>+ Deposito in Cassa</option>
                      <option value="Withdrawal" style={{ color: 'var(--danger)', fontWeight: 'bold' }}>- Prelievo da Cassa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" name="date" value={formData.date} onChange={handleInputChange} required />
                  </div>
                  {(formData.type === 'Deposit' || formData.type === 'Withdrawal' || formData.type === 'Dividend' || formData.type === 'Farming DeFi') ? (
                    <div className="form-group">
                      <label>Valuta Flusso di Cassa / Entrata</label>
                      <select className="form-control" name="symbol" value={formData.symbol} onChange={handleInputChange} required>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">Dollaro (USD)</option>
                        <option value="GBP">Sterlina (GBP)</option>
                        <option value="JPY">Yen (JPY)</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="form-group" style={{ position: 'relative' }}>
                        <label>Cerca Asset (es. Apple, Bitcoin)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Inizia a digitare o compila manualmente sotto..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoComplete="off"
                        />
                        {isSearching && <div style={{ position: 'absolute', right: '10px', top: '35px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Cerco...</div>}
                        {showDropdown && searchResults.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', borderRadius: '4px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            {searchResults.map(res => (
                              <div
                                key={res.symbol}
                                style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}
                                onClick={() => handleSelectTicker(res)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <div>
                                  <strong style={{ color: 'var(--accent)' }}>{res.symbol}</strong>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{res.name}</div>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>{res.exchange}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Ticker Selezionato <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>*</span></label>
                        <input type="text" className="form-control" name="symbol" value={formData.symbol} onChange={handleInputChange} required />
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label>Nome Completo (Opzionale)</label>
                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select
                      className="form-control"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      disabled={formData.type === 'Deposit' || formData.type === 'Withdrawal' || formData.type === 'Dividend' || formData.type === 'Farming DeFi'}
                      style={(formData.type === 'Deposit' || formData.type === 'Withdrawal' || formData.type === 'Dividend' || formData.type === 'Farming DeFi') ? { backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' } : {}}
                    >
                      <option value="Azioni">Azioni</option>
                      <option value="Crypto">Crypto</option>
                      <option value="ETF">ETF</option>
                      <option value="FARMING">Farming (DeFi)</option>
                      <option value="Trading">Trading</option>
                      <option value="Liquidità">Liquidità Cassa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valuta Base</label>
                    <select className="form-control" name="currency" value={formData.currency} onChange={handleInputChange} required>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollaro ($)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{(formData.type === 'Dividend' || formData.type === 'Farming DeFi') ? 'Importo Ottenuto' : 'Quantità'}</label>
                    <input type="number" step="any" className="form-control" name="quantity" value={formData.quantity} onChange={handleInputChange} required />
                  </div>

                  {formData.type !== 'Dividend' && formData.type !== 'Farming DeFi' && (
                    <div className="form-group">
                      <label>Prezzo (per unità)</label>
                      <input type="number" step="any" className="form-control" name="price" value={formData.price || ''} onChange={handleInputChange} required />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Commissioni (Fees in Euro/Dollari)</label>
                    <input type="number" step="any" className="form-control" name="fees" value={formData.fees} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Conto Investimento / Broker</label>
                    <input type="text" className="form-control" name="account" list="accounts-list" value={formData.account} onChange={handleInputChange} placeholder="es. Fineco, Interactive Brokers..." />
                    <datalist id="accounts-list">
                      {accountBalances && Object.keys(accountBalances).map(acc => (
                        <option key={acc} value={acc} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Annulla</button>
                  <button type="submit" className="btn" style={{ background: 'var(--success)' }}>Salva Transazione</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
