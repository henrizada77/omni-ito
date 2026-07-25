import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", size }) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      style={style}
    >
      <defs>
        <linearGradient id="omniItoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      
      {/* Outer infinity loop */}
      <path
        d="M30,10 C18.954,10 10,18.954 10,30 C10,41.046 18.954,50 30,50 C40,50 47.5,41.5 50,30 C52.5,18.5 60,10 70,10 C81.046,10 90,18.954 90,30 C90,41.046 81.046,50 70,50 C60,50 52.5,41.5 50,30 C47.5,18.5 40,10 30,10 Z"
        stroke="url(#omniItoGradient)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner concentric loop */}
      <path
        d="M30,20 C24.477,20 20,24.477 20,30 C20,35.523 24.477,40 30,40 C36,40 42,34 45,30 C42,26 36,20 30,20 Z"
        stroke="url(#omniItoGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M70,20 C75.523,20 80,24.477 80,30 C80,35.523 75.523,40 70,40 C64,40 58,34 55,30 C58,26 64,20 70,20 Z"
        stroke="url(#omniItoGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Logo;
