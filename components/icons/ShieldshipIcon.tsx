
import React from 'react';

const ShieldshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 2l-2.24 4.34 2.24 1.43 2.24-1.43L12 2z" />
    <path d="M12 11.5l-3.24 2.08 3.24 2.08 3.24-2.08L12 11.5z" />
  </svg>
);

export default ShieldshipIcon;
