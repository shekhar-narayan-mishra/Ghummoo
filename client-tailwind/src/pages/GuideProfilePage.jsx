import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import CertBadge from '../components/CertBadge';
import Tag from '../components/Tag';
import DayCell from '../components/DayCell';
import ReviewCard from '../components/ReviewCard';

function GuideProfilePage() {
  const specializations = [
    "Heritage & culture", "Food tours", "Photography spots", "Local markets"
  ];

  const availabilityDays = [
    { dayName: "Mon", dayNum: 20, state: "unavailable" },
    { dayName: "Tue", dayNum: 21, state: "available" },
    { dayName: "Wed", dayNum: 22, state: "selected" },
    { dayName: "Thu", dayNum: 23, state: "available" },
    { dayName: "Fri", dayNum: 24, state: "unavailable" },
    { dayName: "Sat", dayNum: 25, state: "available" },
    { dayName: "Sun", dayNum: 26, state: "available" },
    { dayName: "Mon", dayNum: 27, state: "unavailable" },
    { dayName: "Tue", dayNum: 28, state: "available" },
    { dayName: "Wed", dayNum: 29, state: "available" }
  ];

  const reviews = [
    { 
      initials: "RP", 
      bg: "#EEEDFE", 
      color: "#3C3489",
      name: "Rohan P.", 
      rating: "★★★★★ 5.0",
      text: "Arjun made Jaipur come alive for us. His knowledge of Rajput history is unmatched. Highly recommend the sunrise fort walk!" 
    },
    { 
      initials: "SG", 
      bg: "#FAEEDA", 
      color: "#633806",
      name: "Sara G.", 
      rating: "★★★★★ 4.8",
      text: "Best food tour I've had anywhere in the world. He took us to places no tourist guide book would ever mention." 
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-sm mx-auto pb-20">
      {/* TOP BAR */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <Link to="/" className="text-[#1D9E75] text-sm">
          ← Back
        </Link>
        <div className="text-base font-medium">Guide profile</div>
        <div className="text-xl">♡</div>
      </div>

      {/* HERO */}
      <div className="bg-[#E1F5EE] p-5">
        <div className="flex gap-4 items-start">
          <Avatar 
            initials="AS" 
            bg="#1D9E75" 
            color="white" 
            size={64} 
          />
          <div className="flex-1">
            <div className="text-lg font-medium">Arjun Sharma</div>
            <div className="text-sm text-teal-800 mt-0.5 mb-1.5">📍 Jaipur, Rajasthan</div>
            <CertBadge className="mb-2" />
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">4.9</span>
              <span className="text-amber-600">★★★★★</span>
              <span className="text-sm text-teal-800">· 143 reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <div className="bg-white border-b border-gray-100 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">ABOUT</div>
        <div className="text-sm text-gray-500 leading-relaxed">
          Born and raised in Jaipur, I specialize in heritage walks, Rajasthani cuisine tours, and cultural immersions. 8+ years of guiding experience with travelers from 40+ countries.
        </div>
      </div>

      {/* SPECIALIZATIONS */}
      <div className="bg-white border-b border-gray-100 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">SPECIALIZATIONS</div>
        <div className="flex flex-wrap gap-1.5">
          {specializations.map((spec, index) => (
            <Tag key={index} label={spec} className="text-xs px-3 py-1" />
          ))}
        </div>
      </div>

      {/* AVAILABILITY */}
      <div className="bg-white border-b border-gray-100 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">AVAILABILITY — APRIL 2026</div>
        <div className="grid grid-cols-5 gap-1.5 mb-2">
          {availabilityDays.map((day, index) => (
            <DayCell key={index} {...day} />
          ))}
        </div>
        <div className="flex gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#E1F5EE]"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#1D9E75]"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100"></div>
            <span>Unavailable</span>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <div className="bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 mb-3">RECENT REVIEWS</div>
        {reviews.map((review, index) => (
          <ReviewCard key={index} {...review} />
        ))}
      </div>

      {/* BOOKING PANEL */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium text-[#1D9E75]">₹800</span>
              <span className="text-xs text-gray-500">/ hour</span>
            </div>
            <div className="text-xs text-teal mt-0.5">Apr 22 selected</div>
          </div>
          <button className="bg-[#1D9E75] text-white px-7 py-2.5 rounded-lg text-base font-medium">
            Book now
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuideProfilePage;
