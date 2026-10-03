import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../context/AppContext';

export interface DocumentHeaderProps {
  documentTitle: string;
  documentSubtitle?: string;
  documentNo?: string;
  documentDate?: string;
  referenceNo?: string;
  compact?: boolean; // For 80mm POS slips
  className?: string;
  isPadMode?: boolean;
  padTopMarginMm?: number;
  invoiceId?: string;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  documentTitle,
  documentSubtitle,
  documentNo,
  compact = false,
  className = '',
  isPadMode = false,
  padTopMarginMm = 42,
  invoiceId,
}) => {
  const { profile } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate high-resolution scannable QR Code pointing to the invoice URL so scanning opens the invoice
  useEffect(() => {
    const origin =
      typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'https://dotcolor.onrender.com';

    const targetInvoiceId = invoiceId || documentNo || '';
    const invoiceQrUrl = `${origin}/?invoiceId=${encodeURIComponent(targetInvoiceId)}`;

    QRCode.toDataURL(invoiceQrUrl, {
      width: compact ? 100 : 160,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate Invoice QR Code:', err));
  }, [invoiceId, documentNo, compact]);

  // Compact layout for 80mm POS thermal slips
  if (compact) {
    return (
      <div className={`pb-3 border-b border-dashed border-black text-black ${className}`}>
        {/* Top Header Row: Logo on Left, QR on Right */}
        <div className="flex items-center justify-between gap-2">
          {/* 1. Logo */}
          <div className="shrink-0">
            <BrandLogo size="sm" showTagline={false} />
            <div className="text-[8px] font-black text-black uppercase tracking-wider mt-0.5">
              Printing & Packaging
            </div>
          </div>

          {/* 2. QR Code */}
          <div className="shrink-0 flex items-center bg-white p-0.5 rounded border border-black">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Invoice QR"
                className="w-9 h-9 object-contain"
              />
            ) : (
              <div className="w-9 h-9 bg-white flex items-center justify-center text-[7px] text-black font-bold">
                QR
              </div>
            )}
          </div>
        </div>

        {/* Centered Document Title */}
        <div className="text-center mt-2 pt-1 border-t border-dotted border-black">
          <div className="font-black text-xs uppercase tracking-widest text-black">
            {documentTitle}
          </div>
          {documentSubtitle && (
            <div className="text-[9px] font-bold text-black">{documentSubtitle}</div>
          )}
        </div>
      </div>
    );
  }

  // Standard Full Layout (A4 Invoice, Challan, Work Order, Quotation, Reports)
  return (
    <div className={`w-full text-black ${className}`}>
      {/* Pad Header Spacer (Reserved blank space for pre-printed letterhead pad) */}
      <div
        className={`pad-header-spacer ${isPadMode ? 'block' : 'hidden'}`}
        style={{ height: `${padTopMarginMm}mm` }}
      >
        {isPadMode && (
          <div className="print:hidden h-full flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 bg-indigo-50/50 rounded-xl p-2.5 text-center my-1">
            <span className="font-black text-xs text-indigo-900 tracking-wider uppercase">
              কোম্পানি লেটারহেড প্যাড এরিয়া ({padTopMarginMm}mm)
            </span>
            <span className="text-[10px] text-indigo-600 mt-0.5">
              প্রিন্ট করার সময় এই ফাঁকা জায়গায় আপনার অফসেট প্যাডের ছাপা লোগো ও ঠিকানা থাকবে
            </span>
          </div>
        )}
      </div>

      {/* Top Header Row: Company Brand Logo */}
      <div
        className={`pad-header-branding flex items-center justify-between pb-3 ${
          isPadMode ? 'hidden print:hidden' : ''
        }`}
      >
        {/* 1. Left Side: Company Brand Logo (spans across the header area nicely, no 4-sided border) */}
        <div className="flex flex-col items-start text-left">
          <BrandLogo
            size="xl"
            className="items-start text-left"
            showTagline={profile.showTagline !== false}
            tagline={profile.tagline || 'YOUR VISION, OUR CREATION!'}
            taglineClassName="text-[11px] sm:text-[12px] uppercase font-black tracking-widest text-black mt-1"
          />
          {profile.showCategory !== false && (
            <div className="text-xs sm:text-[13px] font-black text-black tracking-wide mt-1">
              ({profile.category || 'Printing, Packaging, Advertising & Brand Promotions'})
            </div>
          )}
        </div>
      </div>

      {/* Centered Document Title with clean black divider & compact scannable QR Code (Place 3) */}
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-black" />
        </div>
        <div className="relative flex justify-center">
          <div className="bg-white px-4 py-1 flex items-center gap-2.5 border-2 border-black rounded-lg shadow-2xs">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Invoice QR"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
              />
            )}
            <span className="text-base sm:text-lg font-black uppercase tracking-widest text-black">
              {documentTitle}
            </span>
          </div>
        </div>
      </div>
      {documentSubtitle && (
        <div className="text-center text-xs font-bold text-black -mt-1 mb-2">
          {documentSubtitle}
        </div>
      )}
    </div>
  );
};
