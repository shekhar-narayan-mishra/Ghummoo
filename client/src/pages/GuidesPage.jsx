import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import GuideCard from '../components/GuideCard';
import { GuideCardSkeleton } from '../components/LoadingSkeleton';

const SPECIALTIES = ['heritage', 'adventure', 'food', 'spiritual', 'cultural', 'trekking'];
const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Malayalam', 'Tamil', 'Bengali', 'Marathi'];

export default function GuidesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [guides, setGuides] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    specialty: searchParams.get('specialty') || '',
    language: '',
    minRating: '',
    maxPrice: '',
    instantBook: false,
    page: 1,
  });

  const fetchGuides = async (f) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    try {
      const d = await api.get(`/guides?${params}`);
      // interceptor already unwraps envelope → d is the paginated result directly
      setGuides(d?.docs || []);
      setPagination({ page: d?.page || 1, totalPages: d?.totalPages || 1, total: d?.totalDocs || 0 });
    } catch { setGuides([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGuides(filters); }, []);

  const applyFilters = () => { const f = { ...filters, page: 1 }; setFilters(f); fetchGuides(f); };
  const clearFilters = () => {
    const f = { city: '', specialty: '', language: '', minRating: '', maxPrice: '', instantBook: false, page: 1 };
    setFilters(f); fetchGuides(f);
  };
  const changePage = (p) => { const f = { ...filters, page: p }; setFilters(f); fetchGuides(f); };

  const FilterSection = ({ label, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>
      {/* Sidebar */}
      <aside style={{ width: 260, flexShrink: 0, position: 'sticky', top: 80 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Filters</span>
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear</button>
          </div>

          <FilterSection label="City">
            <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Any city" />
          </FilterSection>

          <FilterSection label="Specialty">
            {SPECIALTIES.map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.88rem', textTransform: 'capitalize', color: filters.specialty === s ? '#818cf8' : 'var(--text-secondary)' }}>
                <input type="radio" name="specialty" value={s} checked={filters.specialty === s} onChange={() => setFilters(f => ({ ...f, specialty: s }))}
                  style={{ width: 'auto', borderRadius: 0, background: 'transparent', border: 'none', padding: 0 }} />
                {s}
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, cursor: 'pointer', fontSize: '0.88rem', color: !filters.specialty ? '#818cf8' : 'var(--text-secondary)' }}>
              <input type="radio" name="specialty" value="" checked={!filters.specialty} onChange={() => setFilters(f => ({ ...f, specialty: '' }))}
                style={{ width: 'auto', borderRadius: 0, background: 'transparent', border: 'none', padding: 0 }} />
              All
            </label>
          </FilterSection>

          <FilterSection label="Language">
            {LANGUAGES.map(l => (
              <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.88rem', color: filters.language === l ? '#818cf8' : 'var(--text-secondary)' }}>
                <input type="radio" name="language" value={l} checked={filters.language === l} onChange={() => setFilters(f => ({ ...f, language: l }))}
                  style={{ width: 'auto', borderRadius: 0, background: 'transparent', border: 'none', padding: 0 }} />
                {l}
              </label>
            ))}
          </FilterSection>

          <FilterSection label="Min Rating">
            <input type="number" value={filters.minRating} onChange={e => setFilters(f => ({ ...f, minRating: e.target.value }))} placeholder="e.g. 4.5" min="1" max="5" step="0.1" />
          </FilterSection>

          <FilterSection label="Max Price (₹/day)">
            <input type="number" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} placeholder="e.g. 3000" min="0" />
          </FilterSection>

          <FilterSection label="Instant Book">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={filters.instantBook} onChange={e => setFilters(f => ({ ...f, instantBook: e.target.checked }))}
                style={{ width: 'auto', borderRadius: 0, background: 'transparent', border: 'none', padding: 0 }} />
              Only Instant Book guides
            </label>
          </FilterSection>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyFilters}>Apply Filters</button>
        </div>
      </aside>

      {/* Results */}
      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Find Your Guide</h1>
            {!loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>{pagination.total} certified guides found</p>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <GuideCardSkeleton key={i} />)
            : guides.length > 0
              ? guides.map(g => <GuideCard key={g._id} guide={g} />)
              : <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No guides found matching your filters.</div>
          }
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 40 }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className="btn" onClick={() => changePage(p)} style={{
                padding: '8px 14px', borderRadius: 8, border: `1px solid ${p === pagination.page ? '#6366f1' : 'var(--border)'}`,
                background: p === pagination.page ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: p === pagination.page ? '#818cf8' : 'var(--text-secondary)', fontWeight: 600
              }}>{p}</button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
