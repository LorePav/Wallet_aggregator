import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageTransition from '../components/PageTransition';
import RiskMetricsWidget from '../components/RiskMetricsWidget';
import DrawdownChart from '../components/DrawdownChart';
import CorrelationHeatmap from '../components/CorrelationHeatmap';

const Analytics = () => {
  const [period, setPeriod] = useState('1y');
  
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [isRiskLoading, setIsRiskLoading] = useState(true);
  
  const [drawdownData, setDrawdownData] = useState([]);
  const [isDrawdownLoading, setIsDrawdownLoading] = useState(true);
  
  const [correlationData, setCorrelationData] = useState(null);
  const [isCorrelationLoading, setIsCorrelationLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Drawdown (non dipende dal periodo)
      if (drawdownData.length === 0) {
        setIsDrawdownLoading(true);
        try {
          const resDrop = await axios.get(`${API_URL}/api/analytics/drawdown`);
          setDrawdownData(resDrop.data);
        } catch (error) {
          console.error("Errore fetch drawdown:", error);
        } finally {
          setIsDrawdownLoading(false);
        }
      }

      // Metriche (dipendono dal periodo)
      setIsRiskLoading(true);
      try {
        const resRisk = await axios.get(`${API_URL}/api/analytics/risk-metrics?period=${period}`);
        setRiskMetrics(resRisk.data);
      } catch (error) {
        console.error("Errore fetch risk metrics:", error);
        setRiskMetrics({ error: "Errore durante il fetch delle metriche." });
      } finally {
        setIsRiskLoading(false);
      }

      // Correlazione (dipende dal periodo)
      setIsCorrelationLoading(true);
      try {
        const resCorr = await axios.get(`${API_URL}/api/analytics/correlation?period=${period}`);
        setCorrelationData(resCorr.data);
      } catch (error) {
        console.error("Errore fetch correlation:", error);
      } finally {
        setIsCorrelationLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]); // Rifetch quando cambia il periodo (drawdown viene saltato se già c'è)

  return (
    <PageTransition>
      <div className="portfolio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>Analisi Avanzate</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Indaga a fondo sul comportamento dinamico del tuo portafoglio.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Periodo di riferimento:</label>
          <select 
            className="form-control" 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="6mo">Ultimi 6 Mesi</option>
            <option value="1y">Ultimo Anno</option>
            <option value="2y">Ultimi 2 Anni</option>
            <option value="5y">Ultimi 5 Anni</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* ROW 1: Metriche di Rischio Widget */}
        <RiskMetricsWidget metrics={riskMetrics} isLoading={isRiskLoading} />

        {/* ROW 2: Grafico Drawdown e Matrice (in grid flexibile) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          <DrawdownChart data={drawdownData} isLoading={isDrawdownLoading} />
          <CorrelationHeatmap data={correlationData} isLoading={isCorrelationLoading} />
        </div>
      </div>
    </PageTransition>
  );
};

export default Analytics;
