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

    const getPeriodDate = () => {
        const d = new Date();
        if (historyPeriod === '1G') d.setDate(d.getDate() - 1);
        if (historyPeriod === '1S') d.setDate(d.getDate() - 7);
        if (historyPeriod === '1M') d.setMonth(d.getMonth() - 1);
        if (historyPeriod === '3M') d.setMonth(d.getMonth() - 3);
        if (historyPeriod === '6M') d.setMonth(d.getMonth() - 6);
        if (historyPeriod === '1Y') d.setFullYear(d.getFullYear() - 1);
        return historyPeriod === 'ALL' ? null : d;
    };

    const cutOffDate = getPeriodDate();

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

        // Iniezione Snapshot Live
        if (totalValue > 0 || totalInvested > 0) {
            const now = new Date();
            const localDateStr = now.toLocaleDateString('en-CA');
            const fullLocalStr = `${localDateStr}T${now.toLocaleTimeString('en-GB')}`;
            filtered.push({
                date: fullLocalStr,
                total_invested: totalInvested,
                total_value: totalValue,
                isLive: true
            });
        }

        if (filtered.length === 0) return { data: [], maxDrawdown: 0 };

        const augmented = [];
        let maxDrawdown = 0;
        let peakValue = 0;

        const firstBase = filtered[0].total_invested > 0 ? filtered[0].total_invested : 1;
        const firstValue = filtered[0].total_value > 0 ? filtered[0].total_value : 1;

        let baseBenchmarkValue = 1;
        if (benchmarkData && benchmarkData.length > 0) {
            const firstDateString = filtered[0].date;
            const bchMatch = benchmarkData.find(b => b.date >= firstDateString) || benchmarkData[0];
            baseBenchmarkValue = bchMatch.price || 1;
        }

        filtered.forEach((s, i) => {
            const timestamp = parseLocalDate(s.date).getTime();

            let daily_deposit = 0;
            if (i > 0) {
                daily_deposit = s.total_invested - filtered[i - 1].total_invested;
            }

            if (s.total_value > peakValue) peakValue = s.total_value;
            const currentDrawdown = peakValue > 0 ? ((s.total_value - peakValue) / peakValue) * 100 : 0;
            if (currentDrawdown < maxDrawdown) maxDrawdown = currentDrawdown;

            let twr_percent = 0;
            if (s.total_invested > 0) {
                twr_percent = ((s.total_value / s.total_invested) / (firstValue / firstBase) - 1) * 100;
                if (isNaN(twr_percent) || !isFinite(twr_percent)) twr_percent = 0;
            }

            const sDateStr = s.date.split('T')[0];
            const dayTransactions = transactions.filter(t => t.date === sDateStr);
            let eventMarker = null;
            if (dayTransactions.length > 0) {
                eventMarker = dayTransactions.map(t => `${t.type === 'Buy' ? '🟢 Buy' : (t.type === 'Sell' ? '🔴 Sell' : '📉')} ${t.quantity || ''} ${t.symbol}`).join(' • ');
            }

            let benchmark_percent = 0;
            if (benchmarkData && benchmarkData.length > 0) {
                const bchDaily = benchmarkData.find(b => b.date === s.date);
                if (bchDaily) {
                    benchmark_percent = ((bchDaily.price / baseBenchmarkValue) - 1) * 100;
                } else {
                    const prevBchs = benchmarkData.filter(b => b.date <= s.date);
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
        });

        return { data: augmented, maxDrawdown };
    }, [snapshots, historyPeriod, benchmarkData, transactions, totalValue, totalInvested, cutOffDate, overrides]);

    const filteredSnapshots = augmentedSnapshots.data;
    const maxDrawdown = augmentedSnapshots.maxDrawdown;

    let periodGain = 0;
    let periodGainPercent = 0;
    if (filteredSnapshots.length > 0) {
        const firstItem = filteredSnapshots[0];
        const lastItem = filteredSnapshots[filteredSnapshots.length - 1];
        periodGain = lastItem.total_value - firstItem.total_value;
        periodGainPercent = firstItem.total_value > 0 ? (periodGain / firstItem.total_value) * 100 : 0;
    }

    return { filteredSnapshots, maxDrawdown, periodGain, periodGainPercent };
};
