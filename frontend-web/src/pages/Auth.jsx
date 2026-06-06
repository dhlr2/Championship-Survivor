import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.username, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Animated pitch lines */}
      <div className={styles.pitchBg}>
        <div className={styles.circle} />
        <div className={styles.halfLine} />
      </div>

      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>⚽</div>
          <h1 className={styles.logoText}>LAST MAN<br />STANDING</h1>
          <p className={styles.tagline}>EFL Championship Survival Game</p>
        </div>

        {/* Auth card */}
        <div className={styles.card}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`}
              onClick={() => setMode('login')}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`}
              onClick={() => setMode('register')}
              type="button"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {mode === 'register' && (
              <div className={styles.field}>
                <label className={styles.label}>Username</label>
                <input
                  className="input"
                  type="text"
                  value={form.username}
                  onChange={update('username')}
                  placeholder="YourGamertag"
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Enter the Game' : 'Join the Game'}
            </button>
          </form>
        </div>

        <p className={styles.footer}>
          Pick wisely. Survive longer. Be the last.
        </p>
      </div>
    </div>
  );
}
