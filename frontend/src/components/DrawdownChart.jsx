import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DrawdownChart = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card" style={{ padding: '2rem', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Calcolo drawdown storico in corso...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Non ci sono dati sufficienti per mostrare il drawdown.</p>
      </div>
    );
  }

  // Format date to be short e.g. "MMM DD" or "YYYY-MM"
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().substr(-2)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const { drawdown_pct, value, peak } = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'rgba(20,20,20,0.9)', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</p>
          <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Drawdown: {drawdown_pct.toFixed(2)}%</p>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Valore: €{value.toLocaleString()}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Picco: €{peak.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}
    >
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Drawdown Storico</h3>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
        Distanza percentuale dal massimo valore storico raggiunto dal portafoglio. Più l'area scende, maggiore è la sofferenza ("Drawdown").
      </p>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate} 
              stroke="rgba(255,255,255,0.2)" 
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
              tickFormatter={(val) => `${val}%`} 
              stroke="rgba(255,255,255,0.2)" 
              axisLine={false}
              tickLine={false}
              domain={['auto', 0]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="drawdown_pct" 
              stroke="#ef4444" 
              fillOpacity={1} 
              fill="url(#colorDrawdown)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default DrawdownChart;
