import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  tagline?: string;
  logoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
  tagline,
  logoUrl: explicitLogoUrl,
}) => {
  const { profile } = useApp();
  const [imageError, setImageError] = useState(false);

  const activeLogoUrl = explicitLogoUrl || profile?.logoUrl;
  const isBdhosttUrl = activeLogoUrl ? activeLogoUrl.toLowerCase().includes('bdhostt') : false;
  const hasValidCustomLogo = Boolean(activeLogoUrl && !isBdhosttUrl && !imageError);

  const iconSize = size === 'sm' ? 28 : size === 'md' ? 38 : size === 'lg' ? 48 : 64;
  const imgHeight = size === 'sm' ? 32 : size === 'md' ? 42 : size === 'lg' ? 56 : 72;
  const dotSize = size === 'sm' ? 3.5 : size === 'md' ? 5 : size === 'lg' ? 6 : 8;
  const centerSize = size === 'sm' ? 7 : size === 'md' ? 10 : size === 'lg' ? 12 : 16;

  // If custom logo image URL is uploaded and loads without error, render the image
  if (hasValidCustomLogo) {
    return (
      <div className={`flex flex-col select-none ${className}`}>
        <div className="flex items-center gap-2">
          <img
            src={activeLogoUrl}
            alt={profile?.name || 'Company Logo'}
            onError={() => setImageError(true)}
            style={{ maxHeight: `${imgHeight}px` }}
            className="w-auto object-contain shrink-0 max-w-[240px]"
          />
        </div>
        {showTagline && (
          <span className="text-[10px] uppercase font-semibold tracking-widest text-amber-600 mt-1">
            {tagline || profile?.tagline || 'YOUR VISION, OUR CREATION!'}
          </span>
        )}
      </div>
    );
  }

  // Default Brand Logo (Vector DotColorCommunication Logo)
  const logoHeight = size === 'sm' ? 'h-6 sm:h-7' : size === 'md' ? 'h-9 sm:h-10' : size === 'lg' ? 'h-12 sm:h-14' : 'h-16 sm:h-20';

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <img
        src="/dotcolor-logo.svg"
        alt="DotColorCommunication Logo"
        className={`${logoHeight} w-auto object-contain shrink-0`}
      />
      {showTagline && (
        <span className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-widest text-orange-600 mt-1 whitespace-nowrap">
          {tagline || profile?.tagline || 'YOUR VISION, OUR CREATION!'}
        </span>
      )}
    </div>
  );
};
