import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function VerifyPage() {
  const { user, API } = useAuth();
  const [tab, setTab] = useState('sent');
  const [verifications, setVerifications] = useState({ sent: [], received: [] });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ receiverMobile: '', amount: '', utrNumber: '', note: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await axios.get(`${API}/verifications`);
      setVerifications(r.data);
    } catch {}
    setLoading(false);
  };

  const submit = async () => {
    setError(''); setSubmitting(true);
    try {
      // Find user by mobile
      const r = await axios.post(`${API}/verifications`, {
        receiverId: form.receiverId,
        amount: parseFloat(form.amount),
        utrNumber: form.utrNumber,
      });
      setVerifications(prev => ({ ...prev, sent: [r.data, ...prev.sent] }));
      setShowModal(false);
      setForm({ receiverMobile: '', amount: '', utrNumber: '', receiverId: '' });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send');
    } finally { setSubmitting(false); }
  };

  const respond = async (id, status) => {
    try {
      const r = await axios.patch(`${API}/verifications/${id}`, { status });
      setVerifications(prev => ({
        ...prev,
        received: prev.received.map(v => v.id === id ? { ...v, status: r.data.status } : v)
      }));
    } catch {}
  };

  const statusClass = (s) => s === 'pending' ? 'status-pending' : s === 'confirmed' ? 'status-confirmed' : 'status-rejected';

  const list = verifications[tab] || [];

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Verification</h1>
          <p className="page-subtitle">Confirm UPI payments you sent or received</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Verify</button>
      </div>

      <div className="segment">
        <button className={`segment-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          Sent ({verifications.sent.length})
        </button>
        <button className={`segment-btn ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>
          Received ({verifications.received.length})
        </button>
      </div>

      {loading ? <div className="spinner" /> : list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📤</div>
          <div className="empty-title">{tab === 'sent' ? 'No sent requests' : 'No received requests'}</div>
          <div className="empty-desc">{tab === 'sent' ? 'Tap Verify to request confirmation.' : 'When someone sends you a request, it appears here.'}</div>
        </div>
      ) : (
        <div className="card">
          {list.map(v => (
            <div key={v.id} className="verify-item">
              <div className="verify-header">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {tab === 'sent' ? v.receiverName || 'Unknown' : v.senderName || 'Unknown'}
                  </div>
                  {v.expenseTitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.expenseTitle}</div>}
                </div>
                <span className={`verify-status ${statusClass(v.status)}`}>{v.status.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'Space Grotesk' }}>₹{v.amount}</div>
                  {v.utrNumber && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>UTR: {v.utrNumber}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(v.createdAt).toLocaleString('en-IN')}</div>
                </div>
                {tab === 'received' && v.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => respond(v.id, 'confirmed')}>✓ Confirm</button>
                    <button className="btn btn-danger btn-sm" onClick={() => respond(v.id, 'rejected')}>✗</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2 className="modal-title">New Verification Request</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="input-group">
              <label className="input-label">Receiver ID (User ID)</label>
              <input className="input" placeholder="Paste receiver's user ID" value={form.receiverId || ''} onChange={e => setForm(f => ({ ...f, receiverId: e.target.value }))} />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Ask the other person to share their User ID from their profile</div>
            </div>
            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <input className="input" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">UTR Number (Optional)</label>
              <input className="input" placeholder="12-digit UTR number" value={form.utrNumber} onChange={e => setForm(f => ({ ...f, utrNumber: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
