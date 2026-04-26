import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, TrendingUp, ShieldCheck, PieChart, Info, DollarSign, BrainCircuit, AlertCircle } from 'lucide-react';
import styles from './ChatbotAnalyst.module.css';
import PageTransition from '../components/PageTransition';

// Helper per i badge (uguale alla vecchia dashboard)
const getBadgeClass = (colore) => {
  if (colore === 'verde') return 'tx-badge--farm';
  if (colore === 'rosso') return 'tx-badge--sell';
  if (colore === 'giallo') return 'tx-badge--dep';
  return 'tx-badge--other';
};

const AnalysisSection = ({ icon: Icon, sectionData }) => {
  if (!sectionData) return null;
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
        <div className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Icon size={20} color="var(--accent)" />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{sectionData.titolo_sezione}</h3>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Metrica Chiave:</span>
          <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{sectionData.metrica_principale}</span>
        </div>
        
        <div style={{ display: 'inline-block', alignSelf: 'flex-start' }}>
          <span className={`tx-badge ${getBadgeClass(sectionData.colore)}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            {sectionData.giudizio}
          </span>
        </div>
        
        <div style={{ 
          background: 'rgba(0,0,0,0.2)', 
          padding: '1rem', 
          borderRadius: '8px', 
          borderLeft: `3px solid ${sectionData.colore === 'verde' ? 'var(--success)' : sectionData.colore === 'rosso' ? 'var(--danger)' : sectionData.colore === 'giallo' ? 'var(--accent)' : 'var(--text-secondary)'}`,
          fontSize: '0.9rem',
          lineHeight: '1.5',
          color: 'rgba(255,255,255,0.9)'
        }}>
          {sectionData.spiegazione}
        </div>
      </div>
    </div>
  );
};

const GraphicCardsMessage = ({ data }) => {
  return (
    <div className={styles.graphicalDataContainer}>
      {/* HEADER AZIENDA */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {data.nome} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>{data.ticker}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Settore: {data.settore}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.3rem 0' }}>Prezzo Attuale</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
            {data.prezzo.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{data.valuta}</span>
          </div>
        </div>
      </div>

      {/* VERDETTO FINALE */}
      <div className="glass-panel" style={{ 
        marginBottom: '1.5rem', 
        background: data.sommario.verdetto.includes('Solida') ? 'rgba(16, 185, 129, 0.05)' : 
                    data.sommario.verdetto.includes('Attenzione') ? 'rgba(239, 68, 68, 0.05)' : 
                    'rgba(245, 158, 11, 0.05)',
        border: `1px solid ${data.sommario.verdetto.includes('Solida') ? 'rgba(16, 185, 129, 0.3)' : 
                              data.sommario.verdetto.includes('Attenzione') ? 'rgba(239, 68, 68, 0.3)' : 
                              'rgba(245, 158, 11, 0.3)'}`
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Verdetto Globale: {data.sommario.verdetto}</h3>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>{data.sommario.testo}</p>
      </div>

      {/* GRID ANALISI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <AnalysisSection icon={DollarSign} sectionData={data.valutazione} />
        <AnalysisSection icon={ShieldCheck} sectionData={data.salute} />
        <AnalysisSection icon={TrendingUp} sectionData={data.redditivita} />
        <AnalysisSection icon={PieChart} sectionData={data.dividendi} />
      </div>

      {/* INFO AZIENDA */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, fontSize: '1rem' }}>
          <Info size={16} color="var(--accent)" /> Cosa fa questa azienda?
        </h3>
        <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0 }}>
          {data.descrizione}
        </p>
      </div>
    </div>
  );
};

const ChatbotAnalyst = () => {
  const [messages, setMessages] = useState([
    {
      id: Date.now(),
      sender: 'bot',
      type: 'text',
      text: "Ciao! Sono l'Analista di Mercato AI. Inserisci il ticker di un'azienda (es. AAPL o ENI.MI) e preparerò per te la scheda fondamentale sintetica e visuale."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const ticker = input.trim().toUpperCase();
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', type: 'text', text: ticker }]);
    setInput('');
    setIsLoading(true);
    
    const loadingMsgId = Date.now() + 1;
    setMessages(prev => [...prev, { id: loadingMsgId, sender: 'bot', type: 'text', text: `Sto analizzando ${ticker}... recupero i bilanci in corso ⏳` }]);

    try {
      const response = await axios.get(`${API_URL}/api/market-analyst/${ticker}`);
      const data = response.data;
      
      // Rimuovi messaggio di caricamento
      setMessages(prev => prev.filter(msg => msg.id !== loadingMsgId));

      // Aggiungi il messaggio testuale (Sintesi con semafori) e poi i dati grafici
      setMessages(prev => [
        ...prev, 
        { id: Date.now() + 2, sender: 'bot', type: 'text', text: data.sintesi_testuale || `Ecco l'analisi per **${data.nome}**:` },
        { id: Date.now() + 3, sender: 'bot', type: 'analysis', data: data }
      ]);

    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== loadingMsgId));
      let errorMsg = 'Si è verificato un errore di connessione.';
      if (error.response && error.response.data && error.response.data.detail) {
        errorMsg = `❌ Errore: ${error.response.data.detail}`;
      }
      setMessages(prev => [...prev, { id: Date.now() + 4, sender: 'bot', type: 'text', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <PageTransition>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.avatar}><img src="/bot-avatar.png" alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
          <div className={styles.headerInfo}>
            <h2>Analista di Mercato AI</h2>
            <span className={styles.status}>Online - Visual Dashboard Mode</span>
          </div>
        </header>

        <div className={styles.chatWindow}>
          <div className={styles.messageList}>
            {messages.map((msg) => (
              <div key={msg.id} className={msg.sender === 'bot' ? styles.botMessageWrapper : styles.userMessageWrapper}>
                {msg.sender === 'bot' && <div className={styles.botAvatar}><img src="/bot-avatar.png" alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>}
                
                {msg.type === 'text' ? (
                  <div className={msg.sender === 'bot' ? styles.botBubble : styles.userBubble}>
                    {/* Render text with basic bold and newlines */}
                    {msg.text.split('\n').map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line.split('**').map((chunk, i) => (i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk))}
                        {idx !== msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className={styles.botGraphicBubble}>
                    <GraphicCardsMessage data={msg.data} />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className={styles.botMessageWrapper}>
                <div className={styles.botAvatar}><img src="/bot-avatar.png" alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /></div>
                <div className={styles.botBubble}>
                  <span className={styles.loadingDots}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className={styles.inputArea}>
          <input 
            type="text"
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder="Cerca un'azienda (es. MSFT, TSLA)..."
            disabled={isLoading}
            className={styles.input}
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            className={styles.sendButton}
          >
            {isLoading ? '...' : <Search size={18} />}
          </button>
        </div>
      </div>
    </PageTransition>
  );
};

export default ChatbotAnalyst;
