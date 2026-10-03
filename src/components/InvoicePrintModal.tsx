import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { SalesInvoice } from '../types';
import { BrandLogo } from './BrandLogo';
import { DocumentHeader } from './DocumentHeader';
import { dispatchHardwarePrint, checkHardwareAgentStatus, HardwareAgentStatus } from '../utils/hardwarePrint';
import { PrinterBridgeModal } from './PrinterBridgeModal';
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
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoiceId: string | null;
  mode?: 'invoice' | 'challan' | 'pos';
  onClose: () => void;
  autoPrint?: boolean;
  initialPadMode?: boolean;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoiceId,
  mode = 'invoice',
  onClose,
  autoPrint = false,
  initialPadMode = false,
}) => {
  const { invoices, quotations, profile, language } = useApp();
  const [template, setTemplate] = useState<'A4' | 'POS' | 'WORK_ORDER' | 'CHALLAN'>(
    mode === 'challan' ? 'CHALLAN' : mode === 'pos' ? 'POS' : 'A4'
  );
  const [isPadMode, setIsPadMode] = useState(initialPadMode);
  const [padTopMarginMm, setPadTopMarginMm] = useState<number>(profile.padTopMarginMm || 42);
  const [printError, setPrintError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrinterBridgeOpen, setIsPrinterBridgeOpen] = useState(false);
  const [hardwareAgentStatus, setHardwareAgentStatus] = useState<HardwareAgentStatus>({ isOnline: false });
  const [isHardwarePrinting, setIsHardwarePrinting] = useState(false);
  const [hardwarePrintMsg, setHardwarePrintMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [posQrDataUrl, setPosQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (template === 'POS') {
      checkHardwareAgentStatus().then((st) => setHardwareAgentStatus(st));
    }
  }, [template]);

  if (!invoiceId) return null;
  
  const isQuote = invoiceId.startsWith('qt-') || invoiceId.startsWith('q-');
  const quote = isQuote
    ? (quotations || []).find((q) => q.id === invoiceId || q.quoteNo.toLowerCase() === invoiceId.toLowerCase())
    : null;
  const realInvoice = isQuote
    ? null
    : invoices.find(
        (inv) =>
          inv.id === invoiceId ||
          inv.invoiceNo.toLowerCase() === invoiceId.toLowerCase() ||
          inv.invoiceNo.toLowerCase() === invoiceId.replace(/^#/, '').toLowerCase()
      );

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

  useEffect(() => {
    if (template === 'POS' && invoice) {
      const qrPayload = [
        profile.name || 'DotColor Communication',
        `Invoice: ${invoice.invoiceNo}`,
        `Date: ${invoice.date}`,
        `Total: ${invoice.grandTotal} BDT`,
        `Due: ${invoice.dueAmount} BDT`,
        `Hotline: ${profile.phone || '01846100900'}`,
        'Powered by BD HOSTT',
      ].join('\n');

      QRCode.toDataURL(qrPayload, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setPosQrDataUrl(url))
        .catch((err) => console.error('Failed to generate POS QR code:', err));
    }
  }, [template, invoice.invoiceNo, invoice.date, invoice.grandTotal, invoice.dueAmount, profile]);

  useEffect(() => {
    if (autoPrint && invoiceId) {
      const timer = setTimeout(() => {
        handlePrint(initialPadMode);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, initialPadMode, invoiceId]);

  const tryDirectWindowPrint = () => {
    try {
      window.print();
      setIsPrinting(false);
      if (autoPrint) {
        setTimeout(onClose, 600);
      }
    } catch (err: any) {
      console.error('Direct window.print() failed:', err);
      setIsPrinting(false);
      if (autoPrint) {
        setTimeout(onClose, 600);
      }
      setPrintError(
        language === 'bn'
          ? 'ব্রাউজার প্রিভিউ আইফ্রেমের কারণে প্রিন্ট ডায়ালগ সরাসরি ওপেন হয়নি। অনুগ্রহ করে পাশের "নতুন ট্যাবে প্রিন্ট" বাটনে ক্লিক করুন অথবা "ডাউনলোড" করুন।'
          : 'Direct print is blocked by browser iframe restrictions. Please click "Open in New Tab" to print or "Download HTML".'
      );
    }
  };

  const handlePrint = (padModeOverride?: boolean) => {
    const activePadMode = padModeOverride !== undefined ? padModeOverride : isPadMode;
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
          printFrame.style.border = '0';
          document.body.appendChild(printFrame);
        }
        printFrame.style.width = template === 'POS' ? '80mm' : '210mm';
        printFrame.style.height = '1000px';
        printFrame.style.visibility = 'hidden';

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
                    box-sizing: border-box !important;
                  }
                  @page {
                    size: ${template === 'POS' ? '80mm auto !important' : 'A4 portrait !important'};
                    margin: ${template === 'POS' ? '0mm !important' : '8mm 10mm !important'};
                  }
                  html, body {
                    background: #ffffff !important;
                    color: #000000 !important;
                    padding: 0 !important;
                    margin: 0 auto !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace !important;
                    height: auto !important;
                    width: ${template === 'POS' ? '80mm !important' : 'auto !important'};
                    max-width: ${template === 'POS' ? '80mm !important' : 'none !important'};
                  }
                  .print\\:hidden { display: none !important; }
                  ${template === 'POS' ? `
                    * {
                      color: #000000 !important;
                      border-color: #000000 !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    body {
                      width: 80mm !important;
                      max-width: 80mm !important;
                      padding: 0 !important;
                      margin: 0 auto !important;
                    }
                    .pos-thermal-sheet {
                      width: 78mm !important;
                      max-width: 78mm !important;
                      margin: 0 auto !important;
                      padding: 1mm 1mm !important;
                      border: none !important;
                      box-shadow: none !important;
                      border-radius: 0 !important;
                    }
                  ` : `
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
                  `}
                  ${activePadMode ? `
                    .pad-header-branding { display: none !important; }
                    .pad-header-spacer { display: block !important; height: ${padTopMarginMm}mm !important; }
                    .pad-footer-credit { display: none !important; }
                  ` : ''}
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
              if (autoPrint) {
                setTimeout(onClose, 600);
              }
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

  const handlePadPrint = () => {
    setIsPadMode(true);
    handlePrint(true);
  };

  const handleHardwarePrint = async () => {
    setIsHardwarePrinting(true);
    setHardwarePrintMsg(null);

    const hardwarePayload = {
      companyName: profile.name || 'DotColor Communication',
      companyCategory: profile.category || 'Printing, Packaging & Signage',
      companyHotline: profile.phone || '01846100900',
      companyAddress: profile.officeAddress || profile.factoryAddress || 'Dhaka, Bangladesh',
      documentTitle: 'TAX INVOICE / বিল',
      invoiceNo: invoice.invoiceNo,
      referenceNo: invoice.referenceNo,
      date: invoice.date,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      items: invoice.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        width: item.width,
        height: item.height,
        totalSqft: item.totalSqft,
        notes: item.notes,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      vatRate: invoice.vatRate,
      vatAmount: invoice.vatAmount,
      grandTotal: invoice.grandTotal,
      paidAmount: invoice.paidAmount,
      dueAmount: invoice.dueAmount,
      paymentMethod: invoice.paymentMethod,
    };

    try {
      const ok = await dispatchHardwarePrint('/api/hardware/print-invoice', hardwarePayload);
      if (ok) {
        setHardwarePrintMsg({
          type: 'success',
          text: language === 'bn'
            ? '✅ ৮০মিমি থার্মাল প্রিন্টারে সরাসরি প্রিন্ট পাঠানো হয়েছে!'
            : '✅ Direct print sent to 80mm thermal printer!',
        });
        setTimeout(() => setHardwarePrintMsg(null), 4000);
      } else {
        setHardwarePrintMsg({
          type: 'error',
          text: language === 'bn'
            ? '⚠️ প্রিন্টার এজেন্ট কানেক্ট করা যায়নি। নিচের "এজেন্ট সেটআপ" বাটনে ক্লিক করে এজেন্ট চালু করুন।'
            : '⚠️ Could not reach printer agent. Please click "Agent Setup" to start the agent.',
        });
        setIsPrinterBridgeOpen(true);
      }
    } catch {
      setHardwarePrintMsg({
        type: 'error',
        text: language === 'bn' ? '⚠️ প্রিন্ট পাঠাতে সমস্যা হয়েছে।' : '⚠️ Print dispatch failed.',
      });
    } finally {
      setIsHardwarePrinting(false);
    }
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
              margin: ${template === 'POS' ? '0' : '8mm 10mm'};
            }
            html, body {
              background: white !important;
              color: black !important;
              padding: ${template === 'POS' ? '0' : '15px'};
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
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
              ${template === 'POS' ? `
                * {
                  color: #000000 !important;
                  border-color: #000000 !important;
                }
                .pos-thermal-sheet {
                  width: 78mm !important;
                  max-width: 78mm !important;
                  margin: 0 auto !important;
                  padding: 1mm 1mm !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }
              ` : ''}
              ${isPadMode ? `
                .pad-header-branding { display: none !important; }
                .pad-header-spacer { display: block !important; height: ${padTopMarginMm}mm !important; }
                .pad-footer-credit { display: none !important; }
              ` : ''}
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
          <div style="max-width: ${template === 'POS' ? '80mm' : '210mm'}; margin: 0 auto;">
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
              margin: ${template === 'POS' ? '0' : '8mm 10mm'};
            }
            body {
              background: white !important;
              color: black !important;
              padding: ${template === 'POS' ? '0' : '20px'};
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
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
              ${template === 'POS' ? `
                * {
                  color: #000000 !important;
                  border-color: #000000 !important;
                }
                .pos-thermal-sheet {
                  width: 78mm !important;
                  max-width: 78mm !important;
                  margin: 0 auto !important;
                  padding: 1mm 1mm !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }
              ` : ''}
              ${isPadMode ? `
                .pad-header-branding { display: none !important; }
                .pad-header-spacer { display: block !important; height: ${padTopMarginMm}mm !important; }
                .pad-footer-credit { display: none !important; }
              ` : ''}
            }
          </style>
        </head>
        <body onload="window.print()">
          <div style="max-width: ${template === 'POS' ? '80mm' : '210mm'}; margin: 0 auto;">
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
    <>
      {autoPrint && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 pointer-events-none">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            {template === 'POS' ? (
              <Receipt className="w-5 h-5 animate-pulse text-emerald-400" />
            ) : (
              <Printer className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100">
              {template === 'POS'
                ? (language === 'bn' ? '৮০মিমি POS / KOT থার্মাল প্রিন্ট ডায়ালগ ওপেন হচ্ছে...' : 'Opening 80mm POS / KOT Print Dialog...')
                : initialPadMode
                ? (language === 'bn' ? 'প্যাড প্রিন্ট ডায়ালগ ওপেন হচ্ছে...' : 'Opening Pad Print Dialog...')
                : (language === 'bn' ? 'A4 প্রিন্টার ডায়ালগ ওপেন হচ্ছে...' : 'Opening A4 Printer Dialog...')}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              #{invoice.invoiceNo} {template === 'POS' ? '• 80mm POS Slip' : initialPadMode ? '• Letterhead Pad' : '• Normal A4'}
            </div>
          </div>
        </div>
      )}

      <div
        className={
          autoPrint
            ? `fixed -left-[9999px] -top-[9999px] ${template === 'POS' ? 'w-[80mm]' : 'w-[210mm]'} opacity-0 pointer-events-none`
            : "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible print:block"
        }
      >
      {/* Print styles for direct browser print (Ctrl+P / direct print) */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          @page {
            size: ${template === 'POS' ? '80mm auto !important' : 'A4 portrait !important'};
            margin: ${template === 'POS' ? '0mm !important' : '8mm 10mm !important'};
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: ${template === 'POS' ? '80mm !important' : 'auto !important'};
            max-width: ${template === 'POS' ? '80mm !important' : 'none !important'};
            margin: 0 auto !important;
            padding: 0 !important;
          }
          ${template === 'POS' ? `
            * {
              color: #000000 !important;
              border-color: #000000 !important;
            }
            .pos-thermal-sheet {
              width: 78mm !important;
              max-width: 78mm !important;
              margin: 0 auto !important;
              padding: 1mm 1mm !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          ` : `
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
          `}
          ${isPadMode ? `
            .pad-header-branding { display: none !important; }
            .pad-header-spacer { display: block !important; height: ${padTopMarginMm}mm !important; }
            .pad-footer-credit { display: none !important; }
          ` : ''}
        }
      `}</style>
      {/* Container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 print:max-w-none print:w-full print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing via CSS @media print) */}
        <div className="print:hidden p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-2xl">
          {/* Template Switcher & Pad Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2">
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

            {/* Quick Pad View Toggle */}
            {template !== 'POS' && (
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => setIsPadMode(false)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    !isPadMode ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="সম্পূর্ণ ইনভয়েস প্রিভিউ"
                >
                  নরমাল ভিউ
                </button>
                <button
                  type="button"
                  onClick={() => setIsPadMode(true)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isPadMode ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-600'
                  }`}
                  title="লেটারহেড প্যাড প্রিভিউ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>প্যাড ভিউ</span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons (Right side: user mark 1 area) */}
          <div className="flex items-center gap-2">
            {/* Direct Hardware Thermal Print Button for 80mm POS Slip */}
            {template === 'POS' && (
              <button
                type="button"
                onClick={handleHardwarePrint}
                disabled={isHardwarePrinting}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                  hardwareAgentStatus.isOnline
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title={
                  hardwareAgentStatus.isOnline
                    ? `৮০মিমি প্রিন্টারে সরাসরি হার্ডওয়্যার প্রিন্ট (${hardwareAgentStatus.activePrinter || '80 Printer'})`
                    : '৮০মিমি থার্মাল প্রিন্টারে সরাসরি প্রিন্ট (এজেন্ট রানিং না থাকলে সেটআপ ডায়ালগ ওপেন হবে)'
                }
              >
                <Printer className="w-4 h-4 text-emerald-200" />
                <span>
                  {isHardwarePrinting
                    ? (language === 'bn' ? 'প্রিন্ট হচ্ছে...' : 'Printing...')
                    : (language === 'bn' ? 'থার্মাল প্রিন্টার (Agent)' : 'Thermal Printer (Agent)')}
                </span>
                {hardwareAgentStatus.isOnline ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" title="Agent Online" />
                ) : (
                  <span className="text-[10px] px-1 bg-white/20 rounded font-normal">Setup</span>
                )}
              </button>
            )}

            {template === 'POS' && (
              <button
                type="button"
                onClick={() => setIsPrinterBridgeOpen(true)}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title={language === 'bn' ? 'প্রিন্টার এজেন্ট স্ট্যাটাস ও সেটআপ' : 'Printer Agent Status & Setup'}
              >
                <Settings className="w-4 h-4 text-slate-700" />
              </button>
            )}

            {/* Standard Full Print */}
            <button
              type="button"
              onClick={() => handlePrint(false)}
              disabled={isPrinting}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              title={language === 'bn' ? 'সম্পূর্ণ ইনভয়েস লোগো ও ফুটারসহ প্রিন্ট করুন' : 'Print complete document with header and footer'}
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrinting ? (language === 'bn' ? 'প্রিন্ট হচ্ছে...' : 'Printing...') : (language === 'bn' ? 'প্রিন্ট করুন (Print)' : 'Print Document')}</span>
            </button>

            {/* Pad Print Button (User request at mark 1) */}
            {template !== 'POS' && (
              <button
                type="button"
                onClick={handlePadPrint}
                disabled={isPrinting}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all ring-2 ring-indigo-300"
                title={language === 'bn' ? 'কোম্পানি প্যাডের জন্য হেডার ও ফুটার ছাড়া সরাসরি প্রিন্ট করুন' : 'Print for pre-printed letterhead pad without header & footer'}
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                <span>{language === 'bn' ? 'প্যাড প্রিন্ট (Pad Print)' : 'Pad Print'}</span>
              </button>
            )}

            {/* Open in New Tab */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              title={language === 'bn' ? 'আলাদা ট্যাবে খুলে সরাসরি প্রিন্ট করুন' : 'Open document in a new browser tab to print'}
            >
              <ExternalLink className="w-4 h-4 text-slate-950" />
              <span>{language === 'bn' ? 'নতুন ট্যাবে' : 'Open in New Tab'}</span>
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

        {/* Hardware Print Feedback Message */}
        {hardwarePrintMsg && (
          <div
            className={`print:hidden mx-4 mt-3 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
              hardwarePrintMsg.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {hardwarePrintMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{hardwarePrintMsg.text}</span>
            </div>
            <button
              onClick={() => setHardwarePrintMsg(null)}
              className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pad Mode Interactive Settings Banner */}
        {isPadMode && template !== 'POS' && (
          <div className="print:hidden mx-4 my-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-bold">
                {language === 'bn' ? 'লেটারহেড প্যাড মোড চালু:' : 'Letterhead Pad Mode Active:'}
              </span>
              <span className="text-indigo-800 text-[11px]">
                {language === 'bn'
                  ? 'হেডার (লোগো/কিউআর) এবং নিচের সফটওয়্যার ফুটার ছাড়া কেবল মূল বিল প্রিন্ট হবে।'
                  : 'Header branding and software footer are hidden.'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-slate-600">{language === 'bn' ? 'প্যাড ফাঁকা স্পেস:' : 'Pad Top Space:'}</span>
              {[30, 38, 42, 50].map((mm) => (
                <button
                  key={mm}
                  type="button"
                  onClick={() => setPadTopMarginMm(mm)}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    padTopMarginMm === mm
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {mm}mm
                </button>
              ))}
            </div>
          </div>
        )}

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
            <div className="a4-page-sheet bg-white max-w-[210mm] min-h-[297mm] mx-auto p-8 rounded-xl shadow-xs print:shadow-none print:p-0 border border-black print:border-none flex flex-col justify-between text-black text-xs">
              <div className="a4-page-content space-y-6 flex-1">
              
              {/* Header: Company Logo on Left, Scannable Invoice QR on Right */}
              <DocumentHeader
                documentTitle={
                  (invoice as any).isQuote
                    ? (language === 'bn' ? 'কোটেশন ও প্রাক্কলন' : 'QUOTATION / ESTIMATION')
                    : (language === 'bn' ? 'সেলস ইনভয়েস / বিল' : 'INVOICE')
                }
                documentNo={invoice.invoiceNo}
                documentDate={invoice.date}
                referenceNo={invoice.referenceNo}
                invoiceId={invoice.id}
                isPadMode={isPadMode}
                padTopMarginMm={padTopMarginMm}
              />

              {/* Bill To & Invoice Meta Box */}
              <div className="bg-white p-4 rounded-xl border-2 border-black shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Left Column: BILL TO */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-black tracking-wider block mb-1">
                    BILL TO:
                  </span>
                  <div className="space-y-1 text-black">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-black font-bold">Customer Name :</span>
                      <span className="font-black text-black text-sm">{invoice.customerName}</span>
                    </div>
                    {invoice.customerCompany && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-black font-bold">Company / Org :</span>
                        <span className="font-bold text-black">{invoice.customerCompany}</span>
                      </div>
                    )}
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-black font-bold">Address :</span>
                      <span className="text-black font-medium">
                        {invoice.customerAddress || 'Chattogram, Bangladesh'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Invoice Details */}
                <div className="space-y-1.5 sm:border-l-2 sm:border-black sm:pl-4">
                  <span className="text-[11px] font-black uppercase text-black tracking-wider block mb-1">
                    DOCUMENT DETAILS:
                  </span>
                  <div className="space-y-1 text-black">
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-black font-bold">Invoice Date :</span>
                      <span className="font-black text-black">{invoice.date}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-black font-bold">Invoice # :</span>
                      <span className="font-black text-black font-mono">#{invoice.invoiceNo}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 shrink-0 text-black font-bold">Ref/PO # :</span>
                      <span className="font-black text-black font-mono">
                        {invoice.referenceNo && !['nill', 'nil', 'none', 'null', '-'].includes(invoice.referenceNo.trim().toLowerCase())
                          ? invoice.referenceNo
                          : ''}
                      </span>
                    </div>
                    {invoice.deliveryDate && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-black font-bold">
                          {(invoice as any).isQuote ? 'Valid Until :' : 'Delivery Target :'}
                        </span>
                        <span className="font-black text-black">{invoice.deliveryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table Container */}
              <div className="rounded-xl border-2 border-black overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black text-white text-[11px] font-black uppercase tracking-wider border-b-2 border-black">
                      <th className="py-2.5 px-3 text-center border-r border-black font-black w-12 text-white">SL</th>
                      <th className="py-2.5 px-3 text-left border-r border-black font-black text-white">Service / Item Description</th>
                      <th className="py-2.5 px-3 text-center border-r border-black font-black w-16 text-white">Unit</th>
                      <th className="py-2.5 px-3 text-center border-r border-black font-black w-24 text-white">Qty / SqFt</th>
                      <th className="py-2.5 px-3 text-right border-r border-black font-black w-24 text-white">Rate (৳)</th>
                      <th className="py-2.5 px-3 text-right font-black w-28 text-white">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs bg-white text-black">
                    {invoice.items.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-black last:border-b-0 hover:bg-slate-50/60 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                      >
                        <td className="py-2.5 px-3 font-bold text-black border-r border-black text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-black">
                          <div className="font-black text-black text-xs">{item.name}</div>
                          {Boolean(item.totalSqft && item.width && item.height) && (
                            <div className="text-[11px] text-black font-bold mt-0.5">
                              Dimensions: {item.width}' × {item.height}' = {item.totalSqft} SqFt
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-black italic font-medium mt-0.5">{item.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-black border-r border-black">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-black border-r border-black">
                          {item.totalSqft ? item.totalSqft : item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-black border-r border-black">
                          {Number(item.unitPrice).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-black">
                          {Number(item.totalPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Financials */}
              <div className="grid grid-cols-12 gap-6 pt-2">
                <div className="col-span-7 space-y-3">
                  {invoice.jobSpecs && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-black text-xs shadow-2xs">
                      <strong className="text-black font-black block mb-0.5">Job Instructions:</strong>
                      <span className="text-black font-medium">{invoice.jobSpecs}</span>
                    </div>
                  )}
                </div>

                <div className="col-span-5 space-y-1.5 text-xs text-black">
                  <div className="flex justify-between text-black font-bold">
                    <span>Subtotal:</span>
                    <span className="font-black text-black">
                      {profile.currencySymbol}
                      {invoice.subtotal.toLocaleString()}
                    </span>
                  </div>

                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-black font-bold">
                      <span>Discount:</span>
                      <span className="font-black text-black">
                        -{profile.currencySymbol}
                        {invoice.discount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {invoice.vatAmount > 0 && (
                    <div className="flex justify-between text-black font-bold">
                      <span>VAT ({invoice.vatRate}%):</span>
                      <span className="font-black text-black">
                        +{profile.currencySymbol}
                        {invoice.vatAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-black text-black">
                    <span>Grand Total:</span>
                    <span className="text-black font-black text-base">
                      {profile.currencySymbol}
                      {invoice.grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {!(invoice as any).isQuote && (
                    <>
                      {invoice.splitPayments ? (
                        <div className="space-y-1 text-[11px] pt-1.5 border-t border-black text-black">
                          {(invoice.splitPayments.cash ?? 0) > 0 && (
                            <div className="flex justify-between text-black">
                              <span>Paid Cash:</span>
                              <span className="font-black text-black">
                                {profile.currencySymbol}{(invoice.splitPayments.cash ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(invoice.splitPayments.card ?? 0) > 0 && (
                            <div className="flex justify-between text-black">
                              <span>Paid Card / Bank:</span>
                              <span className="font-black text-black">
                                {profile.currencySymbol}{(invoice.splitPayments.card ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(invoice.splitPayments.bkash ?? 0) > 0 && (
                            <div className="flex justify-between text-black">
                              <span>Paid bKash:</span>
                              <span className="font-black text-black">
                                {profile.currencySymbol}{(invoice.splitPayments.bkash ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(invoice.splitPayments.nagad ?? 0) > 0 && (
                            <div className="flex justify-between text-black">
                              <span>Paid Nagad:</span>
                              <span className="font-black text-black">
                                {profile.currencySymbol}{(invoice.splitPayments.nagad ?? 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs pt-1 border-t border-black text-black">
                            <span className="font-bold text-black">Total Paid:</span>
                            <span className="font-black text-black">
                              {profile.currencySymbol}
                              {invoice.paidAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between text-xs pt-1 border-t border-black text-black">
                          <span className="font-bold text-black">Paid Amount ({invoice.paymentMethod}):</span>
                          <span className="font-black text-black">
                            {profile.currencySymbol}
                            {invoice.paidAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs font-black text-black pt-1 border-t border-black">
                        <span>Balance Due:</span>
                        <span className="font-black text-black">
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
                <div className="flex justify-between items-end text-center text-xs text-black">
                  <div>
                    <div className="w-36 border-t border-black mx-auto mb-1" />
                    <span className="font-bold text-black">Customer's Signature</span>
                  </div>
                  <div>
                    <div className="w-44 border-t border-black mx-auto mb-1" />
                    <span className="font-black text-black">For {profile.name}</span>
                  </div>
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
                isPadMode={isPadMode}
                padTopMarginMm={padTopMarginMm}
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
                <div className={`pad-footer-credit pt-4 border-t border-amber-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1 ${isPadMode ? 'hidden print:hidden' : ''}`}>
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
                isPadMode={isPadMode}
                padTopMarginMm={padTopMarginMm}
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
                    {invoice.referenceNo && !['nill', 'nil', 'none', 'null', '-'].includes(invoice.referenceNo.trim().toLowerCase()) && (
                      <div className="flex items-baseline">
                        <span className="w-28 shrink-0 text-slate-500 font-semibold">Ref/PO # :</span>
                        <span className="font-bold text-amber-700 font-mono">{invoice.referenceNo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Challan Table Container */}
              <div className="rounded-xl border-2 border-slate-400 print:border-slate-600 overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b-2 border-slate-900">
                      <th className="py-2.5 px-3 text-center border-r border-slate-700 font-bold w-12">SL</th>
                      <th className="py-2.5 px-3 text-left border-r border-slate-700 font-bold">Description of Goods Delivered</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-700 font-bold w-20">Unit</th>
                      <th className="py-2.5 px-3 text-right font-bold w-36">Delivered Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs bg-white">
                    {invoice.items.map((i, idx) => (
                      <tr key={idx} className={`border-b border-slate-300 print:border-slate-400 last:border-b-0 hover:bg-slate-50/60 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
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
              </div>

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
                <div className={`pad-footer-credit pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1 ${isPadMode ? 'hidden print:hidden' : ''}`}>
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
            <div className="pos-thermal-sheet bg-white w-[78mm] max-w-[78mm] mx-auto p-2 border border-slate-300 print:border-none print:shadow-none font-mono text-black leading-tight space-y-2 select-text">
              {/* 1. Company Branding Header */}
              <div className="text-center space-y-0.5 pb-2 border-b-2 border-dashed border-black">
                <div className="font-black text-sm uppercase tracking-wide text-black">
                  {profile.name || 'DOT COLOR COMMUNICATION'}
                </div>
                <div className="text-[10px] font-bold text-black uppercase">
                  {profile.category || 'Printing, Packaging & Signage'}
                </div>
                {(profile.officeAddress || profile.factoryAddress) && (
                  <div className="text-[9px] text-black leading-snug">
                    {profile.officeAddress || profile.factoryAddress}
                  </div>
                )}
                <div className="text-[10px] font-black text-black">
                  Hotline: {profile.phone || '01846100900, 01756007600'}
                </div>
              </div>

              {/* 2. Receipt Title Badge */}
              <div className="text-center py-1 border-b border-dashed border-black">
                <span className="font-black text-xs uppercase tracking-widest px-2 py-0.5 border border-black rounded-xs inline-block">
                  {(invoice as any).isQuote
                    ? '*** QUOTATION SLIP ***'
                    : (language === 'bn' ? '*** ক্যাশ মেমো / POS রিসিট ***' : '*** CASH MEMO / POS RECEIPT ***')}
                </span>
              </div>

              {/* 3. Invoice & Customer Meta */}
              <div className="text-[11px] space-y-1 pb-2 border-b-2 border-dashed border-black">
                <div className="flex justify-between font-bold">
                  <span>Invoice No:</span>
                  <span className="font-black">#{invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date &amp; Time:</span>
                  <span className="font-semibold">{invoice.date}</span>
                </div>
                {invoice.referenceNo && (
                  <div className="flex justify-between">
                    <span>Ref / PO:</span>
                    <span>{invoice.referenceNo}</span>
                  </div>
                )}
                <div className="flex justify-between items-start pt-0.5">
                  <span className="shrink-0 mr-2">Customer:</span>
                  <span className="font-black text-right break-words">{invoice.customerName}</span>
                </div>
                {invoice.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-bold">{invoice.customerPhone}</span>
                  </div>
                )}
                {invoice.deliveryDate && (
                  <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span>{invoice.deliveryDate}</span>
                  </div>
                )}
              </div>

              {/* 4. Line Items Table */}
              <div className="pb-2 border-b-2 border-dashed border-black">
                {/* Table Column Headers */}
                <div className="flex justify-between font-black text-[10px] uppercase pb-1 border-b border-black">
                  <span className="w-[45%] text-left">ITEM / বিবরণ</span>
                  <span className="w-[15%] text-center">QTY</span>
                  <span className="w-[20%] text-right">RATE</span>
                  <span className="w-[20%] text-right">TOTAL</span>
                </div>

                {/* Items Rows */}
                <div className="divide-y divide-dotted divide-slate-400 pt-1">
                  {invoice.items.map((i, idx) => (
                    <div key={idx} className="py-1 space-y-0.5">
                      <div className="font-black text-[11px] text-black leading-snug break-words">
                        {idx + 1}. {i.name}
                      </div>
                      {Boolean(i.totalSqft && i.width && i.height) && (
                        <div className="text-[9px] text-black font-semibold pl-3">
                          ({i.width}' x {i.height}' = {i.totalSqft} sqft)
                        </div>
                      )}
                      {i.notes && (
                        <div className="text-[9px] text-black pl-3 italic">
                          * {i.notes}
                        </div>
                      )}
                      <div className="flex justify-between text-[11px] font-semibold pl-3">
                        <span className="text-[10px] text-black">
                          {i.qty} {i.unit || 'pcs'} × {Number(i.unitPrice).toLocaleString()}
                        </span>
                        <span className="font-black text-black">
                          {Number(i.totalPrice).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Financial Summary */}
              <div className="space-y-1 text-xs font-bold pt-1">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal / সাবটোটাল:</span>
                  <span>{Number(invoice.subtotal).toLocaleString()} BDT</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span>Discount / ছাড়:</span>
                    <span>-{Number(invoice.discount).toLocaleString()} BDT</span>
                  </div>
                )}

                {invoice.vatAmount > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span>VAT / ভ্যাট:</span>
                    <span>+{Number(invoice.vatAmount).toLocaleString()} BDT</span>
                  </div>
                )}

                {/* GRAND TOTAL: BOLD DOUBLE LINE */}
                <div className="py-1.5 my-1 border-y-2 border-black flex justify-between items-center text-sm font-black">
                  <span>TOTAL / সর্বমোট:</span>
                  <span className="text-base">{Number(invoice.grandTotal).toLocaleString()} BDT</span>
                </div>

                <div className="flex justify-between text-[11px] font-semibold">
                  <span>Paid ({invoice.paymentMethod || 'Cash'}):</span>
                  <span>{Number(invoice.paidAmount).toLocaleString()} BDT</span>
                </div>

                {invoice.dueAmount > 0 ? (
                  <div className="flex justify-between text-xs font-black py-0.5 border-t border-dotted border-black">
                    <span>DUE / বকেয়া:</span>
                    <span className="text-sm font-black">{Number(invoice.dueAmount).toLocaleString()} BDT</span>
                  </div>
                ) : (
                  <div className="text-center font-black text-[10px] py-0.5 text-black border-t border-dotted border-black">
                    *** PAID IN FULL (পরিশোধিত) ***
                  </div>
                )}
              </div>

              {/* 6. Scannable Verification QR Code */}
              {posQrDataUrl && (
                <div className="flex flex-col items-center justify-center pt-2 border-t-2 border-dashed border-black">
                  <img
                    src={posQrDataUrl}
                    alt="Receipt Verification QR"
                    className="w-20 h-20 object-contain mx-auto"
                  />
                  <div className="text-[8px] font-bold uppercase tracking-wider text-black mt-0.5">
                    Scan to Verify / যোগাযোগ
                  </div>
                </div>
              )}

              {/* 7. Footer Notes & Credit */}
              <div className="text-center pt-1 border-t border-dashed border-black text-[9px] text-black space-y-0.5">
                <div className="font-bold">পণ্য গ্রহণের সময় গণনা ও কোয়ালিটি যাচাই করুন।</div>
                <div className="font-bold">ধন্যবাদ! আবার আসবেন।</div>
                <div className="pt-1 text-[8px] font-sans text-black">
                  Software by <strong className="font-bold">BD HOSTT</strong> (Hotline: 01846100900)
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Printer Agent Bridge Modal */}
      <PrinterBridgeModal
        isOpen={isPrinterBridgeOpen}
        onClose={() => {
          setIsPrinterBridgeOpen(false);
          checkHardwareAgentStatus().then((st) => setHardwareAgentStatus(st));
        }}
      />
    </div>
    </>
  );
};
