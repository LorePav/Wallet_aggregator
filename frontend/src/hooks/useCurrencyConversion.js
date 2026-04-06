import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const useCurrencyConversion = () => {
    const [fxRates, setFxRates] = useState({});
    const [displayCurrency, setDisplayCurrency] = useState(
        () => localStorage.getItem('displayCurrency') || 'EUR'
    );

    const fetchFxRates = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/fx_rates`);
            setFxRates(res.data);
        } catch (err) {
            console.error("Errore fetch fx rates:", err);
        }
    }, []);

    const formatCurrency = useCallback((amount, baseCurrency = 'EUR', maxFract = 2) => {
        if (amount === undefined || amount === null) return '';

        let convertedAmount = amount;

        if (baseCurrency !== displayCurrency) {
            if (baseCurrency === 'USD' && displayCurrency === 'EUR') {
                convertedAmount = amount / (fxRates['USD'] || 1.0);
            } else if (baseCurrency === 'EUR' && displayCurrency === 'USD') {
                convertedAmount = amount * (fxRates['USD'] || 1.0);
            } else {
                const fxBaseToEur = (baseCurrency === 'EUR') ? 1.0 : (1 / (fxRates[baseCurrency] || 1.0));
                const eurAmount = amount * fxBaseToEur;
                const targetRate = fxRates[displayCurrency] || 1.0;
                convertedAmount = (displayCurrency === 'EUR') ? eurAmount : (eurAmount * targetRate);
            }
        }

        const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' };
        const sym = symbols[displayCurrency] || displayCurrency + ' ';
        return `${sym}${convertedAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: maxFract })}`;
    }, [displayCurrency, fxRates]);

    const handleCurrencyChange = useCallback((e) => {
        const val = e.target.value;
        setDisplayCurrency(val);
        localStorage.setItem('displayCurrency', val);
    }, []);

    return {
        fxRates,
        setFxRates,
        displayCurrency,
        setDisplayCurrency,
        fetchFxRates,
        formatCurrency,
        handleCurrencyChange
    };
};
