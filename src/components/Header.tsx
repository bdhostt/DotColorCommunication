import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import {
  Building2,
  Factory,
  Globe2,
  Database,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  X,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    profile,
    products,
    invoices,
    transactions,
    language,
    setLanguage,
    activeLocation,
    setActiveLocation,
    exportDatabase,
    importDatabase,
    resetToDefaultData,
    activeStaff,
    logout,
    cloudSyncStatus,
    isCloudConnected,
    lastSyncedAt,
    syncWithCloud,
  } = useApp();

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Compute stats
  const lowStockCount = products.filter(
    (p) => p.stockFactory + p.stockOffice <= p.minStockAlert
  ).length;

  const totalSalesAmount = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalDueAmount = invoices.reduce((acc, inv) => acc + inv.dueAmount, 0);

  const handleExport = () => {
    const dataStr = exportDatabase();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dot-color-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importDatabase(content);
      if (ok) {
        setImportStatus('success');
        setTimeout(() => {
          setImportStatus(null);
          setShowBackupModal(false);
        }, 1200);
      } else {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="text-left focus:outline-hidden"
              >
                <BrandLogo size="md" showTagline={false} />
              </button>
            </div>

            {/* Middle: Single Central Warehouse Badge */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'সেন্ট্রাল ওয়্যারহাউজ ও হেড অফিস' : 'Central Warehouse & Head Office'}</span>
            </div>

            {/* Right: Actions, Badges & Toggles */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Alert Badge for Low Stock */}
              {lowStockCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                  title="Items running low on stock"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="hidden sm:inline">
                    {language === 'bn' ? 'স্টক সতর্কতা' : 'Low Stock'}
                  </span>
                  <span className="bg-rose-600 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                    {lowStockCount}
                  </span>
                </button>
              )}

              {/* Company Info Button */}
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={language === 'bn' ? 'যোগাযোগ ও অফিসের তথ্য' : 'Company & Contact Info'}
              >
                <Phone className="w-4 h-4" />
              </button>

              {/* Settings / Configuration Module */}
              <button
                type="button"
                id="btn-nav-settings"
                onClick={() => setActiveTab('settings')}
                className={`p-2 rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={language === 'bn' ? 'কনফিগারেশন ও সেটিংস' : 'Settings & Admin'}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Cloud Sync Status Indicator */}
              <button
                type="button"
                onClick={() => syncWithCloud()}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isCloudConnected
                    ? cloudSyncStatus === 'syncing'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
                title={
                  isCloudConnected
                    ? `MongoDB Atlas: Connected (${lastSyncedAt ? `Last: ${lastSyncedAt}` : 'Ready'}) - Click to Sync`
                    : 'MongoDB Not Connected (Running in Local Storage mode) - Click to retry'
                }
              >
                {isCloudConnected ? (
                  cloudSyncStatus === 'syncing' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  )
                ) : (
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden md:inline">
                  {isCloudConnected
                    ? cloudSyncStatus === 'syncing'
                      ? 'Syncing...'
                      : 'DB Synced'
                    : 'Local Mode'}
                </span>
              </button>

              {/* Data Backup Modal */}
              <button
                type="button"
                onClick={() => setShowBackupModal(true)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={language === 'bn' ? 'ডাটা ব্যাকআপ / রিস্টোর' : 'Data Backup & Restore'}
              >
                <Database className="w-4 h-4" />
              </button>

              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-800 transition-all shadow-2xs shrink-0"
              >
                <Globe2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'bn' ? 'বাংলা' : 'EN'}</span>
              </button>

              {/* User Session & Logout */}
              {activeStaff && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {language === 'bn' && activeStaff.nameBn ? activeStaff.nameBn : activeStaff.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                      {language === 'bn' && activeStaff.roleBn ? activeStaff.roleBn.split(' ')[0] : activeStaff.role}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${activeStaff.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs`} title={activeStaff.role}>
                    {activeStaff.name.charAt(0)}
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title={language === 'bn' ? 'লগ আউট করুন' : 'Log Out'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-50 border-t border-slate-200 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex gap-1 sm:gap-1.5 py-2">
            {[
              { id: 'pos', labelEn: 'POS Counter', labelBn: 'পিওএস কাউন্টার' },
              { id: 'sales', labelEn: 'Sales & Orders', labelBn: 'সেলস ও ওয়ার্ক অর্ডার' },
              { id: 'inventory', labelEn: 'Inventory', labelBn: 'ইনভেন্টরি ও স্টক' },
              { id: 'supply', labelEn: 'Supply & Purchase', labelBn: 'সাপ্লাই চেইন ও পারচেস' },
              { id: 'accounting', labelEn: 'Accounting', labelBn: 'অ্যাকাউন্টিং ও অর্থ' },
              { id: 'reports', labelEn: 'Reports', labelBn: 'রিপোর্ট ও বিশ্লেষণ' },
              { id: 'settings', labelEn: 'Settings & Admin', labelBn: 'সেটিংস ও অ্যাডমিন' },
              { id: 'profile', labelEn: 'Company Profile', labelBn: 'কোম্পানি প্রোফাইল' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg whitespace-nowrap transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {language === 'bn' ? tab.labelBn : tab.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Backup & Restore Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {language === 'bn' ? 'ডাটা ব্যাকআপ ও রিস্টোর' : 'Data Backup & Restore'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'আপনার সমস্ত সেলস, পারচেস, ইনভেন্টরি স্টক ও অ্যাকাউন্টিং ডাটা ব্রাউজারে সংরক্ষিত থাকে। নিয়মিত ব্যাকআপ ফাইল ডাউনলোড করে রাখতে পারেন।'
                  : 'All sales invoices, purchase records, inventory stock and financial ledgers are securely stored locally. You can download an offline JSON backup or restore anytime.'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all group text-center"
                >
                  <Download className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">
                    {language === 'bn' ? 'ব্যাকআপ ডাউনলোড' : 'Download Backup'}
                  </span>
                  <span className="text-[10px] text-slate-500">.json format</span>
                </button>

                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-800 hover:bg-slate-50 transition-all cursor-pointer text-center">
                  <Upload className="w-6 h-6 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">
                    {language === 'bn' ? 'ফাইল রিস্টোর' : 'Restore File'}
                  </span>
                  <span className="text-[10px] text-slate-500">upload JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* MongoDB Atlas Cloud Sync Status & Action */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isCloudConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {language === 'bn' ? 'মঙ্গোডিবি ক্লাউড সিঙ্ক' : 'MongoDB Atlas Cloud Sync'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isCloudConnected
                          ? (lastSyncedAt ? `${language === 'bn' ? 'সর্বশেষ সিঙ্ক: ' : 'Last: '}${lastSyncedAt}` : 'Connected')
                          : (language === 'bn' ? 'কানেক্টেড নয় (লোকাল স্টোরেজ মোড)' : 'Not Connected (Local Mode)')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => syncWithCloud()}
                    disabled={cloudSyncStatus === 'syncing'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors shadow-2xs shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>{cloudSyncStatus === 'syncing' ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (language === 'bn' ? 'এখন সিঙ্ক করুন' : 'Sync Now')}</span>
                  </button>
                </div>
              </div>

              {importStatus === 'success' && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {language === 'bn' ? 'ডাটা সফলভাবে রিস্টোর হয়েছে!' : 'Data restored successfully!'}
                </div>
              )}

              {importStatus === 'error' && (
                <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {language === 'bn' ? 'ভুল ফরম্যাট! সঠিক JSON ফাইল আপলোড করুন।' : 'Invalid JSON file format!'}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        language === 'bn'
                          ? 'আপনি কি নিশ্চিত যে ডেমো ডাটায় রিসেট করতে চান?'
                          : 'Are you sure you want to reset to demo data?'
                      )
                    ) {
                      resetToDefaultData();
                      setShowBackupModal(false);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'ডেমো ডাটায় রিসেট' : 'Reset to Default'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info & Contact Modal (from User photos) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <BrandLogo size="md" showTagline={true} />
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-700">
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                <span className="font-bold text-amber-900 text-sm block">
                  {profile?.name || 'DotColorCommunication Sales, POS & ERP'}
                </span>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {profile?.tagline || 'YOUR VISION, OUR CREATION!'} — {profile?.category || 'Premier digital printing, 3D signage, corporate promotional merchandise, and custom ERP solution provider.'}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Factory className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">
                      {language === 'bn' ? 'ফ্যাক্টরি অ্যাড্রেস:' : 'FACTORY:'}
                    </strong>
                    <span className="text-slate-600">{profile.factoryAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">
                      {language === 'bn' ? 'হেড অফিস:' : 'OFFICE:'}
                    </strong>
                    <span className="text-slate-600">{profile.officeAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="text-slate-900 inline font-semibold">
                      {language === 'bn' ? 'হটলাইন:' : 'Hotline:'}{' '}
                    </strong>
                    <a
                      href={`tel:${profile.phone}`}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      {profile.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <strong className="text-slate-900 inline font-semibold">
                      {language === 'bn' ? 'ইমেইল:' : 'Emails:'}{' '}
                    </strong>
                    <span className="text-slate-600">{profile.emails.join(' • ')}</span>
                  </div>
                </div>
              </div>

              {/* Dedicated BD HOSTT Technology Partner Advertising Card */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 rounded-2xl text-white shadow-xs border border-blue-900/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                    TECHNOLOGY &amp; IT PARTNER
                  </span>
                  <span className="text-[10px] font-semibold text-amber-400">
                    ★ Certified IT Solutions
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white">
                    BD HOSTT
                  </h4>
                  <a
                    href="https://www.bdhost.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 underline"
                  >
                    www.bdhost.com ↗
                  </a>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Web Hosting, Domain Registration, High-Performance VPS, Enterprise POS &amp; ERP Solutions.
                </p>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Hotline: <strong className="text-white">01846100900</strong></span>
                  <a
                    href="tel:01846100900"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] transition-colors"
                  >
                    Call BD HOSTT
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                {language === 'bn' ? 'ঠিক আছে' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
