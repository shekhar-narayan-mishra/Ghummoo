import React from 'react';

function MetricCard({ label, value, valueColor = 'inherit' }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-medium" style={{ color: valueColor }}>{value}</div>
    </div>
  );
}

export default MetricCard;
