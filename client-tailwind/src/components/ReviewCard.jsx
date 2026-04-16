import React from 'react';
import Avatar from './Avatar';

function ReviewCard({ initials, avatarBg, avatarColor, name, rating, text }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar 
          initials={initials} 
          bg={avatarBg} 
          color={avatarColor} 
          size={28} 
        />
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-amber-600 ml-auto">{rating}</span>
      </div>
      <div className="text-sm text-gray-500 leading-relaxed">{text}</div>
    </div>
  );
}

export default ReviewCard;
