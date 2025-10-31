import React from 'react';

const AsteroidIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.44 3.78a2.5 2.5 0 00-4.88 0 2.5 2.5 0 00-2.34 3.24 2.5 2.5 0 00-1.42 4.23 2.5 2.5 0 00.64 4.54 2.5 2.5 0 002.9 2.58 2.5 2.5 0 003.82.9 2.5 2.5 0 004.54-.64 2.5 2.5 0 002.58-2.9 2.5 2.5 0 00.9-3.82 2.5 2.5 0 00-4.23-1.42 2.5 2.5 0 00-3.24-2.34z" />
    <path d="M8 8a.5.5 0 100-1 .5.5 0 000 1z" />
    <path d="M16 14a1 1 0 100-2 1 1 0 000 2z" />
    <path d="M12.5 17.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
  </svg>
);

export default AsteroidIcon;
