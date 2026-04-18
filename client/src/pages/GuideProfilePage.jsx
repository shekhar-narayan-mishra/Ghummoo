import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { ReviewCard } from '../components/ReviewCard';
import { GuideCardSkeleton } from '../components/LoadingSkeleton';
import { Award, MapPin, Star, Home, Zap, Mail, Calendar } from 'lucide-react';

const TIER_BADGE = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

function PricingBreakdown({ guide, totalDays }) {
  if (!guide || !totalDays) return null;
  const base = guide.pricePerDay * totalDays;
  let serviceFee = 0, priorityFee = 0;
  if (guide.pricingType === 'premium') serviceFee = Math.round(base * 0.15);
  if (guide.pricingType === 'luxury') { serviceFee = Math.round(base * 0.25); priorityFee = 500; }
  const total = base + serviceFee + priorityFee;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, padding: 14, background: 'rgba(242,101,34,0.06)', borderRadius: 10, border: '1px solid rgba(242,101,34,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6B6B6B' }}>
        <span>₹{guide.pricePerDay?.toLocaleString()} × {totalDays} days</span>
        <span>₹{base.toLocaleString()}</span>
      </div>
      {serviceFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6B6B6B' }}>
        <span>Service fee ({guide.pricingType === 'luxury' ? '25%' : '15%'})</span>
        <span>₹{serviceFee.toLocaleString()}</span>
      </div>}
      {priorityFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6B6B6B' }}>
        <span>Priority support</span><span>₹{priorityFee}</span>
      </div>}
      <div className="divider" style={{ margin: '4px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#1A1A1A' }}>
        <span>Total</span><span>₹{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function GuideProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [guide, setGuide] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/guides/${id}`),
      api.get(`/reviews/guide/${id}?page=1&limit=5`)
    ]).then(([guide, rRes]) => {
      setGuide(guide);
      setReviews(rRes?.docs || []);
      if ((rRes?.page || 1) >= (rRes?.totalPages || 1)) setHasMoreReviews(false);
    }).catch(() => toast.error('Guide not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadMoreReviews = async () => {
    const nextPage = reviewPage + 1;
    const rRes = await api.get(`/reviews/guide/${id}?page=${nextPage}&limit=5`);
    setReviews(r => [...r, ...(rRes?.docs || [])]);
    setReviewPage(nextPage);
    if (nextPage >= (rRes?.totalPages || 1)) setHasMoreReviews(false);
  };

  const handleBook = async () => {
    if (!user) { navigate('/login'); return; }
    if (!selectedRange) { toast.error('Please select dates on the calendar'); return; }
    setBooking(true);
    try {
      await api.post('/bookings', { guideId: id, ...selectedRange });
      toast.success(guide.instantBook ? 'Booking confirmed instantly!' : 'Booking request sent to guide!');
      navigate('/bookings');
    } catch (err) {
      toast.error(err.message);
    } finally { setBooking(false); }
  };

  if (loading) return <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}><GuideCardSkeleton /></div>;
  if (!guide) return <div style={{ textAlign: 'center', padding: 80, color: '#9B9B9B' }}>Guide not found</div>;

  const totalDays = selectedRange
    ? dayjs(selectedRange.endDate).diff(dayjs(selectedRange.startDate), 'day') + 1
    : 0;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 28, alignItems: 'flex-start' }}>

        {/* LEFT: Profile */}
        <aside>
          <div className="card" style={{ padding: 24, textAlign: 'center', position: 'sticky', top: 80 }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, rgba(242,101,34,0.15), rgba(242,101,34,0.35))', border: '2px solid rgba(242,101,34,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#F26522', margin: '0 auto 16px' }}>
              {guide.userId?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4, color: '#1A1A1A' }}>{guide.userId?.name}</h1>
            <div style={{ color: '#9B9B9B', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><MapPin size={16} /> {guide.city}</div>

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
              {guide.certificationStatus === 'approved' && guide.certificationTier &&
                <span className={`badge badge-${guide.certificationTier}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Award size={12} /> {TIER_BADGE[guide.certificationTier]}</span>}
              {guide.isTopRated && <span className="badge badge-indigo" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="currentColor" /> Top Rated</span>}
              {guide.isLocalExpert && <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Home size={12} /> Local Expert</span>}
              {guide.instantBook && <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> Instant Book</span>}
            </div>

            <div className="divider" />

            {/* Rating */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: '#F26522', display: 'flex', alignItems: 'center' }}><Star size={18} fill="currentColor" strokeWidth={0} /></span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1A1A1A' }}>{guide.avgRating?.toFixed(1)}</span>
              <span style={{ color: '#9B9B9B' }}>({guide.totalReviews} reviews)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: '#9B9B9B' }}>Price: </span>
                <span style={{ fontWeight: 700, color: '#1A1A1A' }}>₹{guide.pricePerDay?.toLocaleString()}/day</span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: '#9B9B9B' }}>Tier: </span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#1A1A1A' }}>{guide.pricingType}</span>
              </div>
              {guide.languages?.length > 0 && (
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: '#9B9B9B' }}>Speaks: </span>
                  <span style={{ color: '#1A1A1A' }}>{guide.languages.join(', ')}</span>
                </div>
              )}
            </div>

            {guide.bio && (
              <>
                <div className="divider" />
                <p style={{ fontSize: '0.84rem', color: '#6B6B6B', lineHeight: 1.6, textAlign: 'left' }}>{guide.bio}</p>
              </>
            )}
          </div>
        </aside>

        {/* CENTER: Calendar + Reviews */}
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20, color: '#1A1A1A' }}>Availability</h2>
            <AvailabilityCalendar guideId={guide._id} onRangeSelect={setSelectedRange} />
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1A1A1A' }}>Reviews</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#F26522', display: 'flex', alignItems: 'center' }}><Star size={16} fill="currentColor" strokeWidth={0} /></span>
                <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{guide.avgRating?.toFixed(1)}</span>
              </div>
            </div>
            {reviews.length === 0
              ? <div style={{ color: '#9B9B9B', padding: '20px 0' }}>No reviews yet</div>
              : reviews.map(r => <ReviewCard key={r._id} review={r} />)
            }
            {hasMoreReviews && (
              <button className="btn btn-outline" style={{ marginTop: 16, width: '100%' }} onClick={loadMoreReviews}>Load More Reviews</button>
            )}
          </div>
        </div>

        {/* RIGHT: Booking Panel */}
        <aside>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4, color: '#1A1A1A' }}>Book This Guide</h2>
            <div style={{ color: '#9B9B9B', fontSize: '0.8rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              {guide.instantBook ? <><Zap size={14} /> Instant confirmation</> : <><Mail size={14} /> Guide approves within 24h</>}
            </div>

            {selectedRange ? (
              <>
                <div style={{ padding: '10px 14px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.18)', borderRadius: 10, fontSize: '0.85rem', marginBottom: 4, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> {dayjs(selectedRange.startDate).format('MMM D')} – {dayjs(selectedRange.endDate).format('MMM D, YYYY')}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9B9B9B', marginBottom: 12 }}>
                  {totalDays} day{totalDays !== 1 ? 's' : ''}
                </div>
                <PricingBreakdown guide={guide} totalDays={totalDays} />
              </>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9B9B9B', fontSize: '0.85rem', border: '1px dashed rgba(242,101,34,0.18)', borderRadius: 10, marginBottom: 8 }}>
                Select dates on the calendar to see pricing
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={handleBook}
              disabled={!selectedRange || booking}
            >
              {booking ? 'Booking…' : guide.instantBook ? <><Zap size={16} /> Book Instantly</> : <><Mail size={16} /> Request to Book</>}
            </button>
            {!user && <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#9B9B9B', marginTop: 8 }}>You must be logged in to book</div>}
          </div>
        </aside>

      </div>
    </div>
  );
}
