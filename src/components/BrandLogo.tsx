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

  const isLegacyCommunicationImage = Boolean(
    activeLogoUrl &&
    typeof activeLogoUrl === 'string' &&
    (activeLogoUrl.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALL') ||
     activeLogoUrl.includes('ALLCAYAAACHp'))
  );

  const hasValidCustomLogo = Boolean(
    activeLogoUrl &&
    !imageError &&
    activeLogoUrl.trim() !== '' &&
    activeLogoUrl !== '/dotcolor-logo.svg' &&
    activeLogoUrl !== '/dotcolor-official-logo.png' &&
    !isLegacyCommunicationImage
  );
  const imgHeight =
    size === 'sm' ? 32 : size === 'md' ? 42 : size === 'lg' ? 56 : 72;

  const defaultTaglineClass =
    'text-[10px] sm:text-[11px] uppercase font-black tracking-widest text-black mt-1 whitespace-nowrap';

  const isRightAligned = className.includes('items-end') || className.includes('text-right');

  const effectiveTagline = tagline !== undefined ? tagline : profile?.tagline;
  const shouldRenderTagline = showTagline && Boolean(effectiveTagline && effectiveTagline.trim() !== '');

  // If custom logo image URL is uploaded and loads without error, render the image
  if (hasValidCustomLogo) {
    return (
      <div className={`flex flex-col select-none ${className}`}>
        <div className={`flex items-center gap-2 ${isRightAligned ? 'justify-end' : ''}`}>
          <img
            src={activeLogoUrl}
            alt={profile?.name || 'Dot Color'}
            onError={() => setImageError(true)}
            style={{ maxHeight: `${imgHeight}px` }}
            className={`w-auto object-contain shrink-0 ${
              size === 'xl' ? 'max-w-[320px]' : 'max-w-[240px]'
            }`}
          />
        </div>
        {shouldRenderTagline && (
          <span className={taglineClassName || defaultTaglineClass}>
            {effectiveTagline}
          </span>
        )}
      </div>
    );
  }

  // Default Brand Logo (Vector Dot Color Logo)
  const logoHeight =
    size === 'sm'
      ? 'h-7 sm:h-8'
      : size === 'md'
      ? 'h-10 sm:h-11'
      : size === 'lg'
      ? 'h-14 sm:h-15'
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
      <div className={`flex items-center gap-2 ${isRightAligned ? 'justify-end' : ''}`}>
        <img
          src="/dotcolor-official-logo.png"
          alt={profile?.name || 'Dot Color Logo'}
          className={`${logoHeight} w-auto object-contain shrink-0`}
        />
      </div>
      {shouldRenderTagline && (
        <span className={taglineClassName || defaultTaglineClass}>
          {effectiveTagline}
        </span>
      )}
    </div>
  );
};
