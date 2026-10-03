import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  tagline?: string;
  taglineClassName?: string;
  logoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
  tagline,
  taglineClassName,
  logoUrl: explicitLogoUrl,
}) => {
  const { profile } = useApp();
  const [imageError, setImageError] = useState(false);

  const activeLogoUrl = explicitLogoUrl || profile?.logoUrl;

  useEffect(() => {
    setImageError(false);
  }, [activeLogoUrl]);

  const hasValidCustomLogo = Boolean(activeLogoUrl && !imageError);
  const imgHeight = size === 'sm' ? 32 : size === 'md' ? 42 : size === 'lg' ? 56 : 72;

  const defaultTaglineClass =
    'text-[10px] sm:text-[11px] uppercase font-black tracking-widest text-black mt-1 whitespace-nowrap';

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
          <span className={taglineClassName || defaultTaglineClass}>
            {tagline || profile?.tagline || 'YOUR VISION, OUR CREATION!'}
          </span>
        )}
      </div>
    );
  }

  // Default Brand Logo (Vector DotColorCommunication Logo)
  const logoHeight =
    size === 'sm'
      ? 'h-6 sm:h-7'
      : size === 'md'
      ? 'h-9 sm:h-10'
      : size === 'lg'
      ? 'h-12 sm:h-14'
      : 'h-16 sm:h-20';

  const hasAlignment =
    className.includes('items-start') ||
    className.includes('items-end') ||
    className.includes('items-center');

  return (
    <div
      className={`flex flex-col ${
        hasAlignment ? '' : 'items-center justify-center text-center'
      } select-none ${className}`}
    >
      <img
        src="/dotcolor-logo.svg"
        alt="DotColorCommunication Logo"
        className={`${logoHeight} w-auto object-contain shrink-0`}
      />
      {showTagline && (
        <span className={taglineClassName || defaultTaglineClass}>
          {tagline || profile?.tagline || 'YOUR VISION, OUR CREATION!'}
        </span>
      )}
    </div>
  );
};
