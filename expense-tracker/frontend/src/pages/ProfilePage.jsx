import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, logout, updateProfile, API } = useAuth();
  const [editing, setEditing] = useState(null); // 'email' | 'upiId'
  const [editVal, setEditVal] = useState('');
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    axios.get(`${API}/expenses/recent`).then(r => setRecentExpenses(r.data)).catch(() => {});
  }, []);

  const startEdit = (field) => {
    setEditing(field);
    setEditVal(user?.[field] || '');
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateProfile({ [editing]: editVal });
      setEditing(null);
      setSuccess('Saved!');
      setTimeout(() => setSuccess(''), 2000);
    } catch {}
    setSaving(false);
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      setRecentExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) { alert(e.response?.data?.error || 'Cannot delete'); }
  };

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 20 }}>Profile</h1>
      {success && <div className="alert alert-success">{success}</div>}

      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{user?.fullName}</div>
          <div className="profile-mobile">{user?.mobile}</div>
          <div className="profile-status">No active room</div>
        </div>
      </div>

      {/* Info card */}
      <div className="card">
        <div className="info-field">
          <div>
            <div className="info-field-label">Full Name</div>
            <div className="info-field-value">{user?.fullName}</div>
          </div>
        </div>
        <div className="info-field">
          <div>
            <div className="info-field-label">Mobile Number</div>
            <div className="info-field-value">{user?.mobile}</div>
          </div>
        </div>
        <div className="info-field">
          <div>
            <div className="info-field-label">Email Address</div>
            {editing === 'email' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input" value={editVal} onChange={e => setEditVal(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>Save</button>
              </div>
            ) : (
              <div className="info-field-value">{user?.email || '—'}</div>
            )}
          </div>
          {editing !== 'email' && <button className="btn btn-ghost btn-sm" onClick={() => startEdit('email')}>✏️ Edit</button>}
        </div>
        <div className="info-field">
          <div>
            <div className="info-field-label">UPI ID</div>
            {editing === 'upiId' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input" value={editVal} onChange={e => setEditVal(e.target.value)} placeholder="Enter your UPI ID" style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>Save</button>
              </div>
            ) : (
              <div className="info-field-value">{user?.upiId || '—'}</div>
            )}
          </div>
          {editing !== 'upiId' && <button className="btn btn-ghost btn-sm" onClick={() => startEdit('upiId')}>✏️ Edit</button>}
        </div>
        {/* Show User ID for sharing */}
        <div className="info-field">
          <div>
            <div className="info-field-label">User ID (share for Verify)</div>
            <div className="info-field-value" style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--green)' }}>{user?.id}</div>
          </div>
        </div>
      </div>

      {/* Recent deletable expenses */}
      <div style={{ marginTop: 20, marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Deletable expenses</div>
      </div>
      {recentExpenses.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 24px' }}>
          <div className="empty-icon">⏱</div>
          <div className="empty-title">No expenses</div>
          <div className="empty-desc">Expenses created by you can be deleted here.</div>
        </div>
      ) : (
        <div className="card">
          {recentExpenses.map(e => (
            <div key={e.id} className="expense-item">
              <div className="expense-header">
                <div>
                  <div className="expense-title">{e.title}</div>
                  <div className="expense-cat">{e.category}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div className="expense-amount">₹{e.amount}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteExpense(e.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-danger btn-full btn-lg" style={{ marginTop: 24 }} onClick={logout}>
        → Log out
      </button>
    </div>
  );
}
