import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const { staffMembers = [], login, language, setLanguage } = useApp();
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    (staffMembers && staffMembers[1]?.id) || (staffMembers && staffMembers[0]?.id) || 'staff-02'
  );
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isBn = language === 'bn';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login(selectedStaffId, password);
      setIsLoading(false);
      if (res.success) {
        setSuccess(isBn ? 'সফলভাবে লগইন হয়েছে!' : 'Login successful!');
      } else {
        setError(res.message);
      }
    }, 400);
  };

  const handleQuickSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-10 px-4 sm:px-6 font-sans selection:bg-amber-100 selection:text-amber-900 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5 text-slate-500" />
          <span>{isBn ? 'English' : 'বাংলা'}</span>
        </button>
      </div>

      {/* Header with Logo */}
      <div className="w-full max-w-lg flex flex-col items-center justify-center text-center">
        <BrandLogo size="lg" showTagline={true} />

        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
          {isBn ? 'সিস্টেম লগইন' : 'System Login'}
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          {isBn
            ? 'আপনার অ্যাকাউন্ট নির্বাচন করে পাসওয়ার্ড দিন'
            : 'Select your account and enter your password'}
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-6 w-full max-w-lg bg-white p-7 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80">
        {/* SELECT USER */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            {isBn ? 'ব্যবহারকারী নির্বাচন করুন' : 'SELECT USER'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {staffMembers.map((staff) => {
              const isSelected = staff.id === selectedStaffId;
              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleQuickSelect(staff.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl text-left border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/10 shadow-2xs'
                      : 'border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${
                      staff.avatarColor || 'bg-blue-600'
                    } flex items-center justify-center text-white text-sm font-black shrink-0 shadow-2xs`}
                  >
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {isBn && staff.nameBn ? staff.nameBn : staff.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {isBn && staff.roleBn ? staff.roleBn.split(' ')[0] : staff.role}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* PASSWORD / PIN CODE */}
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2"
            >
              {isBn ? 'পাসওয়ার্ড / পিন কোড' : 'PASSWORD / PIN CODE'}
            </label>
            <div className="relative rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isBn ? 'ডিফল্ট পিন: 1234' : 'Default PIN: 1234'}
                className="block w-full pl-10 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-950 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-sm font-medium transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error & Success Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs border border-rose-200/80"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs border border-emerald-200/80"
              >
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="font-semibold">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Sign In Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-6 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isBn ? 'লগইন করুন' : 'Sign In'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info note */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-normal">
            {isBn
              ? 'অনুমোদিত অ্যাক্সেসের জন্য ডিফল্ট পিন কোড হিসেবে "1234" ব্যবহার করুন।'
              : 'Use default PIN code "1234" for authorized system access.'}
          </p>
        </div>
      </div>

      {/* Powered by BD HOSTT IT Partner Promotion */}
      <div className="mt-8 text-center flex flex-col items-center max-w-lg px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 shadow-2xs text-xs transition-all">
          <span className="text-slate-500 font-medium">Developed &amp; Powered by</span>
          <a
            href="https://www.bdhost.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
          >
            <span>BD HOSTT</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
              IT Solutions
            </span>
          </a>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">
          Web Hosting • Domain Registration • Cloud VPS • Custom ERP &amp; POS Systems
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Hotline: <strong className="text-slate-600 font-semibold">01846100900, 01756007600</strong> • <a href="https://www.bdhost.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.bdhost.com</a>
        </p>
      </div>
    </div>
  );
};
