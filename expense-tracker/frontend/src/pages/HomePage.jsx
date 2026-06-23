import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function HomePage({ navigate }) {
  const { user, API } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ totalRooms: 0, totalExpenses: 0, youOwe: 0, youAreOwed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get(`${API}/rooms`);
        const roomList = r.data.all || [];
        setRooms(roomList.slice(0, 3));
        // Compute aggregate stats from all active rooms
        let totalExp = 0, youOwe = 0, youAreOwed = 0;
        await Promise.all(roomList.map(async room => {
          try {
            const [expR, balR] = await Promise.all([
              axios.get(`${API}/rooms/${room.id}/expenses`),
              axios.get(`${API}/rooms/${room.id}/balances`)
            ]);
            totalExp += expR.data.length;
            const myBal = balR.data.find(b => b.userId === user?.id);
            if (myBal) {
              if (myBal.netBalance > 0) youAreOwed += myBal.netBalance;
              else youOwe += Math.abs(myBal.netBalance);
            }
          } catch {}
        }));
        setStats({ totalRooms: roomList.length, totalExpenses: totalExp, youOwe, youAreOwed });
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Good day,</p>
          <h1 className="page-title">{user?.fullName?.split(' ')[0] || 'User'} 👋</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#000', cursor: 'pointer' }}
          onClick={() => navigate('profile')}>
          {initials}
        </div>
      </div>

      {/* Summary */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">To Collect</div>
          <div className="summary-card-value" style={{ color: 'var(--green)' }}>₹{stats.youAreOwed.toFixed(0)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">To Send</div>
          <div className="summary-card-value" style={{ color: 'var(--red)' }}>₹{stats.youOwe.toFixed(0)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Rooms</div>
          <div className="summary-card-value">{stats.totalRooms}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Expenses</div>
          <div className="summary-card-value">{stats.totalExpenses}</div>
        </div>
      </div>

      {/* Recent Rooms */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Rooms</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('room')}>View all</button>
      </div>

      {loading ? <div className="spinner" /> : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <div className="empty-title">No rooms yet</div>
          <div className="empty-desc">Create or join a room to get started</div>
        </div>
      ) : rooms.map(room => (
        <div key={room.id} className="card card-clickable room-card" onClick={() => navigate('room')}>
          <div className="room-card-header">
            <span className="room-name">{room.name}</span>
            <span className={`badge ${room.isActive ? 'badge-active' : 'badge-past'}`}>{room.isActive ? 'ACTIVE' : 'PAST'}</span>
          </div>
          <div className="room-meta">Max {room.maxMembers} members · Admin: {room.adminName}</div>
        </div>
      ))}

      {/* Quick actions */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 14 }}>Quick Actions</h2>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('room')}>🏠 Rooms</button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('verify')}>✅ Verify</button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('balances')}>⚖️ Balances</button>
      </div>
    </div>
  );
}
