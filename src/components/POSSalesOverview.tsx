import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SalesInvoice, CompanyProfile, Language } from '../types';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { exportSalesToExcel } from '../utils/exportUtils';
import { ReportPrintModal } from './ReportPrintModal';

interface POSSalesOverviewProps {
  invoices: SalesInvoice[];
  profile: CompanyProfile;
  currencySymbol: string;
  language: Language;
}

type DateFilterPreset = 'today' | 'yesterday' | '7d' | '14d' | '30d' | 'this_month' | 'custom';

export const POSSalesOverview: React.FC<POSSalesOverviewProps> = ({
  invoices,
  profile,
  currencySymbol,
  language,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter Preset State
  const [filterPreset, setFilterPreset] = useState<DateFilterPreset>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [isExpanded, setIsExpanded] = useState(true);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Apply preset dates
  const handlePresetSelect = (preset: DateFilterPreset) => {
    setFilterPreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const today = now.toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setShowCustomPicker(false);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
      setShowCustomPicker(false);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(now.getDate() - 6);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setShowCustomPicker(false);
    } else if (preset === '14d') {
      const d = new Date();
      d.setDate(now.getDate() - 13);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setShowCustomPicker(false);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(now.getDate() - 29);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setShowCustomPicker(false);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
      setShowCustomPicker(false);
    } else if (preset === 'custom') {
      setShowCustomPicker(true);
    }
  };

  // Generate date list between startDate and endDate
  const chartData = useMemo(() => {
    const data: Array<{
      dateStr: string;
      label: string;
      dayOfWeek: string;
      revenue: number;
      collected: number;
      due: number;
      orders: number;
    }> = [];

    const start = new Date(startDate || todayStr);
    const end = new Date(endDate || todayStr);

    // Swap if start is after end
    const effectiveStart = start <= end ? start : end;
    const effectiveEnd = start <= end ? end : start;

    const diffDays = Math.min(
      90, // cap to 90 days for chart performance
      Math.max(1, Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000) + 1)
    );

    for (let i = 0; i < diffDays; i++) {
      const d = new Date(effectiveStart);
      d.setDate(effectiveStart.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const dayName = d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        weekday: 'short',
      });
      const monthDay = d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });

      const dayInvoices = invoices.filter((inv) => inv.date === dateStr);
      const dayRevenue = dayInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
      const dayCollected = dayInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
      const dayDue = dayInvoices.reduce((acc, inv) => acc + (inv.dueAmount || 0), 0);

      data.push({
        dateStr,
        label: monthDay,
        dayOfWeek: dayName,
        revenue: dayRevenue,
        collected: dayCollected,
        due: dayDue,
        orders: dayInvoices.length,
      });
    }

    return data;
  }, [startDate, endDate, invoices, language, todayStr]);

  // Filtered Invoices in range
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const d = inv.date;
      return d >= startDate && d <= endDate;
    });
  }, [invoices, startDate, endDate]);

  // Summary metrics for current selection
  const periodTotalRevenue = useMemo(
    () => filteredInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0),
    [filteredInvoices]
  );
  const periodTotalCollected = useMemo(
    () => filteredInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0),
    [filteredInvoices]
  );
  const periodTotalDue = useMemo(
    () => filteredInvoices.reduce((acc, inv) => acc + (inv.dueAmount || 0), 0),
    [filteredInvoices]
  );
  const periodAvgDaily = useMemo(() => {
    return chartData.length > 0 ? Math.round(periodTotalRevenue / chartData.length) : 0;
  }, [periodTotalRevenue, chartData.length]);

  // Today's stats for reference
  const todayInvoices = invoices.filter((inv) => inv.date === todayStr);
  const todayRevenue = todayInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  // Date range display text
  const dateRangeText = useMemo(() => {
    return `${startDate} to ${endDate}`;
  }, [startDate, endDate]);

  // Direct Excel Export handler
  const handleExcelExport = () => {
    exportSalesToExcel(filteredInvoices, profile, `Period: ${dateRangeText}`);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700 min-w-[200px]">
          <div className="font-bold border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
            <span>
              {dataPoint.label} ({dataPoint.dayOfWeek})
            </span>
            <span className="text-amber-400 font-semibold">{dataPoint.orders} orders</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                {language === 'bn' ? 'মোট বিক্রয়' : 'Total Revenue'}:
              </span>
              <span className="font-bold">
                {currencySymbol}
                {dataPoint.revenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                {language === 'bn' ? 'আদায়কৃত' : 'Collected'}:
              </span>
              <span className="font-bold">
                {currencySymbol}
                {dataPoint.collected.toLocaleString()}
              </span>
            </div>
            {dataPoint.due > 0 && (
              <div className="flex items-center justify-between text-rose-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  {language === 'bn' ? 'বকেয়া' : 'Due'}:
                </span>
                <span className="font-bold">
                  {currencySymbol}
                  {dataPoint.due.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {language === 'bn' ? 'সেলস ওভারভিউ ও রাজস্ব ড্যাশবোর্ড' : 'Sales Overview & Revenue Trends'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  {language === 'bn' ? 'দৈনিক চার্ট' : 'Daily Chart'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'কাস্টম তারিখ ফিল্টার করে বিক্রয়, ক্যাশ কালেকশন ও বকেয়া অ্যানালিটিক্স দেখুন'
                  : 'Track sales, collections, and dues with custom date range filtering'}
              </p>
            </div>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Quick Filter Presets */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'today', en: 'Today', bn: 'আজকে' },
                  { id: '7d', en: '7 Days', bn: '৭ দিন' },
                  { id: '30d', en: '30 Days', bn: '৩০ দিন' },
                  { id: 'this_month', en: 'Month', bn: 'মাস' },
                  { id: 'custom', en: 'Custom', bn: 'কাস্টম' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    filterPreset === preset.id
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {language === 'bn' ? preset.bn : preset.en}
                </button>
              ))}
            </div>



            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {/* Export Excel (.xlsx) */}
              <button
                type="button"
                onClick={handleExcelExport}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-white rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                title={language === 'bn' ? 'এক্সেল ডাউনলোড (.xlsx)' : 'Download Excel Sheet'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              {/* Print / PDF Report */}
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-white rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                title={language === 'bn' ? 'প্রিন্ট / সেভ PDF রিপোর্ট' : 'Print / Save PDF Report'}
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>

            {/* Expand / Collapse */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title={isExpanded ? 'Collapse Overview' : 'Expand Overview'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Custom Date Range Filter Bar (ডেসবোডে কাস্টমস ডেইট ফিল্টার) */}
        {(showCustomPicker || filterPreset === 'custom') && (
          <div className="bg-amber-50/50 border-b border-amber-200/60 p-3 sm:p-4 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">
                  {language === 'bn' ? 'কাস্টম তারিখ নির্বাচন (Custom Date Range):' : 'Custom Date Range Filter:'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-slate-500 text-[11px] font-medium">
                    {language === 'bn' ? 'শুরু:' : 'From:'}
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFilterPreset('custom');
                    }}
                    className="text-xs font-semibold text-slate-800 outline-none bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-slate-500 text-[11px] font-medium">
                    {language === 'bn' ? 'শেষ:' : 'To:'}
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setFilterPreset('custom');
                    }}
                    className="text-xs font-semibold text-slate-800 outline-none bg-transparent"
                  />
                </div>

                {/* Reset to Today */}
                <button
                  type="button"
                  onClick={() => handlePresetSelect('today')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area (Collapsible) */}
        {isExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Top Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Selected Period Total Revenue */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  {language === 'bn' ? 'নির্বাচিত সময়ের বিক্রয়' : 'Period Gross Sales'}
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {currencySymbol}
                  {periodTotalRevenue.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">
                  {filteredInvoices.length} {language === 'bn' ? 'টি ইনভয়েস' : 'invoices in range'}
                </span>
              </div>

              {/* Total Realized Collection */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {language === 'bn' ? 'আদায়কৃত নগদ/ব্যাংক' : 'Total Collected'}
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
                  {currencySymbol}
                  {periodTotalCollected.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-600/80 font-medium">
                  {periodTotalRevenue > 0
                    ? `${Math.round((periodTotalCollected / periodTotalRevenue) * 100)}% realization`
                    : '0%'}
                </span>
              </div>

              {/* Outstanding Due */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  {language === 'bn' ? 'বকেয়া পাওনা' : 'Balance Due'}
                </span>
                <div className="text-base sm:text-lg font-black text-rose-600 mt-1">
                  {currencySymbol}
                  {periodTotalDue.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">
                  {language === 'bn' ? 'আদায়ের অপেক্ষায়' : 'Receivables outstanding'}
                </span>
              </div>

              {/* Daily Average Revenue */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  {language === 'bn' ? 'দৈনিক গড় বিক্রয়' : 'Daily Avg Sales'}
                </span>
                <div className="text-base sm:text-lg font-black text-indigo-600 mt-1">
                  {currencySymbol}
                  {periodAvgDaily.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">
                  {chartData.length} {language === 'bn' ? 'দিনের গড় গতিধারা' : 'days span active'}
                </span>
              </div>
            </div>

            {/* Bar Chart Section */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>
                    {language === 'bn'
                      ? `তারিখ অনুযায়ী বিক্রয় ও আদায়ের বার চার্ট (${dateRangeText})`
                      : `Daily Sales & Cash Realization (${dateRangeText})`}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                    {language === 'bn' ? 'মোট বিক্রয়' : 'Total Revenue'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                    {language === 'bn' ? 'আদায়কৃত ক্যাশ' : 'Cash Collected'}
                  </span>
                </div>
              </div>

              <div className="w-full h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="revenue"
                      name={language === 'bn' ? 'মোট বিক্রয়' : 'Total Revenue'}
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="collected"
                      name={language === 'bn' ? 'আদায়কৃত' : 'Cash Collected'}
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Professional Report Print & PDF Modal */}
      {showReportModal && (
        <ReportPrintModal
          type="sales"
          salesData={filteredInvoices}
          profile={profile}
          language={language}
          dateRangeText={dateRangeText}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
};
