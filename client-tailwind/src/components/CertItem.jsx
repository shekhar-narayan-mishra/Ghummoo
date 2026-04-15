import React from 'react';
import Avatar from './Avatar';

function CertItem({ initials, avatarBg, avatarColor, name, meta }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar 
        initials={initials} 
        bg={avatarBg} 
        color={avatarColor} 
        size={36} 
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{meta}</div>
      </div>
      <div className="flex gap-2">
        <button className="bg-[#E1F5EE] text-[#0F6E56] border border-[#9FE1CB] rounded-md text-xs px-3 py-1 font-medium">
          Approve
        </button>
        <button className="bg-white text-gray-400 border border-gray-200 rounded-md text-xs px-3 py-1 font-medium">
          Reject
        </button>
      </div>
    </div>
  );
}

export default CertItem;
