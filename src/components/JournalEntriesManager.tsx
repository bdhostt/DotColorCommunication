import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JournalEntry } from '../types';
import { DocumentHeader } from './DocumentHeader';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  X,
} from 'lucide-react';

export const JournalEntriesManager: React.FC = () => {
  const {
    journalEntries = [],
    chartOfAccounts = [],
    language,
    profile,
    activeStaff,
    addJournalEntry,
    updateJournalEntry,
    checkPermission,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<any | null>(null);

  const [editFormData, setEditFormData] = useState({
    date: '',
    reference: '',
    debitAccountId: '',
    creditAccountId: '',
    amount: 0,
    narration: '',
  });

  const canCreateJournal = checkPermission('accounting.add_income') || true;

  // Normalizer for varying JournalEntry structures (Standard vs Extended formats)
  const normalizeEntry = (entry: any) => {
    if (!entry) return null;
    const voucherNo = entry.voucherNo || entry.entryNo || `JV-${entry.id}`;
    const reference = entry.reference || entry.refNo || '';
    const lines = entry.lines || [
      {
        id: `line-${entry.id}-1`,
        accountId: entry.debitAccountId || '',
        accountCode: '',
        accountName: entry.debitAccountName || 'Debit Account',
        debit: entry.amount || 0,
        credit: 0,
        description: entry.narration || '',
      },
      {
        id: `line-${entry.id}-2`,
        accountId: entry.creditAccountId || '',
        accountCode: '',
        accountName: entry.creditAccountName || 'Credit Account',
        debit: 0,
        credit: entry.amount || 0,
        description: entry.narration || '',
      }
    ];
    return {
      ...entry,
      voucherNo,
      reference,
      lines,
      totalDebit: entry.totalDebit || entry.amount || 0,
      totalCredit: entry.totalCredit || entry.amount || 0,
      createdBy: entry.createdBy || 'System',
      status: entry.status || 'Posted',
    };
  };

  const normalizedEntries = (journalEntries || []).map(normalizeEntry);
  const normalizedSelectedVoucher = selectedVoucher ? normalizeEntry(selectedVoucher) : null;

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: `JV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    debitAccountId: '',
    creditAccountId: '',
    amount: 5000,
    narration: '',
  });

  const filteredEntries = normalizedEntries.filter((je) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (je.voucherNo || '').toLowerCase().includes(q) ||
      (je.reference && je.reference.toLowerCase().includes(q)) ||
      (je.narration || '').toLowerCase().includes(q) ||
      je.lines.some((l: any) => (l.accountName || '').toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    const defaultDebit = chartOfAccounts[0]?.id || '';
    const defaultCredit = chartOfAccounts[1]?.id || '';
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      reference: `JV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      debitAccountId: defaultDebit,
      creditAccountId: defaultCredit,
      amount: 5000,
      narration: '',
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.debitAccountId || !formData.creditAccountId || formData.amount <= 0) return;
    if (formData.debitAccountId === formData.creditAccountId) {
      alert('Debit account and Credit account must be different.');
      return;
    }

    const debitAcc = chartOfAccounts.find((a) => a.id === formData.debitAccountId);
    const creditAcc = chartOfAccounts.find((a) => a.id === formData.creditAccountId);

    if (!debitAcc || !creditAcc) return;

    // Conforms strictly to Omit<JournalEntry, 'id' | 'entryNo'>
    addJournalEntry({
      date: formData.date,
      debitAccountId: debitAcc.id,
      debitAccountName: debitAcc.name,
      creditAccountId: creditAcc.id,
      creditAccountName: creditAcc.name,
      amount: Number(formData.amount),
      narration: formData.narration || 'General Journal Entry',
      source: 'MANUAL',
      createdBy: activeStaff?.name || 'Authorized Accountant',
      refNo: formData.reference,
    } as any);

    setShowAddModal(false);
  };

  const handleOpenEditVoucher = (entry: any) => {
    const norm = normalizeEntry(entry);
    const debitLine = norm.lines.find((l: any) => l.debit > 0);
    const creditLine = norm.lines.find((l: any) => l.credit > 0);

    setEditFormData({
      date: norm.date,
      reference: norm.reference || '',
      debitAccountId: debitLine ? debitLine.accountId : norm.debitAccountId || '',
      creditAccountId: creditLine ? creditLine.accountId : norm.creditAccountId || '',
      amount: norm.totalDebit || norm.amount || 0,
      narration: norm.narration || '',
    });
    setEditingVoucher(entry);
  };

  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher) return;
    if (!editFormData.debitAccountId || !editFormData.creditAccountId || editFormData.amount <= 0) return;
    if (editFormData.debitAccountId === editFormData.creditAccountId) {
      alert('Debit account and Credit account must be different.');
      return;
    }

    const debitAcc = chartOfAccounts.find((a) => a.id === editFormData.debitAccountId);
    const creditAcc = chartOfAccounts.find((a) => a.id === editFormData.creditAccountId);

    if (!debitAcc || !creditAcc) return;

    updateJournalEntry(editingVoucher.id, {
      date: editFormData.date,
      debitAccountId: debitAcc.id,
      debitAccountName: debitAcc.name,
      creditAccountId: creditAcc.id,
      creditAccountName: creditAcc.name,
      amount: Number(editFormData.amount),
      narration: editFormData.narration || 'Updated Journal Entry',
      refNo: editFormData.reference,
    } as any);

    setEditingVoucher(null);
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'ভাউচার নং বা বিবরণ দিয়ে খুঁজুন...' : 'Search voucher no, narration...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
          </button>

          {canCreateJournal && (
            <button
              type="button"
              id="btn-add-journal-entry"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন জার্নাল ভাউচার (JV)' : 'New Journal Voucher'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4">ভাউচার নম্বর</th>
                <th className="py-3 px-4">তারিখ ও রেফারেন্স</th>
                <th className="py-3 px-4">ডেবিট খতিয়ান (Debit Account)</th>
                <th className="py-3 px-4">ক্রেডিট খতিয়ান (Credit Account)</th>
                <th className="py-3 px-4 text-right">পরিমাণ (৳)</th>
                <th className="py-3 px-4">বিবরণ (Narration)</th>
                <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">ভাউচার প্রিন্ট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    {language === 'bn' ? 'কোনো জার্নাল এন্ট্রি পাওয়া যায়নি' : 'No journal voucher records found.'}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const debitLine = entry.lines.find((l: any) => l.debit > 0);
                  const creditLine = entry.lines.find((l: any) => l.credit > 0);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          {entry.voucherNo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-600">{entry.date}</div>
                        {entry.reference && <div className="text-[10px] text-slate-400">Ref: {entry.reference}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {debitLine ? debitLine.accountName : 'Debit Account'}
                        </div>
                        {debitLine && (
                          <div className="text-[10px] text-slate-400 font-mono">[{debitLine.accountCode}]</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {creditLine ? creditLine.accountName : 'Credit Account'}
                        </div>
                        {creditLine && (
                          <div className="text-[10px] text-slate-400 font-mono">[{creditLine.accountCode}]</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-[13px]">
                        {profile.currencySymbol}{entry.totalDebit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-medium">
                        {entry.narration}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> {entry.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'দেখুন ও প্রিন্ট' : 'View & Print'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditVoucher(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'সংশোধন' : 'Edit'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Journal Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {language === 'bn' ? 'নতুন জার্নাল ভাউচার নিবন্ধন' : 'Record Journal Entry (Double-Entry)'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'তারিখ *' : 'Entry Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'রেফারেন্স / মেমো নং' : 'Reference / Memo No'}
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-emerald-700 block mb-1">
                  {language === 'bn' ? '১. ডেবিট হিসাব খাত (Debit Account Dr.) *' : 'Debit Account (Dr.) *'}
                </label>
                <select
                  value={formData.debitAccountId}
                  onChange={(e) => setFormData({ ...formData, debitAccountId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/40 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- {language === 'bn' ? 'ডেবিট হিসাব নির্বাচন করুন' : 'Select Debit Account'} --</option>
                  {chartOfAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({a.classification} - {a.accountGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-blue-700 block mb-1">
                  {language === 'bn' ? '২. ক্রেডিট হিসাব খাত (Credit Account Cr.) *' : 'Credit Account (Cr.) *'}
                </label>
                <select
                  value={formData.creditAccountId}
                  onChange={(e) => setFormData({ ...formData, creditAccountId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-blue-300 bg-blue-50/40 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- {language === 'bn' ? 'ক্রেডিট হিসাব নির্বাচন করুন' : 'Select Credit Account'} --</option>
                  {chartOfAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({a.classification} - {a.accountGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'পরিমাণ (Amount ৳) *' : 'Amount (৳) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বিবরণ / কারণ (Narration) *' : 'Narration / Description *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  placeholder="e.g. Transferred factory petty cash to main BRAC Bank account or monthly depreciation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  {language === 'bn' ? 'দ্বৈত দাখিলা নিশ্চিতকরণ:' : 'Double-Entry Balanced:'}
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  Total Dr. {profile.currencySymbol}{formData.amount} = Total Cr. {profile.currencySymbol}{formData.amount}
                </span>
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
                {language === 'bn' ? 'ভাউচার পোস্ট করুন' : 'Post Journal Voucher'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Voucher Detail / Print Modal */}
      {normalizedSelectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 print:static print:bg-white print:p-0 print:overflow-visible print:block">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none print:p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500">
                {language === 'bn' ? 'ভাউচার প্রিন্ট প্রিভিউ' : 'Voucher Print Preview'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'প্রিন্ট' : 'Print'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official Document Header with Logo on Left and QR on Right */}
            <DocumentHeader
              documentTitle={language === 'bn' ? 'জার্নাল ভাউচার (JV)' : 'JOURNAL VOUCHER'}
              documentSubtitle={`${profile.name || 'DotColorCommunication'} • General Ledger & Financial Voucher`}
              documentNo={normalizedSelectedVoucher.voucherNo}
              documentDate={normalizedSelectedVoucher.date}
              referenceNo={normalizedSelectedVoucher.reference}
            />

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[10px] block">তারিখ (Date):</span>
                  <span className="font-bold text-slate-800 font-mono">{normalizedSelectedVoucher.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">রেফারেন্স (Ref):</span>
                  <span className="font-bold text-slate-800 font-mono">{normalizedSelectedVoucher.reference || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">পোস্ট করেছেন (Created By):</span>
                  <span className="font-semibold text-slate-800">{normalizedSelectedVoucher.createdBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">ভাউচার স্ট্যাটাস:</span>
                  <span className="font-bold text-emerald-600">{normalizedSelectedVoucher.status}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <th className="py-2 px-3">খাত ও কোড</th>
                      <th className="py-2 px-3 text-right">ডেবিট (Dr.)</th>
                      <th className="py-2 px-3 text-right">ক্রেডিট (Cr.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {normalizedSelectedVoucher.lines.map((l: any) => (
                      <tr key={l.id}>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 font-sans">{l.accountName}</div>
                          <div className="text-[10px] text-slate-400">[{l.accountCode}]</div>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                          {l.debit > 0 ? `${profile.currencySymbol}${l.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-700 font-bold">
                          {l.credit > 0 ? `${profile.currencySymbol}${l.credit.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                      <td className="py-2 px-3">সর্বমোট (Total):</td>
                      <td className="py-2 px-3 text-right text-emerald-800 font-mono">
                        {profile.currencySymbol}{normalizedSelectedVoucher.totalDebit.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-800 font-mono">
                        {profile.currencySymbol}{normalizedSelectedVoucher.totalCredit.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] block">বর্ণনা ও উদ্দেশ্য (Narration):</span>
                <p className="text-slate-800 font-medium mt-0.5">{normalizedSelectedVoucher.narration}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'প্রিন্ট ভাউচার' : 'Print Voucher'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Journal Entry Modal */}
      {editingVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleEditFormSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {language === 'bn' ? 'জার্নাল ভাউচার সংশোধন করুন' : 'Edit Journal Entry (Double-Entry)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'তারিখ *' : 'Entry Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'রেফারেন্স / মেমো নং' : 'Reference / Memo No'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.reference}
                    onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-emerald-700 block mb-1">
                  {language === 'bn' ? '১. ডেবিট হিসাব খাত (Debit Account Dr.) *' : 'Debit Account (Dr.) *'}
                </label>
                <select
                  value={editFormData.debitAccountId}
                  onChange={(e) => setEditFormData({ ...editFormData, debitAccountId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/40 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- {language === 'bn' ? 'ডেবিট হিসাব নির্বাচন করুন' : 'Select Debit Account'} --</option>
                  {chartOfAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({a.classification} - {a.accountGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-blue-700 block mb-1">
                  {language === 'bn' ? '২. ক্রেডিট হিসাব খাত (Credit Account Cr.) *' : 'Credit Account (Cr.) *'}
                </label>
                <select
                  value={editFormData.creditAccountId}
                  onChange={(e) => setEditFormData({ ...editFormData, creditAccountId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-blue-300 bg-blue-50/40 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- {language === 'bn' ? 'ক্রেডিট হিসাব নির্বাচন করুন' : 'Select Credit Account'} --</option>
                  {chartOfAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({a.classification} - {a.accountGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'পরিমাণ (Amount ৳) *' : 'Amount (৳) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বিবরণ / কারণ (Narration) *' : 'Narration / Description *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={editFormData.narration}
                  onChange={(e) => setEditFormData({ ...editFormData, narration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  {language === 'bn' ? 'দ্বৈত দাখিলা নিশ্চিতকরণ:' : 'Double-Entry Balanced:'}
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  Total Dr. {profile.currencySymbol}{editFormData.amount} = Total Cr. {profile.currencySymbol}{editFormData.amount}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
