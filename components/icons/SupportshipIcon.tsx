import React from 'react';

const SupportshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
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
    <path d="M12 2L4 5v6c0 5.55 3.58 10.42 8 11.92 4.42-1.5 8-6.37 8-11.92V5l-8-3z" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

export default SupportshipIcon;