import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Award, Clock, AlertCircle, Star } from 'lucide-react';
import api from '../services/api';
import BookingCard from '../components/BookingCard';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function GuideDashboardPage() {
  const [guide, setGuide] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [applyingCert, setApplyingCert] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [tab, setTab] = useState('All');

  const STATUS_MAP = { 'All': '', 'Pending': 'pending', 'Confirmed': 'confirmed', 'Completed': 'completed' };

  useEffect(() => {
    Promise.all([
      api.get('/guides/me'),
      api.get('/bookings/guide'),
      api.get('/certifications/my'),
    ]).then(([guideData, bookingsData, certData]) => {
      setGuide(guideData);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setCert(certData);
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const fetchBookings = async () => {
    const status = STATUS_MAP[tab];
    const bookingsData = await api.get(`/bookings/guide${status ? `?status=${status}` : ''}`);
    setBookings(Array.isArray(bookingsData) ? bookingsData : []);
  };

  useEffect(() => { if (guide) fetchBookings(); }, [tab]);

  const handleConfirm = async (id) => {
    try {
      await api.patch(`/bookings/${id}/confirm`);
      toast.success('Booking confirmed! The traveler has been notified.');
      fetchBookings();
    } catch (err) { toast.error(err.message); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this booking request?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`, { reason: 'Guide declined' });
      toast.success('Booking rejected');
      fetchBookings();
    } catch (err) { toast.error(err.message); }
  };

  const handleApplyCert = async (e) => {
    e.preventDefault();
    if (!certFile) { toast.error('Please select a document file'); return; }
    setApplyingCert(true);
    const formData = new FormData();
    formData.append('document', certFile);
    try {
      await api.post('/certifications/apply', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Application submitted! Admin will review within 48h.');
      const certData = await api.get('/certifications/my');
      setCert(certData);
      const guideData = await api.get('/guides/me');
      setGuide(guideData);
    } catch (err) { toast.error(err.message); }
    finally { setApplyingCert(false); }
  };

  const stats = [
    { label: 'Total Bookings', value: bookings.length },
    { label: 'Confirmed', value: bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length },
    { label: 'Completed', value: guide?.totalCompletedBookings || 0 },
    { label: 'Avg Rating', value: guide ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{guide.avgRating?.toFixed(1)} <Star size={14} fill="currentColor" strokeWidth={0} /></span> : '–' },
  ];

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CardSkeleton height={100} />
      <CardSkeleton height={300} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <div className="page-header">
        <h1 className="page-title">Guide Dashboard</h1>
        <p className="page-subtitle">Welcome back, {guide?.userId?.name?.split(' ')[0]}</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F26522' }}>{s.value}</div>
            <div style={{ color: '#6B6B6B', fontSize: '0.82rem', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'flex-start' }}>

        {/* Availability Manager */}
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: 16, color: '#1A1A1A' }}>Manage Availability</h2>
          <p style={{ color: '#6B6B6B', fontSize: '0.82rem', marginBottom: 16 }}>Click days to toggle available / unavailable. Red = already booked (locked).</p>
          {guide && <AvailabilityCalendar guideId={guide._id} editable={true} />}
        </div>

        {/* Certification Section */}
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: 16, color: '#1A1A1A' }}>Certification</h2>
          {guide?.certificationStatus === 'approved' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ marginBottom: 8, color: '#F26522', display: 'flex', justifyContent: 'center' }}>
                <Award size={48} strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#1A1A1A' }}>
                {guide.certificationTier?.charAt(0).toUpperCase() + guide.certificationTier?.slice(1)} Certified Guide
              </div>
              <div style={{ color: '#9B9B9B', fontSize: '0.82rem' }}>
                Approved on {cert?.reviewedAt ? new Date(cert.reviewedAt).toLocaleDateString() : '–'}
              </div>
            </div>
          ) : guide?.certificationStatus === 'pending' ? (
            <div style={{ padding: '20px', background: 'rgba(242,101,34,0.06)', border: '1px solid rgba(242,101,34,0.18)', borderRadius: 10 }}>
              <div style={{ color: '#F26522', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={16} /> Application Under Review</div>
              <div style={{ color: '#6B6B6B', fontSize: '0.83rem' }}>
                Submitted: {cert?.createdAt ? new Date(cert.createdAt).toLocaleDateString() : '–'}<br />
                Our team will review within 48 hours.
              </div>
            </div>
          ) : guide?.certificationStatus === 'rejected' ? (
            <>
              <div style={{ padding: 14, background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.18)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ color: '#DC3545', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} /> Application Rejected</div>
                <div style={{ color: '#6B6B6B', fontSize: '0.83rem' }}>{cert?.adminNotes || 'No reason provided'}</div>
              </div>
              <form onSubmit={handleApplyCert} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Upload New Document</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setCertFile(e.target.files[0])} style={{ padding: 8 }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={applyingCert}>
                  {applyingCert ? 'Submitting…' : 'Reapply for Certification'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: '#6B6B6B', fontSize: '0.85rem', marginBottom: 16 }}>
                Get certified to unlock bookings. You'll need your bio, city, specialties, and a price filled in.
              </p>
              <form onSubmit={handleApplyCert} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Upload Certification Document (PDF / Image)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setCertFile(e.target.files[0])} style={{ padding: 8 }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={applyingCert}>
                  {applyingCert ? 'Submitting…' : 'Apply for Certification'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Incoming Bookings */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, color: '#1A1A1A' }}>Incoming Bookings</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {['All', 'Pending', 'Confirmed', 'Completed'].map(t => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bookings.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px', color: '#9B9B9B' }}>No {tab !== 'All' ? tab.toLowerCase() : ''} bookings</div>
            : bookings.map(b => (
                <BookingCard key={b._id} booking={b} isGuide={true} onConfirm={handleConfirm} onReject={handleReject} />
              ))
          }
        </div>
      </div>
    </div>
  );
}
