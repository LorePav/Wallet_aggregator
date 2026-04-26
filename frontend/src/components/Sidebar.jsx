import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
  BrainCircuit,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const navSections = [
  {
    label: 'Panoramica',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/portfolio', icon: Briefcase, label: 'Portafoglio' },
    ],
  },
  {
    label: 'Analisi',
    items: [
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transazioni' },
      { to: '/analytics', icon: BarChart3, label: 'Analisi Avanzate' },
      { to: '/market-analyst', icon: BrainCircuit, label: 'Analista di Mercato' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/settings', icon: Settings, label: 'Impostazioni' },
    ],
  },
];

const Sidebar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (email) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Utente';

  return (
    <div className="sidebar">
      {/* Logo / Brand */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Wallet size={18} strokeWidth={2} />
        </div>
        <span className="sidebar-logo-text">My Portfolio</span>
      </div>

      {/* Navigation sections */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label} className="nav-section">
            <p className="nav-section-label">{section.label}</p>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                <Icon size={17} strokeWidth={1.75} className="nav-icon" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer: user info + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{getInitials(user?.email)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{displayName}</span>
            <span className="sidebar-user-email">{user?.email || ''}</span>
          </div>
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Esci"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
