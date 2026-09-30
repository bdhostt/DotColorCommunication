import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Mail, Facebook } from 'lucide-react';

export interface DocumentHeaderProps {
  documentTitle: string;
  documentSubtitle?: string;
  documentNo?: string;
  documentDate?: string;
  referenceNo?: string;
  compact?: boolean; // For 80mm POS slips
  className?: string;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  documentTitle,
  documentSubtitle,
  documentNo,
  documentDate,
  referenceNo,
  compact = false,
  className = '',
}) => {
  const { profile } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate high-resolution scannable QR Code containing company vCard & document verification
  useEffect(() => {
    const qrPayload = profile.qrCodeValue
      ? profile.qrCodeValue
      : [
          profile.name || 'DotColorCommunication Sales, POS & ERP',
          `Doc: ${documentNo || 'N/A'}`,
          documentDate ? `Date: ${documentDate}` : '',
          referenceNo ? `Ref: ${referenceNo}` : '',
          `Hotline: ${profile.phone || '01846100900, 01756007600'}`,
          `Email: ${profile.emails?.[0] || 'info@dotcolorcommunication.com'}`,
          `Web: ${profile.website || 'www.dotcolorcommunication.com'}`,
          `Address: ${profile.factoryAddress || 'South Noya Para, Banglabazar, Cox\'s Bazar, Chattogram, Bangladesh.'}`,
          'Software Developed by: BD HOSTT (www.bdhost.com • Hotline: 01846100900)',
        ]
          .filter(Boolean)
          .join('\n');

    QRCode.toDataURL(qrPayload, {
      width: compact ? 120 : 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR Code:', err));
  }, [documentNo, documentDate, referenceNo, profile, compact]);

  const companyAddress =
    profile.factoryAddress ||
    'South Noya Para, Banglabazar, Cox\'s Bazar, Chattogram, Bangladesh.';
  const hotline = profile.phone || '01846100900, 01756007600';
  const emailsText =
    profile.emails && profile.emails.length > 0
      ? profile.emails.join(', ')
      : 'info@dotcolorcommunication.com, support@dotcolorcommunication.com';
  const facebookText = profile.facebook || 'dotcolorcommunication.official';

  // Compact layout for 80mm POS thermal slips
  if (compact) {
    return (
      <div className={`pb-3 border-b border-dashed border-slate-400 text-slate-900 ${className}`}>
        {/* Top Header Row: Logo on Left, QR on Right */}
        <div className="flex items-center justify-between gap-2">
          {/* 1. Logo */}
          <div className="shrink-0">
            <BrandLogo size="sm" showTagline={false} />
            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Printing & Packaging
            </div>
          </div>

          {/* 2. QR Code */}
          <div className="shrink-0 flex items-center gap-1.5 bg-white p-1 rounded border border-slate-300">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Document & Contact QR"
                className="w-11 h-11 object-contain"
              />
            ) : (
              <div className="w-11 h-11 bg-slate-100 flex items-center justify-center text-[7px] text-slate-400">
                QR
              </div>
            )}
          </div>
        </div>

        {/* Centered Document Title */}
        <div className="text-center mt-2 pt-1 border-t border-dotted border-slate-300">
          <div className="font-black text-xs uppercase tracking-widest text-slate-950">
            {documentTitle}
          </div>
          {documentSubtitle && (
            <div className="text-[9px] text-slate-600">{documentSubtitle}</div>
          )}
        </div>
      </div>
    );
  }

  // Standard Full Layout (A4 Invoice, Challan, Work Order, Quotation, Reports)
  return (
    <div className={`w-full text-slate-900 ${className}`}>
      {/* Top Header Row: 1 Logo on Left, 2 QR on Right */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
        {/* 1. Left Side: Company Brand Logo */}
        <div className="flex flex-col">
          <BrandLogo size="lg" showTagline={true} tagline={profile.tagline || 'YOUR VISION, OUR CREATION!'} />
          <div className="text-[11px] font-semibold text-slate-500 tracking-wide mt-1.5">
            {profile.category || 'Printing, Packaging, Advertising & Brand Promotions'}
          </div>
        </div>

        {/* 2. Right Side: QR Code & Company Contact Block (exactly as in uploaded card/screenshot) */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs shrink-0 max-w-lg">
          {/* QR Code */}
          <div className="shrink-0 p-1 bg-white rounded-lg border border-slate-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`${profile.name} Official QR Code`}
                className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
              />
            ) : (
              <div className="w-20 h-20 sm:w-22 sm:h-22 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          {/* Contact Details with Circular Icons */}
          <div className="space-y-1 text-[10.5px] leading-tight text-slate-800">
            {/* Address */}
            <div className="flex items-start gap-1.5">
              <div className="w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-slate-900 stroke-[2.5]" />
              </div>
              <span className="font-medium text-[10px] sm:text-[10.5px] text-slate-800 leading-snug">
                {companyAddress}
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center shrink-0">
                <Phone className="w-2.5 h-2.5 text-slate-900 stroke-[2.5]" />
              </div>
              <span className="font-black text-[11px] text-slate-950 tracking-wide">
                {hotline}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center shrink-0">
                <Mail className="w-2.5 h-2.5 text-slate-900 stroke-[2.5]" />
              </div>
              <span className="font-medium text-[10px] text-slate-700 truncate max-w-[260px]">
                {emailsText}
              </span>
            </div>

            {/* Facebook */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center shrink-0">
                <Facebook className="w-2.5 h-2.5 text-slate-900 fill-slate-900" />
              </div>
              <span className="font-medium text-[10px] text-slate-700">
                {facebookText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Document Title with clean divider (Matches user's Screenshot) */}
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-slate-900" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-5 py-0.5 text-base sm:text-lg font-black uppercase tracking-widest text-slate-950 border-2 border-slate-900 rounded-lg shadow-2xs">
            {documentTitle}
          </span>
        </div>
      </div>
      {documentSubtitle && (
        <div className="text-center text-xs font-semibold text-slate-600 -mt-1 mb-2">
          {documentSubtitle}
        </div>
      )}
    </div>
  );
};
