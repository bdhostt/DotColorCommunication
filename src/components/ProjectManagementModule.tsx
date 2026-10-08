import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Project, ProjectExpenseItem, ProjectSalesItem } from '../types';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  Calendar,
  User,
  Phone,
  BookOpen,
  PieChart,
  Tag,
  CreditCard,
  Wallet,
} from 'lucide-react';

export interface SalesPaymentRow {
  id: string;
  method: string;
  amount: number | '';
  note: string;
}

export interface ExpenseBreakdownRow {
  id: string;
  category: string;
  categorySearch: string;
  amount: number | '';
  note: string;
  isDropdownOpen: boolean;
}

export const ProjectManagementModule: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    addProjectSales,
    addProjectExpense,
    addProjectExpenses,
    deleteProjectSales,
    deleteProjectExpense,
    expenseHeads,
    language,
    profile,
    paymentMethods = [],
  } = useApp();

  const isBn = language === 'bn';

  const [searchTerm, setSearchType] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState<string | null>(null); // projectId
  const [showExpenseModal, setShowExpenseModal] = useState<string | null>(null); // projectId
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // New Project Form State
  const [newProject, setNewProject] = useState({
    name: '',
    nameBn: '',
    clientName: '',
    clientPhone: '',
    budget: 0,
    status: 'In Progress' as Project['status'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  // Dynamic Payment method options for sales breakdown
  const activePaymentMethods = useMemo(() => {
    return (paymentMethods || []).filter((p) => p.isEnabled);
  }, [paymentMethods]);

  const paymentMethodOptions = useMemo(() => {
    if (activePaymentMethods.length === 0) {
      return [
        { id: 'Cash', nameEn: 'Cash in Hand', nameBn: 'ক্যাশ ইন হ্যান্ড (Cash)' },
        { id: 'Due', nameEn: 'Due / Receivable', nameBn: 'বাকি (Due / Receivable)' },
      ];
    }
    const list = activePaymentMethods.map((pm) => ({
      id: pm.name,
      nameEn: pm.name,
      nameBn: pm.nameBn ? `${pm.nameBn} (${pm.name})` : pm.name,
    }));
    if (!list.some((item) => item.id.toLowerCase() === 'due')) {
      list.push({ id: 'Due', nameEn: 'Due / Receivable', nameBn: 'বাকি (Due / Receivable)' });
    }
    if (!list.some((item) => item.id.toLowerCase() === 'other')) {
      list.push({ id: 'Other', nameEn: 'Other / Adjustment', nameBn: 'অন্যান্য (Other)' });
    }
    return list;
  }, [activePaymentMethods]);

  // Sales Form State with Multi-Payment Breakdown
  const [salesForm, setSalesForm] = useState({
    invoiceNo: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    generalNote: '',
    paymentRows: [
      { id: 'pay-1', method: 'Cash', amount: '' as number | '', note: '' },
    ] as SalesPaymentRow[],
  });

  const totalSalesAmount = useMemo(() => {
    return salesForm.paymentRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [salesForm.paymentRows]);

  // Expense Form State with Multi-Category Breakdown Rows & Notes Per Row
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseGeneralNote, setExpenseGeneralNote] = useState('');
  const [expenseRows, setExpenseRows] = useState<ExpenseBreakdownRow[]>([
    {
      id: 'exp-1',
      category: 'Conveyance & Transport',
      categorySearch: 'Conveyance & Transport',
      amount: '' as number | '',
      note: '',
      isDropdownOpen: false,
    },
  ]);

  const totalExpenseAmount = useMemo(() => {
    return expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [expenseRows]);

  const [breakdownSearchTerm, setBreakdownSearchTerm] = useState('');

  const defaultExpenseCategoryList = useMemo(() => {
    const list = [
      { id: 'cat-1', nameEn: 'Conveyance & Transport', nameBn: 'যাতায়াত খরচ (Conveyance / Transport)' },
      { id: 'cat-2', nameEn: 'Labor Charge & Wages', nameBn: 'লেবার চার্জ (Labor / Worker Wages)' },
      { id: 'cat-3', nameEn: 'Entertainment & Refreshments', nameBn: 'আপ্যায়ন খরচ (Entertainment / Snacks)' },
      { id: 'cat-4', nameEn: 'Raw Materials Purchase', nameBn: 'কাঁচামাল ক্রয় (Raw Materials Purchase)' },
      { id: 'cat-5', nameEn: 'Fuel & Truck Transport', nameBn: 'ফুয়েল ও ট্রাক/গাড়ি ভাড়া' },
      { id: 'cat-6', nameEn: 'Site Installation & Setup', nameBn: 'সাইট ইনস্টলেশন ও সেটআপ' },
      { id: 'cat-7', nameEn: 'Permit, Tax & Official Fee', nameBn: 'পারমিট, ট্যাক্স ও সরকারি ফি' },
      { id: 'cat-8', nameEn: 'Commission & Allowance', nameBn: 'কমিশন ও নাইট এলাউন্স' },
      { id: 'cat-9', nameEn: 'Subcontract & Fabrication', nameBn: 'সাব-কন্ট্রাক্ট কারিগরি কাজ' },
      { id: 'cat-10', nameEn: 'Printing & Banner', nameBn: 'প্রিন্টিং ও ব্যানার খরচ' },
      { id: 'cat-11', nameEn: 'Generator Diesel & Power', nameBn: 'জেনারেটর ডিজেল ও পাওয়ার' },
      { id: 'cat-12', nameEn: 'Equipment & Crane Rental', nameBn: 'ইকুইপমেন্ট ও ক্রেন ভাড়া' },
      { id: 'cat-13', nameEn: 'Hotel & Food Allowance', nameBn: 'হোটেল ও খাবার খরচ' },
      { id: 'cat-14', nameEn: 'Site Security & Guard', nameBn: 'সাইট গার্ড ও সিকিউরিটি' },
    ];

    if (expenseHeads && expenseHeads.length > 0) {
      expenseHeads.forEach((head) => {
        list.push({
          id: head.id,
          nameEn: head.name,
          nameBn: head.nameBn || head.name,
        });
      });
    }

    return list;
  }, [expenseHeads]);

  const getFilteredCategories = (termInput: string) => {
    const term = termInput.toLowerCase().trim();
    if (!term) return defaultExpenseCategoryList;
    return defaultExpenseCategoryList.filter(
      (item) =>
        item.nameEn.toLowerCase().includes(term) ||
        item.nameBn.toLowerCase().includes(term)
    );
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.nameBn && p.nameBn.includes(searchTerm)) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const totalSales = projects.reduce((sum, p) => sum + (p.totalSales || 0), 0);
    const totalExpenses = projects.reduce((sum, p) => sum + (p.totalExpenses || 0), 0);
    const totalNetProfit = totalSales - totalExpenses;
    const overallMargin = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;

    return {
      totalProjects,
      totalSales,
      totalExpenses,
      totalNetProfit,
      overallMargin,
    };
  }, [projects]);

  // Helper for Category Bengalis
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Conveyance':
        return isBn ? 'যাতায়াত খরচ (Conveyance)' : 'Conveyance';
      case 'Labor Charge':
        return isBn ? 'লেবার চার্জ (Labor Charge)' : 'Labor Charge';
      case 'Entertainment':
        return isBn ? 'আপ্যায়ন খরচ (Entertainment)' : 'Entertainment';
      case 'Raw Materials Purchase':
        return isBn ? 'কাঁচামাল ক্রয় (Raw Materials)' : 'Raw Materials Purchase';
      case 'Subcontract':
        return isBn ? 'সাব-কন্ট্রাক্ট কারিগরি' : 'Subcontract';
      default:
        return isBn ? 'অন্যান্য বিবিধ খরচ' : 'Utility & Others';
    }
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientName) return;

    if (editingProject) {
      updateProject(editingProject.id, {
        name: newProject.name,
        nameBn: newProject.nameBn,
        clientName: newProject.clientName,
        clientPhone: newProject.clientPhone,
        budget: Number(newProject.budget),
        status: newProject.status,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        notes: newProject.notes,
      });
      setEditingProject(null);
    } else {
      addProject({
        name: newProject.name,
        nameBn: newProject.nameBn,
        clientName: newProject.clientName,
        clientPhone: newProject.clientPhone,
        budget: Number(newProject.budget),
        status: newProject.status,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        notes: newProject.notes,
        salesItems: [],
        expenseItems: [],
      });
    }

    setShowCreateModal(false);
    setNewProject({
      name: '',
      nameBn: '',
      clientName: '',
      clientPhone: '',
      budget: 0,
      status: 'In Progress',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: '',
    });
  };

  const handleAddPaymentRow = () => {
    const newId = `pay-${Date.now()}-${salesForm.paymentRows.length + 1}`;
    setSalesForm((prev) => ({
      ...prev,
      paymentRows: [
        ...prev.paymentRows,
        { id: newId, method: 'Bank Transfer', amount: '', note: '' },
      ],
    }));
  };

  const handleRemovePaymentRow = (id: string) => {
    if (salesForm.paymentRows.length <= 1) return;
    setSalesForm((prev) => ({
      ...prev,
      paymentRows: prev.paymentRows.filter((r) => r.id !== id),
    }));
  };

  const handleUpdatePaymentRow = (id: string, updates: Partial<SalesPaymentRow>) => {
    setSalesForm((prev) => ({
      ...prev,
      paymentRows: prev.paymentRows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  };

  const handleAddSalesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSalesModal) return;

    const validPaymentRows = salesForm.paymentRows.filter(
      (r) => Number(r.amount) > 0
    );

    const calculatedTotal = validPaymentRows.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );

    if (calculatedTotal <= 0) return;

    const primaryMethod =
      validPaymentRows.length === 1
        ? validPaymentRows[0].method
        : isBn
        ? 'একাধিক মেথড (ব্রেকডাউন)'
        : 'Multiple Payment Methods';

    addProjectSales(showSalesModal, {
      invoiceNo: salesForm.invoiceNo,
      description: salesForm.description || (isBn ? 'প্রজেক্ট বিলিং ও রাজস্ব আয়' : 'Project Billing / Revenue Receipt'),
      amount: calculatedTotal,
      date: salesForm.date,
      clientName: salesForm.clientName,
      note: salesForm.generalNote || validPaymentRows.map(r => `${r.method}: ৳${r.amount}${r.note ? ` (${r.note})` : ''}`).join(' | '),
      paymentMethod: primaryMethod,
      paymentBreakdown: validPaymentRows.map((r) => ({
        id: r.id,
        method: r.method,
        amount: Number(r.amount),
        note: r.note,
      })),
    });

    setShowSalesModal(null);
  };

  const handleAddExpenseRow = () => {
    const newId = `exp-${Date.now()}-${expenseRows.length + 1}`;
    setExpenseRows((prev) => [
      ...prev,
      {
        id: newId,
        category: 'Labor Charge & Wages',
        categorySearch: 'Labor Charge & Wages',
        amount: '',
        note: '',
        isDropdownOpen: false,
      },
    ]);
  };

  const handleRemoveExpenseRow = (id: string) => {
    if (expenseRows.length <= 1) return;
    setExpenseRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateExpenseRow = (id: string, updates: Partial<ExpenseBreakdownRow>) => {
    setExpenseRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showExpenseModal) return;

    const validRows = expenseRows.filter(
      (r) => Number(r.amount) > 0 && (r.category.trim() || r.categorySearch.trim())
    );

    if (validRows.length === 0) return;

    const batchId = `exp-batch-${Date.now()}`;
    const itemsToSave: Omit<ProjectExpenseItem, 'id'>[] = validRows.map((r) => {
      const finalCategory = r.category.trim() || r.categorySearch.trim() || (isBn ? 'সাধারণ খরচ' : 'General Expense');
      return {
        category: finalCategory,
        categoryBn: finalCategory,
        amount: Number(r.amount),
        date: expenseDate,
        note: r.note.trim() || expenseGeneralNote.trim() || undefined,
        breakdownBatchId: batchId,
      };
    });

    addProjectExpenses(showExpenseModal, itemsToSave);
    setShowExpenseModal(null);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setNewProject({
      name: p.name,
      nameBn: p.nameBn || '',
      clientName: p.clientName,
      clientPhone: p.clientPhone || '',
      budget: p.budget,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate || '',
      notes: p.notes || '',
    });
    setShowCreateModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-200">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {isBn ? 'প্রজেক্টস' : 'Projects'}
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                {isBn ? 'COA লিঙ্কড' : 'Chart of Accounts Synced'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setNewProject({
                name: '',
                nameBn: '',
                clientName: '',
                clientPhone: '',
                budget: 0,
                status: 'In Progress',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                notes: '',
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'নতুন প্রজেক্ট খুলুন' : 'Create New Project'}</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales/Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isBn ? 'মোট প্রজেক্ট সেলস / আয়' : 'Total Project Income'}
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {profile.currencySymbol}
                {metrics.totalSales.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.totalProjects} {isBn ? 'টি প্রজেক্টের মোট কাজ' : 'Projects Total'}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isBn ? 'মোট প্রজেক্ট খরচ' : 'Total Project Expense'}
              </p>
              <h3 className="text-xl font-black text-rose-600 mt-1">
                {profile.currencySymbol}
                {metrics.totalExpenses.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {isBn ? 'কনভেয়েন্স, লেবার, আপ্যায়ন ও মালামাল' : 'Conveyance, labor & materials'}
              </p>
            </div>
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isBn ? 'নিট প্রজেক্ট লাভ (Profit)' : 'Net Project Profit'}
              </p>
              <h3
                className={`text-xl font-black mt-1 ${
                  metrics.totalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {profile.currencySymbol}
                {metrics.totalNetProfit.toLocaleString()}
              </h3>
              <p className="text-[11px] font-bold text-emerald-600 mt-1">
                {isBn ? 'আয় থেকে মোট খরচ বাদ' : 'Net Margin Revenue - Cost'}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Overall Profit Margin % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isBn ? 'গড় প্রফিট মার্জিন (%)' : 'Average Margin %'}
              </p>
              <h3 className="text-xl font-black text-amber-600 mt-1">
                {metrics.overallMargin.toFixed(1)}%
              </h3>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.overallMargin))}%` }}
                />
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchType(e.target.value)}
            placeholder={
              isBn ? 'প্রজেক্ট কোড, নাম বা ক্লায়েন্ট খুঁজুন...' : 'Search project code, name, client...'
            }
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-700"
          >
            <option value="ALL">{isBn ? 'সকল স্টেটাস (All Status)' : 'All Status'}</option>
            <option value="In Progress">{isBn ? 'চলমান (In Progress)' : 'In Progress'}</option>
            <option value="Completed">{isBn ? 'সম্পন্ন (Completed)' : 'Completed'}</option>
            <option value="Planning">{isBn ? 'পরিকল্পনাধীন (Planning)' : 'Planning'}</option>
            <option value="On Hold">{isBn ? 'স্থগিত (On Hold)' : 'On Hold'}</option>
          </select>
        </div>
      </div>

      {/* Project Cards List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">
              {isBn ? 'কোনো প্রজেক্ট পাওয়া যায়নি' : 'No Projects Found'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn ? 'নতুন প্রজেক্ট তৈরি করুন অথবা ফিল্টার পরিবর্তন করুন।' : 'Create a new project or change filter.'}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;

            // Expense Breakdown per category for this project
            const expenseCategoryBreakdown = project.expenseItems.reduce((acc, exp) => {
              acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
              return acc;
            }, {} as Record<string, number>);

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all"
              >
                {/* Main Card Header Bar */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                        {project.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          project.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : project.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : project.status === 'On Hold'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isBn && project.statusBn ? project.statusBn : project.status}
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900">
                      {isBn && project.nameBn ? project.nameBn : project.name}
                    </h2>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {project.clientName}
                      </span>
                      {project.clientPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {project.clientPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {project.startDate} {project.endDate ? `➔ ${project.endDate}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Profitability Numbers Bar */}
                  <div className="flex items-center gap-4 sm:gap-6 bg-white p-3 rounded-xl border border-slate-200/80 self-start lg:self-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {isBn ? 'বিক্রয় (Income)' : 'Sales Income'}
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {profile.currencySymbol}
                        {project.totalSales.toLocaleString()}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {isBn ? 'মোট খরচ (Expense)' : 'Total Cost'}
                      </p>
                      <p className="text-sm font-black text-rose-600">
                        {profile.currencySymbol}
                        {project.totalExpenses.toLocaleString()}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {isBn ? 'নিট লাভ (Profit)' : 'Net Profit'}
                      </p>
                      <p
                        className={`text-sm font-black ${
                          project.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {profile.currencySymbol}
                        {project.netProfit.toLocaleString()}
                      </p>
                    </div>

                    <div className="hidden sm:block h-8 w-px bg-slate-200" />

                    <div className="hidden sm:block">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {isBn ? 'মার্জিন' : 'Margin %'}
                      </p>
                      <p className="text-xs font-extrabold text-amber-600">
                        {project.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Category-wise Expense Quick Bar */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <span className="font-bold text-slate-700 text-[11px] shrink-0">
                      {isBn ? 'খাতভিত্তিক খরচসমূহ:' : 'Expense Breakdown:'}
                    </span>

                    {/* Breakdown Live Search Input Box */}
                    <div className="relative flex items-center shrink-0">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
                      <input
                        type="text"
                        value={breakdownSearchTerm}
                        onChange={(e) => setBreakdownSearchTerm(e.target.value)}
                        placeholder={isBn ? '🔍 খাত ফিল্টার করুন...' : '🔍 Filter breakdown...'}
                        className="pl-7 pr-6 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-slate-800 w-32 sm:w-44 shadow-2xs"
                      />
                      {breakdownSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setBreakdownSearchTerm('')}
                          className="absolute right-2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {Object.keys(expenseCategoryBreakdown).length === 0 ? (
                      <span className="text-[11px] text-slate-400 font-medium italic">
                        {isBn ? 'কোনো খরচ এন্ট্রি করা হয়নি' : 'No expenses recorded yet'}
                      </span>
                    ) : (
                      Object.entries(expenseCategoryBreakdown)
                        .filter(([catName]) =>
                          !breakdownSearchTerm ||
                          catName.toLowerCase().includes(breakdownSearchTerm.toLowerCase())
                        )
                        .map(([catName, amt]) => (
                          <span
                            key={catName}
                            className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs animate-in fade-in duration-100"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{catName}:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {profile.currencySymbol}{(amt as number).toLocaleString()}
                            </span>
                          </span>
                        ))
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSalesModal(project.id);
                        setSalesForm({
                          invoiceNo: '',
                          description: '',
                          date: new Date().toISOString().split('T')[0],
                          clientName: project.clientName,
                          generalNote: '',
                          paymentRows: [
                            { id: `pay-${Date.now()}-1`, method: 'Cash', amount: '', note: '' },
                          ],
                        });
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      + {isBn ? 'সেলস ইনকাম যোগ' : 'Add Sales'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowExpenseModal(project.id);
                        setExpenseDate(new Date().toISOString().split('T')[0]);
                        setExpenseGeneralNote('');
                        setExpenseRows([
                          {
                            id: `exp-${Date.now()}-1`,
                            category: 'Conveyance & Transport',
                            categorySearch: 'Conveyance & Transport',
                            amount: '',
                            note: '',
                            isDropdownOpen: false,
                          },
                        ]);
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    >
                      + {isBn ? 'খরচ এন্ট্রি যোগ' : 'Add Expense'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(project)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                      title="Edit Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setProjectToDelete(project)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                      className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Itemized View */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-slate-50/60 space-y-6 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Itemized Sales Table */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span>{isBn ? 'প্রজেক্টের সেলস / আয় খতিয়ান' : 'Itemized Project Income'}</span>
                          </h4>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {profile.currencySymbol}
                            {project.totalSales.toLocaleString()}
                          </span>
                        </div>

                        {project.salesItems.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-3 text-center">
                            {isBn ? 'এখনো কোনো ইনকাম এন্ট্রি করা হয়নি।' : 'No sales entries recorded yet.'}
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-[10px] text-slate-400 font-bold border-b border-slate-100">
                                  <th className="py-1.5">তারিখ & বিবরণ</th>
                                  <th className="py-1.5 text-right">পরিমাণ (৳)</th>
                                  <th className="py-1.5 text-center">অ্যাকশন</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {project.salesItems.map((sales) => (
                                  <tr key={sales.id} className="hover:bg-slate-50">
                                    <td className="py-2">
                                      <div className="font-semibold text-slate-800">{sales.description}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {sales.date} {sales.invoiceNo ? `• ${sales.invoiceNo}` : ''}
                                      </div>
                                      {sales.paymentBreakdown && sales.paymentBreakdown.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {sales.paymentBreakdown.map((pb, pidx) => (
                                            <span
                                              key={pidx}
                                              className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200"
                                            >
                                              <span>{pb.method}:</span>
                                              <span className="font-mono">{profile.currencySymbol}{pb.amount.toLocaleString()}</span>
                                              {pb.note && <span className="text-slate-500 font-normal">({pb.note})</span>}
                                            </span>
                                          ))}
                                        </div>
                                      ) : sales.paymentMethod ? (
                                        <div className="mt-1">
                                          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                                            {sales.paymentMethod}
                                          </span>
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="py-2 text-right font-extrabold text-slate-900">
                                      {profile.currencySymbol}
                                      {sales.amount.toLocaleString()}
                                    </td>
                                    <td className="py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => deleteProjectSales(project.id, sales.id)}
                                        className="text-slate-300 hover:text-rose-600 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Itemized Expense Table */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                            <span>{isBn ? 'প্রজেক্টের খরচ খতিয়ান (Expenses)' : 'Itemized Project Expenses'}</span>
                          </h4>
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            {profile.currencySymbol}
                            {project.totalExpenses.toLocaleString()}
                          </span>
                        </div>

                        {project.expenseItems.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-3 text-center">
                            {isBn ? 'এখনো কোনো খরচ এন্ট্রি করা হয়নি।' : 'No expense entries recorded yet.'}
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-[10px] text-slate-400 font-bold border-b border-slate-100">
                                  <th className="py-1.5">খাত & বিবরণ</th>
                                  <th className="py-1.5 text-right">পরিমাণ (৳)</th>
                                  <th className="py-1.5 text-center">অ্যাকশন</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {project.expenseItems.map((exp) => (
                                  <tr key={exp.id} className="hover:bg-slate-50">
                                    <td className="py-2">
                                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                        <span>{exp.categoryBn || exp.category}</span>
                                      </div>
                                      {exp.note && (
                                        <div className="text-[11px] text-slate-700 pl-3 font-medium bg-amber-50/60 py-0.5 px-1.5 rounded border-l-2 border-amber-400 my-0.5">
                                          📝 {exp.note}
                                        </div>
                                      )}
                                      <div className="text-[10px] text-slate-400 pl-3">{exp.date}</div>
                                    </td>
                                    <td className="py-2 text-right font-extrabold text-rose-600">
                                      {profile.currencySymbol}
                                      {exp.amount.toLocaleString()}
                                    </td>
                                    <td className="py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => deleteProjectExpense(project.id, exp.id)}
                                        className="text-slate-300 hover:text-rose-600 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProjectSubmit}
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProject
                  ? isBn
                    ? 'প্রজেক্ট এডিট করুন'
                    : 'Edit Project'
                  : isBn
                  ? 'নতুন প্রজেক্ট তৈরি করুন'
                  : 'Create New Project'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'প্রজেক্টের নাম (English) *' : 'Project Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="e.g. Port City Univ 3D Signage Project"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'প্রজেক্টের নাম (বাংলা)' : 'Bengali Name'}
                  </label>
                  <input
                    type="text"
                    value={newProject.nameBn}
                    onChange={(e) => setNewProject({ ...newProject, nameBn: e.target.value })}
                    placeholder="যেমন: পোর্ট সিটি ইউনিভার্সিটি ৩ডি সাইনবোর্ড কাজ"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'কাস্টমার / ক্লায়েন্ট নাম *' : 'Client Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newProject.clientName}
                    onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                    placeholder="e.g. Apex Apparel Ltd"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'ক্লায়েন্ট ফোন নম্বর' : 'Client Phone'}
                  </label>
                  <input
                    type="tel"
                    value={newProject.clientPhone}
                    onChange={(e) => setNewProject({ ...newProject, clientPhone: e.target.value })}
                    placeholder="01819-XXXXXX"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'আনুমানিক বাজেট (Budget ৳)' : 'Project Budget'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'স্টেটাস' : 'Status'}
                  </label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="In Progress">In Progress (চলমান)</option>
                    <option value="Completed">Completed (সম্পন্ন)</option>
                    <option value="Planning">Planning (পরিকল্পনাধীন)</option>
                    <option value="On Hold">On Hold (স্থগিত)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'শুরুর তারিখ' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'সমাপ্তির তারিখ' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {editingProject ? (isBn ? 'আপডেট করুন' : 'Update') : isBn ? 'সংরক্ষণ করুন' : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD SALES MODAL - PAYMENT METHOD BREAKDOWN WITH NOTE PER ROW */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleAddSalesSubmit}
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div>{isBn ? 'প্রজেক্টের ইনকাম / সেলস এন্ট্রি' : 'Add Project Sales Income'}</div>
                  <div className="text-[11px] font-normal text-slate-500">
                    {isBn ? 'পেমেন্ট মেথড অনুযায়ী বিক্রয় ব্রেকডাউন ও বিবরণ' : 'Sales Amount Breakdown by Payment Method'}
                  </div>
                </div>
              </h3>
              <button
                type="button"
                onClick={() => setShowSalesModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'ইনভয়েস বা বিল রেফারেন্স নং' : 'Invoice / Bill Ref No.'}
                  </label>
                  <input
                    type="text"
                    value={salesForm.invoiceNo}
                    onChange={(e) => setSalesForm({ ...salesForm, invoiceNo: e.target.value })}
                    placeholder="e.g. DCC-INV-2026-1003"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={salesForm.date}
                    onChange={(e) => setSalesForm({ ...salesForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn ? 'কাজের বিবরণ (Description) *' : 'Description *'}
                </label>
                <input
                  type="text"
                  required
                  value={salesForm.description}
                  onChange={(e) => setSalesForm({ ...salesForm, description: e.target.value })}
                  placeholder="e.g. 3D Acrylic Lettering Job Billing / Milestone 1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              {/* SALES AMOUNT BREAKDOWN BY PAYMENT METHOD */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isBn ? 'পেমেন্ট মেথড ব্রেকডাউন (Payment Method Breakdown) *' : 'Sales Amount Payment Method Breakdown *'}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isBn ? 'ক্যাশ, ব্যাংক, বিকাশ ইত্যাদিতে ভাগ করুন' : 'Split across Cash, Bank, Mobile etc.'}
                  </span>
                </div>

                <div className="space-y-3">
                  {salesForm.paymentRows.map((pRow, idx) => (
                    <div
                      key={pRow.id}
                      className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                            #{idx + 1}
                          </span>
                          <span>{isBn ? `পেমেন্ট মেথড #${idx + 1}` : `Payment Method #${idx + 1}`}</span>
                        </span>

                        {salesForm.paymentRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentRow(pRow.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {isBn ? 'পেমেন্ট মাধ্যম (Method)' : 'Payment Method'}
                          </label>
                          <select
                            value={pRow.method}
                            onChange={(e) => handleUpdatePaymentRow(pRow.id, { method: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-800 bg-white"
                          >
                            {paymentMethodOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {isBn ? opt.nameBn : opt.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {isBn ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={pRow.amount}
                            onChange={(e) => handleUpdatePaymentRow(pRow.id, { amount: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-emerald-700 bg-white"
                          />
                        </div>
                      </div>

                      {/* Under each row: Note / Description option */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          {isBn ? 'নোট / বিবরণ / রেফারেন্স (Note / Description)' : 'Note / Reference / Description'}
                        </label>
                        <input
                          type="text"
                          value={pRow.note}
                          onChange={(e) => handleUpdatePaymentRow(pRow.id, { note: e.target.value })}
                          placeholder={isBn ? 'e.g. ব্যাংক ট্রানজেকশন আইডি / চেক নং / ক্যাশ কাউন্টার বিবরণ...' : 'e.g. Bank slip no / Trx ID / Cheque #...'}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 focus:bg-white text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={handleAddPaymentRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isBn ? '+ পেমেন্ট মেথড ব্রেকডাউন যোগ করুন' : '+ Add Payment Method'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Sales Total Display */}
              <div className="bg-emerald-50 border-2 border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 block">
                    {isBn ? 'মোট বিক্রয় / সেলস পরিমাণ (Total Sales Amount):' : 'Total Sales Amount:'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {salesForm.paymentRows
                      .filter((r) => Number(r.amount) > 0)
                      .map((r) => `${r.method} (৳${Number(r.amount).toLocaleString()})`)
                      .join(' + ') || (isBn ? 'পেমেন্ট পরিমাণ লিখুন' : 'Enter amount')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-800 font-mono">
                    *{profile.currencySymbol}{totalSalesAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowSalesModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={totalSalesAmount <= 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                {isBn ? `ইনকাম সংরক্ষণ করুন (*৳${totalSalesAmount.toLocaleString()})` : `Record Sales (*${totalSalesAmount.toLocaleString()})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD EXPENSE MODAL - MULTI-BREAKDOWN WITH REAL-TIME SUM & NOTE PER ROW */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleAddExpenseSubmit}
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <div>{isBn ? 'প্রজেক্টের খরচ এন্ট্রি (Expense Breakdown)' : 'Record Project Expense Breakdown'}</div>
                  <div className="text-[11px] font-normal text-slate-500">
                    {isBn ? 'একাধিক খরচের খাত, পরিমাণ ও প্রতি সারিতে নোট/বিবরণ' : 'Multi-row expense categories, amounts & notes per row'}
                  </div>
                </div>
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'খরচের তারিখ (Date)' : 'Expense Date'}
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'সাধারণ ভাউচার / রেফারেন্স নং (ঐচ্ছিক)' : 'Voucher / Ref No. (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={expenseGeneralNote}
                    onChange={(e) => setExpenseGeneralNote(e.target.value)}
                    placeholder="e.g. VOUCHER-OCT-004"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* MULTI-ROW BREAKDOWN ITEMS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isBn ? 'খরচের খাত ও ব্রেকডাউন তালিকা (Expense Breakdown Rows) *' : 'Expense Breakdown Rows *'}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isBn ? 'সারির নিচে নোট লিখুন ও সার্চ ব্যবহার করুন' : 'Search category & write note below each row'}
                  </span>
                </div>

                {expenseRows.map((eRow, idx) => {
                  const filteredCats = getFilteredCategories(eRow.categorySearch);
                  return (
                    <div
                      key={eRow.id}
                      className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] font-black">
                            #{idx + 1}
                          </span>
                          <span>{isBn ? `খরচের খাত #${idx + 1}` : `Expense Row #${idx + 1}`}</span>
                        </span>

                        {expenseRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseRow(eRow.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Row Inputs: Category with Search Dropdown + Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2 relative">
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            {isBn ? 'খরচের খাত অনুসন্ধান বা নতুন নাম (Category / Breakdown Name) *' : 'Category / Breakdown Name *'}
                          </label>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                            <input
                              type="text"
                              required
                              value={eRow.categorySearch}
                              onFocus={() => handleUpdateExpenseRow(eRow.id, { isDropdownOpen: true })}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateExpenseRow(eRow.id, {
                                  categorySearch: val,
                                  category: val,
                                  isDropdownOpen: true,
                                });
                              }}
                              placeholder={isBn ? '🔍 খাতের নাম সার্চ করুন বা নতুন নাম লিখুন...' : '🔍 Search breakdown name or type new...'}
                              className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            />
                            {eRow.categorySearch && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateExpenseRow(eRow.id, {
                                    categorySearch: '',
                                    category: '',
                                    isDropdownOpen: true,
                                  })
                                }
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Searchable Dropdown for this row */}
                          {eRow.isDropdownOpen && (
                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                              {filteredCats.map((cat) => {
                                const label = isBn ? cat.nameBn : cat.nameEn;
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateExpenseRow(eRow.id, {
                                        category: cat.nameEn,
                                        categorySearch: label,
                                        isDropdownOpen: false,
                                      });
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-amber-50 hover:text-amber-900 flex items-center justify-between font-semibold text-slate-800 transition-colors cursor-pointer"
                                  >
                                    <span>{label}</span>
                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                      বেছে নিন
                                    </span>
                                  </button>
                                );
                              })}

                              {eRow.categorySearch.trim() !== '' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateExpenseRow(eRow.id, {
                                      category: eRow.categorySearch.trim(),
                                      categorySearch: eRow.categorySearch.trim(),
                                      isDropdownOpen: false,
                                    });
                                  }}
                                  className="w-full text-left px-3 py-2 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 flex items-center gap-1.5 transition-colors border-t border-amber-200 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    {isBn
                                      ? `✍️ কাস্টম খাত হিসেবে সেট করুন: "${eRow.categorySearch.trim()}"`
                                      : `✍️ Set as custom name: "${eRow.categorySearch.trim()}"`}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            {isBn ? 'টাকার পরিমাণ (Amount ৳) *' : 'Amount (৳) *'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={eRow.amount}
                            onChange={(e) =>
                              handleUpdateExpenseRow(eRow.id, {
                                amount: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            placeholder="0"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-black text-rose-600 bg-white"
                          />
                        </div>
                      </div>

                      {/* PROTETA ROW ER NECE NOTE / DESCRIPTION LIKAR OPTION */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          {isBn ? 'নোট / বিবরণ (Note / Description for this row)' : 'Note / Description'}
                        </label>
                        <input
                          type="text"
                          value={eRow.note}
                          onChange={(e) => handleUpdateExpenseRow(eRow.id, { note: e.target.value })}
                          placeholder={
                            isBn
                              ? 'e.g. রিকশা ও লোকাল ভাড়া / ৩ জন লেবার মজুরি / সাইট ইনস্টলেশন বিস্তারিত...'
                              : 'e.g. Conveyance details / 3 laborers wages / site setup note...'
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] bg-white text-slate-800 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Add Row Button */}
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={handleAddExpenseRow}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isBn ? '+ খরচের খাত / ব্রেকডাউন আইটেম যোগ করুন' : '+ Add Breakdown Row'}</span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC SUM DISPLAY: Expense Amount *2100 taka hobe */}
              <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-rose-900 block">
                    {isBn ? 'মোট খরচের পরিমাণ (Total Expense Amount):' : 'Total Expense Amount:'}
                  </span>
                  <div className="text-[11px] text-rose-700 font-medium flex flex-wrap gap-1 mt-0.5">
                    {expenseRows
                      .filter((r) => Number(r.amount) > 0)
                      .map((r) => `${r.category || (isBn ? 'খাত' : 'Item')} (৳${Number(r.amount).toLocaleString()})`)
                      .join(' + ') || (isBn ? 'পরিমাণ লিখুন' : 'Enter breakdown amounts')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-rose-600 font-mono">
                    *{profile.currencySymbol}{totalExpenseAmount.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isBn ? 'টাকা' : 'BDT'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowExpenseModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={totalExpenseAmount <= 0}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                {isBn ? `খরচ সংরক্ষণ করুন (*৳${totalExpenseAmount.toLocaleString()})` : `Record Expenses (*${totalExpenseAmount.toLocaleString()})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isBn ? 'প্রজেক্ট মুছে ফেলার সতর্কতা' : 'Confirm Project Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isBn
                  ? `আপনি কি নিশ্চিতভাবে "${projectToDelete.name}" প্রজেক্টটি মুছে ফেলতে চান?`
                  : `Are you sure you want to delete project "${projectToDelete.name}"?`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {isBn ? 'ডিলিট করুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
