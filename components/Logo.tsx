
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
  width?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-12", showText = true, variant = 'dark', width }) => {
  const mainColor = variant === 'light' ? '#FFFFFF' : '#004282';
  const accentColor = '#74C044';
  const textColor = variant === 'light' ? '#FFFFFF' : '#0F172A';
  const subTextColor = variant === 'light' ? 'rgba(255,255,255,0.6)' : '#64748B';

  return (
    <div className={`flex items-center justify-start ${className}`} style={width ? { width, minWidth: width } : {}}>
      <svg 
        viewBox={showText ? "0 0 500 120" : "0 0 120 120"} 
        className="w-full h-full" 
        preserveAspectRatio="xMinYMid meet"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(10, 10)">
          <path d="M45 5L70 20V50L45 65L20 50V20L45 5Z" fill={mainColor} fillOpacity="0.15" stroke={mainColor} strokeWidth="4" strokeLinejoin="round"/>
          <path d="M22 45L47 60V90L22 105L-3 90V60L22 45Z" fill={mainColor} fillOpacity="0.1" stroke={mainColor} strokeWidth="4" strokeLinejoin="round"/>
          <path d="M68 45L93 60V90L68 105L43 90V60L68 45Z" fill={mainColor} fillOpacity="0.1" stroke={mainColor} strokeWidth="4" strokeLinejoin="round"/>
          <path d="M25 55L45 72L65 55" stroke={accentColor} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        </g>

        {showText && (
          <g transform="translate(120, 15)">
            <text y="48" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="54" fill={textColor} letterSpacing="-1.5">
              Metrolab<tspan fill={accentColor}>`s</tspan>
            </text>
            <text y="82" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="17" fill={subTextColor} letterSpacing="0.5" style={{ textTransform: 'uppercase' }}>
              Engenharia Clínica & Hospitalar
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default Logo;
