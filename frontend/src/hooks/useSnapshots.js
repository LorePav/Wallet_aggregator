import { useMemo } from 'react';

// Helper per parse date YYYY-MM-DD come LOCAL invece di UTC
const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('T')) return new Date(dateStr);
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/**
 * Hook che elabora gli snapshot grezzi del backend in dati pronti per il grafico:
 * - Padding dei giorni mancanti
 * - Calcolo TWR, drawdown, benchmark
 * - Iniezione del punto "Live" in tempo reale
 */
export const useSnapshots = ({ snapshots, historyPeriod, benchmarkData, transactions, totalValue, totalInvested, overrides = {} }) => {

    // La data di taglio dipende solo dal periodo scelto: se la ricalcolassimo
    // a ogni render (come prima), il useMemo degli snapshot verrebbe invalidato
    // continuamente e lo storico verrebbe ricalcolato a ogni hover.
    const cutOffDate = useMemo(() => {
        const d = new Date();
        if (historyPeriod === '1G') d.setDate(d.getDate() - 1);
        if (historyPeriod === '1S') d.setDate(d.getDate() - 7);
        if (historyPeriod === '1M') d.setMonth(d.getMonth() - 1);
        if (historyPeriod === '3M') d.setMonth(d.getMonth() - 3);
        if (historyPeriod === '6M') d.setMonth(d.getMonth() - 6);
        if (historyPeriod === '1Y') d.setFullYear(d.getFullYear() - 1);
        return historyPeriod === 'ALL' ? null : d;
    }, [historyPeriod]);

    const augmentedSnapshots = useMemo(() => {
        if (!snapshots || snapshots.length === 0) return { data: [], maxDrawdown: 0 };

        let baseSnapshot = snapshots[0];
        const filteredRaw = [];

        snapshots.forEach(s => {
            const sDate = parseLocalDate(s.date);
            if (cutOffDate && sDate < cutOffDate) {
                baseSnapshot = s;
            } else {
                filteredRaw.push(s);
            }
        });

        const paddedSnapshots = [];
        const startDate = cutOffDate ? new Date(cutOffDate) : parseLocalDate(snapshots[0].date);
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);

        let currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);

        if (!cutOffDate && filteredRaw.length > 0) {
            currentDate = parseLocalDate(filteredRaw[0].date);
            currentDate.setHours(0, 0, 0, 0);
        }

        let currentRefSnapshot = baseSnapshot;
        let nextRawIdx = 0;

        if (!currentRefSnapshot) {
            currentRefSnapshot = { date: currentDate.toLocaleDateString('en-CA'), total_invested: 0, total_value: 0 };
        }

        while (currentDate <= endDate) {
            const dateString = currentDate.toLocaleDateString('en-CA');

            while (nextRawIdx < filteredRaw.length && parseLocalDate(filteredRaw[nextRawIdx].date).getTime() <= currentDate.getTime()) {
                currentRefSnapshot = filteredRaw[nextRawIdx];
                nextRawIdx++;
            }

            paddedSnapshots.push({ ...currentRefSnapshot, date: dateString });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const filtered = paddedSnapshots.map(s => {
            const override = !s.isLive && overrides[s.date];
            if (override) {
                return {
                    ...s,
                    total_value: override.total_value,
                    isOverridden: true,
                    overrideNote: override.note || ''
                };
            }
            return s;
        });

        // Iniezione Snapshot Live (sostituisce il punto di oggi se già presente)
        if (totalValue > 0 || totalInvested > 0) {
            const now = new Date();
            const localDateStr = now.toLocaleDateString('en-CA');
            const fullLocalStr = `${localDateStr}T${now.toLocaleTimeString('en-GB')}`;
            const livePoint = {
                date: fullLocalStr,
                total_invested: totalInvested,
                total_value: totalValue,
                isLive: true
            };
            const lastIdx = filtered.length - 1;
            if (lastIdx >= 0 && String(filtered[lastIdx].date || '').startsWith(localDateStr)) {
                filtered[lastIdx] = livePoint;
            } else {
                filtered.push(livePoint);
            }
        }

        if (filtered.length === 0) return { data: [], maxDrawdown: 0 };

        const augmented = [];
        let maxDrawdown = 0;
        let peakIndex = 1.0;   // picco dell'indice TWR (parte da 1)
        let twrMultiplier = 1.0;
        let prevValue = null;
        let prevInvested = null;

        let baseBenchmarkValue = 1;
        if (benchmarkData && benchmarkData.length > 0) {
            const firstDateString = filtered[0].date;
            const bchMatch = benchmarkData.find(b => b.date >= firstDateString) || benchmarkData[0];
            baseBenchmarkValue = bchMatch.price || 1;
        }

        filtered.forEach((s, i) => {
            const timestamp = parseLocalDate(s.date).getTime();
            const value = Number(s.total_value) || 0;
            const invested = Number(s.total_invested) || 0;

            // Flusso netto del giorno = variazione del capitale investito.
            // Depositi e prelievi non sono rendimento: vanno esclusi dal TWR.
            let daily_deposit = 0;
            let daily_return = 0;
            if (i > 0 && prevValue !== null) {
                daily_deposit = invested - prevInvested;
                if (prevValue > 0) {
                    daily_return = (value - daily_deposit) / prevValue - 1;
                    if (!isFinite(daily_return) || Math.abs(daily_return) > 10) daily_return = 0;
                }
            }

            twrMultiplier *= (1 + daily_return);
            const twr_percent = (twrMultiplier - 1) * 100;

            if (twrMultiplier > peakIndex) peakIndex = twrMultiplier;
            const currentDrawdown = peakIndex > 0 ? ((twrMultiplier - peakIndex) / peakIndex) * 100 : 0;
            if (currentDrawdown < maxDrawdown) maxDrawdown = currentDrawdown;

            const sDateStr = s.date.split('T')[0];
            const dayTransactions = transactions.filter(t => t.date === sDateStr);
            let eventMarker = null;
            if (dayTransactions.length > 0) {
                eventMarker = dayTransactions.map(t => `${t.type === 'Buy' ? '🟢 Buy' : (t.type === 'Sell' ? '🔴 Sell' : '📉')} ${t.quantity || ''} ${t.symbol}`).join(' • ');
            }

            let benchmark_percent = 0;
            if (benchmarkData && benchmarkData.length > 0) {
                const bchDaily = benchmarkData.find(b => b.date === sDateStr);
                if (bchDaily) {
                    benchmark_percent = ((bchDaily.price / baseBenchmarkValue) - 1) * 100;
                } else {
                    const prevBchs = benchmarkData.filter(b => b.date <= sDateStr);
                    if (prevBchs.length > 0) {
                        benchmark_percent = ((prevBchs[prevBchs.length - 1].price / baseBenchmarkValue) - 1) * 100;
                    }
                }
            }

            augmented.push({
                ...s, time: timestamp, daily_deposit,
                daily_drawdown: currentDrawdown, twr_percent,
                eventMarker, benchmark_percent,
                has_event: eventMarker ? 0 : null
            });

            prevValue = value;
            prevInvested = invested;
        });

        return { data: augmented, maxDrawdown };
    }, [snapshots, benchmarkData, transactions, totalValue, totalInvested, cutOffDate, overrides]);

    const filteredSnapshots = augmentedSnapshots.data;
    const maxDrawdown = augmentedSnapshots.maxDrawdown;

    // Guadagno del periodo al netto di depositi/prelievi: un versamento non è
    // una performance. La percentuale usa il TWR (rendimento composto).
    let periodGain = 0;
    let periodGainPercent = 0;
    if (filteredSnapshots.length > 0) {
        const firstItem = filteredSnapshots[0];
        const lastItem = filteredSnapshots[filteredSnapshots.length - 1];
        const netFlow = filteredSnapshots.slice(1).reduce((sum, s) => sum + (s.daily_deposit || 0), 0);
        periodGain = lastItem.total_value - firstItem.total_value - netFlow;
        periodGainPercent = lastItem.twr_percent || 0;
    }

    return { filteredSnapshots, maxDrawdown, periodGain, periodGainPercent };
};
