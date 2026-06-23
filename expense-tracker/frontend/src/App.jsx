import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import BalancesPage from './pages/BalancesPage';
import VerifyPage from './pages/VerifyPage';
import RoomPage from './pages/RoomPage';
import ProfilePage from './pages/ProfilePage';

const NAV = [
  { id: 'home', label: 'Home', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.182V20a1 1 0 0 0 1 1h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5a1 1 0 0 0 1-1v-9.818M3 10.182L12 3l9 7.182"/>
    </svg>
  )},
  { id: 'balances', label: 'Balances', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="18" r="3"/>
      <circle cx="12" cy="6" r="3"/>
      <path d="M12 9v9M6 15l6-9 6 9"/>
    </svg>
  )},
  { id: 'verify', label: 'Verify', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )},
  { id: 'room', label: 'Room', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
    </svg>
  )},
  { id: 'profile', label: 'Profile', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/>
      <path d="M20 21a8 8 0 0 0-16 0"/>
    </svg>
  )},
];

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('home');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ margin: 0 }} />
      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading SplitEase…</div>
    </div>
  );

  if (!user) return <AuthPage />;

  const PAGES = {
    home: <HomePage navigate={setPage} />,
    balances: <BalancesPage />,
    verify: <VerifyPage />,
    room: <RoomPage />,
    profile: <ProfilePage />,
  };

  return (
    <div className="app-container">
      {PAGES[page] || PAGES.home}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            {n.icon(page === n.id)}
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
