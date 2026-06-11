import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import styles from './Profile.module.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 className={`display-font ${styles.title}`}>ACCOUNT</h1>
        <div />
      </header>

      <main className={styles.main}>
        {/* Profile card */}
        <div className={styles.profileCard}>
          <div className={styles.avatar} style={{ background: user?.avatar_color }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className={styles.username}>{user?.username}</h2>
            <p className={styles.email}>{user?.email}</p>
          </div>
        </div>

        {/* Change password */}
        <div className={`card ${styles.section}`}>
          <h3 className={`display-font ${styles.sectionTitle}`}>CHANGE PASSWORD</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Current Password</label>
              <input
                className="input"
                type="password"
                value={form.currentPassword}
                onChange={update('currentPassword')}
                placeholder="Your current password"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>New Password</label>
              <input
                className="input"
                type="password"
                value={form.newPassword}
                onChange={update('newPassword')}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm New Password</label>
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
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <button
          className="btn btn-ghost"
          onClick={logout}
          style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(255,59,59,0.3)' }}
        >
          Sign Out
        </button>
      </main>
    </div>
  );
}
