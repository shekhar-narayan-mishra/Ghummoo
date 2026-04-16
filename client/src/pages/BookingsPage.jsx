import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import BookingCard from '../components/BookingCard';
import { ReviewForm } from '../components/ReviewCard';
import { CardSkeleton } from '../components/LoadingSkeleton';

const TABS = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
const STATUS_MAP = { 'All': '', 'Pending': 'pending', 'Confirmed': 'confirmed', 'In Progress': 'in_progress', 'Completed': 'completed', 'Cancelled': 'cancelled' };

export default function BookingsPage() {
  const [tab, setTab] = useState('All');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = async (status = '') => {
    setLoading(true);
    try {
      const bookings = await api.get(`/bookings/my${status ? `?status=${status}` : ''}`);
      setBookings(Array.isArray(bookings) ? bookings : []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(STATUS_MAP[tab]); }, [tab]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`, { reason: 'Cancelled by traveler' });
      toast.success('Booking cancelled');
      fetchBookings(STATUS_MAP[tab]);
    } catch (err) { toast.error(err.message); }
  };

  const handleReviewSubmit = async ({ rating, comment }) => {
    setSubmittingReview(true);
    try {
      await api.post('/reviews', { bookingId: reviewTarget._id, rating, comment });
      toast.success('Review submitted! Thank you.');
      setReviewTarget(null);
      fetchBookings(STATUS_MAP[tab]);
    } catch (err) { toast.error(err.message); }
    finally { setSubmittingReview(false); }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
        <p className="page-subtitle">Track and manage all your travel bookings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Review Modal */}
      {reviewTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Leave a Review</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setReviewTarget(null)}>✕</button>
            </div>
            <ReviewForm onSubmit={handleReviewSubmit} loading={submittingReview} />
          </div>
        </div>
      )}

      {/* Booking List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} height={130} />)
          : bookings.length === 0
            ? <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺</div>
                No {tab !== 'All' ? tab.toLowerCase() : ''} bookings found
              </div>
            : bookings.map(b => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  onCancel={handleCancel}
                  onReview={booking => setReviewTarget(booking)}
                />
              ))
        }
      </div>
    </div>
  );
}
