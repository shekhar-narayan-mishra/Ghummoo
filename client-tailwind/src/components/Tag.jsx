import React from 'react';

function Tag({ label }) {
  return (
    <span className="bg-[#E1F5EE] text-[#0F6E56] rounded-full text-xs px-2 py-0.5 font-medium">
      {label}
    </span>
  );
}

export default Tag;
