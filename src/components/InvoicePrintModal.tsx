import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SalesInvoice } from '../types';
import { BrandLogo } from './BrandLogo';
import { DocumentHeader } from './DocumentHeader';
import {
  Printer,
  X,
  FileText,
  Truck,
  Receipt,
  Download,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoiceId: string | null;
  mode?: 'invoice' | 'challan' | 'pos';
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoiceId,
  mode = 'invoice',
  onClose,
}) => {
  const { invoices, quotations, profile, language } = useApp();
  const [template, setTemplate] = useState<'A4' | 'POS' | 'WORK_ORDER' | 'CHALLAN'>(
    mode === 'challan' ? 'CHALLAN' : mode === 'pos' ? 'POS' : 'A4'
  );
  const [printError, setPrintError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!invoiceId) return null;
  
  const isQuote = invoiceId.startsWith('qt-') || invoiceId.startsWith('q-');
  const quote = isQuote ? (quotations || []).find((q) => q.id === invoiceId) : null;
  const realInvoice = isQuote ? null : invoices.find((inv) => inv.id === invoiceId);

  if (!realInvoice && !quote) return null;

  // Adapt quotation into an invoice-like schema for rendering
  const invoice: SalesInvoice = realInvoice || {
    id: quote!.id,
    invoiceNo: quote!.quoteNo,
    referenceNo: quote!.referenceNo,
    date: quote!.date,
    customerId: 'quote',
    customerName: quote!.customerName,
    customerPhone: quote!.customerPhone,
    customerCompany: quote!.customerCompany || '',
    customerAddress: '',
    items: quote!.items.map(item => ({
      ...item,
      totalSqft: 0,
      width: 0,
      height: 0,
    })),
    subtotal: quote!.grandTotal,
    discount: 0,
    discountType: 'amount' as const,
    discountValue: 0,
    vatRate: 0,
    vatAmount: 0,
    grandTotal: quote!.grandTotal,
    paidAmount: 0,
    dueAmount: quote!.grandTotal,
    paymentMethod: 'Cash',
    paymentStatus: (quote!.status as any) || 'Due',
    productionStatus: 'Queued',
    warehouseLocation: 'Office',
    notes: quote!.notes || '',
    jobSpecs: '',
    deliveryDate: quote!.validUntil,
    isQuote: true,
  };

  const tryDirectWindowPrint = () => {
    try {
      window.print();
      setIsPrinting(false);
    } catch (err: any) {
      console.error('Direct window.print() failed:', err);
      setIsPrinting(false);
      setPrintError(
        language === 'bn'
          ? 'ব্রাউজার প্রিভিউ আইফ্রেমের কারণে প্রিন্ট ডায়ালগ সরাসরি ওপেন হয়নি। অনুগ্রহ করে পাশের "নতুন ট্যাবে প্রিন্ট" বাটনে ক্লিক করুন অথবা "ডাউনলোড" করুন।'
          : 'Direct print is blocked by browser iframe restrictions. Please click "Open in New Tab" to print or "Download HTML".'
      );
    }
  };

  const handlePrint = () => {
    setPrintError(null);
    setIsPrinting(true);

    try {
      const printableContent = document.getElementById('printable-invoice-content');
      if (printableContent) {
        let printFrame = document.getElementById('print-iframe-helper') as HTMLIFrameElement | null;
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = 'print-iframe-helper';
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = '0';
          document.body.appendChild(printFrame);
        }

        const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
        if (doc) {
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map((s) => s.outerHTML)
            .join('\n');

          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>${invoice.invoiceNo} - Print</title>
                ${styles}
                <style>
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @page {
                    size: ${template === 'POS' ? '80mm auto' : 'A4 portrait'};
                    margin: ${template === 'POS' ? '2mm' : '8mm 10mm'};
                  }
                  html, body {
                    background: white !important;
                    color: black !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    font-family: sans-serif;
                    height: 100%;
                  }
                  .print\\:hidden { display: none !important; }
                  .a4-page-sheet {
                    min-height: calc(297mm - 16mm) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    box-sizing: border-box !important;
                    padding: 0 !important;
                    margin: 0 auto !important;
                    border: none !important;
                    box-shadow: none !important;
                  }
                  .a4-page-content {
                    flex: 1 0 auto !important;
                  }
                  .a4-page-footer {
                    margin-top: auto !important;
                  }
                  table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                  }
                </style>
              </head>
              <body>
                ${printableContent.innerHTML}
              </body>
            </html>
          `);
          doc.close();

          setTimeout(() => {
            try {
              printFrame?.contentWindow?.focus();
              printFrame?.contentWindow?.print();
              setIsPrinting(false);
            } catch (err) {
              console.warn('Iframe print blocked, trying window.print():', err);
              tryDirectWindowPrint();
            }
          }, 300);
          return;
        }
      }
    } catch (err) {
      console.warn('Print iframe error:', err);
    }

    tryDirectWindowPrint();
  };

  const handleOpenInNewTab = () => {
    const printableContent = document.getElementById('printable-invoice-content');
    if (!printableContent) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${language}">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${invoice.invoiceNo} - Print</title>
          <script src="https://cdn.tailwindcss.com"></script>
          ${styles}
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: ${template === 'POS' ? '80mm auto' : 'A4 portrait'};
              margin: ${template === 'POS' ? '2mm' : '8mm 10mm'};
            }
            html, body {
              background: white !important;
              color: black !important;
              padding: 15px;
              font-family: sans-serif;
              min-height: 100%;
            }
            .print-controls-bar {
              display: flex;
              justify-content: center;
              gap: 12px;
              margin-bottom: 24px;
              padding: 12px 20px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
            }
            .print-btn {
              background: #0f172a;
              color: white;
              padding: 10px 24px;
              border-radius: 8px;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              border: none;
            }
            .close-btn {
              background: #e2e8f0;
              color: #334155;
              padding: 10px 20px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              border: none;
            }
            .a4-page-sheet {
              min-height: 297mm;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
            }
            .a4-page-content {
              flex: 1 0 auto !important;
            }
            .a4-page-footer {
              margin-top: auto !important;
            }
            @media print {
              .print-controls-bar { display: none !important; }
              body { padding: 0 !important; }
              .a4-page-sheet {
                min-height: calc(297mm - 16mm) !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-controls-bar">
            <button class="print-btn" onclick="window.print()">
              🖨️ ${language === 'bn' ? 'প্রিন্ট করুন (Print)' : 'Print Document'}
            </button>
            <button class="close-btn" onclick="window.close()">
              ✕ ${language === 'bn' ? 'বন্ধ করুন (Close)' : 'Close Window'}
            </button>
          </div>
          <div style="max-width: 210mm; margin: 0 auto;">
            ${printableContent.innerHTML}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadHTML = () => {
    const printableContent = document.getElementById('printable-invoice-content');
    if (!printableContent) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${invoice.invoiceNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          ${styles}
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: ${template === 'POS' ? '80mm auto' : 'A4 portrait'};
              margin: ${template === 'POS' ? '2mm' : '8mm 10mm'};
            }
            body {
              background: white !important;
              color: black !important;
              padding: 20px;
              font-family: sans-serif;
            }
            .a4-page-sheet {
              min-height: 297mm;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
            }
            .a4-page-content {
              flex: 1 0 auto !important;
            }
            .a4-page-footer {
              margin-top: auto !important;
            }
            @media print {
              body { padding: 0 !important; }
              .a4-page-sheet {
                min-height: calc(297mm - 16mm) !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div style="max-width: 210mm; margin: 0 auto;">
            ${printableContent.innerHTML}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNo || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible print:block">
      {/* Print styles for direct browser print (Ctrl+P / direct print) */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: ${template === 'POS' ? '80mm auto' : 'A4 portrait'};
            margin: ${template === 'POS' ? '2mm' : '8mm 10mm'};
          }
          .a4-page-sheet {
            min-height: calc(297mm - 16mm) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
          }
          .a4-page-content {
            flex: 1 0 auto !important;
          }
          .a4-page-footer {
            margin-top: auto !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
        }
      `}</style>
      {/* Container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 print:max-w-none print:w-full print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing via CSS @media print) */}
        <div className="print:hidden p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-2xl">
          {/* Template Switcher */}
          {isQuote ? (
            <div className="text-slate-800 text-sm font-black flex items-center gap-2 px-1">
              <FileText className="w-5 h-5 text-amber-500" />
              <span>{language === 'bn' ? 'কোটেশন ও প্রাক্কলন প্রিন্ট ভিউ' : 'Quotation Print & View'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTemplate('A4')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  template === 'A4' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 বিল ও ইনভয়েস
              </button>
              <button
                type="button"
                onClick={() => setTemplate('WORK_ORDER')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  template === 'WORK_ORDER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ফ্যাক্টরি ওয়ার্ক অর্ডার
              </button>
              <button
                type="button"
                onClick={() => setTemplate('CHALLAN')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  template === 'CHALLAN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ডেলিভারি চালান
              </button>
              <button
                type="button"
                onClick={() => setTemplate('POS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  template === 'POS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm থার্মাল স্লিপ
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              title={language === 'bn' ? 'সরাসরি প্রিন্ট ডায়ালগ ওপেন করুন' : 'Open direct print dialog'}
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrinting ? (language === 'bn' ? 'প্রিন্ট হচ্ছে...' : 'Printing...') : (language === 'bn' ? 'প্রিন্ট করুন (Print)' : 'Print Document')}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              title={language === 'bn' ? 'আলাদা ট্যাবে খুলে সরাসরি প্রিন্ট করুন' : 'Open document in a new browser tab to print'}
            >
              <ExternalLink className="w-4 h-4 text-slate-950" />
              <span>{language === 'bn' ? 'নতুন ট্যাবে প্রিন্ট' : 'Open in New Tab'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded-xl transition-all cursor-pointer"
              title={language === 'bn' ? 'অফলাইন এইচটিএমএল হিসেবে ডাউনলোড করুন' : 'Download standalone HTML file'}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Banner if print is restricted */}
        {printError && (
          <div className="print:hidden mx-4 my-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{printError}</span>
            </div>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'নতুন ট্যাবে খুলুন' : 'Open in New Tab'}</span>
            </button>
          </div>
        )}

        {/* Printable Document Body */}
        <div id="printable-invoice-content" className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible print:max-h-none">
          
          {/* ============================================================== */}
          {/* 1. STANDARD A4 TAX / SALES INVOICE */}
          {/* ============================================================== */}
          {template === 'A4' && (
            <div className="a4-page-sheet bg-white max-w-[210mm] min-h-[297mm] mx-auto p-8 rounded-xl shadow-xs print:shadow-none print:p-0 border border-slate-200 print:border-none flex flex-col justify-between text-slate-900 text-xs">
              <div className="a4-page-content space-y-6 flex-1">
              
              {/* Header: Company Logo on Left, QR Banner on Right (as per Screenshot) */}
              <DocumentHeader
                documentTitle={
                  (invoice as any).isQuote
                    ? (language === 'bn' ? 'কোটেশন ও প্রাক্কলন' : 'QUOTATION / ESTIMATION')
                    : (language === 'bn' ? 'সেলস ইনভয়েস / বিল' : 'INVOICE')
                }
                documentNo={invoice.invoiceNo}
                documentDate={invoice.date}
                referenceNo={invoice.referenceNo}
              />

              {/* Bill To & Invoice Meta Box (Screenshot Layout: Left BILL TO, Right INVOICE DETAILS) */}
              <div className="bg-white p-4 rounded-xl border-2 border-slate-400 print:border-slate-600 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Left Column: BILL TO */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider block mb-1">
                    BILL TO:
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Customer Name :</span>
                      <span className="font-extrabold text-slate-950 text-sm">{invoice.customerName}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Mobile :</span>
                      <span className="font-bold text-slate-900">{invoice.customerPhone}</span>
                    </div>
                    {invoice.customerCompany && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-slate-500 font-semibold">Company / Org :</span>
                        <span className="font-medium text-slate-800">{invoice.customerCompany}</span>
                      </div>
                    )}
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Order Type :</span>
                      <span className="font-bold text-slate-800">
                        {invoice.warehouseLocation === 'Factory' ? 'Factory Dispatch' : 'Store Delivery'}
                      </span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Address :</span>
                      <span className="text-slate-700 font-medium">
                        {invoice.customerAddress || 'Chattogram, Bangladesh'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Invoice Details */}
                <div className="space-y-1.5 sm:border-l-2 sm:border-slate-300 print:sm:border-slate-400 sm:pl-4">
                  <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider block mb-1">
                    DOCUMENT DETAILS:
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Invoice Date :</span>
                      <span className="font-bold text-slate-900">{invoice.date}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Invoice # :</span>
                      <span className="font-black text-slate-950 font-mono">#{invoice.invoiceNo}</span>
                    </div>
                    {invoice.referenceNo && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-slate-500 font-semibold">Ref / PO # :</span>
                        <span className="font-bold text-amber-700 font-mono">{invoice.referenceNo}</span>
                      </div>
                    )}
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Fulfillment :</span>
                      <span className="font-bold text-blue-700 uppercase tracking-wide">
                        {invoice.warehouseLocation === 'Factory' ? 'FACTORY PRODUCTION' : 'OFFICE DISPATCH'}
                      </span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Payment :</span>
                      <span className="font-bold text-emerald-700 uppercase">
                        {invoice.paymentMethod || 'CASH'} ({invoice.paymentStatus})
                      </span>
                    </div>
                    {invoice.deliveryDate && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-slate-500 font-semibold">
                          {(invoice as any).isQuote ? 'Valid Until :' : 'Delivery Target :'}
                        </span>
                        <span className="font-bold text-slate-900">{invoice.deliveryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-slate-300 print:border-slate-500 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-900">
                    <th className="py-2.5 px-3 border-r border-slate-700 font-bold">SL</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 font-bold">Service / Item Description</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 font-bold">Unit</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 font-bold">Qty / SqFt</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-700 font-bold">Rate (৳)</th>
                    <th className="py-2.5 px-3 text-right font-bold">Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 print:divide-slate-400 text-xs">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-300 print:border-slate-400 hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300 print:border-slate-400 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 border-r border-slate-300 print:border-slate-400">
                        <div className="font-bold text-slate-950 text-xs">{item.name}</div>
                        {item.totalSqft && (
                          <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                            Dimensions: {item.width}' × {item.height}' = {item.totalSqft} SqFt
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-slate-600 italic mt-0.5">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-300 print:border-slate-400">{item.unit}</td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-950 border-r border-slate-300 print:border-slate-400">
                        {item.totalSqft ? item.totalSqft : item.qty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 border-r border-slate-300 print:border-slate-400">
                        {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-950">
                        {item.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Financials */}
              <div className="grid grid-cols-12 gap-6 pt-2">
                <div className="col-span-7 space-y-3">
                  {invoice.jobSpecs && (
                    <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-300 print:border-amber-400 text-xs shadow-2xs">
                      <strong className="text-amber-950 font-bold block mb-0.5">Job Instructions:</strong>
                      <span className="text-slate-800">{invoice.jobSpecs}</span>
                    </div>
                  )}

                  <div className="bg-slate-50/80 p-3.5 rounded-xl border-2 border-slate-400 print:border-slate-600 text-[11px] space-y-1.5 shadow-2xs">
                    <strong className="text-slate-900 font-extrabold block border-b border-slate-300 print:border-slate-400 pb-1 mb-1">
                      Bank Account for Payment:
                    </strong>
                    <div className="text-slate-700"><span className="font-semibold text-slate-900">Bank:</span> {profile.bankName}</div>
                    <div className="text-slate-700"><span className="font-semibold text-slate-900">Account:</span> {profile.bankAccount}</div>
                    <div className="text-slate-700"><span className="font-semibold text-slate-900">Branch:</span> {profile.bankBranch}</div>
                    <div className="text-slate-700"><span className="font-semibold text-slate-900">bKash / Nagad:</span> {profile.phone}</div>
                  </div>
                </div>

                <div className="col-span-5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900">
                      {profile.currencySymbol}
                      {invoice.subtotal.toLocaleString()}
                    </span>
                  </div>

                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount:</span>
                      <span className="font-bold text-rose-600">
                        -{profile.currencySymbol}
                        {invoice.discount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {invoice.vatAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>VAT ({invoice.vatRate}%):</span>
                      <span className="font-bold text-slate-900">
                        +{profile.currencySymbol}
                        {invoice.vatAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-slate-900 text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-amber-600">
                      {profile.currencySymbol}
                      {invoice.grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {!(invoice as any).isQuote && (
                    <>
                      {invoice.splitPayments ? (
                        <div className="space-y-1 text-[11px] pt-1.5 border-t border-slate-100">
                          {(invoice.splitPayments.cash ?? 0) > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Paid Cash:</span>
                              <span className="font-medium text-slate-700">
                                {profile.currencySymbol}{(invoice.splitPayments.cash ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(invoice.splitPayments.card ?? 0) > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Paid Card / Bank:</span>
                              <span className="font-medium text-slate-700">
                                {profile.currencySymbol}{(invoice.splitPayments.card ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(invoice.splitPayments.bkash ?? 0) > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Paid bKash:</span>
                              <span className="font-medium text-slate-700">
                                {profile.currencySymbol}{(invoice.splitPayments.bkash ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(invoice.splitPayments.nagad ?? 0) > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Paid Nagad:</span>
                              <span className="font-medium text-slate-700">
                                {profile.currencySymbol}{(invoice.splitPayments.nagad ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                            <span className="font-bold text-slate-700">Total Paid:</span>
                            <span className="font-extrabold text-emerald-700">
                              {profile.currencySymbol}
                              {invoice.paidAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                          <span className="text-slate-600">Paid Amount ({invoice.paymentMethod}):</span>
                          <span className="font-bold text-emerald-700">
                            {profile.currencySymbol}
                            {invoice.paidAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs font-black text-rose-600">
                        <span>Balance Due:</span>
                        <span>
                          {profile.currencySymbol}
                          {invoice.dueAmount.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              </div>

              {/* Signatures & Footer pinned to bottom */}
              <div className="a4-page-footer mt-auto pt-8 space-y-6">
                {/* Signatures */}
                <div className="flex justify-between items-end text-center text-xs text-slate-600">
                  <div>
                    <div className="w-36 border-t border-slate-400 mx-auto mb-1" />
                    <span>Customer's Signature</span>
                  </div>
                  <div>
                    <div className="w-44 border-t border-slate-400 mx-auto mb-1" />
                    <span className="font-bold text-slate-900">For {profile.name}</span>
                  </div>
                </div>

                {/* IT Firm Partner Advertising Footer */}
                <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
                  <span>DotColorCommunication Sales, POS &amp; ERP</span>
                  <span className="font-semibold text-slate-600">
                    Software Developed by <strong className="text-blue-700 font-bold">BD HOSTT</strong> (www.bdhost.com • Hotline: 01846100900)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. FACTORY WORK ORDER / JOB CARD */}
          {/* ============================================================== */}
          {template === 'WORK_ORDER' && (
            <div className="a4-page-sheet bg-white max-w-[210mm] min-h-[297mm] mx-auto p-8 rounded-xl shadow-xs print:shadow-none print:p-0 border border-amber-300 print:border-none flex flex-col justify-between text-xs text-slate-900">
              <div className="a4-page-content space-y-6 flex-1">
              {/* Header with Brand Logo on Left, QR Banner on Right */}
              <DocumentHeader
                documentTitle="PRODUCTION WORK ORDER / কারখানা জব কার্ড"
                documentSubtitle={`${profile.name || 'DotColorCommunication'} • Technical Work Order & Service Unit`}
                documentNo={`WO-${invoice.invoiceNo}`}
                documentDate={invoice.date}
                referenceNo={invoice.referenceNo}
              />

              {/* Order Meta Box */}
              <div className="bg-white p-4 rounded-xl border-2 border-amber-400 print:border-slate-600 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-amber-900 tracking-wider block mb-1">
                    CLIENT DETAILS:
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Client Name :</span>
                      <span className="font-extrabold text-slate-950 text-sm">{invoice.customerName}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Phone :</span>
                      <span className="font-bold text-slate-900">{invoice.customerPhone}</span>
                    </div>
                    {invoice.customerCompany && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-slate-500 font-semibold">Company :</span>
                        <span className="font-medium text-slate-800">{invoice.customerCompany}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 sm:border-l-2 sm:border-amber-300 print:sm:border-slate-400 sm:pl-4">
                  <span className="text-[11px] font-black uppercase text-amber-900 tracking-wider block mb-1">
                    PRODUCTION DEADLINE & STATUS:
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Work Order # :</span>
                      <span className="font-black text-slate-950 font-mono">WO-#{invoice.invoiceNo}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Delivery Target :</span>
                      <span className="font-black text-rose-600 text-sm">{invoice.deliveryDate || 'Urgent Delivery'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Current Status :</span>
                      <span className="font-black text-amber-700 uppercase">{invoice.productionStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Item Specifications & Sizing
                </h4>
                <div className="space-y-2">
                  {invoice.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-start justify-between"
                    >
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">{item.name}</span>
                        <div className="text-xs text-amber-900 mt-1 font-semibold">
                          Category: {item.category}
                        </div>
                        {item.totalSqft && (
                          <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                            📐 Exact Measurement: {item.width} Feet (W) × {item.height} Feet (H) ={' '}
                            {item.totalSqft} SqFt
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-slate-600 mt-1 bg-white p-2 rounded border border-amber-200">
                            <strong>Note:</strong> {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-slate-900">
                          Qty: {item.qty} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {invoice.jobSpecs && (
                <div className="p-4 bg-slate-900 text-white rounded-xl">
                  <span className="text-xs font-bold text-amber-400 block mb-1">
                    SPECIAL FABRICATION & PRINTING SPECS:
                  </span>
                  <p className="text-xs leading-relaxed text-slate-200">{invoice.jobSpecs}</p>
                </div>
              )}

              </div>

              <div className="a4-page-footer mt-auto pt-8 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center text-xs text-slate-600">
                  <div>
                    <div className="border-t border-slate-300 pt-1">Graphic Designer</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-300 pt-1">Machine Operator / Print Master</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-300 pt-1">Quality Inspection & Packing</div>
                  </div>
                </div>

                {/* IT Firm Partner Advertising Footer */}
                <div className="pt-4 border-t border-amber-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
                  <span>Production Work Order &amp; Job Card</span>
                  <span className="font-semibold text-slate-600">
                    Software Developed by <strong className="text-blue-700 font-bold">BD HOSTT</strong> (www.bdhost.com • Hotline: 01846100900)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. DELIVERY CHALLAN */}
          {/* ============================================================== */}
          {template === 'CHALLAN' && (
            <div className="a4-page-sheet bg-white max-w-[210mm] min-h-[297mm] mx-auto p-8 rounded-xl shadow-xs print:shadow-none print:p-0 border border-slate-200 print:border-none flex flex-col justify-between text-xs text-slate-900">
              <div className="a4-page-content space-y-6 flex-1">
              {/* Header with Brand Logo on Left, QR Banner on Right */}
              <DocumentHeader
                documentTitle="DELIVERY CHALLAN / চালান"
                documentSubtitle={`${profile.name || 'DotColorCommunication'} • Official Goods & Services Delivery Note`}
                documentNo={`CH-${invoice.invoiceNo}`}
                documentDate={invoice.date}
                referenceNo={invoice.referenceNo}
              />

              {/* Delivery Meta Box */}
              <div className="bg-white p-4 rounded-xl border-2 border-slate-400 print:border-slate-600 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider block mb-1">
                    DELIVER TO:
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Receiver Name :</span>
                      <span className="font-extrabold text-slate-950 text-sm">{invoice.customerName}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Phone :</span>
                      <span className="font-bold text-slate-900">{invoice.customerPhone}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Delivery Address :</span>
                      <span className="font-medium text-slate-800">{invoice.customerAddress || 'Chattogram'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:border-l-2 sm:border-slate-300 print:sm:border-slate-400 sm:pl-4">
                  <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider block mb-1">
                    DISPATCH DETAILS:
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Challan Ref # :</span>
                      <span className="font-black text-slate-950 font-mono">CH-#{invoice.invoiceNo}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Challan Date :</span>
                      <span className="font-bold text-slate-900">{invoice.date}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-slate-500 font-semibold">Dispatch Unit :</span>
                      <span className="font-bold text-slate-900">{invoice.warehouseLocation}</span>
                    </div>
                    {invoice.referenceNo && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-slate-500 font-semibold">Ref / PO # :</span>
                        <span className="font-bold text-amber-700 font-mono">{invoice.referenceNo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300 print:border-slate-500 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-900">
                    <th className="py-2.5 px-3 border-r border-slate-700 font-bold">SL</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 font-bold">Description of Goods Delivered</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 font-bold">Unit</th>
                    <th className="py-2.5 px-3 text-right font-bold">Delivered Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 print:divide-slate-400 text-xs">
                  {invoice.items.map((i, idx) => (
                    <tr key={idx} className="border-b border-slate-300 print:border-slate-400 hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-700 font-bold text-center border-r border-slate-300 print:border-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-950 border-r border-slate-300 print:border-slate-400">{i.name}</td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-300 print:border-slate-400">{i.unit}</td>
                      <td className="py-2.5 px-3 text-right font-black text-sm text-slate-950">
                        {i.qty} {i.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50/80 p-4 rounded-xl border-2 border-slate-400 print:border-slate-600 text-[11px] text-slate-800 leading-relaxed shadow-2xs">
                <p>
                  ঘোষণাপত্র: উপরিউক্ত পণ্য সামগ্রী সঠিক গণনা ও অক্ষত অবস্থায় গ্রহণ করিলাম।
                </p>
              </div>

              </div>

              <div className="a4-page-footer mt-auto pt-8 space-y-6">
                <div className="flex justify-between items-end text-center text-xs text-slate-600">
                  <div>
                    <div className="w-36 border-t border-slate-400 mx-auto mb-1" />
                    <span>Receiver's Signature with Seal</span>
                  </div>
                  <div>
                    <div className="w-40 border-t border-slate-400 mx-auto mb-1" />
                    <span className="font-bold text-slate-900">Delivered By ({profile.name})</span>
                  </div>
                </div>

                {/* IT Firm Partner Advertising Footer */}
                <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
                  <span>Official Delivery Challan • DotColorCommunication</span>
                  <span className="font-semibold text-slate-600">
                    Software Developed by <strong className="text-blue-700 font-bold">BD HOSTT</strong> (www.bdhost.com • Hotline: 01846100900)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. POS THERMAL 80MM SLIP */}
          {/* ============================================================== */}
          {template === 'POS' && (
            <div className="bg-white max-w-[80mm] mx-auto p-4 rounded-xl shadow-xs border border-slate-300 font-mono text-[11px] text-slate-900 space-y-3">
              {/* POS Compact Header: Brand Logo on Left, QR Code on Right */}
              <DocumentHeader
                compact={true}
                documentTitle={
                  (invoice as any).isQuote
                    ? 'QUOTATION SLIP'
                    : (language === 'bn' ? 'ক্যাশ মেমো / ইনভয়েস' : 'TAX INVOICE / বিল')
                }
                documentNo={invoice.invoiceNo}
                documentDate={invoice.date}
                referenceNo={invoice.referenceNo}
              />

              <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice #:</span>
                  <span className="font-bold">#{invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{invoice.date}</span>
                </div>
                {invoice.referenceNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref:</span>
                    <span>{invoice.referenceNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold truncate max-w-[130px]">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{invoice.customerPhone}</span>
                </div>
              </div>

              <div className="space-y-1 pb-2 border-b border-dashed border-slate-400">
                {invoice.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="max-w-[50mm] truncate">
                      {i.name} (x{i.qty})
                    </div>
                    <div className="font-bold">{i.totalPrice}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-bold text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{invoice.subtotal}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{invoice.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-900">
                  <span>TOTAL:</span>
                  <span>{invoice.grandTotal} BDT</span>
                </div>
                <div className="flex justify-between text-[10px] font-normal pt-1">
                  <span>Paid ({invoice.paymentMethod}):</span>
                  <span>{invoice.paidAmount}</span>
                </div>
                {invoice.dueAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-black">
                    <span>DUE:</span>
                    <span>{invoice.dueAmount} BDT</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[9px] text-slate-500">
                Thank you for your business!
                <br />
                Quality Printing &amp; Signage Solutions
                <div className="mt-1.5 pt-1 border-t border-dotted border-slate-300 text-[8px] text-slate-500 font-sans">
                  Software Developed by <strong className="text-slate-900 font-bold">BD HOSTT</strong> (www.bdhost.com • 01846100900)
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
