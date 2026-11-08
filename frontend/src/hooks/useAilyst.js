import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useAilyst() {
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState({});
  const [fearGreed, setFearGreed] = useState(null);
  
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFilter, setNewsFilter] = useState('');

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);

  // --- Watchlist & Prices ---
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/ailyst/watchlist`);
      setWatchlist(res.data.data || []);
    } catch (e) {
      console.error('Watchlist fetch error', e);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const res = await axios.get(`${API}/api/ailyst/prices`);
      setPrices(res.data.data?.prices || {});
      setFearGreed(res.data.data?.fear_greed || null);
    } catch (e) {
      console.error('Prices fetch error', e);
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // --- News ---
  const fetchNews = useCallback(async (refresh = false) => {
    setNewsLoading(true);
    try {
      let url = `${API}/api/ailyst/news?hours=24&limit=30`;
      if (refresh) url += `&refresh=true`;
      if (newsFilter) url += `&asset=${newsFilter}`;
      
      const res = await axios.get(url);
      setNews(res.data.data || []);
    } catch (e) {
      console.error('News fetch error', e);
    } finally {
      setNewsLoading(false);
    }
  }, [newsFilter]);

  // --- Report ---
  const fetchLatestReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await axios.get(`${API}/api/ailyst/report/latest`);
      setReport(res.data.data || null);
    } catch (e) {
      console.error('Report fetch error', e);
    } finally {
      setReportLoading(false);
    }
  }, []);

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await axios.post(`${API}/api/ailyst/report/generate?send_email=true`);
      await fetchLatestReport(); // Refresh
      return res.data;
    } finally {
      setGeneratingReport(false);
    }
  };

  // --- Settings ---
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await axios.get(`${API}/api/ailyst/settings`);
      setSettings(res.data.data || null);
    } catch (e) {
      console.error('Settings fetch error', e);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const updateSettings = async (newSettings) => {
    await axios.put(`${API}/api/ailyst/settings`, newSettings);
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // --- Search & Add ---
  const addAsset = async (payload) => {
    const res = await axios.post(`${API}/api/ailyst/watchlist`, payload);
    await fetchWatchlist();
    await fetchPrices();
    return res.data;
  };

  const removeAsset = async (id) => {
    await axios.delete(`${API}/api/ailyst/watchlist/${id}`);
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };


  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchWatchlist(),
        fetchPrices(),
        fetchNews(),
        fetchLatestReport(),
        fetchSettings()
      ]);
      if (mounted) setLoading(false);
    };
    init();
    
    return () => { mounted = false; };
    // Empty dependency array ensures this runs exactly ONCE on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate useEffect to ONLY refetch news when the filter changes.
  useEffect(() => {
    // We skip the initial load since the empty array useEffect handles it.
    if (!loading) {
      fetchNews();
    }
    // `loading` è volutamente escluso: aggiungerlo causerebbe un secondo fetch
    // appena termina il caricamento iniziale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsFilter, fetchNews]);

  return {
    watchlist, prices, fearGreed, loading,
    pricesLoading, fetchPrices, addAsset, removeAsset,
    news, newsLoading, fetchNews, newsFilter, setNewsFilter,
    report, reportLoading, generateReport, generatingReport,
    settings, settingsLoading, updateSettings
  };
}
