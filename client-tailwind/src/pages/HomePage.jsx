import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GuideCard from '../components/GuideCard';
import BookingItem from '../components/BookingItem';
import BottomNav from '../components/BottomNav';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');

  const featuredGuides = [
    { 
      emoji: "🧭", 
      heroBg: "#E1F5EE", 
      name: "Arjun S.", 
      location: "Jaipur", 
      tags: ["Heritage", "Food"], 
      rating: "★ 4.9", 
      price: "₹800/hr" 
    },
    { 
      emoji: "🏔️", 
      heroBg: "#EEEDFE", 
      name: "Priya M.", 
      location: "Manali", 
      tags: ["Trekking"], 
      rating: "★ 4.8", 
      price: "₹1200/hr" 
    },
    { 
      emoji: "🕌", 
      heroBg: "#FAEEDA", 
      name: "Rafi K.", 
      location: "Agra", 
      tags: ["History"], 
      rating: "★ 5.0", 
      price: "₹950/hr" 
    }
  ];

  const bookings = [
    { 
      initials: "AS", 
      bg: "#E1F5EE", 
      color: "#0F6E56",
      name: "Arjun Sharma",  
      detail: "Jaipur Heritage Walk · Apr 22", 
      status: "Confirmed" 
    },
    { 
      initials: "PM", 
      bg: "#EEEDFE", 
      color: "#3C3489",
      name: "Priya Mehta",   
      detail: "Manali Trek · Apr 28", 
      status: "Pending" 
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-sm mx-auto">
      {/* NAVBAR */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <div className="text-[#1D9E75] text-lg font-medium">ghummoo</div>
        <div className="flex gap-2">
          <button className="text-sm px-3 py-1.5 text-gray-600 border border-gray-300 rounded-md">
            Log in
          </button>
          <button className="text-sm px-3 py-1.5 bg-[#1D9E75] text-white rounded-md font-medium">
            Sign up
          </button>
        </div>
      </div>

      {/* HERO */}
      <div className="px-4 py-8">
        <h1 className="text-2xl font-medium text-center mb-3">
          Find your perfect <span className="text-[#1D9E75]">local guide</span>
        </h1>
        <p className="text-sm text-gray-500 text-center max-w-xs mx-auto mb-6">
          Book certified guides for authentic travel experiences across India and beyond.
        </p>
        
        {/* SEARCH BAR */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Where to? (e.g. Varanasi)"
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All</option>
            <option>Heritage</option>
            <option>Nature</option>
            <option>Trekking</option>
            <option>Food</option>
            <option>History</option>
          </select>
          <button className="px-4 py-2 bg-[#1D9E75] text-white rounded-md text-sm font-medium">
            Search
          </button>
        </div>

        {/* STATS */}
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-xl font-medium text-[#1D9E75]">240+</div>
            <div className="text-xs text-gray-500 mt-1">Certified guides</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-medium text-[#1D9E75]">80+</div>
            <div className="text-xs text-gray-500 mt-1">Destinations</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-medium text-[#1D9E75]">4.8★</div>
            <div className="text-xs text-gray-500 mt-1">Avg rating</div>
          </div>
        </div>
      </div>

      {/* FEATURED GUIDES */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium">Featured guides</h2>
          <Link to="/guides" className="text-[#1D9E75] text-sm">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {featuredGuides.map((guide, index) => (
            <GuideCard key={index} {...guide} />
          ))}
        </div>
      </div>

      {/* YOUR BOOKINGS */}
      <div className="bg-[#f9fafb] px-6 py-4">
        <h2 className="text-base font-medium mb-3">Your bookings</h2>
        <div className="space-y-3">
          {bookings.map((booking, index) => (
            <BookingItem key={index} {...booking} />
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <BottomNav active="home" />
    </div>
  );
}

export default HomePage;
