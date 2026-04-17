import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import GuideCard from '../components/GuideCard';
import { GuideCardSkeleton } from '../components/LoadingSkeleton';

const STATS = [
  { value: '200+', label: 'Certified Guides' },
  { value: '50+', label: 'Cities Covered' },
  { value: '10,000+', label: 'Trips Completed' },
];

const SPECIALTIES = [
  { id: 'heritage', emoji: '🏛', label: 'Heritage' },
  { id: 'adventure', emoji: '🧗', label: 'Adventure' },
  { id: 'food', emoji: '🍛', label: 'Food' },
  { id: 'spiritual', emoji: '🕌', label: 'Spiritual' },
  { id: 'cultural', emoji: '🎭', label: 'Cultural' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('');

  useEffect(() => {
    api.get('/guides?limit=6&minRating=4.5')
      .then(res => setFeatured(res.data?.docs || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (specialty) params.set('specialty', specialty);
    navigate(`/guides?${params}`);
  };

  return (
    <div>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '100px 32px 80px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 500, height: 400, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <span style={{ display: 'inline-block', padding: '4px 16px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24, border: '1px solid rgba(99,102,241,0.3)' }}>
            Trust Through Certification
          </span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, maxWidth: 700, margin: '0 auto 20px' }}>
            Discover Certified<br />
            <span className="gradient-text">Local Guides</span> Across India
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.65 }}>
            Every guide on Ghummoo is verified, certified, and trusted. No generic tours — authentic, expert-led experiences.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 580, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Where do you want to go?" style={{ flex: '1 1 200px', minWidth: 0 }} />
            <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={{ flex: '0 0 160px' }}>
              <option value="">Any specialty</option>
              {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </select>
            <button type="submit" className="btn btn-primary" style={{ flex: '0 0 auto' }}>Search Guides</button>
          </form>
        </div>
      </section>

      {/* Specialty Cards */}
      <section style={{ padding: '0 32px 64px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SPECIALTIES.map(s => (
              <Link key={s.id} to={`/guides?specialty=${s.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '12px 22px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#818cf8'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <span>{s.emoji}</span> {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ padding: '24px 32px 64px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#818cf8' }}>{s.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Guides */}
      <section style={{ padding: '0 32px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Top Rated Guides</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Handpicked certified guides loved by travelers</p>
            </div>
            <Link to="/guides" style={{ color: '#818cf8', fontWeight: 600, fontSize: '0.88rem' }}>See all →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <GuideCardSkeleton key={i} />)
              : featured.map(g => <GuideCard key={g._id} guide={g} />)
            }
          </div>
        </div>
      </section>
    </div>
  );
}
