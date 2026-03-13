
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = "h-12", showText = true, variant = 'dark' }) => {
  const mainColor = variant === 'light' ? '#FFFFFF' : '#004282';
  const accentColor = '#74C044';
  const textColor = variant === 'light' ? '#FFFFFF' : '#0F172A';
  const subTextColor = variant === 'light' ? 'rgba(255,255,255,0.6)' : '#64748B';

  return (
    <div className={`flex items-center justify-start ${className}`}>
      <svg 
        viewBox="0 0 450 120" 
        className="w-full h-full" 
        preserveAspectRatio="xMinYMid meet"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(10, 5)">
          <path d="M45 5L70 20V50L45 65L20 50V20L45 5Z" stroke={mainColor} strokeWidth="5" strokeLinejoin="round"/>
          <path d="M22 45L47 60V90L22 105L-3 90V60L22 45Z" stroke={mainColor} strokeWidth="5" strokeLinejoin="round"/>
          <path d="M68 45L93 60V90L68 105L43 90V60L68 45Z" stroke={mainColor} strokeWidth="5" strokeLinejoin="round"/>
          <path d="M25 55L45 72L65 55" stroke={accentColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        </g>

        {showText && (
          <g transform="translate(125, 12)">
            <text y="52" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="58" fill={textColor} letterSpacing="-2.5">
              Metrolab<tspan fill={accentColor}>`s</tspan>
            </text>
            <text y="88" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="17" fill={subTextColor} letterSpacing="1.2" style={{ textTransform: 'uppercase' }}>
              Engenharia Clínica & Hospitalar
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default Logo;
