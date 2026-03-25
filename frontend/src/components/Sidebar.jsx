import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', background: 'linear-gradient(45deg, var(--accent), #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          My Portfolio
        </h2>
      </div>
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem 1rem' }}>
        <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          📺 Dashboard
        </NavLink>
        <NavLink to="/portfolio" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          💼 Portafoglio
        </NavLink>
        <NavLink to="/transactions" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          📜 Transazioni
        </NavLink>
        <div style={{ flex: 1 }}></div>
        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ marginTop: 'auto' }}>
          ⚙️ Impostazioni
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
