import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Sidebar from './Sidebar';
import { usePortfolioContext } from '../context/PortfolioContext';
import GlobalModals from './GlobalModals';

// Valute di cassa: selezionabili come "Asset Collegato" per i farming/dividendi
// quando si mette a rendere la liquidità stessa (es. USD → USD).
const FIAT_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

const Layout = () => {
  const {
    isModalOpen, setIsModalOpen,
    formData, setFormData, handleInputChange, handleSubmit,
    editingTxId, accountBalances, combinedPortfolio
  } = usePortfolioContext();

  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Il rendimento è un asset (es. SOL) oppure una valuta (es. USD)?
  const rewardIsAsset = formData.reward_currency && !FIAT_CURRENCIES.includes(formData.reward_currency);

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

  // --- Mappatura ricerca ticker → categoria e valuta del form ---
  const inferCategoryFromSearch = (type) => {
    const t = (type || '').toUpperCase();
    if (t === 'CRYPTOCURRENCY') return 'Crypto';
    if (t === 'ETF') return 'ETF';
    if (t === 'EQUITY') return 'Azioni';
    return 'Azioni';
  };

  const inferCurrencyFromSearch = (result) => {
    const symbol = (result.symbol || '').toUpperCase();
    const exchange = (result.exchange || '').toUpperCase();
    const type = (result.type || '').toUpperCase();

    // Suffisso nel simbolo (es. ENI.MI, VOD.L)
    if (symbol.endsWith('.L')) return 'GBP';
    if (symbol.endsWith('.SW')) return 'CHF';
    if (['.MI', '.DE', '.PA', '.AS', '.MC', '.BR', '.LS', '.VI', '.IR'].some(s => symbol.endsWith(s))) return 'EUR';
    if (symbol.endsWith('.TO') || symbol.endsWith('.V')) return 'CAD';
    if (symbol.endsWith('.T')) return 'JPY';
    if (symbol.endsWith('.HK')) return 'HKD';

    // Borse USA → USD
    if (/^(NYQ|NMS|NGM|NYS|NYSE|NASDAQ|PCX|ASE|BATS|PNK|OQX|OTC)/.test(exchange)) return 'USD';
    // Borse europee → EUR
    if (/(MIL|MTA|GER|FRA|STU|BER|HAM|DUS|MUN|XETRA|PAR|AMS|MAD|BRU|LIS|VIE|BME|LISBON)/.test(exchange)) return 'EUR';
    // Londra → GBP
    if (/(LON|LSE)/.test(exchange)) return 'GBP';
    // Svizzera → CHF
    if (/(EBS|SWX|ZURICH)/.test(exchange)) return 'CHF';
    // Toronto → CAD, Tokyo → JPY, Hong Kong → HKD
    if (/(TOR|TSX|TSE)/.test(exchange)) return 'CAD';
    if (/(TYO|TKS|OSE)/.test(exchange)) return 'JPY';
    if (/(HKG|HKEX)/.test(exchange)) return 'HKD';

    // Cripto e coppie valutarie quotano in USD
    if (type === 'CRYPTOCURRENCY' || type === 'CURRENCY') return 'USD';
    return 'EUR';
  };

  const handleSelectTicker = (result) => {
    setFormData(prev => ({
      ...prev,
      symbol: result.symbol,
      name: result.name || '',
      category: inferCategoryFromSearch(result.type),
      currency: inferCurrencyFromSearch(result)
    }));
    setSearchTerm(''); // Puliamo il campo di ricerca: i campi sotto sono già compilati
    setShowDropdown(false);
  };

  // Dividendi e Farming: il simbolo deve essere un asset esistente, così il
  // guadagno realizzato viene attribuito all'asset corretto. In alternativa
  // si può scegliere una valuta di cassa (es. USD) per "farmare USD → USD":
  // in quel caso il guadagno va solo in liquidità, non a un asset.
  const handleIncomeAssetChange = (e) => {
    const symbol = e.target.value;
    const isFiat = FIAT_CURRENCIES.includes(symbol);
    const asset = !isFiat ? combinedPortfolio.find(i => !i.isLiquidity && i.symbol === symbol) : null;
    setFormData(prev => ({
      ...prev,
      symbol,
      name: asset?.name || '',
      category: asset?.category || (isFiat ? 'Liquidità' : prev.category),
      currency: isFiat ? symbol : (asset?.currency || prev.currency),
      reward_currency: isFiat ? symbol : (asset?.currency || prev.reward_currency || '')
    }));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="app-container" style={{ margin: 0, width: '100%', maxWidth: 'none', padding: '2rem 3rem', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <React.Fragment key={location.pathname}>
              <Outlet />
            </React.Fragment>
          </AnimatePresence>
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
                  {(formData.type === 'Deposit' || formData.type === 'Withdrawal') ? (
                    <div className="form-group">
                      <label>Valuta Flusso di Cassa</label>
                      <select className="form-control" name="symbol" value={formData.symbol} onChange={handleInputChange} required>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">Dollaro (USD)</option>
                        <option value="GBP">Sterlina (GBP)</option>
                        <option value="JPY">Yen (JPY)</option>
                      </select>
                    </div>
                  ) : (formData.type === 'Dividend' || formData.type === 'Farming DeFi') ? (
                    <>
                      <div className="form-group">
                        <label>Asset Collegato <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>*</span></label>
                        <select className="form-control" name="symbol" value={formData.symbol} onChange={handleIncomeAssetChange} required>
                          <option value="">Seleziona un asset o una valuta...</option>
                          <optgroup label="Asset del portafoglio">
                            {combinedPortfolio.filter(i => !i.isLiquidity && !FIAT_CURRENCIES.includes(i.symbol)).map(i => (
                              <option key={i.uniqueId} value={i.symbol}>{i.symbol} — {i.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Valute (cassa)">
                            {FIAT_CURRENCIES.map(c => (
                              <option key={c} value={c}>{c} — Liquidità {c}</option>
                            ))}
                          </optgroup>
                        </select>
                        <span className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                          Il guadagno viene attribuito all'asset scelto, oppure alla cassa se selezioni una valuta.
                        </span>
                      </div>
                      <div className="form-group">
                        <label>Rendimento in</label>
                        <select className="form-control" name="reward_currency" value={formData.reward_currency} onChange={handleInputChange}>
                          <option value="">— valuta dell'asset —</option>
                          <optgroup label="Valute">
                            <option value="EUR">Euro (€)</option>
                            <option value="USD">Dollaro ($)</option>
                            <option value="GBP">Sterlina (£)</option>
                            <option value="CHF">Franco (CHF)</option>
                            <option value="JPY">Yen (¥)</option>
                          </optgroup>
                          <optgroup label="Asset del portafoglio">
                            {combinedPortfolio.filter(i => !i.isLiquidity && !FIAT_CURRENCIES.includes(i.symbol)).map(i => (
                              <option key={i.uniqueId} value={i.symbol}>{i.symbol} — {i.name}</option>
                            ))}
                          </optgroup>
                        </select>
                        <span className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                          La valuta o l'asset in cui ti viene pagata la ricompensa (es. SOL → USD, oppure SOL → SOL).
                        </span>
                      </div>
                      {formData.type === 'Farming DeFi' && (
                        <div className="form-group">
                          <label>Rendimento Passivo % (APR/APY)</label>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            name="yield_percent"
                            value={formData.yield_percent}
                            onChange={handleInputChange}
                            placeholder="es. 5.2"
                          />
                          <span className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                            Solo informativo: la percentuale annua stimata di questa posizione.
                          </span>
                        </div>
                      )}
                    </>
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
                  {formData.category === 'FARMING' && formData.type !== 'Dividend' && formData.type !== 'Farming DeFi' && (
                    <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '-0.5rem' }}>
                      Le posizioni Farming sono valutate al costo di acquisto (nessun prezzo di mercato).
                      Registra i rendimenti con il tipo "Farming (DeFi)".
                    </div>
                  )}
                  <div className="form-group">
                    <label>Valuta Base</label>
                    <select className="form-control" name="currency" value={formData.currency} onChange={handleInputChange} required>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollaro ($)</option>
                      <option value="GBP">Sterlina (£)</option>
                      <option value="CHF">Franco (CHF)</option>
                      <option value="JPY">Yen (¥)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{(formData.type === 'Dividend' || formData.type === 'Farming DeFi') ? (rewardIsAsset ? `Quantità ricevuta (in ${formData.reward_currency})` : 'Importo Ottenuto') : 'Quantità'}</label>
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
