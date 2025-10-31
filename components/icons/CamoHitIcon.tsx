import React from 'react';

const CamoHitIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M2 2l10 10L2 22" />
    <path d="M22 2l-10 10L22 22" />
    <path d="M12 2v20" />
  </svg>
);

export default CamoHitIcon;
