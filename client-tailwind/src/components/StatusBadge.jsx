import React from 'react';

function StatusBadge({ status }) {
  const statusStyles = {
    'Confirmed': 'bg-[#EAF3DE] text-[#3B6D11]',
    'Pending': 'bg-[#FAEEDA] text-[#633806]',
    'Completed': 'bg-[#EAF3DE] text-[#3B6D11]',
    'Cancelled': 'bg-[#FCEBEB] text-[#A32D2D]'
  };

  return (
    <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${statusStyles[status] || statusStyles['Pending']}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
