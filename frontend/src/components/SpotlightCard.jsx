import React, { useRef, useState } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';

const SpotlightCard = ({ children, className = '', style = {}, onClick }) => {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const { themeColor } = usePortfolioContext();

  const handleMouseMove = (e) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`glass-panel spotlight-card ${className}`}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Spotlight */}
      <div
        className="pointer-events-none spotlight-layer"
        style={{
          position: 'absolute',
          inset: 0,
          opacity,
          transition: 'opacity 0.3s ease',
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${themeColor}1A, transparent 40%)`,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* Glow Border Mask */}
      <div 
        className="pointer-events-none spotlight-border"
        style={{
           position: 'absolute',
           inset: 0,
           opacity,
           transition: 'opacity 0.3s ease',
           maskImage: `radial-gradient(300px circle at ${position.x}px ${position.y}px, black, transparent 100%)`,
           WebkitMaskImage: `radial-gradient(300px circle at ${position.x}px ${position.y}px, black, transparent 100%)`,
           pointerEvents: 'none',
           zIndex: 1,
           padding: '2px', // The thickness of the glowing border
           boxSizing: 'border-box'
        }}
      >
        <div style={{ width: '100%', height: '100%', border: `1px solid ${themeColor}`, borderRadius: '16px' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default SpotlightCard;
