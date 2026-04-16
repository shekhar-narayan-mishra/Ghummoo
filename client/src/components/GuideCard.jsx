import { Link } from 'react-router-dom';

const SPECIALTY_COLORS = {
  heritage: '#f59e0b', adventure: '#ef4444', food: '#10b981',
  spiritual: '#8b5cf6', cultural: '#6366f1', trekking: '#06b6d4',
};

const TIER_STYLES = {
  gold: 'badge-gold',
  silver: 'badge-silver',
  bronze: 'badge-bronze',
};

export default function GuideCard({ guide }) {
  const g = guide;
  const primarySpecialty = g.specialties?.[0] || 'heritage';
  const color = SPECIALTY_COLORS[primarySpecialty] || '#6366f1';
  const initials = g.userId?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <Link to={`/guides/${g._id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        transition: 'all 0.25s', cursor: 'pointer', height: '100%',
        display: 'flex', flexDirection: 'column', gap: 14
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
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
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{g.userId?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>📍 {g.city}</div>
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
            <span className={`badge ${TIER_STYLES[g.certificationTier]}`}>
              {g.certificationTier === 'gold' ? '🥇' : g.certificationTier === 'silver' ? '🥈' : '🥉'} {g.certificationTier}
            </span>
          )}
          {g.isTopRated && <span className="badge badge-indigo">⭐ Top Rated</span>}
          {g.isLocalExpert && <span className="badge badge-green">🏠 Local Expert</span>}
          {g.instantBook && <span className="badge badge-amber">⚡ Instant Book</span>}
        </div>

        {/* Rating + Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#f59e0b' }}>★</span>
            <span style={{ fontWeight: 700 }}>{g.avgRating?.toFixed(1)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({g.totalReviews})</span>
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>₹{g.pricePerDay?.toLocaleString()}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>/day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
