import React from 'react';
import Tag from './Tag';

function GuideCard({ emoji, heroBg, name, location, tags, rating, price }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 transition-all hover:border-gray-300">
      <div className="h-20 flex items-center justify-center text-3xl" style={{ backgroundColor: heroBg }}>
        {emoji}
      </div>
      <div className="p-2.5">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5 mb-1.5">📍 {location}</div>
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag, index) => (
            <Tag key={index} label={tag} />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-amber-600">{rating}</span>
          <span className="text-sm font-medium text-[#1D9E75]">{price}</span>
        </div>
      </div>
    </div>
  );
}

export default GuideCard;
