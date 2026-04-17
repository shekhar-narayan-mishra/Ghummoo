import { useState } from 'react';
import { Star } from 'lucide-react';

function StarRating({ rating, onRate, size = 24 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || rating;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{ cursor: onRate ? 'pointer' : 'default', color: n <= display ? '#F26522' : '#ddd', transition: 'color 0.1s', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => onRate && setHovered(n)}
          onMouseLeave={() => onRate && setHovered(0)}
          onClick={() => onRate?.(n)}
        ><Star size={size} fill={n <= display ? 'currentColor' : 'none'} /></span>
      ))}
    </div>
  );
}

export function ReviewCard({ review }) {
  const name = review.travelerId?.name || 'Traveler';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid rgba(242,101,34,0.10)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(242,101,34,0.15), rgba(242,101,34,0.35))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.8rem', color: '#F26522'
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{name}</span>
            <span style={{ color: '#9B9B9B', fontSize: '0.78rem' }}>{date}</span>
          </div>
          <StarRating rating={review.rating} size={16} />
          {review.comment && <p style={{ marginTop: 6, color: '#6B6B6B', fontSize: '0.9rem', lineHeight: 1.55 }}>{review.comment}</p>}
        </div>
      </div>
    </div>
  );
}

export function ReviewForm({ onSubmit, loading }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) return alert('Please select a rating');
    onSubmit({ rating, comment });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
      <div className="form-group">
        <label className="form-label">Your Rating</label>
        <StarRating rating={rating} onRate={setRating} size={32} />
      </div>
      <div className="form-group">
        <label className="form-label">Your Review</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Share your experience..." />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading || !rating}>
        {loading ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}

export { StarRating };
