import React from 'react';

const CamoshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
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
    <path d="M16 12l-4-4-4 4M12 20V10" />
    <path d="M21 12c-1.88 4.5-5.22 7.79-9 8-3.78-.21-7.12-3.5-9-8 .9-2.12 2.4-4 4.33-5.5" />
    <path d="M2.5 12a1 1 0 0 0-1 1" />
  </svg>
);

export default CamoshipIcon;
