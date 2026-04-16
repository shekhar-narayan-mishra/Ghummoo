import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import api from '../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityCalendar({ guideId, onRangeSelect, editable = false, onSlotsChange }) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [slots, setSlots] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guideId) return;
    setLoading(true);
    api.get(`/availability/${guideId}?month=${currentMonth.format('YYYY-MM')}`)
      .then(res => { setSlots(res.data || []); })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [guideId, currentMonth]);

  const slotMap = {};
  slots.forEach(s => { slotMap[dayjs(s.date).format('YYYY-MM-DD')] = s; });

  const startOfMonth = currentMonth.startOf('month');
  const daysInMonth = currentMonth.daysInMonth();
  const startDayOfWeek = startOfMonth.day();
  const today = dayjs().format('YYYY-MM-DD');

  const getDayStatus = (dateStr) => {
    if (dateStr < today) return 'past';
    if (!slotMap[dateStr]) return 'unavailable';
    return slotMap[dateStr].isBooked ? 'booked' : 'available';
  };

  const isSelected = (dateStr) => {
    if (!rangeStart) return selectedDates.includes(dateStr);
    if (rangeEnd) {
      const s = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const e = rangeStart < rangeEnd ? rangeEnd : rangeStart;
      return dateStr >= s && dateStr <= e;
    }
    return dateStr === rangeStart;
  };

  const handleDayClick = (dateStr) => {
    const status = getDayStatus(dateStr);
    if (status === 'past' || status === 'booked' || status === 'unavailable') return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd(null);
    } else {
      const start = rangeStart < dateStr ? rangeStart : dateStr;
      const end = rangeStart < dateStr ? dateStr : rangeStart;
      setRangeStart(start);
      setRangeEnd(end);
      if (onRangeSelect) onRangeSelect({ startDate: start, endDate: end });
    }
  };

  const handleEditorToggle = async (dateStr) => {
    const slot = slotMap[dateStr];
    if (slot?.isBooked) return;
    try {
      if (slot) {
        await api.delete(`/availability/${guideId}/slots/${dateStr}`);
      } else {
        await api.post(`/availability/${guideId}/slots`, { dates: [dateStr] });
      }
      const res = await api.get(`/availability/${guideId}?month=${currentMonth.format('YYYY-MM')}`);
      setSlots(res.data || []);
      onSlotsChange?.();
    } catch (err) { alert(err.message); }
  };

  const getDayStyle = (dateStr, status) => {
    const base = {
      width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '0.82rem', fontWeight: 600,
      cursor: 'default', transition: 'all 0.15s', userSelect: 'none', position: 'relative'
    };
    if (status === 'past') return { ...base, color: '#374151' };
    if (status === 'booked') return { ...base, background: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    if (status === 'unavailable') return editable
      ? { ...base, color: '#6b7280', cursor: 'pointer', '&:hover': { background: 'rgba(255,255,255,0.05)' } }
      : { ...base, color: '#4b5563' };
    if (isSelected(dateStr)) return {
      ...base, background: 'rgba(99,102,241,0.3)', color: '#818cf8',
      border: '1px solid #6366f1', cursor: 'pointer'
    };
    return {
      ...base, background: 'rgba(16,185,129,0.12)', color: '#10b981',
      cursor: editable ? 'pointer' : 'pointer', border: '1px solid transparent'
    };
  };

  const totalDays = rangeStart && rangeEnd ? dayjs(rangeEnd).diff(dayjs(rangeStart), 'day') + 1 : 0;

  return (
    <div>
      {/* Month Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}>←</button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{currentMonth.format('MMMM YYYY')}</span>
        <button className="btn btn-outline btn-sm" onClick={() => setCurrentMonth(m => m.add(1, 'month'))}>→</button>
      </div>

      {/* Day Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {/* Empty cells for alignment */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dateStr = currentMonth.date(i + 1).format('YYYY-MM-DD');
            const status = getDayStatus(dateStr);
            return (
              <div
                key={dateStr}
                style={getDayStyle(dateStr, status)}
                onClick={() => editable ? handleEditorToggle(dateStr) : handleDayClick(dateStr)}
                title={status === 'booked' ? 'Already booked' : status === 'unavailable' ? 'Not available' : dateStr}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { color: '#10b981', label: 'Available' },
          { color: '#ef4444', label: 'Booked' },
          { color: '#6366f1', label: 'Selected' },
          { color: '#374151', label: 'Unavailable/Past' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      {rangeStart && rangeEnd && !editable && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(99,102,241,0.1)', borderRadius: 10, border: '1px solid #6366f133' }}>
          <div style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 600 }}>
            Selected: {dayjs(rangeStart).format('MMM D')} – {dayjs(rangeEnd).format('MMM D, YYYY')} · {totalDays} day{totalDays !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
