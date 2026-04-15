import React from 'react';

function DayCell({ dayName, dayNum, state }) {
  const stateStyles = {
    'available': 'bg-[#E1F5EE] text-[#0F6E56]',
    'selected': 'bg-[#1D9E75] text-white',
    'unavailable': 'bg-gray-100 text-gray-400'
  };

  return (
    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-medium ${stateStyles[state] || stateStyles['unavailable']}`}>
      <div>{dayName}</div>
      <div className="text-sm">{dayNum}</div>
    </div>
  );
}

export default DayCell;
