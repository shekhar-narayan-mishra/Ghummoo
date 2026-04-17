import dayjs from 'dayjs';
import { MapPin, Calendar, CalendarDays, Zap, Mail } from 'lucide-react';
import StatusPill from './StatusPill';

export default function BookingCard({ booking, onCancel, onReview, onConfirm, onReject, isGuide }) {
  const guide = booking.guideId;
  const traveler = booking.travelerId;
  const guideName = guide?.userId?.name || guide?.name || 'Guide';
  const travelerName = traveler?.name || 'Traveler';
  const guideCity = guide?.city || '';
  const avatar = isGuide ? travelerName : guideName;
  const initials = avatar.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(242,101,34,0.15), rgba(242,101,34,0.35))',
        border: '2px solid rgba(242,101,34,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, color: '#F26522', fontSize: '0.95rem'
      }}>{initials}</div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{isGuide ? travelerName : guideName}</div>
            {!isGuide && <div style={{ color: '#9B9B9B', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {guideCity}</div>}
          </div>
          <StatusPill status={booking.status} />
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.82rem', color: '#6B6B6B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> {dayjs(booking.startDate).format('MMM D')} – {dayjs(booking.endDate).format('MMM D, YYYY')}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6B6B6B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={14} /> {booking.totalDays} day{booking.totalDays !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A1A1A' }}>
            ₹{booking.totalAmount?.toLocaleString()}
          </div>
        </div>

        {booking.bookingMode && (
          <div style={{ fontSize: '0.75rem', color: '#9B9B9B', marginTop: 4 }}>
            {booking.bookingMode === 'instant' 
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> Instant Book</span> 
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> Request to Book</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {/* Guide view: confirm/reject pending requests */}
          {isGuide && booking.status === 'pending' && booking.bookingMode === 'request' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => onConfirm?.(booking._id)}>Confirm</button>
              <button className="btn btn-danger btn-sm" onClick={() => onReject?.(booking._id)}>Reject</button>
            </>
          )}
          {/* Traveler view: cancel */}
          {!isGuide && (booking.status === 'pending' || booking.status === 'confirmed') && (
            <button className="btn btn-danger btn-sm" onClick={() => onCancel?.(booking._id)}>Cancel</button>
          )}
          {/* Leave Review */}
          {!isGuide && booking.status === 'completed' && (
            <button className="btn btn-primary btn-sm" onClick={() => onReview?.(booking)}>
              Leave Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
