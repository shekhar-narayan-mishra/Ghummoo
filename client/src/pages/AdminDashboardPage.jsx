import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { Users, Compass, ClipboardList, Calendar, DollarSign, FileText, Check, X, Star } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [pendingCerts, setPendingCerts] = useState([]);
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectNotes, setRejectNotes] = useState({});
  const [rejecting, setRejecting] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/certifications/pending'),
      api.get('/reviews/flagged'),
      api.get('/admin/guides'),
    ]).then(([statsData, certsData, reviewsData, guidesData]) => {
      setStats(statsData);
      setPendingCerts(Array.isArray(certsData) ? certsData : []);
      setFlaggedReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setGuides(Array.isArray(guidesData) ? guidesData : []);
    }).catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const approveCert = async (id) => {
    try {
      await api.patch(`/certifications/${id}/approve`);
      toast.success('Guide approved and notified!');
      setPendingCerts(c => c.filter(x => x._id !== id));
    } catch (err) { toast.error(err.message); }
  };

  const rejectCert = async (id) => {
    setRejecting(r => ({ ...r, [id]: true }));
    try {
      await api.patch(`/certifications/${id}/reject`, { notes: rejectNotes[id] || '' });
      toast.success('Certification rejected');
      setPendingCerts(c => c.filter(x => x._id !== id));
    } catch (err) { toast.error(err.message); }
    finally { setRejecting(r => ({ ...r, [id]: false })); }
  };

  const flagReview = async (id) => {
    try {
      await api.patch(`/reviews/${id}/flag`);
      toast.success('Review hidden from public');
      setFlaggedReviews(r => r.filter(x => x._id !== id));
    } catch (err) { toast.error(err.message); }
  };

  const suspendGuide = async (id) => {
    if (!window.confirm('Suspend this guide? They will lose their certification and cannot accept new bookings.')) return;
    try {
      await api.patch(`/admin/guides/${id}/suspend`);
      toast.success('Guide suspended');
      setGuides(gs => gs.map(g => g._id === id ? { ...g, certificationStatus: 'none', isSuspended: true } : g));
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CardSkeleton height={100} />
      <CardSkeleton height={300} />
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users },
    { label: 'Certified Guides', value: stats?.totalGuides || 0, icon: Compass },
    { label: 'Pending Certs', value: stats?.pendingCerts || 0, icon: ClipboardList, highlight: stats?.pendingCerts > 0 },
    { label: 'Bookings This Month', value: stats?.bookingsThisMonth || 0, icon: Calendar },
    { label: 'Revenue This Month', value: `₹${(stats?.revenueThisMonth || 0).toLocaleString()}`, icon: DollarSign },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview and moderation tools</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 36 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: 20, border: s.highlight ? '1px solid rgba(242,101,34,0.35)' : undefined }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4, display: 'flex' }}><s.icon size={24} /></div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.highlight ? '#F26522' : '#F26522' }}>{s.value}</div>
            <div style={{ color: '#6B6B6B', fontSize: '0.8rem', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Certifications */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20, color: '#1A1A1A' }}>
          Pending Certifications
          {pendingCerts.length > 0 && <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', width: 22, height: 22, background: '#F26522', borderRadius: '50%', color: 'white', fontSize: '0.72rem', fontWeight: 700, justifyContent: 'center' }}>{pendingCerts.length}</span>}
        </h2>
        {pendingCerts.length === 0
          ? <div style={{ color: '#9B9B9B', padding: '20px 0' }}>No pending applications</div>
          : pendingCerts.map(cert => {
              const guide = cert.guideId;
              const user = guide?.userId;
              return (
                <div key={cert._id} style={{ padding: '16px', background: 'rgba(255,255,255,0.50)', borderRadius: 12, marginBottom: 12, border: '1px solid rgba(242,101,34,0.10)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{user?.name || '—'}</div>
                      <div style={{ color: '#6B6B6B', fontSize: '0.83rem' }}>{user?.email}</div>
                      <div style={{ color: '#9B9B9B', fontSize: '0.8rem' }}>📍 {guide?.city} · Submitted {new Date(cert.createdAt).toLocaleDateString()}</div>
                      {guide?.specialties?.length > 0 && (
                        <div style={{ color: '#9B9B9B', fontSize: '0.78rem', marginTop: 4, textTransform: 'capitalize' }}>
                          {guide.specialties.join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {cert.documentUrl && (
                        <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={14} /> View Doc</a>
                      )}
                      <button className="btn btn-success btn-sm" onClick={() => approveCert(cert._id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Approve</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <input placeholder="Rejection notes (optional before rejecting)"
                        value={rejectNotes[cert._id] || ''}
                        onChange={e => setRejectNotes(n => ({ ...n, [cert._id]: e.target.value }))}
                        style={{ fontSize: '0.82rem', padding: '7px 12px' }}
                      />
                    </div>
                    <button className="btn btn-danger btn-sm" disabled={rejecting[cert._id]} onClick={() => rejectCert(cert._id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {rejecting[cert._id] ? '…' : <><X size={14} /> Reject</>}
                    </button>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Flagged Reviews */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20, color: '#1A1A1A' }}>Flagged Reviews</h2>
        {flaggedReviews.length === 0
          ? <div style={{ color: '#9B9B9B', padding: '20px 0' }}>No flagged reviews</div>
          : flaggedReviews.map(r => (
              <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(242,101,34,0.10)', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1A1A1A' }}>{r.travelerId?.name} → {r.guideId?.userId?.name}</div>
                  <div style={{ color: '#F26522', fontSize: '0.82rem', display: 'flex' }}>
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={`f${i}`} size={12} fill="currentColor" strokeWidth={0} />)}
                    {Array.from({ length: 5 - r.rating }).map((_, i) => <Star key={`e${i}`} size={12} />)}
                  </div>
                  <div style={{ color: '#6B6B6B', fontSize: '0.82rem', marginTop: 2 }}>{r.comment}</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => flagReview(r._id)}>Hide Review</button>
              </div>
            ))
        }
      </div>

      {/* Guide Management */}
      <div className="card">
        <h2 style={{ fontWeight: 700, marginBottom: 20, color: '#1A1A1A' }}>Guide Management</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ color: '#9B9B9B', borderBottom: '1px solid rgba(242,101,34,0.12)' }}>
                {['Guide', 'City', 'Status', 'Tier', 'Rating', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guides.map(g => (
                <tr key={g._id} style={{ borderBottom: '1px solid rgba(242,101,34,0.08)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1A1A1A' }}>{g.userId?.name}</td>
                  <td style={{ padding: '12px', color: '#6B6B6B' }}>{g.city}</td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge ${g.certificationStatus === 'approved' ? 'badge-green' : g.certificationStatus === 'pending' ? 'badge-amber' : 'badge-red'}`}>
                      {g.certificationStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'capitalize', color: '#6B6B6B' }}>{g.certificationTier || '—'}</td>
                  <td style={{ padding: '12px', color: '#1A1A1A' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {g.avgRating?.toFixed(1)} <Star size={12} fill="currentColor" strokeWidth={0} />
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {!g.isSuspended && g.certificationStatus === 'approved' && (
                      <button className="btn btn-danger btn-sm" onClick={() => suspendGuide(g._id)}>Suspend</button>
                    )}
                    {g.isSuspended && <span style={{ color: '#9B9B9B', fontSize: '0.78rem' }}>Suspended</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
