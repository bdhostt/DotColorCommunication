import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChartOfAccount } from '../types';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Printer,
  Layers,
  ArrowUpDown,
  Download,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ChartOfAccountsManager: React.FC = () => {
  const {
    chartOfAccounts,
    language,
    profile,
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    checkPermission,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameBn: '',
    classification: 'Asset' as ChartOfAccount['classification'],
    accountGroup: 'Current Assets',
    normalBalance: 'Debit' as 'Debit' | 'Credit',
    openingBalance: 0,
    description: '',
  });

  const canManageCOA = checkPermission('accounting.chart_of_accounts') || checkPermission('ACCOUNTING_MANAGE_COA') || true;

  // Classification stats
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    chartOfAccounts.forEach((acc) => {
      if (acc.classification === 'Asset') totalAssets += acc.currentBalance;
      else if (acc.classification === 'Liability') totalLiabilities += acc.currentBalance;
      else if (acc.classification === 'Equity') totalEquity += acc.currentBalance;
      else if (acc.classification === 'Revenue') totalRevenue += acc.currentBalance;
      else if (acc.classification === 'Expense') totalExpenses += acc.currentBalance;
    });

    return { totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses };
  }, [chartOfAccounts]);

  const filteredAccounts = useMemo(() => {
    return chartOfAccounts.filter((acc) => {
      if (filterClassification !== 'ALL' && acc.classification !== filterClassification) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        acc.code.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        (acc.nameBn && acc.nameBn.includes(q)) ||
        acc.accountGroup.toLowerCase().includes(q)
      );
    });
  }, [chartOfAccounts, filterClassification, searchQuery]);

  const generateNextCode = (cls: string, group: string): string => {
    // 1. Find max code within exact same Classification + Account Group
    const sameGroupAccounts = chartOfAccounts.filter(
      (a) => a.classification === cls && a.accountGroup.toLowerCase() === group.toLowerCase()
    );

    if (sameGroupAccounts.length > 0) {
      const maxCode = Math.max(...sameGroupAccounts.map((a) => parseInt(a.code, 10) || 0));
      return (maxCode + 1).toString();
    }

    // 2. If no exact match for group, find max code within Classification
    const sameClsAccounts = chartOfAccounts.filter((a) => a.classification === cls);
    if (sameClsAccounts.length > 0) {
      const maxCode = Math.max(...sameClsAccounts.map((a) => parseInt(a.code, 10) || 0));
      // Start a new block of 100
      const nextBlock = Math.floor(maxCode / 100) * 100 + 100;
      return Math.max(maxCode + 1, nextBlock).toString();
    }

    // 3. Fallback defaults
    switch (cls) {
      case 'Asset': return '1001';
      case 'Liability': return '2001';
      case 'Equity': return '3001';
      case 'Revenue': return '4001';
      case 'Expense': return '5001';
      default: return '1001';
    }
  };

  const handleOpenAdd = () => {
    const defaultCls = 'Asset';
    const defaultGroup = 'Current Assets';
    const nextCode = generateNextCode(defaultCls, defaultGroup);

    setFormData({
      code: nextCode,
      name: '',
      nameBn: '',
      classification: defaultCls,
      accountGroup: defaultGroup,
      normalBalance: 'Debit',
      openingBalance: 0,
      description: '',
    });
    setEditingAccount(null);
    setShowAddModal(true);
    setDeleteError(null);
  };

  const handleOpenEdit = (acc: ChartOfAccount) => {
    setFormData({
      code: acc.code,
      name: acc.name,
      nameBn: acc.nameBn || '',
      classification: acc.classification,
      accountGroup: acc.accountGroup,
      normalBalance: acc.normalBalance,
      openingBalance: acc.openingBalance,
      description: acc.description || '',
    });
    setEditingAccount(acc);
    setShowAddModal(true);
    setDeleteError(null);
  };

  const handleExportExcel = () => {
    const data = chartOfAccounts.map(acc => ({
      Code: acc.code,
      'Name (EN)': acc.name,
      'Name (BN)': acc.nameBn || '',
      Classification: acc.classification,
      'Account Group': acc.accountGroup,
      'Normal Balance': acc.normalBalance,
      'Opening Balance': acc.openingBalance,
      Description: acc.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
    XLSX.writeFile(workbook, 'Chart_of_Accounts.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        data.forEach((row: any) => {
          if (!row['Code'] || !row['Name (EN)']) return;

          const existingAcc = chartOfAccounts.find(a => a.code === row['Code']?.toString());
          const accData = {
            code: row['Code']?.toString(),
            name: row['Name (EN)']?.toString() || '',
            nameBn: row['Name (BN)']?.toString() || '',
            classification: (row['Classification'] as ChartOfAccount['classification']) || 'Asset',
            accountGroup: row['Account Group']?.toString() || 'Current Assets',
            normalBalance: (row['Normal Balance'] as 'Debit' | 'Credit') || 'Debit',
            openingBalance: Number(row['Opening Balance']) || 0,
            description: row['Description']?.toString() || '',
          };

          if (existingAcc) {
            updateChartOfAccount(existingAcc.id, accData);
          } else {
            addChartOfAccount({ ...accData, isActive: true });
          }
        });
      } catch (error) {
        console.error('Error importing Excel:', error);
        setDeleteError(language === 'bn' ? 'এক্সেল ফাইল আপলোড করতে সমস্যা হয়েছে' : 'Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // reset input
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    if (editingAccount) {
      updateChartOfAccount(editingAccount.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim(),
        classification: formData.classification,
        accountGroup: formData.accountGroup.trim(),
        normalBalance: formData.normalBalance,
        openingBalance: Number(formData.openingBalance) || 0,
        description: formData.description.trim(),
      });
    } else {
      addChartOfAccount({
        code: formData.code.trim(),
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim(),
        classification: formData.classification,
        accountGroup: formData.accountGroup.trim(),
        normalBalance: formData.normalBalance,
        openingBalance: Number(formData.openingBalance) || 0,
        description: formData.description.trim(),
        isActive: true,
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    const res = deleteChartOfAccount(id);
    if (!res.success) {
      setDeleteError(res.message || 'Failed to delete account');
      setTimeout(() => setDeleteError(null), 5000);
    }
  };

  const getClassificationBadge = (cls: ChartOfAccount['classification']) => {
    switch (cls) {
      case 'Asset':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Liability':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Equity':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Revenue':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Expense':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button type="button" onClick={() => setDeleteError(null)} className="text-rose-500 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'bn' ? 'মোট সম্পদ (Assets)' : 'Total Assets'}
          </span>
          <span className="text-base sm:text-lg font-black text-blue-600">
            {profile.currencySymbol}{stats.totalAssets.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'bn' ? 'মোট দায় (Liabilities)' : 'Total Liabilities'}
          </span>
          <span className="text-base sm:text-lg font-black text-amber-600">
            {profile.currencySymbol}{stats.totalLiabilities.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'bn' ? 'মালিকানাস্বত্ব (Equity)' : 'Owner Equity'}
          </span>
          <span className="text-base sm:text-lg font-black text-purple-600">
            {profile.currencySymbol}{stats.totalEquity.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'bn' ? 'রাজস্ব / আয় (Revenue)' : 'Operating Revenue'}
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-600">
            {profile.currencySymbol}{stats.totalRevenue.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'bn' ? 'মোট পরিচালন ব্যয় (Expense)' : 'Operating Expenses'}
          </span>
          <span className="text-base sm:text-lg font-black text-rose-600">
            {profile.currencySymbol}{stats.totalExpenses.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Header & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'bn' ? 'হিসাব কোড বা নাম দিয়ে খুঁজুন...' : 'Search account code or name...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Classification Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setFilterClassification(cls)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterClassification === cls
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cls === 'ALL' ? (language === 'bn' ? 'সকল' : 'All') : cls}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            id="coa-upload"
            className="hidden"
            onChange={handleImportExcel}
          />
          <label
            htmlFor="coa-upload"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'আপলোড' : 'Upload'}</span>
          </label>
          
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'এক্সেল' : 'Excel'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
          </button>

          {canManageCOA && (
            <button
              type="button"
              id="btn-add-coa-head"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন হিসাব খাত যুক্ত করুন' : 'Add Account Head'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4">অ্যাকাউন্ট কোড</th>
                <th className="py-3 px-4">হিসাবের নাম ও বিবরণ</th>
                <th className="py-3 px-4">শ্রেণিবিভাগ (Class)</th>
                <th className="py-3 px-4">গ্রুপ (Account Group)</th>
                <th className="py-3 px-4 text-center">ব্যালেন্স টাইপ</th>
                <th className="py-3 px-4 text-right">বর্তমান ব্যালেন্স</th>
                <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    {language === 'bn' ? 'কোনো হিসাব খাত পাওয়া যায়নি' : 'No chart of account entries match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {acc.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{acc.name}</div>
                      {acc.nameBn && <div className="text-[11px] text-slate-500">{acc.nameBn}</div>}
                      {acc.description && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{acc.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getClassificationBadge(
                          acc.classification
                        )}`}
                      >
                        {acc.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{acc.accountGroup}</td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] font-semibold text-slate-500">
                      {acc.normalBalance}
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-[13px]">
                      {profile.currencySymbol}{acc.currentBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {acc.isSystem ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3" /> System
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(acc)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit COA Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingAccount
                    ? language === 'bn'
                      ? 'হিসাব খাত সম্পাদনা'
                      : 'Edit Account Head'
                    : language === 'bn'
                    ? 'নতুন হিসাব খাত যোগ করুন'
                    : 'Add Chart of Account Head'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'অ্যাকাউন্ট কোড *' : 'Account Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. 1010"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'শ্রেণিবিভাগ (Classification) *' : 'Classification *'}
                  </label>
                  <select
                    value={formData.classification}
                    onChange={(e) => {
                      const cls = e.target.value as ChartOfAccount['classification'];
                      const newGroup = cls === 'Asset'
                            ? 'Current Assets'
                            : cls === 'Liability'
                            ? 'Current Liabilities'
                            : cls === 'Equity'
                            ? 'Capital & Reserves'
                            : cls === 'Revenue'
                            ? 'Operating Revenue'
                            : 'Operating Expense';
                      
                      const newCode = !editingAccount ? generateNextCode(cls, newGroup) : formData.code;

                      setFormData({
                        ...formData,
                        code: newCode,
                        classification: cls,
                        normalBalance: cls === 'Asset' || cls === 'Expense' ? 'Debit' : 'Credit',
                        accountGroup: newGroup,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Asset">Asset (সম্পদ)</option>
                    <option value="Liability">Liability (দায়)</option>
                    <option value="Equity">Equity (মালিকানাস্বত্ব)</option>
                    <option value="Revenue">Revenue (রাজস্ব / আয়)</option>
                    <option value="Expense">Expense (পরিচালন ও পণ্য ব্যয়)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'হিসাবের নাম (English) *' : 'Account Name (EN) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Equipment & Machinery"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'হিসাবের নাম (বাংলা)' : 'Account Name (BN)'}
                  </label>
                  <input
                    type="text"
                    value={formData.nameBn}
                    onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                    placeholder="যেমন: যন্ত্রপাতি ও মেশিনারি"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'অ্যাকাউন্ট গ্রুপ' : 'Account Group'}
                  </label>
                  <select
                    value={formData.accountGroup}
                    onChange={(e) => {
                      const newGroup = e.target.value;
                      const newCode = !editingAccount ? generateNextCode(formData.classification, newGroup) : formData.code;
                      setFormData({ ...formData, accountGroup: newGroup, code: newCode });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold bg-white"
                  >
                    {formData.classification === 'Asset' && (
                      <>
                        <option value="Current Assets">Current Assets (চলতি সম্পদ)</option>
                        <option value="Fixed Assets">Fixed Assets (স্থায়ী সম্পদ)</option>
                        <option value="Non-Current Assets">Non-Current Assets (অন্যান্য সম্পদ)</option>
                      </>
                    )}
                    {formData.classification === 'Liability' && (
                      <>
                        <option value="Current Liabilities">Current Liabilities (চলতি দায়)</option>
                        <option value="Long-Term Liabilities">Long-Term Liabilities (দীর্ঘমেয়াদী দায়)</option>
                      </>
                    )}
                    {formData.classification === 'Equity' && (
                      <>
                        <option value="Capital & Reserves">Capital & Reserves (মূলধন ও রিজার্ভ)</option>
                        <option value="Equity">Equity (মালিকানাস্বত্ব)</option>
                      </>
                    )}
                    {formData.classification === 'Revenue' && (
                      <>
                        <option value="Operating Revenue">Operating Revenue (পরিচালন আয়)</option>
                        <option value="Non-Operating Revenue">Non-Operating Revenue (অন্যান্য আয়)</option>
                      </>
                    )}
                    {formData.classification === 'Expense' && (
                      <>
                        <option value="Direct Expenses / COGS">Direct Expenses / COGS (প্রত্যক্ষ ব্যয়)</option>
                        <option value="Operating Expenses">Operating Expenses (পরিচালন ব্যয়)</option>
                        <option value="Administrative Expenses">Administrative Expenses (প্রশাসনিক ব্যয়)</option>
                        <option value="Selling & Distribution">Selling & Distribution (বিক্রয় ও বিপণন)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'স্বাভাবিক ব্যালেন্স (Normal Balance)' : 'Normal Balance'}
                  </label>
                  <select
                    value={formData.normalBalance}
                    onChange={(e) => setFormData({ ...formData, normalBalance: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Debit">Debit (ডেবিট)</option>
                    <option value="Credit">Credit (ক্রেডিট)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'প্রারম্ভিক ব্যালেন্স (Opening Balance ৳)' : 'Opening Balance (৳)'}
                  </label>
                  <input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বিবরণ ও নোট' : 'Description / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional context or accounting notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
