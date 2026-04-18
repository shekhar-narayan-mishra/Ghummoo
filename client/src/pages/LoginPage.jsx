import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Compass, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name?.split(' ')[0]}!`);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'guide') navigate('/guide/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(242,101,34,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 16, background: '#F26522', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'white', marginBottom: 16 }}>G</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6, color: '#1A1A1A' }}>Welcome back</h1>
          <p style={{ color: '#6B6B6B' }}>Sign in to your Ghummoo account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="divider" />

          {/* Quick login hints */}
          <div style={{ fontSize: '0.78rem', color: '#9B9B9B', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Seed accounts (password: Password@123)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={12} /> Traveler: rahul@ghummoo.com</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Compass size={12} /> Guide: priya@ghummoo.com</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={12} /> Admin: admin@ghummoo.com</div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#6B6B6B', fontSize: '0.88rem' }}>
            Don't have an account? <Link to="/register" style={{ color: '#F26522', fontWeight: 600 }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
