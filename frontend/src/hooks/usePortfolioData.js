import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const usePortfolioData = (uiState) => {
    const [portfolio, setPortfolio] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [liquidity, setLiquidity] = useState({});
    const [snapshots, setSnapshots] = useState([]);
    const [benchmarkData, setBenchmarkData] = useState([]);
    const [sparklineData, setSparklineData] = useState({});
    const [assetHistory, setAssetHistory] = useState([]);

    // True solo al primo caricamento: lo skeleton non deve "lampeggiare"
    // durante i refresh successivi.
    const hasLoadedRef = useRef(false);
    // Contatore per ignorare risposte "vecchie" del deep-dive (race condition).
    const historyRequestRef = useRef(0);

    const fetchSnapshots = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/snapshots`);
            setSnapshots(res.data);
        } catch (err) {
            console.error("Errore fetch snapshots:", err);
        }
    }, []);

    const fetchBenchmark = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/benchmark`);
            setBenchmarkData(res.data);
        } catch (err) {
            console.error("Errore fetch benchmark:", err);
        }
    }, []);

    const fetchLiquidity = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/liquidity`);
            setLiquidity(res.data);
        } catch (err) {
            console.error("Errore fetch liquidity:", err);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/transactions`);
            const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(sorted);
        } catch (err) {
            console.error("Errore fetch transazioni:", err);
        }
    }, []);

    const fetchSparkline = useCallback(async (symbol) => {
        try {
            const res = await axios.get(`${API_URL}/api/asset-history/${symbol}?period=5d`);
            setSparklineData(prev => ({ ...prev, [symbol]: res.data }));
        } catch {
            // Ignora errore per singolo asset
        }
    }, []);

    // Sparkline in batch: una sola richiesta per tutti gli asset (no N+1).
    const fetchSparklines = useCallback(async (symbols) => {
        const unique = [...new Set((symbols || []).filter(Boolean))];
        if (unique.length === 0) return;
        try {
            const res = await axios.get(`${API_URL}/api/sparklines`, {
                params: { symbols: unique.join(','), period: '5d' }
            });
            if (res.data && typeof res.data === 'object') {
                setSparklineData(prev => ({ ...prev, ...res.data }));
            }
        } catch (err) {
            console.error("Errore fetch sparklines:", err);
        }
    }, []);

    const fetchAssetHistory = useCallback(async (symbol) => {
        // Solo l'ultima richiesta può aggiornare lo stato: se l'utente apre
        // rapidamente più asset, le risposte lente non sovrascrivono quelle nuove.
        const requestId = ++historyRequestRef.current;
        try {
            const res = await axios.get(`${API_URL}/api/asset-history/${symbol}?period=1y`);
            if (requestId === historyRequestRef.current) setAssetHistory(res.data);
        } catch (err) {
            console.error("Errore fetch storico asset:", err);
            if (requestId === historyRequestRef.current) setAssetHistory([]);
        }
    }, []);

    const fetchPortfolio = useCallback(async () => {
        const isFirstLoad = !hasLoadedRef.current;
        if (isFirstLoad) uiState.setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/portfolio`);
            setPortfolio(res.data);
            hasLoadedRef.current = true;
            uiState.setLoading(false);
            uiState.setLastUpdated(new Date());
            fetchSnapshots();
            // Una sola chiamata batch per le sparkline di tutti gli asset
            const symbols = [...new Set(res.data
                .filter(item => !item.isLiquidity && item.category !== 'Liquidità')
                .map(item => item.symbol))];
            fetchSparklines(symbols);
        } catch (err) {
            console.error("Errore fetch portfolio", err);
            uiState.setLoading(false);
        }
    }, [fetchSnapshots, fetchSparklines, uiState]);

    // Aggiornamento manuale: salva lo snapshot di oggi (lato server) e usa i
    // dati già calcolati nella risposta, senza rifare una seconda GET.
    const refreshSnapshots = useCallback(async () => {
        try {
            const res = await axios.post(`${API_URL}/api/snapshots/refresh`);
            if (res.data && Array.isArray(res.data.portfolio)) {
                setPortfolio(res.data.portfolio);
                hasLoadedRef.current = true;
                uiState.setLoading(false);
                uiState.setLastUpdated(new Date());
                const symbols = [...new Set(res.data.portfolio
                    .filter(item => !item.isLiquidity && item.category !== 'Liquidità')
                    .map(item => item.symbol))];
                fetchSparklines(symbols);
            }
            await fetchSnapshots();
        } catch (err) {
            console.error("Errore refresh snapshot:", err);
        }
    }, [fetchSnapshots, fetchSparklines, uiState]);

    const handleOpenDeepDive = useCallback((asset) => {
        if (asset.isLiquidity) return;
        uiState.setSelectedAsset(asset);
        fetchAssetHistory(asset.symbol);
    }, [fetchAssetHistory, uiState]);

    const handleCloseDeepDive = useCallback(() => {
        historyRequestRef.current++; // invalida eventuali risposte in volo
        uiState.setSelectedAsset(null);
        setAssetHistory([]);
    }, [uiState]);

    const handleOpenAccountDeepDive = useCallback((accountName, accountData) => {
        uiState.setSelectedAccount({ name: accountName, data: accountData });
    }, [uiState]);

    const handleCloseAccountDeepDive = useCallback(() => {
        uiState.setSelectedAccount(null);
        uiState.setHiddenDeepDiveAssets({});
        uiState.setHoveredDeepDiveAsset(null);
    }, [uiState]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            const type = uiState.formData.type;
            const isCash = type === 'Deposit' || type === 'Withdrawal';
            const isIncome = type === 'Dividend' || type === 'Farming DeFi';
            const symbol = uiState.formData.symbol.toUpperCase();

            // Registriamo l'asset solo per acquisti/vendite. Dividendi e farming
            // si collegano a un asset già esistente e non devono ricrearlo o
            // modificarne categoria/valuta.
            if (!isCash && !isIncome) {
                const alreadyExists = portfolio.some(p => p.symbol === symbol);
                if (!uiState.editingTxId || !alreadyExists) {
                    try {
                        await axios.post(`${API_URL}/api/assets`, {
                            symbol,
                            name: uiState.formData.name || symbol,
                            category: uiState.formData.category,
                            currency: uiState.formData.currency
                        });
                    } catch { /* asset già esiste */ }
                }
            }

            const q = parseFloat(uiState.formData.quantity);
            const p = isIncome ? 1 : parseFloat(uiState.formData.price);
            const f = parseFloat(uiState.formData.fees) || 0;

            // Per vendite e rendite le commissioni riducono l'importo netto;
            // per acquisti e flussi di cassa si aggiungono al costo.
            const gross = q * p;
            const total = (type === 'Sell' || isIncome) ? gross - f : gross + f;

            const txData = {
                date: uiState.formData.date,
                type,
                symbol,
                quantity: q, price: p,
                total,
                fees: f,
                account: uiState.formData.account,
                reward_currency: isIncome
                    ? (uiState.formData.reward_currency || uiState.formData.currency || null)
                    : null,
                yield_percent: (type === 'Farming DeFi' && uiState.formData.yield_percent !== '')
                    ? parseFloat(uiState.formData.yield_percent)
                    : null
            };

            if (uiState.editingTxId) {
                await axios.put(`${API_URL}/api/transactions/${uiState.editingTxId}`, txData);
            } else {
                await axios.post(`${API_URL}/api/transactions`, txData);
            }

            uiState.setIsModalOpen(false);
            uiState.setEditingTxId(null);
            fetchPortfolio();
            fetchTransactions();
            fetchLiquidity();

            uiState.setFormData({
                ...uiState.formData,
                symbol: '', name: '', category: 'Azioni',
                quantity: '', price: '', fees: '0', type: 'Buy',
                reward_currency: '', yield_percent: ''
            });
        } catch (err) {
            alert("Errore di rete durante il salvataggio");
            console.error(err);
        }
    }, [uiState, portfolio, fetchPortfolio, fetchTransactions, fetchLiquidity]);

    const handleTransferSubmit = useCallback(async (e, transferData) => {
        e.preventDefault();
        try {
            const { sourceAccount, destAccount, amount, currency, date } = transferData;
            let amt = parseFloat(amount);
            if (!sourceAccount || !destAccount || isNaN(amt) || amt <= 0) {
                alert('Dati di trasferimento non validi o mancanti'); return;
            }

            const txWithdrawal = {
                date, type: 'Withdrawal', symbol: currency,
                quantity: amt, price: 1, total: amt, fees: 0, account: sourceAccount
            };
            const txDeposit = {
                date, type: 'Deposit', symbol: currency,
                quantity: amt, price: 1, total: amt, fees: 0, account: destAccount
            };

            await axios.post(`${API_URL}/api/transactions`, txWithdrawal);
            await axios.post(`${API_URL}/api/transactions`, txDeposit);

            uiState.setIsTransferModalOpen(false);
            fetchPortfolio();
            fetchTransactions();
            fetchLiquidity();
        } catch (err) {
            alert("Errore di rete durante il salvataggio del trasferimento");
            console.error(err);
        }
    }, [uiState, fetchPortfolio, fetchTransactions, fetchLiquidity]);

    const handleEditTransaction = useCallback((tx) => {
        const isCash = tx.type === 'Deposit' || tx.type === 'Withdrawal';
        // Recupera l'asset reale per non perdere categoria e valuta originali.
        // Stesso simbolo può esistere su conti diversi: cerchiamo anche per conto.
        const asset = portfolio.find(p => p.symbol === tx.symbol && (p.account || 'Default') === (tx.account || 'Default'))
            // Backend vecchi non restituiscono "account" nel portafoglio:
            // in quel caso ripieghiamo sul primo asset con lo stesso simbolo.
            || portfolio.find(p => p.symbol === tx.symbol);
        uiState.setFormData({
            symbol: tx.symbol,
            name: asset?.name || '',
            category: isCash ? 'Liquidità' : (asset?.category || 'Altro'),
            currency: asset?.currency || tx.currency || 'EUR',
            date: tx.date, type: tx.type,
            quantity: tx.quantity, price: tx.price,
            fees: tx.fees, account: tx.account,
            reward_currency: tx.reward_currency || '',
            yield_percent: tx.yield_percent != null ? String(tx.yield_percent) : ''
        });
        uiState.setEditingTxId(tx.id);
        uiState.setIsModalOpen(true);
    }, [uiState, portfolio]);

    const handleDeleteTransaction = useCallback(async (txId) => {
        if (!window.confirm('Sei sicuro di voler eliminare questa transazione?')) return;
        try {
            await axios.delete(`${API_URL}/api/transactions/${txId}`);
            fetchPortfolio();
            fetchTransactions();
            fetchLiquidity();
        } catch (err) {
            alert("Errore nella cancellazione");
            console.error(err);
        }
    }, [fetchPortfolio, fetchTransactions, fetchLiquidity]);

    const handleResetPortfolio = useCallback(async () => {
        if (!window.confirm('⚠️ Sei sicuro? Tutti i dati verranno eliminati!')) return false;
        try {
            await axios.delete(`${API_URL}/api/reset`);
            setPortfolio([]);
            setTransactions([]);
            setLiquidity({});
            setSnapshots([]);
            return true;
        } catch (err) {
            alert("Errore nel reset");
            console.error(err);
            return false;
        }
    }, []);

    return {
        portfolio, transactions, liquidity, snapshots, benchmarkData,
        sparklineData, assetHistory,
        fetchPortfolio, fetchTransactions, fetchLiquidity, fetchSnapshots, fetchBenchmark,
        fetchSparkline, fetchSparklines, refreshSnapshots,
        handleOpenDeepDive, handleCloseDeepDive,
        handleOpenAccountDeepDive, handleCloseAccountDeepDive,
        handleSubmit, handleTransferSubmit,
        handleEditTransaction, handleDeleteTransaction, handleResetPortfolio
    };
};
