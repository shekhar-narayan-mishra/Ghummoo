import { Link } from 'react-router-dom';
import { MapPin, Award, Star, Home, Zap } from 'lucide-react';

const SPECIALTY_COLORS = {
  heritage: '#D95A1F', adventure: '#DC3545', food: '#1D9E75',
  spiritual: '#7B47B8', cultural: '#F26522', trekking: '#0A8ABF',
};

const TIER_STYLES = {
  gold: 'badge-gold',
  silver: 'badge-silver',
  bronze: 'badge-bronze',
};

export default function GuideCard({ guide }) {
  const g = guide;
  const primarySpecialty = g.specialties?.[0] || 'heritage';
  const color = SPECIALTY_COLORS[primarySpecialty] || '#F26522';
  const initials = g.userId?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <Link to={`/guides/${g._id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        cursor: 'pointer', height: '100%',
        display: 'flex', flexDirection: 'column', gap: 14
      }}>
        {/* Avatar + Name */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, ${color}33, ${color}66)`,
            border: `2px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 800, color,
          }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A1A' }}>{g.userId?.name}</div>
            <div style={{ color: '#9B9B9B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {g.city}</div>
          </div>
        </div>

        {/* Specialty Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {g.specialties?.map(s => (
            <span key={s} style={{
              padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
              background: `${SPECIALTY_COLORS[s]}18`, color: SPECIALTY_COLORS[s], textTransform: 'capitalize'
            }}>{s}</span>
          ))}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 24 }}>
          {g.certificationStatus === 'approved' && g.certificationTier && (
            <span className={`badge ${TIER_STYLES[g.certificationTier]}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Award size={12} /> {g.certificationTier}
            </span>
          )}
          {g.isTopRated && <span className="badge badge-indigo" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="currentColor" /> Top Rated</span>}
          {g.isLocalExpert && <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Home size={12} /> Local Expert</span>}
          {g.instantBook && <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> Instant Book</span>}
        </div>

        {/* Rating + Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#F26522', display: 'flex', alignItems: 'center' }}><Star size={14} fill="currentColor" strokeWidth={0} /></span>
            <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{g.avgRating?.toFixed(1)}</span>
            <span style={{ color: '#9B9B9B', fontSize: '0.8rem' }}>({g.totalReviews})</span>
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1A1A1A' }}>₹{g.pricePerDay?.toLocaleString()}</span>
            <span style={{ color: '#9B9B9B', fontSize: '0.78rem' }}>/day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
