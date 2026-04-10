import { useState, useCallback } from 'react';
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
        } catch (err) {
            // Ignora errore per singolo asset
        }
    }, []);

    const fetchAssetHistory = useCallback(async (symbol) => {
        try {
            const res = await axios.get(`${API_URL}/api/asset-history/${symbol}?period=1y`);
            setAssetHistory(res.data);
        } catch (err) {
            console.error("Errore fetch storico asset:", err);
            setAssetHistory([]);
        }
    }, []);

    const fetchPortfolio = useCallback(async () => {
        uiState.setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/portfolio`);
            setPortfolio(res.data);
            uiState.setLoading(false);
            uiState.setLastUpdated(new Date());
            fetchSnapshots();
            res.data.forEach(item => {
                if (!item.isLiquidity && item.category !== 'Liquidità') {
                    fetchSparkline(item.symbol);
                }
            });
        } catch (err) {
            console.error("Errore fetch portfolio", err);
            uiState.setLoading(false);
        }
    }, [fetchSnapshots, fetchSparkline, uiState]);

    const handleOpenDeepDive = useCallback((asset) => {
        if (asset.isLiquidity) return;
        uiState.setSelectedAsset(asset);
        fetchAssetHistory(asset.symbol);
    }, [fetchAssetHistory, uiState]);

    const handleCloseDeepDive = useCallback(() => {
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
            if (uiState.formData.type !== 'Deposit' && uiState.formData.type !== 'Withdrawal') {
                try {
                    await axios.post(`${API_URL}/api/assets`, {
                        symbol: uiState.formData.symbol.toUpperCase(),
                        name: uiState.formData.name || uiState.formData.symbol.toUpperCase(),
                        category: uiState.formData.category,
                        currency: uiState.formData.currency
                    });
                } catch (assetErr) { /* asset già esiste */ }
            }

            let q = parseFloat(uiState.formData.quantity);
            let p = (uiState.formData.type === 'Dividend' || uiState.formData.type === 'Farming DeFi') ? 1 : parseFloat(uiState.formData.price);
            let f = parseFloat(uiState.formData.fees) || 0;

            const txData = {
                date: uiState.formData.date,
                type: uiState.formData.type,
                symbol: uiState.formData.symbol.toUpperCase(),
                quantity: q, price: p,
                total: (q * p) + f,
                fees: f,
                account: uiState.formData.account
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
                quantity: '', price: '', fees: '0', type: 'Buy'
            });
        } catch (err) {
            alert("Errore di rete durante il salvataggio");
            console.error(err);
        }
    }, [uiState, fetchPortfolio, fetchTransactions, fetchLiquidity]);

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
        uiState.setFormData({
            symbol: tx.symbol, name: '',
            category: (tx.type === 'Deposit' || tx.type === 'Withdrawal') ? 'Liquidità' : 'Azioni',
            currency: tx.currency || 'EUR',
            date: tx.date, type: tx.type,
            quantity: tx.quantity, price: tx.price,
            fees: tx.fees, account: tx.account
        });
        uiState.setEditingTxId(tx.id);
        uiState.setIsModalOpen(true);
    }, [uiState]);

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
        if (!window.confirm('⚠️ Sei sicuro? Tutti i dati verranno eliminati!')) return;
        try {
            await axios.delete(`${API_URL}/api/reset`);
            setPortfolio([]);
            setTransactions([]);
            setLiquidity({});
            setSnapshots([]);
        } catch (err) {
            alert("Errore nel reset");
            console.error(err);
        }
    }, []);

    return {
        portfolio, transactions, liquidity, snapshots, benchmarkData,
        sparklineData, assetHistory,
        fetchPortfolio, fetchTransactions, fetchLiquidity, fetchSnapshots, fetchBenchmark,
        handleOpenDeepDive, handleCloseDeepDive,
        handleOpenAccountDeepDive, handleCloseAccountDeepDive,
        handleSubmit, handleTransferSubmit,
        handleEditTransaction, handleDeleteTransaction, handleResetPortfolio
    };
};
