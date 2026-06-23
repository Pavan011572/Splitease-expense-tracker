import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register, API } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ fullName: '', mobile: '', email: '', upiId: '', password: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP reset state
  const [otpStep, setOtpStep] = useState('request'); // 'request' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (tab === 'login') await login(form.mobile, form.password);
      else await register(form);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!form.mobile) return setError('Mobile number required');
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { mobile: form.mobile });
      setOtpStep('verify');
      setSuccessMsg('OTP code sent successfully. Check your server console!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!otpCode || !newPassword) return setError('OTP code and new password required');
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        mobile: form.mobile,
        otpCode,
        newPassword
      });
      setSuccessMsg('Password reset successful! You can now log in.');
      setTimeout(() => {
        setSuccessMsg('');
        setTab('login');
        setOtpStep('request');
        setOtpCode('');
        setNewPassword('');
      }, 2500);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <h1>SplitEase</h1>
        <p>Track group expenses, settle with UPI</p>
      </div>

      {tab !== 'forgot' && (
        <div className="auth-tab">
          <button className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }} style={{ borderRight: '1px solid var(--border)' }}>Sign In</button>
          <button className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Create Account</button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {tab === 'register' && (
        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input className="input" placeholder="Pothanaboyena Pavan" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        </div>
      )}

      {tab !== 'forgot' && (
        <div className="input-group">
          <label className="input-label">Mobile Number</label>
          <input className="input" placeholder="8328025515" value={form.mobile} onChange={e => set('mobile', e.target.value)} type="tel" />
        </div>
      )}

      {tab === 'register' && (
        <>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input className="input" placeholder="pavan@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} type="email" />
          </div>
          <div className="input-group">
            <label className="input-label">UPI ID</label>
            <input className="input" placeholder="8328025515@ybl" value={form.upiId} onChange={e => set('upiId', e.target.value)} />
          </div>
        </>
      )}

      {tab !== 'forgot' && (
        <div className="input-group">
          <label className="input-label">Password</label>
          <input className="input" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} type="password" />
        </div>
      )}

      {tab === 'login' && (
        <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" style={{ border: 'none', background: 'none', padding: 0 }} onClick={() => { setTab('forgot'); setError(''); }}>
            Forgot Password?
          </button>
        </div>
      )}

      {tab !== 'forgot' && (
        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      )}

      {/* Forgot Password View */}
      {tab === 'forgot' && (
        <div>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Reset Password</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Verify your mobile number to reset password</p>
          </div>

          {otpStep === 'request' ? (
            <>
              <div className="input-group">
                <label className="input-label">Mobile Number</label>
                <input className="input" placeholder="8328025515" value={form.mobile} onChange={e => set('mobile', e.target.value)} type="tel" />
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleForgotPassword} disabled={loading || !form.mobile}>
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div className="input-group">
                <label className="input-label">Mobile Number</label>
                <input className="input" value={form.mobile} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="input-group">
                <label className="input-label">Enter 6-Digit OTP</label>
                <input className="input" placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value)} maxLength={6} style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }} />
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input className="input" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" />
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleResetPassword} disabled={loading || !otpCode || !newPassword}>
                {loading ? 'Resetting Password…' : 'Reset Password'}
              </button>
            </>
          )}
          
          <button className="btn btn-ghost btn-full" style={{ marginTop: 14 }} onClick={() => { setTab('login'); setOtpStep('request'); setError(''); }}>
            ← Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
}
