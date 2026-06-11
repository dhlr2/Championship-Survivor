const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Email sender using Resend
async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Championship Survivor <noreply@championship-survivor.vercel.app>',
      to,
      subject,
      html,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to send email');
  }
  return response.json();
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3–20 characters' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [email.toLowerCase(), username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const hash = await bcrypt.hash(password, 12);
    const colors = ['#00FF87','#FF6B6B','#4ECDC4','#FFE66D','#A29BFE','#FD79A8','#FDCB6E','#6C5CE7'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, avatar_color)
       VALUES ($1,$2,$3,$4) RETURNING id, email, username, avatar_color`,
      [email.toLowerCase(), username, hash, color]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, avatar_color: user.avatar_color },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, username, avatar_color, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const result = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await db.query('SELECT id, username FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = result.rows[0];

    // Always return success even if email not found (security best practice)
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);

    // Store new token
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail(
      email.toLowerCase(),
      'Reset your Championship Survivor password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #080C10; color: #F0F4F8; padding: 40px; border-radius: 12px;">
          <h1 style="color: #00FF87; font-size: 28px; margin-bottom: 8px;">Championship Survivor</h1>
          <p style="color: #7A8C99; margin-bottom: 32px;">Password Reset Request</p>
          <p>Hi <strong>${user.username}</strong>,</p>
          <p style="margin: 16px 0;">We received a request to reset your password. Click the button below to set a new one.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #00FF87; color: #080C10; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 24px 0;">
            Reset Password
          </a>
          <p style="color: #7A8C99; font-size: 13px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #445566; font-size: 12px; margin-top: 16px;">Or copy this link: ${resetUrl}</p>
        </div>
      `
    );

    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find valid token
    const tokenRes = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token=$1 AND used=FALSE AND expires_at > NOW()`,
      [token]
    );
    const resetToken = tokenRes.rows[0];
    if (!resetToken) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    // Update password
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, resetToken.user_id]);

    // Mark token as used
    await db.query('UPDATE password_reset_tokens SET used=TRUE WHERE id=$1', [resetToken.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
