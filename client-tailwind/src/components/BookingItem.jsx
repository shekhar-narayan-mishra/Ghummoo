import React from 'react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';

function BookingItem({ initials, avatarBg, avatarColor, name, detail, status }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar 
        initials={initials} 
        bg={avatarBg} 
        color={avatarColor} 
        size={38} 
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{detail}</div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

export default BookingItem;
