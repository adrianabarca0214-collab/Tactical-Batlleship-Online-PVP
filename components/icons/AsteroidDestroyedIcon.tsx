
import React from 'react';

const AsteroidDestroyedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.19 2.51a1.5 1.5 0 011.62 0L21 6.11a1.5 1.5 0 010 2.78l-8.19 3.6-2.61-3.21" />
    <path d="M10.02 14.78L2.2 11.2a1.5 1.5 0 00-1.7 2.32l6.3 8.35a1.5 1.5 0 002.32-1.7z" />
    <path d="M12.5 14.5L18 20l-3.21-2.61" />
  </svg>
);

export default AsteroidDestroyedIcon;