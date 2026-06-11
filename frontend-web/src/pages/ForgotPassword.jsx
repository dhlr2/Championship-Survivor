import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
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
            {sent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📧</div>
                <h3 style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '12px' }}>CHECK YOUR EMAIL</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '16px' }}>The link expires in 1 hour.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '8px' }}>FORGOT PASSWORD</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Enter your email and we'll send you a reset link.
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                    <input
                      className="input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px' }}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
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
