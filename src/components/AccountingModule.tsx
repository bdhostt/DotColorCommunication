import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AccountType, TransactionType } from '../types';
import { Wallet, Building, Smartphone, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownLeft, Search, Filter, DollarSign, Calendar, Layers, FileSpreadsheet, Printer, SlidersHorizontal, RefreshCw, ShieldCheck, BookOpen, Trash2, Edit2, Eye, AlertCircle, } from 'lucide-react';
import { exportAccountingToExcel } from '../utils/exportUtils';
import { ReportPrintModal } from './ReportPrintModal';
import { AuditTrailComponent } from './AuditTrailComponent';
import { ChartOfAccountsManager } from './ChartOfAccountsManager';
import { ExpenseHeadManager } from './ExpenseHeadManager';
import { JournalEntriesManager } from './JournalEntriesManager';
export const AccountingModule: React.FC = () => {
    const { accountBalances: rawBalances, transactions, chartOfAccounts, expenseHeads, journalEntries, auditLogs = [], profile, language, addTransaction, updateTransaction, deleteTransaction, } = useApp();
    const accountBalances = {
        cash: rawBalances?.cash ?? 0,
        bank: rawBalances?.bank ?? 0,
        mobile: rawBalances?.mobile ?? 0,
    };
    const [accountingTab, setAccountingTab] = useState<'ledger' | 'coa' | 'expense-heads' | 'journals' | 'audit'>('ledger');
    const [showAuditReportModal, setShowAuditReportModal] = useState<boolean>(false);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterAccount, setFilterAccount] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    // Date Range Filters
    const [filterDatePreset, setFilterDatePreset] = useState<'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'LAST_30' | 'CUSTOM'>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
    const [showReportModal, setShowReportModal] = useState<boolean>(false);
    // New Transaction / Expense Modal
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Rent & Utilities');
    const [expenseAmount, setExpenseAmount] = useState<number>(1000);
    const [expenseAccount, setExpenseAccount] = useState<AccountType>('Cash in Hand');
    const [expenseNote, setExpenseNote] = useState('');
    // New Income/Receipt Modal
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [incomeTitle, setIncomeTitle] = useState('');
    const [incomeCategory, setIncomeCategory] = useState('Sales Revenue');
    const [incomeAmount, setIncomeAmount] = useState<number>(5000);
    const [incomeAccount, setIncomeAccount] = useState<AccountType>('Cash in Hand');
    // Edit/View/Delete states for Ledger Transactions
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<any | null>(null);
    const [txToDelete, setTxToDelete] = useState<any | null>(null);
    // Edit form states
    const [editTxDate, setEditTxDate] = useState('');
    const [editTxDescription, setEditTxDescription] = useState(''); // narration
    const [editTxCategory, setEditTxCategory] = useState('');
    const [editTxAmount, setEditTxAmount] = useState<number>(0);
    const [editTxAccount, setEditTxAccount] = useState<AccountType>('Cash in Hand');
    const [editTxType, setEditTxType] = useState<TransactionType>('EXPENSE');
    const [editTxRefNo, setEditTxRefNo] = useState('');
    const handleDatePreset = (preset: 'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'LAST_30' | 'CUSTOM') => {
        setFilterDatePreset(preset);
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        if (preset === 'ALL') {
            setStartDate('');
            setEndDate('');
            setShowCustomDate(false);
        }
        else if (preset === 'TODAY') {
            setStartDate(today);
            setEndDate(today);
            setShowCustomDate(false);
        }
        else if (preset === '7D') {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            setStartDate(d.toISOString().slice(0, 10));
            setEndDate(today);
            setShowCustomDate(false);
        }
        else if (preset === 'THIS_MONTH') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
            setStartDate(firstDay);
            setEndDate(today);
            setShowCustomDate(false);
        }
        else if (preset === 'LAST_30') {
            const d = new Date();
            d.setDate(d.getDate() - 29);
            setStartDate(d.toISOString().slice(0, 10));
            setEndDate(today);
            setShowCustomDate(false);
        }
        else if (preset === 'CUSTOM') {
            setShowCustomDate(true);
        }
    };
    // Total Liquid Funds
    const totalFunds = accountBalances.cash + accountBalances.bank + accountBalances.mobile;
    // Filtered transactions
    const filteredTransactions = transactions.filter((tx) => {
        const matchType = filterType === 'ALL' ? true : tx.type === filterType;
        const matchAccount = filterAccount === 'ALL' ? true : tx.account === filterAccount;
        const matchDate = (!startDate || tx.date >= startDate) && (!endDate || tx.date <= endDate);
        const q = (searchQuery || '').toLowerCase().trim();
        const matchSearch = !q ||
            (tx.description && tx.description.toLowerCase().includes(q)) ||
            (tx.category && tx.category.toLowerCase().includes(q)) ||
            (tx.refNo && tx.refNo.toLowerCase().includes(q));
        return matchType && matchAccount && matchDate && matchSearch;
    });
    // Calculate totals from transactions
    const totalIncome = filteredTransactions
        .filter((tx) => tx.type === 'INCOME')
        .reduce((acc, tx) => acc + tx.amount, 0);
    const totalExpense = filteredTransactions
        .filter((tx) => tx.type === 'EXPENSE')
        .reduce((acc, tx) => acc + tx.amount, 0);
    const netOperatingBalance = totalIncome - totalExpense;
    const dateRangeLabel = startDate && endDate
        ? `${startDate} to ${endDate}`
        : startDate
            ? `From ${startDate}`
            : endDate
                ? `Up to ${endDate}`
                : 'All Time Records';
    const handleExcelExport = () => {
        exportAccountingToExcel(filteredTransactions, profile, dateRangeLabel, {
            income: totalIncome,
            expense: totalExpense,
            net: netOperatingBalance,
        });
    };
    const handleCreateExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseTitle || expenseAmount <= 0)
            return;
        addTransaction({
            date: new Date().toISOString().slice(0, 10),
            type: 'EXPENSE',
            category: expenseCategory,
            description: expenseTitle,
            amount: expenseAmount,
            account: expenseAccount,
            refNo: `EXP-${Date.now().toString().slice(-4)}`,
        });
        setShowExpenseModal(false);
        setExpenseTitle('');
        setExpenseAmount(1000);
        setExpenseNote('');
    };
    const handleCreateIncome = (e: React.FormEvent) => {
        e.preventDefault();
        if (!incomeTitle || incomeAmount <= 0)
            return;
        addTransaction({
            date: new Date().toISOString().slice(0, 10),
            type: 'INCOME',
            category: incomeCategory,
            description: incomeTitle,
            amount: incomeAmount,
            account: incomeAccount,
            refNo: `INC-${Date.now().toString().slice(-4)}`,
        });
        setShowIncomeModal(false);
        setIncomeTitle('');
        setIncomeAmount(5000);
    };
    const handleOpenEditTx = (tx: any) => {
        setEditingTransaction(tx);
        setEditTxDate(tx.date);
        setEditTxDescription(tx.description);
        setEditTxCategory(tx.category);
        setEditTxAmount(tx.amount);
        setEditTxAccount(tx.account || 'Cash in Hand');
        setEditTxType(tx.type);
        setEditTxRefNo(tx.refNo || '');
    };
    const handleSaveEditTx = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTransaction)
            return;
        updateTransaction(editingTransaction.id, {
            date: editTxDate,
            description: editTxDescription,
            category: editTxCategory,
            amount: Number(editTxAmount),
            account: editTxAccount,
            type: editTxType,
            refNo: editTxRefNo,
        });
        setEditingTransaction(null);
    };
    return (<div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Account Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Liquidity */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {'Total Liquid Balance'}
            </span>
            <Wallet className="w-4 h-4 text-amber-400"/>
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2">
            {profile.currencySymbol}
            {totalFunds.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {'Cash + Bank + bKash'}
          </span>
        </div>

        {/* Cash in Hand */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {'Cash in Hand'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4"/>
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {profile.currencySymbol}
            {accountBalances.cash.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
            {'Store & Factory Counters'}
          </span>
        </div>

        {/* Bank Account */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {'Bank Account'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building className="w-4 h-4"/>
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {profile.currencySymbol}
            {accountBalances.bank.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {profile.bankName || 'BRAC Bank PLC'} • {(profile.bankAccount ? profile.bankAccount.slice(-6) : '314001')}
          </span>
        </div>

        {/* Mobile Banking */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {'bKash / Nagad Wallet'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4"/>
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {profile.currencySymbol}
            {accountBalances.mobile.toLocaleString()}
          </div>
          <span className="text-[11px] text-pink-600 font-semibold block mt-1">
            {profile.phone}
          </span>
        </div>
      </div>

      {/* P&L Performance Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5"/>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold">
              {'Total Inflow / Revenue'}
            </span>
            <div className="text-lg font-black text-emerald-700">
              +{profile.currencySymbol}
              {totalIncome.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5"/>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold">
              {'Total Outflow / Expense'}
            </span>
            <div className="text-lg font-black text-rose-600">
              -{profile.currencySymbol}
              {totalExpense.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5"/>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold">
              {'Net Operating Balance'}
            </span>
            <div className={`text-lg font-black ${netOperatingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {profile.currencySymbol}
              {netOperatingBalance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: General Ledger, COA, Expense Heads, Journals, Staff Audit Trail */}
      <div id="accounting-nav-tabs" className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button type="button" id="tab-accounting-ledger" onClick={() => setAccountingTab('ledger')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${accountingTab === 'ledger'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'}`}>
          <BookOpen className={`w-4 h-4 ${accountingTab === 'ledger' ? 'text-amber-400' : 'text-slate-500'}`}/>
          <span>{'Financial Ledger'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${accountingTab === 'ledger' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
            {transactions.length}
          </span>
        </button>

        <button type="button" id="tab-accounting-coa" onClick={() => setAccountingTab('coa')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${accountingTab === 'coa'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'}`}>
          <Layers className={`w-4 h-4 ${accountingTab === 'coa' ? 'text-amber-400' : 'text-slate-500'}`}/>
          <span>{'Chart of Accounts'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${accountingTab === 'coa' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
            {chartOfAccounts.length}
          </span>
        </button>

        <button type="button" id="tab-accounting-expense-heads" onClick={() => setAccountingTab('expense-heads')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${accountingTab === 'expense-heads'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'}`}>
          <DollarSign className={`w-4 h-4 ${accountingTab === 'expense-heads' ? 'text-amber-400' : 'text-slate-500'}`}/>
          <span>{'Expense Heads'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${accountingTab === 'expense-heads' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
            {expenseHeads.length}
          </span>
        </button>

        <button type="button" id="tab-accounting-journals" onClick={() => setAccountingTab('journals')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${accountingTab === 'journals'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'}`}>
          <FileSpreadsheet className={`w-4 h-4 ${accountingTab === 'journals' ? 'text-amber-400' : 'text-slate-500'}`}/>
          <span>{'Journal Vouchers'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${accountingTab === 'journals' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
            {journalEntries.length}
          </span>
        </button>

        <button type="button" id="tab-accounting-audit" onClick={() => setAccountingTab('audit')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${accountingTab === 'audit'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'}`}>
          <ShieldCheck className={`w-4 h-4 ${accountingTab === 'audit' ? 'text-white' : 'text-blue-600'}`}/>
          <span>{'Audit Trail'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${accountingTab === 'audit' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'}`}>
            {auditLogs.length}
          </span>
        </button>
      </div>

      {accountingTab === 'coa' && <ChartOfAccountsManager />}
      {accountingTab === 'expense-heads' && <ExpenseHeadManager />}
      {accountingTab === 'journals' && <JournalEntriesManager />}
      {accountingTab === 'audit' && (<AuditTrailComponent onOpenPrintModal={() => setShowAuditReportModal(true)}/>)}

      {accountingTab === 'ledger' && (
        /* General Ledger Section */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {'Financial Ledger Journal'}
            </h3>
            <p className="text-xs text-slate-500">
              {'Automated entries from Sales Invoices, Purchase Orders & Direct Expenses'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Export Excel (.xlsx) */}
            <button type="button" onClick={handleExcelExport} className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 transition-all" title={'Download Excel Ledger'}>
              <FileSpreadsheet className="w-4 h-4"/>
              <span>{'Excel'}</span>
            </button>

            {/* Print / PDF Report */}
            <button type="button" onClick={() => setShowReportModal(true)} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-2xs flex items-center gap-1.5 transition-all" title={'Print / Save PDF Report'}>
              <Printer className="w-4 h-4 text-amber-400"/>
              <span>{'PDF / Print'}</span>
            </button>

             <button type="button" onClick={() => setShowIncomeModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all">
              <Plus className="w-4 h-4"/>
              <span>{'+ Record Income'}</span>
            </button>

            <button type="button" onClick={() => setShowExpenseModal(true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all">
              <Plus className="w-4 h-4 text-amber-400"/>
              <span>{'+ Record Expense'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={'Search description or ref#...'} className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"/>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Date Preset Buttons */}
            <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
              {([
                { id: 'ALL', labelEn: 'All', labelBn: "" },
                { id: 'TODAY', labelEn: 'Today', labelBn: "" },
                { id: '7D', labelEn: '7 Days', labelBn: "" },
                { id: 'THIS_MONTH', labelEn: 'Month', labelBn: "" },
                { id: 'CUSTOM', labelEn: 'Custom', labelBn: "" },
            ] as const).map((p) => (<button key={p.id} type="button" onClick={() => handleDatePreset(p.id)} className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${filterDatePreset === p.id
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-600 hover:text-slate-900'}`}>
                  {p.labelEn}
                </button>))}
            </div>

            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
              <option value="ALL">{'All Types'}</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>

            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
              <option value="ALL">{'All Accounts'}</option>
              <option value="Cash in Hand">Cash in Hand</option>
              <option value="BRAC Bank A/C">BRAC Bank A/C</option>
              <option value="bKash / Nagad">bKash / Nagad</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Filter Inputs */}
        {(showCustomDate || filterDatePreset === 'CUSTOM') && (<div className="bg-amber-50/60 border-b border-amber-200/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600"/>
              <span>{'Custom Date Range:'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                <span className="text-slate-500 text-[11px] font-medium">
                  {'From:'}
                </span>
                <input type="date" value={startDate} onChange={(e) => {
                    setStartDate(e.target.value);
                    setFilterDatePreset('CUSTOM');
                }} className="text-xs font-semibold text-slate-800 outline-none bg-transparent"/>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                <span className="text-slate-500 text-[11px] font-medium">
                  {'To:'}
                </span>
                <input type="date" value={endDate} onChange={(e) => {
                    setEndDate(e.target.value);
                    setFilterDatePreset('CUSTOM');
                }} className="text-xs font-semibold text-slate-800 outline-none bg-transparent"/>
              </div>

              <button type="button" onClick={() => handleDatePreset('ALL')} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3"/>
                <span>{'Reset'}</span>
              </button>
            </div>
          </div>)}

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4"></th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4"></th>
                <th className="py-3 px-4 text-center"></th>
                <th className="py-3 px-4 text-right">Tk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx, idx) => (<tr key={`${tx.id || 'tx'}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tx.date}</td>
                  <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{tx.refNo}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{tx.description}</div>
                    <div className="text-[10px] text-amber-700 font-medium">{tx.category}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{tx.account}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${tx.type === 'INCOME'
                    ? 'bg-emerald-100 text-emerald-800'
                    : tx.type === 'EXPENSE'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-black text-sm ${tx.type === 'INCOME'
                    ? 'text-emerald-700'
                    : tx.type === 'EXPENSE'
                        ? 'text-rose-600'
                        : 'text-slate-900'}`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {profile.currencySymbol}
                      {tx.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                    <button type="button" onClick={() => setViewingTransaction(tx)} className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors animate-fade-in" title={'View Details'}>
                      <Eye className="w-3.5 h-3.5"/>
                    </button>

                    <button type="button" onClick={() => handleOpenEditTx(tx)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors animate-fade-in" title={'Edit Transaction'}>
                      <Edit2 className="w-3.5 h-3.5"/>
                    </button>

                    <button type="button" onClick={() => setTxToDelete(tx)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>))}

              {filteredTransactions.length === 0 && (<tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    {'No transactions recorded'}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>)}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateExpense} className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {'Record Operating Expense'}
              </h3>
              <button type="button" onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Expense Description *'}
                </label>
                <input type="text" required value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="e.g. Factory Electricity Bill / Machine Servicing" className="w-full px-3 py-2 border border-slate-200 rounded-xl"/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Category'}
                  </label>
                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    {expenseHeads && expenseHeads.length > 0 ? (expenseHeads
                .filter((h) => h.isActive)
                .map((h) => (<option key={h.id} value={h.name}>
                            {h.name} {h.nameBn ? `(${h.nameBn})` : ''}
                          </option>))) : (<>
                        <option value="Rent & Utilities">Rent & Utilities</option>
                        <option value="Payroll & Wages">Payroll & Wages</option>
                        <option value="Machine Maintenance">Maintenance</option>
                        <option value="Conveyance & Transport">Transport</option>
                        <option value="Entertainment & Tea">Tea/Refreshment</option>
                        <option value="Miscellaneous">Misc</option>
                      </>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Amount *'}
                  </label>
                  <input type="number" step="any" min="1" required value={expenseAmount} onChange={(e) => setExpenseAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-rose-600 text-sm"/>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Paid From Account *'}
                  </label>
                  <select value={expenseAccount} onChange={(e) => setExpenseAccount(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    <option value="Cash in Hand">Cash in Hand (Nagad  - :{profile.currencySymbol}
                      {accountBalances.cash.toLocaleString()})
                    </option>
                    <option value="BRAC Bank A/C">BRAC Bank A/C (Bank - :{profile.currencySymbol}
                      {accountBalances.bank.toLocaleString()})
                    </option>
                    <option value="bKash / Nagad">bKashNagad ( - :{profile.currencySymbol}
                      {accountBalances.mobile.toLocaleString()})
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                {'Confirm Expense'}
              </button>
            </div>
          </form>
        </div>)}

      {/* Professional Accounting Ledger Report Modal */}
      {showReportModal && (<ReportPrintModal type="accounting" accountingData={filteredTransactions} profile={profile} language={language} dateRangeText={dateRangeLabel} onClose={() => setShowReportModal(false)}/>)}

      {/* Professional Audit Trail Report Modal */}
      {showAuditReportModal && (<ReportPrintModal type="audit" auditData={auditLogs} profile={profile} language={language} dateRangeText={'Staff Activity & Internal Audit Trail'} onClose={() => setShowAuditReportModal(false)}/>)}
      {/* RECORD INCOME MODAL */}
      {showIncomeModal && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateIncome} className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {'Record Operating Income'}
              </h3>
              <button type="button" onClick={() => setShowIncomeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Income Description / Narration *'}
                </label>
                <input type="text" required value={incomeTitle} onChange={(e) => setIncomeTitle(e.target.value)} placeholder="e.g. Received Advance Cash from Client / Interest Credit" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Category'}
                  </label>
                  <select value={incomeCategory} onChange={(e) => setIncomeCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    <option value="Sales Revenue">Sales Revenue</option>
                    <option value="Direct Service Income">Direct Service Income</option>
                    <option value="Advance Received">Advance Received</option>
                    <option value="Interest & Investments">Interest & Investments</option>
                    <option value="Other Non-Operating Income">Other Non-Operating</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Amount *'}
                  </label>
                  <input type="number" step="any" min="1" required value={incomeAmount} onChange={(e) => setIncomeAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-emerald-600 text-sm"/>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Deposit Into Account *'}
                  </label>
                  <select value={incomeAccount} onChange={(e) => setIncomeAccount(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    <option value="Cash in Hand">Cash in Hand (Nagad  - :{profile.currencySymbol}
                      {accountBalances.cash.toLocaleString()})
                    </option>
                    <option value="BRAC Bank A/C">BRAC Bank A/C (Bank - :{profile.currencySymbol}
                      {accountBalances.bank.toLocaleString()})
                    </option>
                    <option value="bKash / Nagad">bKashNagad ( - :{profile.currencySymbol}
                      {accountBalances.mobile.toLocaleString()})
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowIncomeModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                {'Confirm Income'}
              </button>
            </div>
          </form>
        </div>)}

      {/* VIEW TRANSACTION DETAILS MODAL */}
      {viewingTransaction && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border ${viewingTransaction.type === 'INCOME'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  {viewingTransaction.type}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  {'Ledger Transaction Details'}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingTransaction(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">{'Date'}</span>
                  <span className="font-bold text-slate-800 font-mono">{viewingTransaction.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{'Reference'}</span>
                  <span className="font-bold text-slate-800 font-mono">{viewingTransaction.refNo || 'N/A'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/60 my-2 pt-2">
                <span className="text-slate-400 text-[10px] block">{'Description / Narration'}</span>
                <span className="font-bold text-slate-950 text-xs break-words">{viewingTransaction.description}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">{'Category'}</span>
                  <span className="font-bold text-amber-700 font-sans">{viewingTransaction.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{'Paid/Received Via'}</span>
                  <span className="font-bold text-slate-700">{viewingTransaction.account || 'N/A'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center">
                <span className="text-slate-500 font-bold">{'Total Amount:'}</span>
                <span className={`text-base font-black font-mono ${viewingTransaction.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {viewingTransaction.type === 'INCOME' ? '+' : '-'} {profile.currencySymbol}{viewingTransaction.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => {
                handleOpenEditTx(viewingTransaction);
                setViewingTransaction(null);
            }} className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100">
                {'Edit'}
              </button>
              <button type="button" onClick={() => setViewingTransaction(null)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold">
                {'Close'}
              </button>
            </div>
          </div>
        </div>)}

      {/* EDIT TRANSACTION MODAL */}
      {editingTransaction && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditTx} className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-blue-600"/>
                {'Edit Ledger Transaction'}
              </h3>
              <button type="button" onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Transaction Type *'}
                  </label>
                  <select value={editTxType} onChange={(e) => setEditTxType(e.target.value as TransactionType)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold">
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Date *'}
                  </label>
                  <input type="date" required value={editTxDate} onChange={(e) => setEditTxDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"/>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Narration / Description *'}
                </label>
                <input type="text" required value={editTxDescription} onChange={(e) => setEditTxDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Category *'}
                  </label>
                  <input type="text" required value={editTxCategory} onChange={(e) => setEditTxCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl"/>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Amount *'}
                  </label>
                  <input type="number" step="any" min="1" required value={editTxAmount} onChange={(e) => setEditTxAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-slate-800 font-mono text-sm"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Reference / Voucher No'}
                  </label>
                  <input type="text" value={editTxRefNo} onChange={(e) => setEditTxRefNo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"/>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Fund Account *'}
                  </label>
                  <select value={editTxAccount} onChange={(e) => setEditTxAccount(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    <option value="Cash in Hand">Cash in Hand</option>
                    <option value="BRAC Bank A/C">BRAC Bank A/C</option>
                    <option value="bKash / Nagad">bKash / Nagad</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setEditingTransaction(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                {'Save Changes'}
              </button>
            </div>
          </form>
        </div>)}

      {/* LEDGER TRANSACTION DELETE CONFIRM MODAL */}
      {txToDelete && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6"/>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {'Confirm Transaction Deletion'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {`Are you sure you want to delete the transaction "${txToDelete.description}" from the ledger? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button type="button" onClick={() => setTxToDelete(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="button" onClick={() => {
                deleteTransaction(txToDelete.id);
                setTxToDelete(null);
            }} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                {'Delete'}
              </button>
            </div>
          </div>
        </div>)}
    </div>);
};
