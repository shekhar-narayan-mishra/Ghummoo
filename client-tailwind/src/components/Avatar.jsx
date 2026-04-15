import React from 'react';

function Avatar({ initials, bg = '#E1F5EE', color = '#0F6E56', size = 40 }) {
  const sizeClasses = {
    28: 'w-7 h-7 text-xs',
    36: 'w-9 h-9 text-sm',
    38: 'w-9 h-9 text-sm',
    40: 'w-10 h-10 text-sm',
    64: 'w-16 h-16 text-lg'
  };

  return (
    <div 
      className={`${sizeClasses[size] || sizeClasses[40]} rounded-full flex items-center justify-center font-medium`}
      style={{ backgroundColor: bg, color }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
