import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  History,
  FileSpreadsheet,
  Printer,
  Search,
  PlusCircle,
  Clock,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  List,
  GitCommit,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry, StaffMember, AuditActionType } from '../types';
import { exportAuditTrailToExcel } from '../utils/exportUtils';

interface AuditTrailComponentProps {
  onOpenPrintModal?: () => void;
}

export const AuditTrailComponent: React.FC<AuditTrailComponentProps> = ({ onOpenPrintModal }) => {
  const {
    auditLogs,
    staffMembers,
    activeStaff,
    setActiveStaff,
    addAuditLog,
    profile,
    language,
  } = useApp();

  const isBn = language === 'bn';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteCategory, setNoteCategory] = useState('Cash Drawer Verification');
  const [noteRefNo, setNoteRefNo] = useState('');
  const [noteAmount, setNoteAmount] = useState('');
  const [noteLocation, setNoteLocation] = useState<'Office' | 'Factory'>('Office');
  const [noteDetails, setNoteDetails] = useState('');
  const [noteDetailsBn, setNoteDetailsBn] = useState('');

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          log.staffName.toLowerCase().includes(term) ||
          log.staffRole.toLowerCase().includes(term) ||
          log.details.toLowerCase().includes(term) ||
          (log.detailsBn && log.detailsBn.toLowerCase().includes(term)) ||
          (log.refNo && log.refNo.toLowerCase().includes(term)) ||
          log.actionType.toLowerCase().includes(term) ||
          log.entityType.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Staff filter
      if (selectedStaffId !== 'ALL' && log.staffId !== selectedStaffId) {
        return false;
      }

      // Module filter
      if (selectedModule !== 'ALL') {
        if (selectedModule === 'Accounting' && log.entityType !== 'Accounting') return false;
        if (selectedModule === 'Sales' && log.entityType !== 'Sales' && log.entityType !== 'POS') return false;
        if (selectedModule === 'Supply Chain' && log.entityType !== 'Supply Chain') return false;
        if (selectedModule === 'Inventory' && log.entityType !== 'Inventory') return false;
        if (selectedModule === 'Audit' && log.actionType !== 'AUDIT_NOTE_ADDED') return false;
      }

      // Location filter
      if (selectedLocation !== 'ALL') {
        if (log.location !== 'All' && log.location !== selectedLocation) {
          return false;
        }
      }

      // Time filter
      if (selectedTimeFilter !== 'ALL') {
        const logDate = new Date(log.timestamp.replace(' ', 'T'));
        const now = new Date();
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 3600 * 24);

        if (selectedTimeFilter === 'TODAY' && diffDays > 1) return false;
        if (selectedTimeFilter === 'WEEK' && diffDays > 7) return false;
        if (selectedTimeFilter === 'MONTH' && diffDays > 31) return false;
      }

      return true;
    });
  }, [auditLogs, searchTerm, selectedStaffId, selectedModule, selectedLocation, selectedTimeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalEvents = auditLogs.length;
    const uniqueStaff = new Set(auditLogs.map((l) => l.staffId)).size;
    const totalAmountAudited = auditLogs.reduce((acc, l) => acc + (l.amount || 0), 0);
    const recentEvent = auditLogs[0];

    return {
      totalEvents,
      uniqueStaff,
      totalAmountAudited,
      recentEvent,
    };
  }, [auditLogs]);

  // Handle Export
  const handleExportExcel = () => {
    const filterDesc = [
      selectedStaffId !== 'ALL' ? `Staff: ${staffMembers.find((s) => s.id === selectedStaffId)?.name}` : '',
      selectedModule !== 'ALL' ? `Module: ${selectedModule}` : '',
      selectedLocation !== 'ALL' ? `Location: ${selectedLocation}` : '',
      selectedTimeFilter !== 'ALL' ? `Period: ${selectedTimeFilter}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    exportAuditTrailToExcel(
      filteredLogs,
      profile,
      filterDesc || (isBn ? 'সমস্ত অ্যাকশন ও স্টাফ লগ' : 'All Staff Activity Records')
    );
  };

  // Submit Note
  const handleSaveAuditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDetails.trim()) return;

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: noteLocation,
      actionType: 'AUDIT_NOTE_ADDED',
      entityType: 'Accounting',
      refNo: noteRefNo.trim() || `VERIFY-${Date.now().toString().slice(-4)}`,
      details: `${noteCategory}: ${noteDetails}`,
      detailsBn: noteDetailsBn.trim()
        ? `${noteCategory}: ${noteDetailsBn}`
        : `${noteCategory}: ${noteDetails}`,
      amount: noteAmount ? parseFloat(noteAmount) : undefined,
      severity: 'success',
    });

    // Reset
    setNoteDetails('');
    setNoteDetailsBn('');
    setNoteRefNo('');
    setNoteAmount('');
    setIsNoteModalOpen(false);
  };

  const getActionBadge = (actionType: AuditActionType) => {
    switch (actionType) {
      case 'EXPENSE_RECORDED':
        return {
          label: isBn ? 'ব্যয় লিপিবদ্ধ' : 'Expense Recorded',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: ArrowDownRight,
        };
      case 'PAYMENT_COLLECTED':
        return {
          label: isBn ? 'পেমেন্ট আদায়' : 'Payment Received',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: ArrowUpRight,
        };
      case 'INVOICE_CREATED':
        return {
          label: isBn ? 'ইনভয়েস তৈরি' : 'Invoice Created',
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: FileText,
        };
      case 'PO_RECEIVED':
        return {
          label: isBn ? 'মালামাল রিসিভ' : 'PO Received',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Layers,
        };
      case 'SUPPLIER_PAID':
        return {
          label: isBn ? 'সাপ্লায়ার পেমেন্ট' : 'Supplier Paid',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: DollarSign,
        };
      case 'STOCK_TRANSFERRED':
        return {
          label: isBn ? 'স্টক স্থানান্তর' : 'Stock Transfer',
          color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          icon: MapPin,
        };
      case 'STOCK_ADJUSTED':
        return {
          label: isBn ? 'স্টক সমন্বয়' : 'Stock Adjusted',
          color: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Layers,
        };
      case 'BULK_PRODUCTS_IMPORTED':
        return {
          label: isBn ? 'বাল্ক পণ্য আমদানি' : 'Bulk Items Imported',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: Layers,
        };
      case 'AUDIT_NOTE_ADDED':
      default:
        return {
          label: isBn ? 'নিরীক্ষা যাচাই' : 'Audit Verified',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: ShieldCheck,
        };
    }
  };

  return (
    <div id="audit-trail-container" className="space-y-6">
      {/* Top Banner & Active Staff Persona Switcher */}
      <div
        id="audit-trail-header"
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {isBn ? 'স্টাফ অ্যাকশন ও ইন্টারনাল অডিট ট্রেইল' : 'Staff Activity & Internal Audit Trail'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isBn ? 'লাইভ লগিং সক্রিয়' : 'Live Tracking'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn
                ? 'হিসাব শাখা, বিক্রয় কাউন্টার, কারখানা ও গুদামে কর্মী কর্তৃক সম্পাদিত প্রতিটি আর্থিক ও স্টক কার্যক্রমের অপরিবর্তনীয় নিরীক্ষা লগ।'
                : 'Tamper-evident record of all transactions, voucher entries, due collections, and stock changes by personnel.'}
            </p>
          </div>
        </div>

        {/* Active Staff Persona Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Staff Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-500 font-medium whitespace-nowrap">
              {isBn ? 'বর্তমান ব্যবহারকারী:' : 'Active Staff:'}
            </span>
            <select
              id="active-staff-select"
              aria-label={isBn ? 'বর্তমান ব্যবহারকারী নির্বাচন' : 'Select active staff persona'}
              value={activeStaff.id}
              onChange={(e) => {
                const found = staffMembers.find((s) => s.id === e.target.value);
                if (found) setActiveStaff(found);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} — {isBn ? staff.roleBn : staff.role} ({staff.location})
                </option>
              ))}
            </select>
          </div>

          {/* New Audit Note Button */}
          <button
            id="btn-add-audit-note"
            onClick={() => setIsNoteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBn ? '+ অডিট ভেরিফিকেশন' : '+ Log Audit Note'}</span>
          </button>

          {/* Export to Excel */}
          <button
            id="btn-export-audit-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            title={isBn ? 'এক্সেলে এক্সপোর্ট করুন' : 'Export Audit Log to Excel'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'এক্সেল' : 'Excel'}</span>
          </button>

          {/* Print Report */}
          {onOpenPrintModal && (
            <button
              id="btn-print-audit-report"
              onClick={onOpenPrintModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              title={isBn ? 'রিপোর্ট প্রিন্ট করুন' : 'Print Audit Report'}
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div id="audit-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div
          id="kpi-card-total-events"
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isBn ? 'মোট নিরীক্ষা ইভেন্ট' : 'Total Audited Actions'}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEvents}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredLogs.length} {isBn ? 'ফিল্টারে প্রদর্শিত' : 'in current view'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>

        {/* Audited Financial Value */}
        <div
          id="kpi-card-financial-volume"
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isBn ? 'নিরীক্ষিত আর্থিক লেনদেন' : 'Monetary Volume Audited'}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {profile.currencySymbol} {stats.totalAmountAudited.toLocaleString()}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {isBn ? 'ইনভয়েস, খরচ ও সংগ্রহ' : 'Invoices, expenses & receipts'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Active Staff Members */}
        <div
          id="kpi-card-staff-count"
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isBn ? 'সক্রিয় দায়িত্বশীল কর্মী' : 'Contributing Staff'}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {stats.uniqueStaff} <span className="text-sm font-normal text-slate-500">/ {staffMembers.length}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isBn ? 'অফিস ও ফ্যাক্টরি শাখা' : 'Office & Factory desks'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Most Recent Action */}
        <div
          id="kpi-card-recent-event"
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {isBn ? 'সর্বশেষ অ্যাকশন' : 'Latest Activity'}
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
              {stats.recentEvent?.staffName || 'System'}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {stats.recentEvent ? stats.recentEvent.timestamp : 'N/A'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar & View Toggle */}
      <div
        id="audit-filters-bar"
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="audit-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isBn
                  ? 'কর্মী, রেফারেন্স নম্বর, ভাউচার বা বিবরণ দিয়ে খুঁজুন...'
                  : 'Search by staff, reference #, voucher, description...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Table vs Timeline */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start md:self-auto">
            <button
              id="toggle-view-table"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{isBn ? 'লেজার টেবিল' : 'Table View'}</span>
            </button>
            <button
              id="toggle-view-timeline"
              onClick={() => setViewMode('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>{isBn ? 'টাইমলাইন' : 'Timeline'}</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          {/* Staff Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {isBn ? 'নির্দিষ্ট কর্মী' : 'Staff Member'}
            </label>
            <select
              id="filter-staff-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">{isBn ? 'সকল কর্মী (All Staff)' : 'All Personnel'}</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({isBn ? s.roleBn : s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {isBn ? 'মডিউল / কার্যক্রম' : 'Module / Action Scope'}
            </label>
            <select
              id="filter-module-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">{isBn ? 'সকল মডিউল (All Modules)' : 'All Modules'}</option>
              <option value="Accounting">{isBn ? 'অ্যাকাউন্টিং ও খরচ (Accounting)' : 'Accounting & Expenses'}</option>
              <option value="Sales">{isBn ? 'বিক্রয় ও পিওএস (Sales & POS)' : 'Sales & Collections'}</option>
              <option value="Supply Chain">{isBn ? 'সাপ্লাই চেইন ও ক্রয় (Supply Chain)' : 'Procurement & Vendor'}</option>
              <option value="Inventory">{isBn ? 'স্টক ও গুদাম (Inventory)' : 'Stock Movements'}</option>
              <option value="Audit">{isBn ? 'নিরীক্ষা নোট (Audit Notes)' : 'Audit & Reconciliations'}</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {isBn ? 'শাখা / অবস্থান' : 'Operating Branch'}
            </label>
            <select
              id="filter-location-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">{isBn ? 'সেন্ট্রাল ওয়্যারহাউজ (Central Store)' : 'Central Warehouse'}</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {isBn ? 'সময়কাল' : 'Time Period'}
            </label>
            <select
              id="filter-time-select"
              value={selectedTimeFilter}
              onChange={(e) => setSelectedTimeFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">{isBn ? 'সকল সময় (All Time)' : 'All Records'}</option>
              <option value="TODAY">{isBn ? 'আজকের কার্যক্রম (Today)' : 'Today'}</option>
              <option value="WEEK">{isBn ? 'গত ৭ দিন (Last 7 Days)' : 'Past 7 Days'}</option>
              <option value="MONTH">{isBn ? 'চলতি মাস (This Month)' : 'This Month'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          {isBn
            ? `ফিল্টার অনুসারে ${filteredLogs.length} টি অ্যাকশন রেকর্ড প্রদর্শিত হচ্ছে`
            : `Showing ${filteredLogs.length} audit trail events`}
        </span>
        {(searchTerm || selectedStaffId !== 'ALL' || selectedModule !== 'ALL' || selectedLocation !== 'ALL' || selectedTimeFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStaffId('ALL');
              setSelectedModule('ALL');
              setSelectedLocation('ALL');
              setSelectedTimeFilter('ALL');
            }}
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            {isBn ? 'সব ফিল্টার মুছুন' : 'Reset Filters'}
          </button>
        )}
      </div>

      {/* View 1: Table View */}
      {viewMode === 'table' && (
        <div
          id="audit-table-container"
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-36">{isBn ? 'তারিখ ও সময়' : 'Timestamp'}</th>
                  <th className="py-3 px-4 w-48">{isBn ? 'দায়িত্বশীল কর্মী' : 'Staff Member'}</th>
                  <th className="py-3 px-4 w-36">{isBn ? 'অ্যাকশন টাইপ' : 'Action Type'}</th>
                  <th className="py-3 px-4 w-32">{isBn ? 'রেফারেন্স / ভাউচার' : 'Ref / Doc #'}</th>
                  <th className="py-3 px-4">{isBn ? 'বিবরণ ও বিবরণী' : 'Particulars & Details'}</th>
                  <th className="py-3 px-4 w-28 text-right">{isBn ? 'পরিমাণ (৳)' : 'Amount'}</th>
                  <th className="py-3 px-4 w-24 text-center">{isBn ? 'শাখা' : 'Location'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-600">
                        {isBn ? 'কোনো নিরীক্ষা রেকর্ড পাওয়া যায়নি' : 'No audit records match your filters'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isBn ? 'অন্য ফিল্টার ব্যবহার করে চেষ্টা করুন' : 'Try adjusting the search or filter criteria'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => {
                    const badge = getActionBadge(log.actionType);
                    const ActionIcon = badge.icon;
                    const staff = staffMembers.find((s) => s.id === log.staffId);
                    const avatarBg = staff?.avatarColor || 'bg-slate-700';

                    return (
                      <tr
                        key={log.id}
                        id={`audit-row-${log.id}`}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{log.timestamp}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full text-white ${avatarBg} flex items-center justify-center font-bold text-[10px] shrink-0`}
                            >
                              {log.staffName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{log.staffName}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {isBn && staff ? staff.roleBn : log.staffRole}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.color}`}
                          >
                            <ActionIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700 font-medium">
                          {log.refNo ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                              {log.refNo}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <p className="font-medium line-clamp-2">
                            {isBn && log.detailsBn ? log.detailsBn : log.details}
                          </p>
                          {isBn && log.detailsBn && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{log.details}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold">
                          {log.amount !== undefined ? (
                            <span
                              className={
                                log.actionType === 'EXPENSE_RECORDED' || log.actionType === 'SUPPLIER_PAID'
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {profile.currencySymbol} {log.amount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              log.location === 'Factory'
                                ? 'bg-amber-100 text-amber-800'
                                : log.location === 'Office'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.location === 'Factory'
                              ? isBn
                                ? 'ফ্যাক্টরি'
                                : 'Factory'
                              : log.location === 'Office'
                              ? isBn
                                ? 'অফিস'
                                : 'Office'
                              : isBn
                              ? 'উভয়'
                              : 'All'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Timeline View */}
      {viewMode === 'timeline' && (
        <div id="audit-timeline-container" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">
                {isBn ? 'কোনো নিরীক্ষা রেকর্ড পাওয়া যায়নি' : 'No audit events to display'}
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.actionType);
                const ActionIcon = badge.icon;
                const staff = staffMembers.find((s) => s.id === log.staffId);
                const avatarBg = staff?.avatarColor || 'bg-slate-700';

                return (
                  <div key={log.id} id={`timeline-item-${log.id}`} className="relative group">
                    {/* Circle marker on timeline */}
                    <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-400 group-hover:border-blue-600 flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-600"></div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:shadow-xs transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full text-white ${avatarBg} flex items-center justify-center font-bold text-xs shrink-0`}
                          >
                            {log.staffName
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{log.staffName}</h4>
                              <span className="text-xs text-slate-500">
                                • {isBn && staff ? staff.roleBn : log.staffRole}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">{log.timestamp}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}
                          >
                            <ActionIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {log.location}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-800 font-medium leading-relaxed">
                        {isBn && log.detailsBn ? log.detailsBn : log.details}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {log.refNo && (
                            <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Doc: {log.refNo}
                            </span>
                          )}
                          <span className="text-slate-400">Entity: {log.entityType}</span>
                        </div>

                        {log.amount !== undefined && (
                          <div className="font-mono font-bold text-sm">
                            <span className="text-slate-500 text-xs mr-1">{isBn ? 'পরিমাণ:' : 'Amount:'}</span>
                            <span
                              className={
                                log.actionType === 'EXPENSE_RECORDED' || log.actionType === 'SUPPLIER_PAID'
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {profile.currencySymbol} {log.amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual Audit Verification Note Modal */}
      {isNoteModalOpen && (
        <div
          id="modal-audit-note-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-audit-note-content"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {isBn ? 'নিরীক্ষা ও ভেরিফিকেশন এন্ট্রি' : 'Log Internal Audit Note'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isBn ? 'দায়িত্বশীল কর্মী হিসেবে যাচাই নোট লিপিবদ্ধ করুন' : 'Verify and append to tamper-evident audit trail'}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-audit-modal"
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuditNote} className="p-6 space-y-4 text-xs">
              {/* Active Logger Badge */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">
                    {isBn ? 'নিরীক্ষক / এন্ট্রি প্রদানকারী' : 'Logged By Staff Member'}
                  </p>
                  <p className="font-bold text-slate-900 mt-0.5">{activeStaff.name}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                  {isBn ? activeStaff.roleBn : activeStaff.role}
                </span>
              </div>

              {/* Audit Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBn ? 'নিরীক্ষার ধরণ / ক্যাটাগরি' : 'Verification Category'}
                </label>
                <select
                  id="note-category-select"
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Cash Drawer Verification">
                    {isBn ? 'ক্যাশ বাক্স ও ভল্ট মেলানো (Cash Drawer Verification)' : 'Cash Drawer Reconciliation'}
                  </option>
                  <option value="Bank Statement Verification">
                    {isBn ? 'ব্যাংক স্টেটমেন্ট ও লেজার যাচাই (Bank Reconciliation)' : 'Bank Statement Verification'}
                  </option>
                  <option value="Physical Inventory Stock Count">
                    {isBn ? 'কাঁচামাল ও ফিনিশড গুডস স্টক গণনা (Stock Count)' : 'Physical Inventory Audit'}
                  </option>
                  <option value="Tax & VAT Invoice Audit">
                    {isBn ? 'ভ্যাট ও কর চালান নিরীক্ষা (Tax & VAT Audit)' : 'Tax & VAT Invoice Audit'}
                  </option>
                  <option value="Supplier Advance Authorization">
                    {isBn ? 'সাপ্লায়ার অগ্রিম বিল অনুমোদন (Advance Approval)' : 'Supplier Advance Authorization'}
                  </option>
                  <option value="Special Management Clearance">
                    {isBn ? 'ব্যবস্থাপনা কর্তৃপক্ষের বিশেষ ছাড়পত্র' : 'Special Management Clearance'}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Location */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBn ? 'শাখা / কাজের স্থান' : 'Site Location'}
                  </label>
                  <select
                    id="note-location-select"
                    value={noteLocation}
                    onChange={(e) => setNoteLocation(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Office">{isBn ? 'সেন্ট্রাল ওয়্যারহাউজ' : 'Central Warehouse'}</option>
                  </select>
                </div>

                {/* Ref No */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBn ? 'রেফারেন্স / স্লিপ নং (ঐচ্ছিক)' : 'Ref # / Voucher (Optional)'}
                  </label>
                  <input
                    id="note-ref-input"
                    type="text"
                    value={noteRefNo}
                    onChange={(e) => setNoteRefNo(e.target.value)}
                    placeholder="e.g. RECON-09-A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Amount if any */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBn ? 'যাচাইকৃত টাকার পরিমাণ (ঐচ্ছিক)' : 'Audited / Reconciled Amount (Optional)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    {profile.currencySymbol}
                  </span>
                  <input
                    id="note-amount-input"
                    type="number"
                    value={noteAmount}
                    onChange={(e) => setNoteAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Note Details English */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBn ? 'নিরীক্ষার পর্যবেক্ষণ ও বিস্তারিত বিবরণ (English)' : 'Findings & Notes (English)'}
                </label>
                <textarea
                  id="note-details-input"
                  required
                  rows={2}
                  value={noteDetails}
                  onChange={(e) => setNoteDetails(e.target.value)}
                  placeholder="e.g. Verified end-of-day counter closing cash balance ৳185,000 matches system tally."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Note Details Bengali */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBn ? 'বাংলায় বিস্তারিত বিবরণ (ঐচ্ছিক)' : 'Details in Bengali (Optional)'}
                </label>
                <textarea
                  id="note-details-bn-input"
                  rows={2}
                  value={noteDetailsBn}
                  onChange={(e) => setNoteDetailsBn(e.target.value)}
                  placeholder="যেমন: দিনের সমাপ্তিতে ক্যাশ ড্রয়ারের নগদ ১,৮৫,০০০ টাকার হিসাব ও সিস্টেমের ব্যালেন্স সঠিক পাওয়া গেছে।"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-cancel-audit-note"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="btn-submit-audit-note"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isBn ? 'লগ সংরক্ষণ করুন' : 'Append to Audit Trail'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
