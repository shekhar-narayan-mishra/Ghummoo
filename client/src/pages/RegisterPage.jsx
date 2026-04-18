import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Compass } from 'lucide-react';
import toast from 'react-hot-toast';

const SPECIALTIES = ['heritage', 'adventure', 'food', 'spiritual', 'cultural', 'trekking'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'traveler',
    bio: '', city: '', languages: '', pricePerDay: '', pricingType: 'budget',
    specialties: [],
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleSpecialty = (s) => setForm(f => ({
    ...f,
    specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s]
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        languages: form.languages ? form.languages.split(',').map(l => l.trim()) : [],
        pricePerDay: form.pricePerDay ? Number(form.pricePerDay) : undefined,
      };
      const user = await register(payload);
      toast.success(`Welcome to Ghummoo, ${user.name?.split(' ')[0]}!`);
      if (user.role === 'guide') navigate('/guide/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(242,101,34,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 16, background: '#F26522', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'white', marginBottom: 16 }}>G</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6, color: '#1A1A1A' }}>Join Ghummoo</h1>
          <p style={{ color: '#6B6B6B' }}>Create your account and start exploring</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Role Selector */}
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['traveler', 'guide'].map(r => (
                  <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))} style={{
                    flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${form.role === r ? '#F26522' : 'rgba(242,101,34,0.18)'}`,
                    background: form.role === r ? 'rgba(242,101,34,0.08)' : 'transparent',
                    color: form.role === r ? '#F26522' : '#6B6B6B', fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}>
                    {r === 'traveler' ? <><Briefcase size={16} /> Traveler</> : <><Compass size={16} /> Guide</>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name</label>
                <input value={form.name} onChange={set('name')} placeholder="Your name" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Password</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" required minLength={8} />
              </div>
            </div>

            {/* Guide-specific fields */}
            {form.role === 'guide' && (
              <>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div style={{ color: '#6B6B6B', fontSize: '0.82rem', fontWeight: 600 }}>Guide Profile</div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input value={form.city} onChange={set('city')} placeholder="e.g. Jaipur" />
                </div>

                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="Tell travelers about yourself (min 20 chars for certification)" />
                </div>

                <div className="form-group">
                  <label className="form-label">Specialties</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SPECIALTIES.map(s => (
                      <button key={s} type="button" onClick={() => toggleSpecialty(s)} style={{
                        padding: '5px 14px', borderRadius: 999, border: `1px solid ${form.specialties.includes(s) ? '#F26522' : 'rgba(242,101,34,0.18)'}`,
                        background: form.specialties.includes(s) ? 'rgba(242,101,34,0.10)' : 'transparent',
                        color: form.specialties.includes(s) ? '#F26522' : '#9B9B9B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s'
                      }}>{s}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Price / Day (₹)</label>
                    <input type="number" value={form.pricePerDay} onChange={set('pricePerDay')} placeholder="e.g. 1500" min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pricing Tier</label>
                    <select value={form.pricingType} onChange={set('pricingType')}>
                      <option value="budget">Budget</option>
                      <option value="premium">Premium (+15%)</option>
                      <option value="luxury">Luxury (+25% + ₹500)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Languages (comma-separated)</label>
                  <input value={form.languages} onChange={set('languages')} placeholder="Hindi, English, French" />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#6B6B6B', fontSize: '0.88rem' }}>
            Already have an account? <Link to="/login" style={{ color: '#F26522', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
