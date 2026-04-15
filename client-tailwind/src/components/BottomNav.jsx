import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function BottomNav({ active }) {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home', path: '/' },
    { id: 'explore', icon: '🔍', label: 'Explore', path: '/guides' },
    { id: 'bookings', icon: '📅', label: 'Bookings', path: '/bookings' },
    { id: 'profile', icon: '👤', label: 'Profile', path: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around items-center">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
              active === tab.id 
                ? 'text-[#1D9E75]' 
                : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default BottomNav;
