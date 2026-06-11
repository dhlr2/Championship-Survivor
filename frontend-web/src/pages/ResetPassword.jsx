import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token]);

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pitchBg}>
        <div className={styles.circle} />
        <div className={styles.halfLine} />
      </div>

      <div className={styles.container}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>⚽</div>
          <h1 className={styles.logoText}>CHAMPIONSHIP<br />SURVIVOR</h1>
          <p className={styles.tagline}>Will you be the last man standing?</p>
        </div>

        <div className={styles.card}>
          <div style={{ padding: '28px' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                <h3 style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '12px' }}>PASSWORD RESET!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Your password has been updated. Redirecting you to sign in...
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '8px' }}>RESET PASSWORD</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Enter your new password below.
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                    <input
                      className="input"
                      type="password"
                      value={form.newPassword}
                      onChange={update('newPassword')}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                    <input
                      className="input"
                      type="password"
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      placeholder="Repeat new password"
                      required
                      minLength={6}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px' }}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}
