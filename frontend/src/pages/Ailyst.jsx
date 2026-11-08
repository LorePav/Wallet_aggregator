import React, { useState } from 'react';
import { useAilyst } from '../hooks/useAilyst';
import FearGreedWidget from '../components/ailyst/FearGreedWidget';
import AssetSearch from '../components/ailyst/AssetSearch';
import WatchlistCard from '../components/ailyst/WatchlistCard';
import NewsFeed from '../components/ailyst/NewsFeed';
import ReportViewer from '../components/ailyst/ReportViewer';
import AilystSettings from '../components/ailyst/AilystSettings';

export default function Ailyst() {
  const {
    watchlist, prices, fearGreed, loading,
    pricesLoading, fetchPrices, addAsset, removeAsset,
    news, newsLoading, fetchNews, newsFilter, setNewsFilter,
    report, reportLoading, generateReport, generatingReport,
    settings, settingsLoading, updateSettings
  } = useAilyst();

  const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist', 'news', 'report', 'settings'
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddAsset = async (payload) => {
    try {
      await addAsset(payload);
      showToast(`${payload.symbol} aggiunto alla watchlist!`);
    } catch {
      showToast("Errore durante l'aggiunta", 'error');
    }
  };

  const handleRemoveAsset = async (id) => {
    try {
      await removeAsset(id);
      showToast('Asset rimosso dalla watchlist');
    } catch {
      showToast('Errore durante la rimozione', 'error');
    }
  };

  const handleGenerateReport = async () => {
    try {
      await generateReport();
      showToast('Report generato con successo!');
    } catch {
      showToast('Errore durante la generazione del report', 'error');
    }
  };

  const addedSymbols = new Set(watchlist.map(w => (w.symbol || '').toUpperCase()));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', position: 'absolute', zIndex: -1, opacity: 0.1 }} />
        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: 0 }}>Inizializzazione Market Intelligence...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'watchlist', label: 'Watchlist', icon: '📊' },
    { id: 'news', label: 'News', icon: '📰' },
    { id: 'report', label: 'Report', icon: '📈' },
    { id: 'settings', label: 'Impostazioni', icon: '⚙️' },
  ];

  return (
    <div className="app-container" style={{ maxWidth: '1000px', padding: '32px 24px', position: 'relative' }}>
      
      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: 'white', padding: '12px 24px', borderRadius: '10px',
          fontSize: '15px', fontWeight: '600', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '56px', height: '56px', borderRadius: '16px', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
        }}>
          ⚡
        </div>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '800', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Ailyst Intelligence
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
            Il tuo hub centralizzato per analisi di mercato, notizie e report automatici.
          </p>
        </div>
      </div>

      {/* FEAR & GREED WIDGET (Sempre Visibile) */}
      <FearGreedWidget data={fearGreed} loading={pricesLoading} />

      {/* TAB NAVIGATION */}
      <div style={{ 
        display: 'flex', gap: '8px', marginBottom: '32px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--surface-hover)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              borderRadius: '12px', padding: '10px 20px', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div style={{ minHeight: '400px' }}>
        
        {/* TAB 1: WATCHLIST */}
        {activeTab === 'watchlist' && (
          <div className="animation-fade-in">
            <AssetSearch onAddAsset={handleAddAsset} addedSymbols={addedSymbols} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  La tua Watchlist
                  <span style={{
                    fontSize: '12px', fontWeight: '700', background: 'rgba(255,255,255,0.1)', 
                    color: 'white', padding: '2px 10px', borderRadius: '20px',
                  }}>
                    {watchlist.length}
                  </span>
                </h2>
                <button
                  onClick={fetchPrices}
                  disabled={pricesLoading}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  {pricesLoading ? <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}/> : '↻'} Aggiorna
                </button>
              </div>

              {watchlist.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '60px 24px',
                  border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
                  <h3 style={{ color: 'white', marginBottom: '8px' }}>Watchlist vuota</h3>
                  <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>
                    Cerca un asset qui sopra e aggiungilo per monitorare i prezzi e le notizie.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {watchlist.map(item => (
                    <WatchlistCard
                      key={item.id}
                      item={item}
                      priceData={prices[item.symbol]}
                      onRemove={handleRemoveAsset}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NEWS */}
        {activeTab === 'news' && (
          <div className="animation-fade-in">
            <NewsFeed 
              news={news} 
              loading={newsLoading} 
              onRefresh={fetchNews} 
              filter={newsFilter} 
              setFilter={setNewsFilter}
              watchlist={watchlist}
            />
          </div>
        )}

        {/* TAB 3: REPORT */}
        {activeTab === 'report' && (
          <div className="animation-fade-in">
            <ReportViewer 
              report={report} 
              loading={reportLoading} 
              generating={generatingReport} 
              onGenerate={handleGenerateReport} 
            />
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animation-fade-in">
            <AilystSettings 
              settings={settings} 
              loading={settingsLoading} 
              onSave={updateSettings} 
              showToast={showToast} 
            />
          </div>
        )}

      </div>
      
      {/* Global simple keyframe for fadeIn */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animation-fade-in { animation: fadeIn 0.3s ease forwards; }
      `}} />
    </div>
  );
}
