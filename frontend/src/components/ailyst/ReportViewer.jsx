import React from 'react';

export default function ReportViewer({ report, loading, generating, onGenerate }) {
  if (loading && !report) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
        Caricamento report...
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
            Report Giornaliero
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            {report ? `Ultimo generato: ${new Date(report.report_date).toLocaleString('it-IT')}` : 'Nessun report generato'}
          </p>
        </div>
        
        <button
          className="btn"
          onClick={onGenerate}
          disabled={generating}
          style={{ 
            padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, var(--accent), #7c3aed)'
          }}
        >
          {generating ? (
            <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}/> Generazione in corso...</>
          ) : (
            '⚡ Genera Report Ora'
          )}
        </button>
      </div>

      {report?.content_html ? (
        <div style={{ 
          background: 'white', borderRadius: '12px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)', height: '600px'
        }}>
          <iframe
            srcDoc={report.content_html}
            title="Ailyst Daily Report"
            sandbox="allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      ) : (
        <div style={{ 
          border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', 
          padding: '60px 20px', textAlign: 'center' 
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📈</div>
          <h3 style={{ color: 'white', marginBottom: '8px' }}>Nessuna anteprima disponibile</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Clicca su "Genera Report Ora" per creare il tuo primo report.</p>
        </div>
      )}
    </div>
  );
}
