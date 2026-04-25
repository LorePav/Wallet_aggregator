import React from 'react';
import { motion } from 'framer-motion';

const RiskMetricsWidget = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card" style={{ padding: '2rem', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Caricamento metriche di rischio...</p>
      </div>
    );
  }

  if (!metrics || metrics.error) {
    return (
      <div className="card" style={{ padding: '2rem', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>{metrics?.error || "Dati non disponibili per calcolare le metriche."}</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const dataPoints = [
    {
      label: "Sharpe Ratio (1A)",
      value: metrics.sharpe_ratio ? metrics.sharpe_ratio.toFixed(2) : "N/A",
      highlight: metrics.sharpe_ratio > 1 ? "var(--success)" : (metrics.sharpe_ratio > 0 ? "var(--text-primary)" : "var(--danger)"),
      desc: "Rendimento per unità di rischio"
    },
    {
      label: "Beta vs S&P500",
      value: metrics.beta != null ? metrics.beta.toFixed(2) : "N/A",
      highlight: metrics.beta == null ? "var(--text-secondary)" : (metrics.beta > 1 ? "var(--danger)" : "var(--success)"),
      desc: "Sensibilità al mercato"
    },
    {
      label: "Alpha Atteso (1A)",
      value: metrics.alpha_annual_pct != null ? `${metrics.alpha_annual_pct > 0 ? '+' : ''}${metrics.alpha_annual_pct.toFixed(2)}%` : "N/A",
      highlight: metrics.alpha_annual_pct == null ? "var(--text-secondary)" : (metrics.alpha_annual_pct > 0 ? "var(--success)" : "var(--danger)"),
      desc: "Extra-rendimento vs mercato"
    },
    {
      label: "Volatilità Annua",
      value: metrics.volatility_annual_pct ? `${metrics.volatility_annual_pct.toFixed(2)}%` : "N/A",
      highlight: "var(--text-primary)",
      desc: "Variazione standard storizzata"
    }
  ];

  return (
    <motion.div 
      className="card"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: '2rem' }}
    >
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Metriche di Rischio e Performance</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        {dataPoints.map((item, idx) => (
          <motion.div key={idx} variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: item.highlight }}>
              {item.value}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '-0.2rem' }}>
              {item.desc}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RiskMetricsWidget;
