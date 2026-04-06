import { useState, useCallback } from 'react';

const STORAGE_KEY = 'snapshotVisualOverrides';

/**
 * Hook per gestire gli override visivi degli snapshot.
 * I dati vengono salvati SOLO in localStorage — non vengono mai inviati al backend.
 * Servono solo per modificare l'aspetto grafico del grafico storico.
 */
export const useSnapshotOverrides = () => {
    const [overrides, setOverrides] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            return {};
        }
    });

    /**
     * Imposta un override per una data specifica.
     * @param {string} dateStr - Data in formato 'YYYY-MM-DD'
     * @param {number} newValue - Nuovo valore totale del portafoglio (solo visivo)
     * @param {string} [note] - Nota opzionale per ricordare il motivo della modifica
     */
    const setOverride = useCallback((dateStr, newValue, note = '') => {
        setOverrides(prev => {
            const updated = {
                ...prev,
                [dateStr]: { total_value: newValue, note, editedAt: new Date().toISOString() }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    /**
     * Rimuove l'override di una data specifica.
     */
    const removeOverride = useCallback((dateStr) => {
        setOverrides(prev => {
            const updated = { ...prev };
            delete updated[dateStr];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    /**
     * Rimuove TUTTI gli override. Ripristina i dati reali.
     */
    const clearAllOverrides = useCallback(() => {
        setOverrides({});
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        overrides,
        setOverride,
        removeOverride,
        clearAllOverrides,
        hasOverrides: Object.keys(overrides).length > 0
    };
};
