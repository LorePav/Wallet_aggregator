import React, { useState } from 'react';
import { motion } from 'framer-motion';

const CorrelationHeatmap = ({ data, isLoading }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '2rem', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Calcolo correlazione storiche (download yfinance in corso)...</p>
      </div>
    );
  }

  if (!data || !data.matrix || data.matrix.length < 2) {
    return (
      <div className="card" style={{ padding: '2rem', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Dati insufficienti o troppo pochi asset (min 2) per calcolare la correlazione.</p>
      </div>
    );
  }

  const { labels, matrix } = data;

  // Funzione per mappare un valore da -1 a 1 in un colore (es. HSL)
  // -1: Rosso (Decorrelazione) #ef4444
  //  0: Neutro (Nessuna correlazione) #404040 o bg-card
  //  1: Verde (Correlazione completa) #22c55e
  const getColor = (value) => {
    // Gestione null/invalid
    if (value === null || value === undefined) return 'var(--bg-secondary)';
    
    if (value > 0) {
      // Da verde scuro a verde brillante
      const intensity = value * 100; // 0 to 100
      return `color-mix(in srgb, var(--success) ${intensity}%, rgba(20,20,20, 1))`;
    } else {
      // Da rosso scuro a rosso brillante
      const intensity = Math.abs(value) * 100; // 0 to 100
      return `color-mix(in srgb, var(--danger) ${intensity}%, rgba(20,20,20, 1))`;
    }
  };

  const getTextColor = (value) => {
    if (value === null || value === undefined) return 'rgba(255,255,255,0.2)';
    if (Math.abs(value) > 0.5) return '#fff';
    return 'rgba(255,255,255,0.7)';
  };

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ padding: '2rem', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}
    >
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Matrice di Correlazione</h3>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
        Verifica se il tuo portafoglio è realmente diversificato. Valori vicini a 1.0 (verde) indicano asset che si muovono insieme, valori vicino a 0 (scuri) sono decorrelati, valori negativi (rosso) si muovono al contrario.
      </p>

      <div style={{ alignSelf: 'flex-start' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.5rem', minWidth: '80px' }}></th>
              {labels.map((label, i) => (
                <th key={i} style={{ 
                  padding: '0.5rem', 
                  fontSize: '0.8rem', 
                  fontWeight: 'normal', 
                  color: 'var(--text-secondary)',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)'
                }}>
                  {label.substring(0, 10)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, i) => (
              <tr key={i}>
                <td style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.8rem', 
                  textAlign: 'right', 
                  color: 'var(--text-secondary)'
                }}>
                  {rowLabel.substring(0, 10)}
                </td>
                
                {matrix[i].map((val, j) => {
                  const isHovered = hoveredCell && hoveredCell[0] === i && hoveredCell[1] === j;
                  
                  return (
                    <td 
                      key={`${i}-${j}`} 
                      onMouseEnter={() => setHoveredCell([i, j])}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{ 
                        width: '45px', 
                        height: '45px', 
                        backgroundColor: getColor(val),
                        color: getTextColor(val),
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'transform 0.1s, z-index 0.1s',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                        position: 'relative',
                        cursor: 'default',
                        fontWeight: isHovered || i === j ? 'bold' : 'normal'
                      }}
                      title={`${rowLabel} vs ${labels[j]}: ${val?.toFixed(2) || 'N/A'}`}
                    >
                      {val !== null ? val.toFixed(2) : '-'}
                      
                      {isHovered && i !== j && (
                        <div style={{
                          position: 'absolute',
                          bottom: '110%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#000',
                          color: '#fff',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          width: 'max-content',
                          whiteSpace: 'nowrap',
                          zIndex: 100,
                          pointerEvents: 'none'
                        }}>
                          {rowLabel} ⟷ {labels[j]} <br/>
                          <span style={{ color: getColor(val), fontWeight: 'bold' }}>{val.toFixed(2)}</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default CorrelationHeatmap;
