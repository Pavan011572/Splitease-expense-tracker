import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function BalancesPage() {
  const { user, API } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [balances, setBalances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('balances');
  const [loading, setLoading] = useState(true);

  // Settlement Modal state
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTargetId, setSettleTargetId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleUtr, setSettleUtr] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [settleSuccess, setSettleSuccess] = useState('');

  useEffect(() => {
    axios.get(`${API}/rooms`).then(r => {
      const active = (r.data.all || []);
      setRooms(active);
      if (active.length > 0) loadRoom(active[0]);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadRoom = async (room) => {
    setSelectedRoom(room); setLoading(true);
    try {
      const [balR, expR] = await Promise.all([
        axios.get(`${API}/rooms/${room.id}/balances`),
        axios.get(`${API}/rooms/${room.id}/expenses`)
      ]);
      setBalances(balR.data);
      setExpenses(expR.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch {}
    setLoading(false);
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
      const balR = await axios.get(`${API}/rooms/${selectedRoom.id}/balances`);
      setBalances(balR.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Cannot delete');
    }
  };

  const openSettleModal = () => {
    setSettleOpen(true);
    setSettleError('');
    setSettleSuccess('');
    setSettleAmount('');
    setSettleUtr('');
    const others = balances.filter(b => b.userId !== user?.id);
    setSettleTargetId(others[0]?.userId || '');
  };

  const submitSettlement = async () => {
    if (!settleTargetId || !settleAmount) return;
    setSettleError(''); setSettleSubmitting(true);
    try {
      await axios.post(`${API}/verifications`, {
        receiverId: settleTargetId,
        roomId: selectedRoom?.id,
        amount: parseFloat(settleAmount),
        utrNumber: settleUtr
      });
      setSettleSuccess('Settlement request sent to recipient!');
      setTimeout(() => {
        setSettleOpen(false);
        setSettleSuccess('');
      }, 2000);
    } catch (err) {
      setSettleError(err.response?.data?.error || 'Failed to send settlement request');
    } finally {
      setSettleSubmitting(false);
    }
  };

  const selectedMember = balances.find(b => b.userId === settleTargetId);

  if (rooms.length === 0 && !loading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Balances</h1></div>
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <div className="empty-title">No room joined</div>
          <div className="empty-desc">Join a room to view balances.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Balances</h1></div>

      {/* Room selector */}
      {rooms.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {rooms.map(r => (
            <button key={r.id}
              className={`btn btn-sm ${selectedRoom?.id === r.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadRoom(r)} style={{ whiteSpace: 'nowrap' }}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      {selectedRoom && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedRoom.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Code: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedRoom.code}</span></div>
            </div>
            <span className={`badge ${selectedRoom.isActive ? 'badge-active' : 'badge-past'}`}>{selectedRoom.isActive ? 'ACTIVE' : 'PAST'}</span>
          </div>
        </div>
      )}

      <div className="segment">
        <button className={`segment-btn ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>Balances</button>
        <button className={`segment-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>Expenses ({expenses.length})</button>
      </div>

      {loading ? <div className="spinner" /> : activeTab === 'balances' ? (
        <div className="card">
          {balances.length > 1 && (
            <button className="btn btn-primary btn-sm btn-full" style={{ marginBottom: 16 }} onClick={openSettleModal}>
              🤝 Settle Balance (UPI)
            </button>
          )}

          {balances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>No expenses yet</div>
          ) : balances.map(b => (
            <div key={b.userId} className="balance-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="balance-avatar">{b.fullName?.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="balance-name">{b.fullName} {b.userId === user?.id ? '(You)' : ''}</div>
                  <div className="balance-upi">{b.upiId || 'No UPI set'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <div className={`balance-amount ${b.netBalance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                  {b.netBalance >= 0 ? '+' : ''}₹{b.netBalance.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: b.netBalance >= 0 ? 'var(--primary)' : 'var(--red)' }}>
                  {b.netBalance >= 0 ? 'To Collect' : 'To Send'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          {expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>No expenses recorded</div>
          ) : expenses.map(e => {
            const canDelete = e.paidById === user?.id && (new Date() - new Date(e.createdAt)) < 6 * 3600 * 1000;
            return (
              <div key={e.id} className="expense-item">
                <div className="expense-header">
                  <div>
                    <div className="expense-title">{e.title}</div>
                    <div className="expense-cat">{e.category}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div className="expense-amount">₹{e.amount.toFixed(2)}</div>
                    {canDelete && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteExpense(e.id)}>Delete</button>
                    )}
                  </div>
                </div>
                <div className="expense-meta">
                  Paid by {e.paidByName} · {new Date(e.createdAt).toLocaleDateString('en-IN')}
                  {' · '}₹{(e.amount / (e.splits?.length || 1)).toFixed(2)}/person
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settle Balance Modal */}
      {settleOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettleOpen(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2 className="modal-title">Settle Balance</h2>
            {settleError && <div className="alert alert-error">{settleError}</div>}
            {settleSuccess && <div className="alert alert-success">{settleSuccess}</div>}
            
            <div className="input-group">
              <label className="input-label">Select Roommate to Pay</label>
              <select className="input" value={settleTargetId} onChange={e => setSettleTargetId(e.target.value)}>
                {balances.filter(b => b.userId !== user?.id).map(b => (
                  <option key={b.userId} value={b.userId}>{b.fullName}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <input className="input" type="number" placeholder="Enter amount" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">UTR/Transaction ID (Optional)</label>
              <input className="input" placeholder="Enter transaction reference" value={settleUtr} onChange={e => setSettleUtr(e.target.value)} />
            </div>

            {/* UPI Payment App trigger */}
            {selectedMember?.upiId ? (
              <div style={{ padding: 14, background: 'var(--primary-glow)', border: '1px solid var(--primary-border)', borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Recipient UPI: <strong>{selectedMember.upiId}</strong>
                </div>
                <a
                  className="btn btn-primary btn-sm btn-full"
                  href={`upi://pay?pa=${selectedMember.upiId}&pn=${encodeURIComponent(selectedMember.fullName)}&am=${settleAmount || '0'}&cu=INR`}
                  style={{ textDecoration: 'none' }}
                >
                  ⚡ Pay via UPI App
                </a>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8 }}>
                ⚠️ Recipient has not configured their UPI ID in Profile. You can still submit the request for validation.
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={submitSettlement} disabled={settleSubmitting || !settleTargetId || !settleAmount}>
              {settleSubmitting ? 'Sending Request…' : 'Send Settle Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
