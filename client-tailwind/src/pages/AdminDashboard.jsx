import React from 'react';
import MetricCard from '../components/MetricCard';
import CertItem from '../components/CertItem';
import StatusBadge from '../components/StatusBadge';

function AdminDashboard() {
  const metrics = [
    { label: "Total guides", value: "241", valueColor: "#1D9E75" },
    { label: "Pending certs", value: "7", valueColor: "#BA7517" },
    { label: "Bookings today", value: "34", valueColor: "#534AB7" },
    { label: "Total travelers", value: "1,402", valueColor: "inherit" }
  ];

  const certRequests = [
    { 
      initials: "NK", 
      bg: "#E1F5EE", 
      color: "#0F6E56",
      name: "Nikhil Kapoor",  
      meta: "Goa · Applied Apr 17 · 5 yrs experience" 
    },
    { 
      initials: "DT", 
      bg: "#EEEDFE", 
      color: "#3C3489",
      name: "Divya Tripathi", 
      meta: "Varanasi · Applied Apr 16 · 3 yrs experience" 
    },
    { 
      initials: "RB", 
      bg: "#FAEEDA", 
      color: "#633806",
      name: "Rohan Bose",     
      meta: "Kolkata · Applied Apr 15 · 7 yrs experience" 
    }
  ];

  const bookingActivity = [
    { 
      traveler: "Sanya Patel", 
      guide: "Arjun Sharma", 
      dest: "Jaipur", 
      date: "Apr 22", 
      status: "Confirmed" 
    },
    { 
      traveler: "Tom Fischer",  
      guide: "Priya Mehta", 
      dest: "Manali", 
      date: "Apr 28", 
      status: "Pending" 
    },
    { 
      traveler: "Anika Roy",    
      guide: "Rafi Khan", 
      dest: "Agra", 
      date: "Apr 20", 
      status: "Completed" 
    },
    { 
      traveler: "James Lee",   
      guide: "Divya T.", 
      dest: "Varanasi", 
      date: "Apr 19", 
      status: "Cancelled" 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto p-5">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-lg font-medium">Admin dashboard</h1>
        <span className="bg-[#EEEDFE] text-[#3C3489] rounded-full text-xs px-3 py-1 font-medium">
          Admin
        </span>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* CERTIFICATION QUEUE */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium">Certification requests</h2>
          <span className="text-xs text-gray-400">7 pending review</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          {certRequests.map((request, index) => (
            <CertItem key={index} {...request} />
          ))}
        </div>
      </div>

      {/* BOOKING MONITOR TABLE */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium">Booking activity</h2>
          <span className="text-xs text-gray-400">Last 24 hours</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-400">Traveler</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-400">Guide</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-400">Destination</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-400">Date</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookingActivity.map((booking, index) => (
                <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{booking.traveler}</td>
                  <td className="px-4 py-3 text-sm">{booking.guide}</td>
                  <td className="px-4 py-3 text-sm">{booking.dest}</td>
                  <td className="px-4 py-3 text-sm">{booking.date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
