# Ghummoo - Local Guide Booking Platform (Tailwind CSS)

A modern React frontend for the Ghummoo platform built with Tailwind CSS.

## Features

- **Mobile-First Design**: Optimized for mobile with responsive layouts
- **Modern UI**: Clean, flat design with custom color system
- **Three Main Screens**:
  - Home Page with search, featured guides, and bookings
  - Guide Profile with detailed information and booking
  - Admin Dashboard with metrics and management tools

## Tech Stack

- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **Vite** - Fast development server and build tool

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Avatar.jsx       # User avatar with initials
│   ├── StatusBadge.jsx  # Booking status badges
│   ├── CertBadge.jsx    # Certification badge
│   ├── Tag.jsx          # Small pill tags
│   ├── BottomNav.jsx    # Mobile bottom navigation
│   ├── GuideCard.jsx    # Guide listing card
│   ├── BookingItem.jsx  # Booking list item
│   ├── DayCell.jsx      # Calendar day cell
│   ├── ReviewCard.jsx   # Review card component
│   ├── CertItem.jsx     # Certification request item
│   └── MetricCard.jsx   # Admin metric card
├── pages/              # Route-level components
│   ├── HomePage.jsx
│   ├── GuideProfilePage.jsx
│   └── AdminDashboard.jsx
├── App.jsx             # Main app with routing
├── main.jsx            # App entry point
└── index.css           # Tailwind imports and custom styles
```

## Design System

### Colors
- Primary Teal: `#1D9E75`
- Supporting colors for status, badges, and UI elements
- Custom color palette defined in `tailwind.config.js`

### Typography
- Font: Inter (with system-ui fallback)
- Responsive text sizing

### Components
- All components are functional with hooks
- Consistent spacing and border radius
- Flat design with no shadows or gradients

## Routing

- `/` - Home page
- `/guides/:id` - Guide profile page  
- `/admin` - Admin dashboard

## Development

The app uses Vite for fast development with hot reload. All styling uses Tailwind CSS classes with custom color values for brand consistency.

Mobile-first approach with:
- Max width constraints for mobile screens
- Responsive layouts that adapt to larger screens
- Touch-friendly interface elements
