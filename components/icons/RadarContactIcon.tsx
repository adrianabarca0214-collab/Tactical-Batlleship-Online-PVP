
import React from 'react';

// FIX: Added style prop to allow for inline styling, e.g., for animation delays.
const RadarContactIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="2"></circle>
    <path d="M16.2 7.8a6 6 0 0 1 0 8.4"></path>
    <path d="M19.8 4.2a10 10 0 0 1 0 15.6"></path>
  </svg>
);

export default RadarContactIcon;
