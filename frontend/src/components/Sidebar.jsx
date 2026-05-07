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
  TrendingUp,
  Coins,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const navSections = [
  {
    label: 'Panoramica',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/portfolio', icon: Briefcase, label: 'Portafoglio' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transazioni' },
    ],
  },
  {
    label: 'Analisi',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analisi Avanzate' },
      { to: '/fundamental-analysis', icon: TrendingUp, label: 'Analisi Fondamentali' },
      { to: '/tokenomics-analysis', icon: Coins, label: 'Analisi Tokenomics' },
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
      <div className="sidebar-logo" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="sidebar-logo-icon" style={{
          background: 'linear-gradient(135deg, #00A6B2 0%, #E87A00 100%)',
          width: '36px', height: '36px', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white'
        }}>
          <Wallet size={20} strokeWidth={2} />
        </div>
        <span className="sidebar-logo-text" style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1D222A' }}>My Portfolio</span>
      </div>

      {/* Navigation sections */}
      <nav className="sidebar-nav" style={{ padding: '0 1rem' }}>
        {navSections.map((section) => (
          <div key={section.label} className="nav-section" style={{ marginBottom: '1.5rem' }}>
            <p className="nav-section-label" style={{
              fontSize: '0.7rem', fontWeight: '800', color: '#4A5568',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: '0.8rem', paddingLeft: '0.5rem'
            }}>
              {section.label}
            </p>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                <Icon size={18} strokeWidth={2} className="nav-icon" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ flex: 1 }}></div>

      {/* Footer: user info + logout */}
      <div className="sidebar-footer" style={{
        padding: '1.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: 'none'
      }}>
        <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div className="sidebar-avatar" style={{
            background: '#00C2CB', color: 'white', fontWeight: '700', fontSize: '0.9rem',
            width: '38px', height: '38px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {getInitials(user?.email)}
          </div>
          <div className="sidebar-user-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span className="sidebar-user-name" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {displayName}
            </span>
            <span className="sidebar-user-email" style={{ fontSize: '0.7rem', color: '#718096', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email || ''}
            </span>
          </div>
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Esci"
          style={{ background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
