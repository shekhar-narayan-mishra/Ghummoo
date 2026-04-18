import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Landmark, Mountain, Utensils, Church, Palette, Star, Lock, Phone, Heart } from 'lucide-react';
import api from '../services/api';
import GuideCard from '../components/GuideCard';
import { GuideCardSkeleton } from '../components/LoadingSkeleton';

const STATS = [
  { value: '200+', label: 'Certified Guides' },
  { value: '50+', label: 'Cities Covered' },
  { value: '10,000+', label: 'Trips Completed' },
  { value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>4.9 <Star size={18} fill="currentColor" strokeWidth={0} /></span>, label: 'Average Rating' },
];

const SPECIALTIES = [
  { id: 'heritage', icon: Landmark, label: 'Heritage' },
  { id: 'adventure', icon: Mountain, label: 'Adventure' },
  { id: 'food', icon: Utensils, label: 'Food' },
  { id: 'spiritual', icon: Church, label: 'Spiritual' },
  { id: 'cultural', icon: Palette, label: 'Cultural' },
];

const HOW_STEPS = [
  { num: '1', title: 'Search & Filter', desc: 'Find certified guides by city, specialty, language, and price range.' },
  { num: '2', title: 'Book Instantly', desc: 'Pick dates from the availability calendar and book with one click.' },
  { num: '3', title: 'Explore with Trust', desc: 'Meet your verified guide and enjoy authentic, expert-led experiences.' },
];

const placeholderGuides = [
  { _id:'p1', userId:{name:'Arjun Mehta'}, city:'Jaipur', avgRating:4.9, totalReviews:47, specialties:['heritage'], pricePerDay:1800, certificationStatus:'approved', certificationTier:'gold', isTopRated:true, _gradient:'135deg,#F26522,#FF8C55' },
  { _id:'p2', userId:{name:'Priya Nair'}, city:'Kerala Backwaters', avgRating:4.8, totalReviews:62, specialties:['spiritual'], pricePerDay:2200, certificationStatus:'approved', certificationTier:'silver', isLocalExpert:true, _gradient:'135deg,#0F6E56,#5DCAA5' },
  { _id:'p3', userId:{name:'Rajan Sharma'}, city:'Varanasi', avgRating:5.0, totalReviews:31, specialties:['spiritual','cultural'], pricePerDay:1500, certificationStatus:'approved', certificationTier:'gold', isTopRated:true, _gradient:'135deg,#534AB7,#AFA9EC' },
  { _id:'p4', userId:{name:'Sneha Kulkarni'}, city:'Mumbai', avgRating:4.7, totalReviews:89, specialties:['food'], pricePerDay:1600, certificationStatus:'approved', certificationTier:'silver', instantBook:true, _gradient:'135deg,#993556,#ED93B1' },
  { _id:'p5', userId:{name:'Vikram Das'}, city:'Leh-Ladakh', avgRating:4.9, totalReviews:54, specialties:['adventure','trekking'], pricePerDay:2500, certificationStatus:'approved', certificationTier:'gold', isTopRated:true, _gradient:'135deg,#185FA5,#85B7EB' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('');

  useEffect(() => {
    api.get('/guides?limit=6&minRating=4.5')
      .then(res => setFeatured(res.data?.docs || res?.docs || []))
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

  const displayGuides = featured.length > 0 ? featured : placeholderGuides;

  return (
    <div>
      {/* ══════ HERO ══════ */}
      <section className="hero">
        {/* Pill */}
        <div className="hero-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} /> Trust Through Certification
        </div>

        {/* Headline */}
        <h1>
          Discover Certified<br />
          <span>Local Guides</span> Across India
        </h1>

        {/* Subtext */}
        <p>
          Every guide on Ghummoo is verified, certified, and trusted.
          No generic tours — authentic, expert-led experiences.
        </p>

        {/* Glass Search Bar */}
        <form onSubmit={handleSearch} className="search-bar">
          <div className="search-field">
            <label>Where</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="City or destination"
              style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' }}
            />
          </div>
          <div className="search-field">
            <label>Specialty</label>
            <select
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' }}
            >
              <option value="">Any type</option>
              {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <button type="submit" className="search-btn">Search Guides</button>
        </form>

        {/* Trust Stats Strip */}
        <div className="trust-strip">
          {STATS.map((s, i) => (
            <div key={s.label} className="trust-item">
              <span className="trust-number">{s.value}</span>
              <span className="trust-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ SPECIALTY CARDS ══════ */}
      <section style={{ padding: '0 32px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SPECIALTIES.map(s => (
              <Link key={s.id} to={`/guides?specialty=${s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{
                  padding: '12px 22px', display: 'flex', gap: 8, alignItems: 'center',
                  fontSize: '0.9rem', fontWeight: 600, color: '#6B6B6B', cursor: 'pointer'
                }}>
                  <s.icon size={18} /> {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="how-section">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>How It Works</h2>
          <p style={{ color: '#9B9B9B', fontSize: '0.9rem' }}>Three simple steps to your next adventure</p>
        </div>
        <div className="how-grid">
          {HOW_STEPS.map(step => (
            <div key={step.num} className="card how-card">
              <div className="how-number">{step.num}</div>
              <div className="how-title">{step.title}</div>
              <div className="how-desc">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ FEATURED GUIDES ══════ */}
      <section style={{ padding: '0 32px 60px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="section-header" style={{ padding: 0, marginBottom: 24 }}>
            <div>
              <h2 className="section-title">Top Rated Guides</h2>
              <p style={{ color: '#9B9B9B', fontSize: '0.88rem', marginTop: 2 }}>Handpicked certified guides loved by travelers</p>
            </div>
            <Link to="/guides" className="section-link">See all →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <GuideCardSkeleton key={i} />)
              : displayGuides.map(g => <GuideCard key={g._id} guide={g} />)
            }
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 32 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 800 }}>G</div>
                <span style={{ color: '#F26522', fontSize: 18, fontWeight: 700 }}>Ghummoo</span>
              </div>
              <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: 1.6 }}>
                India's trusted platform for certified local guides. Authentic experiences, verified experts.
              </p>
            </div>
            {/* Links */}
            <div>
              <div style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Explore</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/guides" style={{ color: '#888', fontSize: '0.85rem' }}>Find Guides</Link>
                <Link to="/register" style={{ color: '#888', fontSize: '0.85rem' }}>Become a Guide</Link>
                <Link to="/login" style={{ color: '#888', fontSize: '0.85rem' }}>Sign In</Link>
              </div>
            </div>
            {/* More Links */}
            <div>
              <div style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Specialties</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SPECIALTIES.map(s => (
                  <Link key={s.id} to={`/guides?specialty=${s.id}`} style={{ color: '#888', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}><s.icon size={14} /> {s.label}</Link>
                ))}
              </div>
            </div>
            {/* Trust */}
            <div>
              <div style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Trust & Safety</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#888', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> All guides certified</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={14} /> Verified reviews only</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={14} /> Secure bookings</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> 24/7 support</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            © {new Date().getFullYear()} Ghummoo. All rights reserved. Built with <Heart size={12} fill="currentColor" style={{ display: 'inline', color: '#F26522', margin: '0 2px' }} /> for travelers.
          </div>
        </div>
      </footer>
    </div>
  );
}
