import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function RoomPage() {
  const { user, API } = useAuth();
  const [filter, setFilter] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'create' | 'join' | 'expense' | 'detail'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetail, setRoomDetail] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', maxMembers: 6, description: '', code: '', title: '', amount: '', category: 'General', splitType: 'all_other', targetMemberId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);

  const CATEGORIES = ['General', 'Food', 'Transport', 'Stay', 'Entertainment', 'Shopping', 'Other'];

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await axios.get(`${API}/rooms`);
      setRooms(r.data.all || []);
    } catch {}
    setLoading(false);
  };

  const openDetail = async (room) => {
    setSelectedRoom(room);
    setError('');
    try {
      const r = await axios.get(`${API}/rooms/${room.id}`);
      setRoomDetail(r.data);
      if (r.data.adminId === user?.id) {
        const lr = await axios.get(`${API}/rooms/${room.id}/leave-requests`);
        setLeaveRequests(lr.data);
      }
    } catch {}
    setModal('detail');
  };

  const createRoom = async () => {
    setError(''); setSubmitting(true);
    try {
      const r = await axios.post(`${API}/rooms`, { name: form.name, maxMembers: parseInt(form.maxMembers), description: form.description });
      setRooms(prev => [r.data, ...prev]);
      setSuccess(`Room created! Code: ${r.data.code}`);
      setModal('created');
      setSelectedRoom(r.data);
    } catch (e) { setError(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const joinRoom = async () => {
    setError(''); setSubmitting(true);
    try {
      const r = await axios.post(`${API}/rooms/join`, { code: form.code });
      setRooms(prev => [r.data, ...prev]);
      setModal(null);
      setSuccess('Joined room successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const addExpense = async () => {
    if (!selectedRoom) return;
    setError(''); setSubmitting(true);
    try {
      await axios.post(`${API}/rooms/${selectedRoom.id}/expenses`, {
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        splitType: form.splitType,
        targetMemberId: form.targetMemberId
      });
      setModal(null);
      setSuccess('Expense added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const requestLeave = async () => {
    if (!roomDetail) return;
    setError(''); setSubmitting(true);
    try {
      await axios.post(`${API}/rooms/${roomDetail.id}/leave-request`);
      setSuccess('Leave request sent to admin!');
      setTimeout(() => setSuccess(''), 3000);
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to request leave');
    } finally { setSubmitting(false); }
  };

  const approveLeave = async (targetUserId) => {
    if (!roomDetail) return;
    setError('');
    try {
      await axios.post(`${API}/rooms/${roomDetail.id}/approve-leave`, { userId: targetUserId });
      setLeaveRequests(prev => prev.filter(r => r.id !== targetUserId));
      setSuccess('Approved leave request!');
      setTimeout(() => setSuccess(''), 3000);
      const r = await axios.get(`${API}/rooms/${roomDetail.id}`);
      setRoomDetail(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to approve leave');
    }
  };

  const deleteRoom = async () => {
    if (!roomDetail) return;
    if (!window.confirm('WARNING: Are you sure you want to delete this room? This will permanently delete all its expenses and balances. This action CANNOT be undone.')) return;
    setError(''); setSubmitting(true);
    try {
      await axios.delete(`${API}/rooms/${roomDetail.id}`);
      setSuccess('Room deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
      setModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete room');
    } finally { setSubmitting(false); }
  };

  const openFab = (type) => {
    setFabOpen(false);
    setError('');
    const otherMembers = roomDetail?.members?.filter(m => m.id !== user?.id) || [];
    setForm(f => ({
      ...f,
      title: '',
      amount: '',
      code: '',
      name: '',
      splitType: 'all_other',
      targetMemberId: otherMembers[0]?.id || ''
    }));
    setModal(type);
  };

  const openExpenseModal = () => {
    setError('');
    const otherMembers = roomDetail?.members?.filter(m => m.id !== user?.id) || [];
    setForm(f => ({
      ...f,
      title: '',
      amount: '',
      category: 'General',
      splitType: 'all_other',
      targetMemberId: otherMembers[0]?.id || ''
    }));
    setModal('expense');
  };

  const counts = { all: rooms.length, created: rooms.filter(r => r.adminId === user?.id).length, joined: rooms.filter(r => r.adminId !== user?.id).length, pending: 0 };
  const filtered = filter === 'all' ? rooms : filter === 'created' ? rooms.filter(r => r.adminId === user?.id) : filter === 'joined' ? rooms.filter(r => r.adminId !== user?.id) : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My rooms</h1>
        <p className="page-subtitle">Create, join and manage rooms</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="stats-row">
        {[['all', 'ALL'], ['created', 'CREATED'], ['joined', 'JOINED'], ['pending', 'PENDING']].map(([k, label]) => (
          <div key={k} className={`stat-box ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
            <div className={`stat-num ${filter === k ? 'green' : ''}`}>{counts[k]}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <div className="empty-title">No rooms here</div>
          <div className="empty-desc">Create a new room or join one with a code</div>
        </div>
      ) : filtered.map(room => (
        <div key={room.id} className="card card-clickable room-card" onClick={() => openDetail(room)}>
          <div className="room-card-header">
            <span className="room-name">{room.name}</span>
            <span className={`badge ${room.isActive ? 'badge-active' : 'badge-past'}`}>{room.isActive ? 'ACTIVE' : 'PAST'}</span>
          </div>
          <div className="room-meta">Maximum Members: {room.maxMembers}</div>
          <div className="room-meta">Admin: {room.adminName}</div>
        </div>
      ))}

      {/* FAB */}
      <div className="fab-container">
        {fabOpen && (
          <div className="fab-menu">
            <div className="fab-action">
              <span className="fab-label">Join room</span>
              <button className="fab-btn" onClick={() => openFab('join')}>→</button>
            </div>
            <div className="fab-action">
              <span className="fab-label">Create room</span>
              <button className="fab-btn" onClick={() => openFab('create')}>+</button>
            </div>
          </div>
        )}
        <button className={`fab ${fabOpen ? 'open' : ''}`} onClick={() => setFabOpen(!fabOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Create Room Modal */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2 className="modal-title">Create a Room</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="input-group">
              <label className="input-label">Room Name</label>
              <input className="input" placeholder="Enter room name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Max Members</label>
              <input className="input" type="number" min="2" max="50" value={form.maxMembers} onChange={e => setForm(f => ({ ...f, maxMembers: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Description (Optional)</label>
              <input className="input" placeholder="What's this room for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-full" onClick={createRoom} disabled={submitting}>
              {submitting ? 'Creating…' : '+ Create Room'}
            </button>
          </div>
        </div>
      )}

      {/* Room Created - show code */}
      {modal === 'created' && selectedRoom && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2 className="modal-title">Room Created! 🎉</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>Share this code with your group members</p>
            <div className="code-display">
              <div className="code-text">{selectedRoom.code}</div>
              <div className="code-label">Room Invite Code</div>
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setModal(null)}>Done</button>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {modal === 'join' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2 className="modal-title">Join a Room</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="input-group">
              <label className="input-label">Room Code</label>
              <input className="input" placeholder="Enter 6-character code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: 4, fontSize: 20, textAlign: 'center' }} />
            </div>
            <button className="btn btn-primary btn-full" onClick={joinRoom} disabled={submitting || !form.code}>
              {submitting ? 'Joining…' : '→ Join Room'}
            </button>
          </div>
        </div>
      )}

      {/* Room Detail Modal */}
      {modal === 'detail' && roomDetail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{roomDetail.name}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Admin: {roomDetail.adminName}</div>
              </div>
              <div className="code-display" style={{ padding: '8px 14px', marginBottom: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--primary)' }}>{roomDetail.code}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Members ({roomDetail.memberCount})</div>
              {roomDetail.members?.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="balance-avatar">{m.fullName?.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.fullName} {m.id === user?.id ? '(You)' : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.upiId || m.mobile} · {m.role}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Room Requests Panel */}
            {roomDetail.adminId === user?.id && leaveRequests.length > 0 && (
              <div style={{ marginBottom: 20, padding: 14, background: 'rgba(236, 72, 153, 0.05)', border: '1px solid var(--accent-border)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 }}>Leave Requests ({leaveRequests.length})</div>
                {leaveRequests.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.fullName}</div>
                    <button className="btn btn-primary btn-sm" onClick={() => approveLeave(r.id)}>Approve</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={openExpenseModal}>
                + Add Expense
              </button>
              {roomDetail.adminId === user?.id ? (
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={deleteRoom} disabled={submitting}>
                  {submitting ? 'Deleting...' : 'Delete Room'}
                </button>
              ) : (
                roomDetail.myStatus === 'leaving' ? (
                  <button className="btn btn-secondary" style={{ flex: 1 }} disabled>
                    ⏳ Leave Pending Approval
                  </button>
                ) : (
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={requestLeave} disabled={submitting}>
                    {submitting ? 'Requesting...' : 'Leave Room'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {modal === 'expense' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal('detail')}>
          <div className="modal">
            <div className="modal-handle" />
            <h2 className="modal-title">Add Expense</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="input-group">
              <label className="input-label">What was it for?</label>
              <input className="input" placeholder="Enter expense description (e.g. Dinner, Petrol)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <input className="input" type="number" placeholder="Enter amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Splitting Options */}
            <div className="input-group">
              <label className="input-label">Split Mode</label>
              <select className="input" value={form.splitType} onChange={e => setForm(f => ({ ...f, splitType: e.target.value }))}>
                <option value="all_other">Option 1: Split equally among other members (exclude me)</option>
                <option value="single_member">Option 2: Spend completely on one roommate</option>
              </select>
            </div>

            {form.splitType === 'single_member' && (
              <div className="input-group">
                <label className="input-label">Select Roommate</label>
                <select className="input" value={form.targetMemberId} onChange={e => setForm(f => ({ ...f, targetMemberId: e.target.value }))}>
                  {roomDetail?.members?.filter(m => m.id !== user?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Split computation pre-calculation */}
            {form.amount && parseFloat(form.amount) > 0 && (
              <div style={{ padding: '12px 14px', background: 'var(--primary-glow)', border: '1px solid var(--primary-border)', borderRadius: 10, fontSize: 13, marginBottom: 16, color: 'var(--primary)' }}>
                {form.splitType === 'single_member' ? (
                  <span>
                    👉 Assigned 100% to {roomDetail?.members?.find(m => m.id === form.targetMemberId)?.fullName || 'selected roommate'}. They send: <strong>₹{parseFloat(form.amount).toFixed(2)}</strong>
                  </span>
                ) : (
                  <span>
                    👉 Split equally among other {Math.max(1, (roomDetail?.memberCount || 1) - 1)} members. Each sends: <strong>₹{(parseFloat(form.amount) / Math.max(1, (roomDetail?.memberCount || 1) - 1)).toFixed(2)}</strong>
                  </span>
                )}
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={addExpense} disabled={submitting || !form.title || !form.amount || (form.splitType === 'single_member' && !form.targetMemberId)}>
              {submitting ? 'Adding…' : 'Add Expense'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
