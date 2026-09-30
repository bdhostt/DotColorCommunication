import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Wifi,
  FileText,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { dispatchHardwarePrint, checkHardwareAgentStatus, HardwareAgentStatus } from '../utils/hardwarePrint';
import { useApp } from '../context/AppContext';

interface PrinterBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterBridgeModal: React.FC<PrinterBridgeModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useApp();
  const brandName = profile?.name || 'DotColor Communication';
  const [isChecking, setIsChecking] = useState(false);
  const [agentStatus, setAgentStatus] = useState<HardwareAgentStatus>({ isOnline: false });
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean | null>(null);
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    setTestPrintSuccess(null);
    try {
      const status = await checkHardwareAgentStatus();
      setAgentStatus(status);
    } catch {
      setAgentStatus({ isOnline: false });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    setTestPrintSuccess(null);
    try {
      const testPayload = {
        companyName: brandName,
        companyCategory: profile?.category || 'Printing, Packaging & Signage',
        companyHotline: profile?.phone || '01846100900',
        companyAddress: profile?.officeAddress || profile?.factoryAddress || 'Dhaka, Bangladesh',
        documentTitle: 'PRINTER TEST / টেস্ট বিল',
        invoiceNo: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleString(),
        customerName: 'Hardware Test Mode',
        customerPhone: '01846100900',
        items: [
          { name: '80mm Thermal Head Test', qty: 1, unitPrice: 0, totalPrice: 0 },
          { name: 'Direct ESC/POS Communication', qty: 1, unitPrice: 0, totalPrice: 0 },
        ],
        subtotal: 0,
        discount: 0,
        grandTotal: 0,
        paidAmount: 0,
        dueAmount: 0,
        paymentMethod: 'Test',
      };
      const ok = await dispatchHardwarePrint('/api/hardware/print-invoice', testPayload);
      setTestPrintSuccess(ok);
    } catch {
      setTestPrintSuccess(false);
    } finally {
      setIsTestingPrint(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-xl ${
                agentStatus.isOnline
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>{brandName} Printer Bridge</span>
                {agentStatus.isOnline ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                    Not Detected
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Direct USB &amp; LAN (192.168.1.87) 80mm thermal hardware print service
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className="mt-4 p-4 rounded-xl border bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">This PC Local Agent Status:</span>
            </div>
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Re-check'}</span>
            </button>
          </div>

          {agentStatus.isOnline ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Local Print Agent is running smoothly (Instant 0ms print)!</span>
              </div>
              <div className="text-[11px] text-emerald-700 pl-6 space-y-0.5">
                <div>
                  Primary Target Printer:{' '}
                  <strong className="text-emerald-950 font-mono">{agentStatus.activePrinter || '80 Printer'}</strong>
                </div>
                {agentStatus.printers && agentStatus.printers.length > 0 && (
                  <div className="text-slate-600 text-[10px]">
                    Detected Floor Printers: {agentStatus.printers.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Print Agent is not running on this PC!</span>
              </div>
              <p className="text-[11px] text-rose-700 pl-6">
                Please download and start the printer agent on this computer to send 80mm thermal receipts directly to your POS printer with zero spooler distortion.
              </p>
            </div>
          )}

          {/* Test Print Action */}
          {agentStatus.isOnline && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">Verify thermal head &amp; paper cutter:</span>
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestingPrint}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTestingPrint ? 'Sending Test...' : 'Send Hardware Test Print'}</span>
              </button>
            </div>
          )}

          {testPrintSuccess === true && (
            <div className="p-2 bg-emerald-100 text-emerald-900 rounded-md text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Test print dispatched successfully to thermal printer!</span>
            </div>
          )}
          {testPrintSuccess === false && (
            <div className="p-2 bg-rose-100 text-rose-900 rounded-md text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Failed to send test print. Make sure your thermal printer is turned on and connected.</span>
            </div>
          )}
        </div>

        {/* 1-Click Installer Section */}
        <div className="mt-5 p-4 rounded-xl border border-blue-200 bg-linear-to-br from-blue-50/70 to-indigo-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              <h4 className="font-extrabold text-sm text-slate-900">
                1-Click Device Setup (Download Installer)
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
              Windows 10 / 11
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Click the button below to download the printer agent setup package for your POS cash counter or print station:
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <a
              href="/downloads/DotColorPrinter-Setup.zip"
              download="DotColorPrinter-Setup.zip"
              className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Download className="w-4 h-4" />
              <span>Download DotColor Printer Setup (.ZIP)</span>
            </a>

            <a
              href="/api/download/printer-installer-bat"
              download="INSTALL-DOTCOLOR-PRINTER.bat"
              className="w-full sm:w-auto py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
              title="Download standalone BAT installer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Direct .BAT</span>
            </a>
          </div>
        </div>

        {/* 3 Step Installation Instructions */}
        <div className="mt-5 space-y-2.5">
          <h5 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Easy 3-Step Setup:</span>
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                1
              </div>
              <div className="font-bold text-xs text-slate-800">Download &amp; Unzip</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Download the ZIP file and extract (unzip) it into any folder.
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                2
              </div>
              <div className="font-bold text-xs text-slate-800">Run Installer</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Double-click the <strong>INSTALL-DOTCOLOR-PRINTER.bat</strong> file.
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                3
              </div>
              <div className="font-bold text-xs text-slate-800">Auto Ready &amp; Silent</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                A desktop shortcut will appear and it starts automatically with Windows!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-blue-600" />
            <span>Default LAN: 192.168.1.87 (80 Printer)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
