import React from 'react';

const SkeletonLoader = ({ className = '', style = {} }) => {
  return (
    <div 
      className={`skeleton-loader ${className}`} 
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <div className="skeleton-shimmer"></div>
    </div>
  );
};

export default SkeletonLoader;
