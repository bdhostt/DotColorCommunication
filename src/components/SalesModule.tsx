import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SalesInvoice, Quotation, Customer, ProductionStatus } from '../types';
import {
  FileText,
  Printer,
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  DollarSign,
  AlertCircle,
  Eye,
  Filter,
  Layers,
  Phone,
  User,
  Calendar,
  FileSpreadsheet,
  SlidersHorizontal,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  UserPlus,
} from 'lucide-react';
import { exportSalesToExcel } from '../utils/exportUtils';
import { ReportPrintModal } from './ReportPrintModal';
import { CreateSalesInvoiceModal } from './CreateSalesInvoiceModal';

interface SalesModuleProps {
  onOpenInvoiceModal: (
    invoiceId: string,
    mode?: 'invoice' | 'challan' | 'pos',
    options?: { autoPrint?: boolean; isPadMode?: boolean }
  ) => void;
  onOpenChallanModal: (invoiceId: string) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  onOpenInvoiceModal,
  onOpenChallanModal,
}) => {
  const {
    invoices,
    quotations,
    customers,
    products,
    profile,
    language,
    updateProductionStatus,
    updateInvoice,
    deleteInvoice,
    collectInvoicePayment,
    convertQuotationToInvoice,
    addQuotation,
    updateQuotation,
    updateQuotationStatus,
    deleteQuotation,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'quotations' | 'customers'>('invoices');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SalesInvoice | null>(null);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [showDirectInvoiceModal, setShowDirectInvoiceModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [addedQuoteItems, setAddedQuoteItems] = useState<any[]>([]);
  
  // Invoice Editing States
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [editInvoiceItems, setEditInvoiceItems] = useState<any[]>([]);
  const [editInvoiceRefNo, setEditInvoiceRefNo] = useState('');
  const [editInvoiceWarehouse, setEditInvoiceWarehouse] = useState<'Factory' | 'Office'>('Factory');
  const [invItemName, setInvItemName] = useState('');
  const [invItemQty, setInvItemQty] = useState(1);
  const [invItemPrice, setInvItemPrice] = useState(1000);
  const [invSelectedProductId, setInvSelectedProductId] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'amount' | 'percent'>('amount');
  const [invoiceVatType, setInvoiceVatType] = useState<'amount' | 'percent'>('percent');
  const [invoiceVatAmountInput, setInvoiceVatAmountInput] = useState<number>(0);
  
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    advanceBalance: 0,
  });

  const handleUpdateEditInvoiceItemRow = (index: number, field: 'qty' | 'unitPrice', val: number) => {
    setEditInvoiceItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const newQty = field === 'qty' ? Math.max(1, val) : it.qty;
        const newPrice = field === 'unitPrice' ? Math.max(0, val) : it.unitPrice;
        const rowTotal = Math.round(newQty * newPrice);
        return {
          ...it,
          qty: newQty,
          unitPrice: newPrice,
          costPrice: Math.round(newPrice * 0.6),
          totalPrice: rowTotal,
        };
      })
    );
  };

  const handleUpdateQuoteItemRow = (index: number, field: 'qty' | 'unitPrice', val: number) => {
    setAddedQuoteItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const newQty = field === 'qty' ? Math.max(1, val) : it.qty;
        const newPrice = field === 'unitPrice' ? Math.max(0, val) : it.unitPrice;
        const rowTotal = Math.round(newQty * newPrice);
        return {
          ...it,
          qty: newQty,
          unitPrice: newPrice,
          costPrice: Math.round(newPrice * 0.6),
          totalPrice: rowTotal,
        };
      })
    );
  };

  const handleEditInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    let finalItems = [...editInvoiceItems];
    if (finalItems.length === 0 && invItemName.trim()) {
      const subItem = invItemQty * invItemPrice;
      finalItems.push({
        productId: invSelectedProductId || `custom-${Date.now()}`,
        name: invItemName.trim(),
        unit: 'pcs',
        unitPrice: invItemPrice,
        costPrice: Math.round(invItemPrice * 0.6),
        qty: invItemQty,
        totalPrice: subItem,
      });
    }

    if (finalItems.length === 0) {
      alert(language === 'bn' ? 'দয়া করে অন্তত একটি আইটেম যোগ করুন!' : 'Please add at least one item!');
      return;
    }

    const sub = finalItems.reduce((acc, item) => acc + item.totalPrice, 0);
    const effectiveDiscount = invoiceDiscountType === 'percent'
      ? Math.round((sub * Math.min(100, Math.max(0, invoiceDiscount))) / 100)
      : Math.min(sub, Math.max(0, invoiceDiscount));
    const taxable = Math.max(0, sub - effectiveDiscount);
    const effectiveVat = invoiceVatType === 'percent'
      ? Math.round((taxable * Math.min(100, Math.max(0, invoiceVatAmountInput))) / 100)
      : Math.max(0, invoiceVatAmountInput);
    const computedVatRate = invoiceVatType === 'percent'
      ? invoiceVatAmountInput
      : (taxable > 0 ? Number(((effectiveVat / taxable) * 100).toFixed(2)) : 0);
    const grand = Math.max(0, taxable + effectiveVat);
    // Keep paid amount same, update due amount
    const due = Math.max(0, grand - editingInvoice.paidAmount);
    
    // Auto update payment status based on new due
    let newPaymentStatus = editingInvoice.paymentStatus;
    if (due <= 0) {
      newPaymentStatus = 'Paid';
    } else if (editingInvoice.paidAmount > 0 && due > 0) {
      newPaymentStatus = 'Partial';
    } else if (editingInvoice.paidAmount === 0) {
      newPaymentStatus = 'Due';
    }

    updateInvoice(editingInvoice.id, {
      referenceNo: editInvoiceRefNo.trim() || undefined,
      warehouseLocation: editInvoiceWarehouse,
      items: finalItems,
      subtotal: sub,
      discount: effectiveDiscount,
      discountType: invoiceDiscountType,
      discountValue: invoiceDiscount,
      vatType: invoiceVatType,
      vatValue: invoiceVatAmountInput,
      vatRate: computedVatRate,
      vatAmount: effectiveVat,
      grandTotal: grand,
      dueAmount: due,
      paymentStatus: newPaymentStatus,
    });

    setEditingInvoice(null);
    setEditInvoiceItems([]);
    setEditInvoiceRefNo('');
    setInvItemName('');
    setInvSelectedProductId('');
    setInvItemQty(1);
    setInvItemPrice(1000);
    setInvoiceDiscount(0);
    setInvoiceDiscountType('amount');
    setInvoiceVatType('percent');
    setInvoiceVatAmountInput(0);
  };

  const handleCustomerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name.trim() || !customerFormData.phone.trim()) return;

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: customerFormData.name.trim(),
        company: customerFormData.company.trim() || undefined,
        phone: customerFormData.phone.trim(),
        email: customerFormData.email.trim() || undefined,
        address: customerFormData.address.trim() || undefined,
        advanceBalance: Number(customerFormData.advanceBalance) || 0,
      });
    } else {
      addCustomer({
        name: customerFormData.name.trim(),
        company: customerFormData.company.trim() || undefined,
        phone: customerFormData.phone.trim(),
        email: customerFormData.email.trim() || undefined,
        address: customerFormData.address.trim() || undefined,
        advanceBalance: Number(customerFormData.advanceBalance) || 0,
      });
    }

    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  const [filterPayment, setFilterPayment] = useState<string>('ALL');
  const [filterProduction, setFilterProduction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [quoteCustomerSearch, setQuoteCustomerSearch] = useState('');
  const [isQuoteCustomerDropdownOpen, setIsQuoteCustomerDropdownOpen] = useState(false);

  // Date Range Filters for Invoices
  const [filterDatePreset, setFilterDatePreset] = useState<'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'LAST_30' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const handleDatePreset = (preset: 'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'LAST_30' | 'CUSTOM') => {
    setFilterDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      setShowCustomDate(false);
    } else if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
      setShowCustomDate(false);
    } else if (preset === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today);
      setShowCustomDate(false);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(today);
      setShowCustomDate(false);
    } else if (preset === 'LAST_30') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today);
      setShowCustomDate(false);
    } else if (preset === 'CUSTOM') {
      setShowCustomDate(true);
    }
  };

  // Collect Payment Modal
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<SalesInvoice | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'bKash / Nagad' | 'Bank Transfer'>('Cash');

  // New Quotation Modal
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [quoteType, setQuoteType] = useState<'Sales' | 'Custom'>('Sales');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quoteCustomerName, setQuoteCustomerName] = useState('');
  const [quoteCustomerPhone, setQuoteCustomerPhone] = useState('');
  const [quoteCustomerCompany, setQuoteCustomerCompany] = useState('');
  const [quoteReferenceNo, setQuoteReferenceNo] = useState('');
  const [quoteItemName, setQuoteItemName] = useState('');
  const [quoteItemQty, setQuoteItemQty] = useState(1);
  const [quoteItemPrice, setQuoteItemPrice] = useState(1000);
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [quoteDiscountType, setQuoteDiscountType] = useState<'amount' | 'percent'>('amount');
  const [quoteVatType, setQuoteVatType] = useState<'amount' | 'percent'>('percent');
  const [quoteVatAmountInput, setQuoteVatAmountInput] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('');

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchPay = filterPayment === 'ALL' ? true : inv.paymentStatus === filterPayment;
    const matchProd = filterProduction === 'ALL' ? true : inv.productionStatus === filterProduction;
    const matchDate = (!startDate || inv.date >= startDate) && (!endDate || inv.date <= endDate);
    const q = (searchQuery || '').toLowerCase().trim();
    const matchSearch =
      !q ||
      (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
      (inv.referenceNo && inv.referenceNo.toLowerCase().includes(q)) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.includes(q)) ||
      (inv.items && inv.items.some((i) => i.name && i.name.toLowerCase().includes(q)));

    return matchPay && matchProd && matchDate && matchSearch;
  });

  const dateRangeLabel = startDate && endDate
    ? `${startDate} to ${endDate}`
    : startDate
    ? `From ${startDate}`
    : endDate
    ? `Up to ${endDate}`
    : 'All Invoices';

  const handleExcelExport = () => {
    exportSalesToExcel(filteredInvoices, profile, dateRangeLabel);
  };

  // Filtered clients for customer directory
  const filteredClients = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearchQuery]);

  // Filtered customers for quotation quick-select
  const filteredQuoteCustomers = useMemo(() => {
    if (!quoteCustomerSearch.trim()) return customers;
    const q = quoteCustomerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [customers, quoteCustomerSearch]);

  // Financial stats (for filtered or overall)
  const totalSales = filteredInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const totalCollected = filteredInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalDue = filteredInvoices.reduce((acc, i) => acc + i.dueAmount, 0);

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice || collectAmount <= 0) return;
    collectInvoicePayment(paymentModalInvoice.id, collectAmount, collectMethod);
    setPaymentModalInvoice(null);
    setCollectAmount(0);
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCustomerName) return;

    let finalItems = [...addedQuoteItems];
    if (finalItems.length === 0 && quoteItemName.trim()) {
      const subItem = quoteItemQty * quoteItemPrice;
      finalItems.push({
        productId: selectedProductId || `custom-${Date.now()}`,
        name: quoteItemName.trim(),
        category: 'BRANDED PROMOTIONAL GIFTS',
        unit: 'pcs',
        unitPrice: quoteItemPrice,
        costPrice: Math.round(quoteItemPrice * 0.6),
        qty: quoteItemQty,
        totalPrice: subItem,
      });
    }

    if (finalItems.length === 0) {
      alert(language === 'bn' ? 'দয়া করে অন্তত একটি আইটেম যোগ করুন!' : 'Please add at least one item!');
      return;
    }

    const sub = finalItems.reduce((acc, item) => acc + item.totalPrice, 0);
    const effectiveQuoteDiscount = quoteDiscountType === 'percent'
      ? Math.round((sub * Math.min(100, Math.max(0, quoteDiscount))) / 100)
      : Math.min(sub, Math.max(0, quoteDiscount));
    const taxable = Math.max(0, sub - effectiveQuoteDiscount);
    const effectiveQuoteVat = quoteVatType === 'percent'
      ? Math.round((taxable * Math.min(100, Math.max(0, quoteVatAmountInput))) / 100)
      : Math.max(0, quoteVatAmountInput);
    const computedVatRate = quoteVatType === 'percent'
      ? quoteVatAmountInput
      : (taxable > 0 ? Number(((effectiveQuoteVat / taxable) * 100).toFixed(2)) : 0);
    const grand = taxable + effectiveQuoteVat;

    if (editingQuotation) {
      updateQuotation(editingQuotation.id, {
        customerName: quoteCustomerName,
        customerPhone: quoteCustomerPhone,
        customerCompany: quoteCustomerCompany,
        referenceNo: quoteReferenceNo.trim() || undefined,
        items: finalItems,
        subtotal: sub,
        discount: effectiveQuoteDiscount,
        discountType: quoteDiscountType,
        discountValue: quoteDiscount,
        vatType: quoteVatType,
        vatValue: quoteVatAmountInput,
        vatRate: computedVatRate,
        vatAmount: effectiveQuoteVat,
        grandTotal: grand,
        notes: quoteNotes,
        quoteType,
      });
      setEditingQuotation(null);
    } else {
      addQuotation({
        date: new Date().toISOString().slice(0, 10),
        referenceNo: quoteReferenceNo.trim() || undefined,
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        customerName: quoteCustomerName,
        customerPhone: quoteCustomerPhone,
        customerCompany: quoteCustomerCompany,
        items: finalItems,
        subtotal: sub,
        discount: effectiveQuoteDiscount,
        discountType: quoteDiscountType,
        discountValue: quoteDiscount,
        vatType: quoteVatType,
        vatValue: quoteVatAmountInput,
        vatRate: computedVatRate,
        vatAmount: effectiveQuoteVat,
        grandTotal: grand,
        status: 'Sent',
        notes: quoteNotes,
        quoteType,
      });
    }

    setShowNewQuoteModal(false);
    setAddedQuoteItems([]);
    setQuoteType('Sales');
    setSelectedProductId('');
    setQuoteCustomerName('');
    setQuoteCustomerPhone('');
    setQuoteCustomerCompany('');
    setQuoteReferenceNo('');
    setQuoteItemName('');
    setQuoteItemQty(1);
    setQuoteItemPrice(1000);
    setQuoteDiscount(0);
    setQuoteDiscountType('amount');
    setQuoteVatType('percent');
    setQuoteVatAmountInput(0);
    setQuoteNotes('');
  };

  const productionStatuses: ProductionStatus[] = [
    'Queued',
    'Designing',
    'In Print / Fabrication',
    'Finishing',
    'Ready',
    'Delivered',
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">
            {language === 'bn' ? 'সর্বমোট বিক্রয় ভলিউম' : 'Total Gross Sales'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profile.currencySymbol}
            {totalSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {invoices.length} {language === 'bn' ? 'টি ইনভয়েস' : 'invoices recorded'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-600 block mb-1">
            {language === 'bn' ? 'আদায়কৃত পেমেন্ট (জমা)' : 'Total Cash & Bank Collected'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {profile.currencySymbol}
            {totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block font-medium">
            {language === 'bn' ? 'ক্যাশ, ব্যাংক ও বিকাশ মাধ্যমে' : 'via Cash, Bank & Mobile Banking'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-rose-600 block mb-1">
            {language === 'bn' ? 'গ্রাহকদের কাছে বকেয়া পাওনা' : 'Accounts Receivable (Customer Due)'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {profile.currencySymbol}
            {totalDue.toLocaleString()}
          </div>
          <span className="text-[11px] text-rose-500 mt-1 block font-medium">
            {invoices.filter((i) => i.dueAmount > 0).length}{' '}
            {language === 'bn' ? 'টি ইনভয়েসে বকেয়া আছে' : 'invoices with due'}
          </span>
        </div>
      </div>

      {/* Sub tabs & Actions bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('invoices')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'invoices' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'ইনভয়েস ও সেলস' : 'Sales Invoices'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('quotations')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'quotations' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'কোটেশন ও এস্টিমেশন' : 'Quotations / Estimates'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('customers')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'customers' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'গ্রাহক তালিকা' : 'Client Directory'}
          </button>
        </div>

        {activeSubTab === 'invoices' && (
          <button
            type="button"
            onClick={() => setShowDirectInvoiceModal(true)}
            className="w-full md:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ সরাসরি সেলস ইনভয়েস তৈরি' : '+ Create Sales Invoice'}</span>
          </button>
        )}

        {activeSubTab === 'quotations' && (
          <button
            type="button"
            onClick={() => setShowNewQuoteModal(true)}
            className="w-full md:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ নতুন কোটেশন তৈরি' : '+ Create New Quote'}</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: INVOICES & ORDERS */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'ইনভয়েস নং, ক্লায়েন্ট বা ফোন খুঁজুন...'
                    : 'Search invoice#, client or phone...'
                }
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* Date Presets */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                {(
                  [
                    { id: 'ALL', labelEn: 'All', labelBn: 'সকল' },
                    { id: 'TODAY', labelEn: 'Today', labelBn: 'আজকে' },
                    { id: '7D', labelEn: '7 Days', labelBn: '৭ দিন' },
                    { id: 'THIS_MONTH', labelEn: 'Month', labelBn: 'মাস' },
                    { id: 'CUSTOM', labelEn: 'Custom', labelBn: 'কাস্টম' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePreset(p.id)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                      filterDatePreset === p.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {language === 'bn' ? p.labelBn : p.labelEn}
                  </button>
                ))}
              </div>

              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                <option value="ALL">{language === 'bn' ? 'সকল পেমেন্ট' : 'All Payments'}</option>
                <option value="Paid">Paid (পরিশোধিত)</option>
                <option value="Partial">Partial (আংশিক পরিশোধ)</option>
                <option value="Due">Due (বকেয়া)</option>
              </select>

              <select
                value={filterProduction}
                onChange={(e) => setFilterProduction(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                <option value="ALL">{language === 'bn' ? 'সকল কাজের স্ট্যাটাস' : 'All Statuses'}</option>
                {productionStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Excel & PDF Export buttons */}
              <button
                type="button"
                onClick={handleExcelExport}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1 transition-all"
                title={language === 'bn' ? 'এক্সেল সেলস রিপোর্ট ডাউনলোড' : 'Export Excel Report'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-2xs flex items-center gap-1 transition-all"
                title={language === 'bn' ? 'প্রিন্ট / সেভ PDF রিপোর্ট' : 'Print / Save PDF Report'}
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Custom Date Range Filter Inputs */}
          {(showCustomDate || filterDatePreset === 'CUSTOM') && (
            <div className="bg-amber-50/60 border-b border-amber-200/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'bn' ? 'কাস্টম তারিখ ফিল্টার:' : 'Custom Date Filter:'}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                  <span className="text-slate-500 text-[11px] font-medium">
                    {language === 'bn' ? 'শুরু:' : 'From:'}
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFilterDatePreset('CUSTOM');
                    }}
                    className="text-xs font-semibold text-slate-800 outline-none bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                  <span className="text-slate-500 text-[11px] font-medium">
                    {language === 'bn' ? 'শেষ:' : 'To:'}
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setFilterDatePreset('CUSTOM');
                    }}
                    className="text-xs font-semibold text-slate-800 outline-none bg-transparent"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDatePreset('ALL')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">ইনভয়েস / তারিখ</th>
                  <th className="py-3 px-4">গ্রাহক ও প্রতিষ্ঠান</th>
                  <th className="py-3 px-4">আইটেম ও বিবরণ</th>
                  <th className="py-3 px-4 text-right">মোট টাকা</th>
                  <th className="py-3 px-4 text-center">পেমেন্ট</th>
                  <th className="py-3 px-4 text-center">কাজের অগ্রগতি</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{inv.invoiceNo}</span>
                        {inv.referenceNo && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Ref: {inv.referenceNo}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {inv.date}
                        {inv.warehouseLocation && (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1 rounded ml-1">
                            {inv.warehouseLocation}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {inv.customerPhone}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">
                        {inv.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                      </div>
                      {inv.jobSpecs && (
                        <div className="text-[10px] text-amber-700 italic truncate mt-0.5">
                          {inv.jobSpecs}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black text-slate-900 text-sm">
                        {profile.currencySymbol}
                        {inv.grandTotal.toLocaleString()}
                      </div>
                      {inv.dueAmount > 0 && (
                        <div className="text-[11px] font-bold text-rose-600">
                          {language === 'bn' ? 'বকেয়া: ' : 'Due: '}
                          {profile.currencySymbol}
                          {inv.dueAmount.toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.paymentStatus === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{inv.paymentMethod}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={inv.productionStatus}
                        onChange={(e) => updateProductionStatus(inv.id, e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                      >
                        {productionStatuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Printer Select Dropdown (Matches status dropdown style) */}
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            e.target.value = '';
                            if (val === 'pos') {
                              onOpenInvoiceModal(inv.id, 'pos', { autoPrint: true });
                            } else if (val === 'a4') {
                              onOpenInvoiceModal(inv.id, 'invoice', { autoPrint: true, isPadMode: false });
                            } else if (val === 'pad') {
                              onOpenInvoiceModal(inv.id, 'invoice', { autoPrint: true, isPadMode: true });
                            } else if (val === 'preview') {
                              onOpenInvoiceModal(inv.id, 'invoice', { autoPrint: false });
                            }
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100/80 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                          title={language === 'bn' ? 'প্রিন্ট অপশন সিলেক্ট করুন' : 'Select print option'}
                        >
                          <option value="" disabled>
                            {language === 'bn' ? '🖨️ প্রিন্ট করুন ▼' : '🖨️ Print ▼'}
                          </option>
                          <option value="pos">
                            {language === 'bn' ? '🧾 ৮০মিমি POS / KOT স্লিপ' : '🧾 80mm POS / KOT Slip'}
                          </option>
                          <option value="a4">
                            {language === 'bn' ? '📄 A4 সাধারণ ইনভয়েস' : '📄 A4 Standard Invoice'}
                          </option>
                          <option value="pad">
                            {language === 'bn' ? '📑 লেটারহেড প্যাড প্রিন্ট' : '📑 Letterhead Pad Print'}
                          </option>
                          <option value="preview">
                            {language === 'bn' ? '👁️ প্রিভিউ ও এডিট' : '👁️ Preview & Edit'}
                          </option>
                        </select>

                        {/* View / Preview Invoice Modal */}
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceModal(inv.id, 'invoice', { autoPrint: false })}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title={language === 'bn' ? 'ইনভয়েস প্রিভিউ ও বিস্তারিত দেখুন' : 'View / Preview Invoice'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Invoice */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInvoice(inv);
                            setEditInvoiceItems(inv.items || []);
                            setEditInvoiceRefNo(inv.referenceNo || '');
                            setEditInvoiceWarehouse(inv.warehouseLocation || 'Factory');
                            setInvoiceDiscountType(inv.discountType || 'amount');
                            setInvoiceDiscount(inv.discountValue !== undefined ? inv.discountValue : (inv.discount || 0));
                            setInvoiceVatType(inv.vatType || 'percent');
                            setInvoiceVatAmountInput(inv.vatValue !== undefined ? inv.vatValue : (inv.vatRate || 0));
                            setInvItemName('');
                            setInvItemQty(1);
                            setInvItemPrice(1000);
                            setInvSelectedProductId('');
                          }}
                          className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delivery Challan */}
                        <button
                          type="button"
                          onClick={() => onOpenChallanModal(inv.id)}
                          className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                          title="Generate Delivery Challan"
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Invoice */}
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Collect Payment */}
                        {inv.dueAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalInvoice(inv);
                              setCollectAmount(inv.dueAmount);
                            }}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-[10px] font-bold"
                            title="Collect Due Payment"
                          >
                            +জমা
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      {language === 'bn' ? 'কোন ইনভয়েস পাওয়া যায়নি' : 'No invoices found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUOTATIONS / ESTIMATES */}
      {activeSubTab === 'quotations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'bn' ? 'কোটেশন ও প্রাক্কলন তালিকা' : 'Active Quotations & Estimates'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'ক্লায়েন্টদের দেওয়া অফারসমূহ এবং সরাসরি ইনভয়েসে কনভার্ট করার সুবিধা'
                  : 'Proposals sent to clients with one-click conversion to work order'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotations.map((q) => (
              <div
                key={q.id}
                className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 hover:border-amber-400 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {q.quoteNo}
                    </span>
                    {q.referenceNo && (
                      <span className="ml-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        Ref: {q.referenceNo}
                      </span>
                    )}
                    <span className={`ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded border ${
                      q.quoteType === 'Custom'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {q.quoteType === 'Custom'
                        ? (language === 'bn' ? 'কাস্টম কোটেশন' : 'Custom')
                        : (language === 'bn' ? 'সেল ও সার্ভিস' : 'Sales & Service')}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">
                      {q.customerCompany ? `${q.customerCompany} - ` : ''}
                      {q.customerName}
                    </h4>
                    <span className="text-xs text-slate-500">{q.customerPhone}</span>
                  </div>

                  <select
                    value={q.status}
                    onChange={(e) => updateQuotationStatus(q.id, e.target.value as any)}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-hidden transition-all ${
                      q.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : q.status === 'Sent'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : q.status === 'Declined'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <option value="Sent">{language === 'bn' ? 'Pending / Sent' : 'Pending / Sent'}</option>
                    <option value="Approved">{language === 'bn' ? 'Approved' : 'Approved'}</option>
                    <option value="Declined">{language === 'bn' ? 'Declined' : 'Declined'}</option>
                    <option value="Draft">{language === 'bn' ? 'Draft' : 'Draft'}</option>
                  </select>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 text-xs space-y-1">
                  {q.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="font-medium text-slate-700">
                        {i.name} (x{i.qty} {i.unit})
                      </span>
                      <span className="font-bold text-slate-900">
                        {profile.currencySymbol}
                        {i.totalPrice.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-slate-950">
                    <span>{language === 'bn' ? 'সর্বমোট কোটেশন' : 'Total Quote:'}</span>
                    <span className="text-amber-600">
                      {profile.currencySymbol}
                      {q.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {q.notes && <p className="text-[11px] text-slate-500 italic">{q.notes}</p>}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'মেয়াদ:' : 'Valid until:'} {q.validUntil}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Printer Select Dropdown */}
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        e.target.value = '';
                        if (val === 'pos') {
                          onOpenInvoiceModal(q.id, 'pos', { autoPrint: true });
                        } else if (val === 'a4') {
                          onOpenInvoiceModal(q.id, 'invoice', { autoPrint: true, isPadMode: false });
                        } else if (val === 'pad') {
                          onOpenInvoiceModal(q.id, 'invoice', { autoPrint: true, isPadMode: true });
                        } else if (val === 'preview') {
                          onOpenInvoiceModal(q.id, 'invoice', { autoPrint: false });
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100/80 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                      title={language === 'bn' ? 'কোটেশন প্রিন্ট অপশন সিলেক্ট করুন' : 'Select quote print option'}
                    >
                      <option value="" disabled>
                        {language === 'bn' ? '🖨️ প্রিন্ট করুন ▼' : '🖨️ Print ▼'}
                      </option>
                      <option value="pos">
                        {language === 'bn' ? '🧾 ৮০মিমি POS থার্মাল' : '🧾 80mm POS Thermal'}
                      </option>
                      <option value="a4">
                        {language === 'bn' ? '📄 A4 সাধারণ কোটেশন' : '📄 A4 Standard Quote'}
                      </option>
                      <option value="pad">
                        {language === 'bn' ? '📑 লেটারহেড প্যাড প্রিন্ট' : '📑 Letterhead Pad Print'}
                      </option>
                      <option value="preview">
                        {language === 'bn' ? '👁️ কোটেশন প্রিভিউ' : '👁️ Quote Preview'}
                      </option>
                    </select>

                    {/* View Preview */}
                    <button
                      type="button"
                      onClick={() => onOpenInvoiceModal(q.id, 'invoice', { autoPrint: false })}
                      className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      title={language === 'bn' ? 'কোটেশন প্রিভিউ দেখুন' : 'View Quote Preview'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Button if not converted to invoice */}
                    {!q.isConverted && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuotation(q);
                          setQuoteCustomerName(q.customerName);
                          setQuoteCustomerPhone(q.customerPhone);
                          setQuoteCustomerCompany(q.customerCompany || '');
                          setQuoteReferenceNo(q.referenceNo || '');
                          setQuoteType(q.quoteType || 'Sales');
                          setQuoteItemName('');
                          setQuoteItemQty(1);
                          setQuoteItemPrice(1000);
                          setQuoteDiscount(q.discountValue !== undefined ? q.discountValue : (q.discount || 0));
                          setQuoteDiscountType(q.discountType || 'amount');
                          setQuoteVatType(q.vatType || 'percent');
                          setQuoteVatAmountInput(q.vatValue !== undefined ? q.vatValue : (q.vatRate || 0));
                          setQuoteNotes(q.notes || '');
                          setSelectedProductId('');
                          setAddedQuoteItems(q.items || []);
                          setShowNewQuoteModal(true);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</span>
                      </button>
                    )}

                    {/* Convert to Invoice Button - only shown after Approved and not yet converted */}
                    {q.status === 'Approved' && !q.isConverted && (
                      <button
                        type="button"
                        onClick={() => {
                          const inv = convertQuotationToInvoice(q.id);
                          if (inv) {
                            setActiveSubTab('invoices');
                            onOpenInvoiceModal(inv.id);
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>{language === 'bn' ? 'ইনভয়েস তৈরি করুন' : 'Convert to Invoice'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    {/* Delete Quotation Button */}
                    <button
                      type="button"
                      onClick={() => setQuotationToDelete(q)}
                      className="p-1.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                      title="Delete Quotation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Converted Status Indicator */}
                    {q.status === 'Approved' && q.isConverted && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-not-allowed">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'ইনভয়েস কনভার্টেড' : 'Invoice Converted'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CUSTOMER DIRECTORY */}
      {activeSubTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'bn' ? 'নিবন্ধিত কর্পোরেট ও রিটেইল ক্লায়েন্ট তালিকা' : 'Registered Clients'}
              </h3>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {filteredClients.length} {customerSearchQuery ? ` / ${customers.length}` : ''}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Search Customer Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'নাম, মোবাইল নম্বর বা প্রতিষ্ঠান দিয়ে খুঁজুন...'
                      : 'Search by name, phone, company...'
                  }
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const isPhone = /^[0-9+ -]+$/.test(customerSearchQuery.trim());
                  setEditingCustomer(null);
                  setCustomerFormData({
                    name: isPhone ? '' : customerSearchQuery.trim(),
                    company: '',
                    phone: isPhone ? customerSearchQuery.trim() : '',
                    email: '',
                    address: '',
                    advanceBalance: 0,
                  });
                  setShowCustomerModal(true);
                }}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন কাস্টমার যোগ করুন' : 'Add New Client'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-3 px-4">গ্রাহক ও প্রতিষ্ঠান</th>
                  <th className="py-3 px-4">মোবাইল নম্বর</th>
                  <th className="py-3 px-4">ঠিকানা</th>
                  <th className="py-3 px-4 text-right">সর্বমোট ক্রয়</th>
                  <th className="py-3 px-4 text-right">বর্তমান বকেয়া</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <User className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-xs text-slate-700">
                          {language === 'bn'
                            ? `"${customerSearchQuery}" সম্পর্কিত কোনো ক্লায়েন্ট পাওয়া যায়নি`
                            : `No clients found matching "${customerSearchQuery}"`}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const isPhone = /^[0-9+ -]+$/.test(customerSearchQuery.trim());
                            setEditingCustomer(null);
                            setCustomerFormData({
                              name: isPhone ? '' : customerSearchQuery.trim(),
                              company: '',
                              phone: isPhone ? customerSearchQuery.trim() : '',
                              email: '',
                              address: '',
                              advanceBalance: 0,
                            });
                            setShowCustomerModal(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>
                            {language === 'bn'
                              ? `+ নতুন ক্লায়েন্ট হিসেবে যুক্ত করুন`
                              : `+ Add as New Client`}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.company && (
                          <div className="text-[11px] text-amber-700 font-semibold">{c.company}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium font-mono">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-500">{c.address || 'Chattogram'}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {profile.currencySymbol}
                        {c.totalPurchased.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black ${
                            c.dueAmount > 0 ? 'text-rose-600 text-sm' : 'text-slate-400'
                          }`}
                        >
                          {profile.currencySymbol}
                          {c.dueAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(c);
                              setCustomerFormData({
                                name: c.name,
                                company: c.company || '',
                                phone: c.phone,
                                email: c.email || '',
                                address: c.address || '',
                                advanceBalance: c.advanceBalance || 0,
                              });
                              setShowCustomerModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                            title={language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(c)}
                            className="p-1.5 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                            title={language === 'bn' ? 'ডিলিট' : 'Delete'}
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
      )}

      {/* COLLECT DUE MODAL */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCollectSubmit}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'bn' ? 'বকেয়া টাকা কালেকশন' : 'Collect Due Payment'}
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">
                  {paymentModalInvoice.customerName}
                </div>
                <div className="text-slate-500 mt-0.5">
                  ইনভয়েস: {paymentModalInvoice.invoiceNo}
                </div>
                <div className="mt-2 text-rose-600 font-black text-sm">
                  {language === 'bn' ? 'বর্তমান বকেয়া: ' : 'Current Due: '}
                  {profile.currencySymbol}
                  {paymentModalInvoice.dueAmount.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'জমা নেওয়ার পরিমাণ (৳) *' : 'Amount to Collect *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={paymentModalInvoice.dueAmount}
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-base text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Channel'}
                </label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="Cash">Cash (নগদ গ্রহণ)</option>
                  <option value="bKash / Nagad">bKash / Nagad (মোবাইল ব্যাংকিং)</option>
                  <option value="Bank Transfer">BRAC Bank (ব্যাংক একাউন্ট)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'জমা নিশ্চিত করুন' : 'Confirm Collection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT INVOICE MODAL */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleEditInvoiceSubmit}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'bn' ? 'ইনভয়েস সংশোধন করুন' : 'Edit Invoice'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingInvoice(null);
                  setEditInvoiceItems([]);
                  setInvItemName('');
                  setInvSelectedProductId('');
                  setInvItemQty(1);
                  setInvItemPrice(1000);
                  setInvoiceDiscount(0);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1.5 my-3 scrollbar-thin scrollbar-thumb-slate-200">
              {/* Reference & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'রেফারেন্স / পিও নম্বর (Ref No.)' : 'Reference / PO No.'}
                  </label>
                  <input
                    type="text"
                    value={editInvoiceRefNo}
                    onChange={(e) => setEditInvoiceRefNo(e.target.value)}
                    placeholder="e.g. PO-889, REF-2024"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'শাখা / গোডাউন' : 'Branch / Location'}
                  </label>
                  <select
                    value={editInvoiceWarehouse}
                    onChange={(e) => setEditInvoiceWarehouse(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white"
                  >
                    <option value="Office">Central Warehouse / সেন্ট্রাল ওয়্যারহাউজ</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-3">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between items-center">
                  <span>{language === 'bn' ? 'আইটেম এন্ট্রি করুন' : 'Add Item Row'}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{language === 'bn' ? 'নিচের বাটন দিয়ে লিস্টে যোগ করুন' : 'Click Add Row below to save to list'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">
                      {language === 'bn' ? 'কাজের বা সার্ভিসের নাম *' : 'Service / Item Description *'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={invSelectedProductId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          setInvSelectedProductId(prodId);
                          const prod = products.find((p) => p.id === prodId);
                          if (prod) {
                            setInvItemName(language === 'bn' && prod.nameBn ? prod.nameBn : prod.name);
                            setInvItemPrice(prod.unitPrice);
                          } else {
                            setInvItemName('');
                          }
                        }}
                        className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                      >
                        <option value="">{language === 'bn' ? '-- সিলেক্ট আইটেম --' : '-- Select Item --'}</option>
                        {(products || []).filter(p => !p.isRawMaterial).map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {language === 'bn' && prod.nameBn ? prod.nameBn : prod.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={invItemName}
                        onChange={(e) => setInvItemName(e.target.value)}
                        placeholder={
                          language === 'bn'
                            ? 'ম্যানুয়াল আইটেম...'
                            : 'Manual description...'
                        }
                        className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">
                        {language === 'bn' ? 'পরিমাণ' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={invItemQty}
                        onChange={(e) => setInvItemQty(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">
                        {language === 'bn' ? 'দর (৳)' : 'Unit Rate (৳)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={invItemPrice}
                        onChange={(e) => setInvItemPrice(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!invItemName.trim()) {
                        alert(language === 'bn' ? 'দয়া করে আইটেমের নাম লিখুন বা সিলেক্ট করুন!' : 'Please enter or select item name!');
                        return;
                      }
                      const subTotal = invItemQty * invItemPrice;
                      const newItem = {
                        productId: invSelectedProductId || `custom-${Date.now()}`,
                        name: invItemName.trim(),
                        unit: 'pcs',
                        unitPrice: invItemPrice,
                        costPrice: Math.round(invItemPrice * 0.6),
                        qty: invItemQty,
                        totalPrice: subTotal,
                      };
                      setEditInvoiceItems([...editInvoiceItems, newItem]);
                      setInvItemName('');
                      setInvSelectedProductId('');
                      setInvItemQty(1);
                      setInvItemPrice(1000);
                    }}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'যোগ করুন (Add Row)' : 'Add Row'}</span>
                  </button>
                </div>
              </div>

              {/* Added Items Table */}
              {editInvoiceItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-200">
                    {language === 'bn' ? 'যুক্ত হওয়া আইটেমসমূহ' : 'Added Items List'}
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                          <th className="p-2 text-center w-10">SL</th>
                          <th className="p-2">{language === 'bn' ? 'বিবরণ' : 'Description'}</th>
                          <th className="p-2 text-center w-28">{language === 'bn' ? 'পরিমাণ (Qty)' : 'Qty'}</th>
                          <th className="p-2 text-right w-32">{language === 'bn' ? 'দর (Rate ৳)' : 'Rate (৳)'}</th>
                          <th className="p-2 text-right w-28">{language === 'bn' ? 'মোট (Total)' : 'Total (৳)'}</th>
                          <th className="p-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editInvoiceItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-semibold text-slate-800">{item.name}</td>
                            <td className="p-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) =>
                                    handleUpdateEditInvoiceItemRow(idx, 'qty', Math.max(1, Number(e.target.value)))
                                  }
                                  className="w-16 px-1.5 py-1 text-center font-bold text-slate-800 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900"
                                />
                                <span className="text-[10px] text-slate-500 font-medium">{item.unit || 'pcs'}</span>
                              </div>
                            </td>
                            <td className="p-1.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 font-semibold text-xs">৳</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleUpdateEditInvoiceItemRow(idx, 'unitPrice', Math.max(0, Number(e.target.value)))
                                  }
                                  className="w-20 px-1.5 py-1 text-right font-bold text-slate-800 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900"
                                />
                              </div>
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">৳{item.totalPrice.toLocaleString()}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditInvoiceItems(editInvoiceItems.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Discount & VAT / Tax with Toggle */}
              {(() => {
                const sub = editInvoiceItems.reduce((acc, item) => acc + item.totalPrice, 0);
                const effectiveDiscount = invoiceDiscountType === 'percent'
                  ? Math.round((sub * Math.min(100, Math.max(0, invoiceDiscount))) / 100)
                  : Math.min(sub, Math.max(0, invoiceDiscount));
                const taxable = Math.max(0, sub - effectiveDiscount);
                const effectiveVat = invoiceVatType === 'percent'
                  ? Math.round((taxable * Math.min(100, Math.max(0, invoiceVatAmountInput))) / 100)
                  : Math.max(0, invoiceVatAmountInput);
                const grand = Math.max(0, taxable + effectiveVat);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Controls */}
                    <div className="space-y-2">
                      {/* Discount Control */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 text-xs">
                            {language === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => setInvoiceDiscountType('amount')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  invoiceDiscountType === 'amount'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                ৳
                              </button>
                              <button
                                type="button"
                                onClick={() => setInvoiceDiscountType('percent')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  invoiceDiscountType === 'percent'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                %
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={invoiceDiscount}
                              onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value)))}
                              className="w-24 text-right px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* VAT / Tax Control (Like Discount) */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 text-xs">
                            {language === 'bn' ? 'ভ্যাট / ট্যাক্স' : 'VAT / Tax'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => setInvoiceVatType('amount')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  invoiceVatType === 'amount'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                ৳
                              </button>
                              <button
                                type="button"
                                onClick={() => setInvoiceVatType('percent')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  invoiceVatType === 'percent'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                %
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={invoiceVatAmountInput}
                              onChange={(e) => setInvoiceVatAmountInput(Math.max(0, Number(e.target.value)))}
                              className="w-24 text-right px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary box */}
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 flex flex-col justify-center space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>{language === 'bn' ? 'উপ-মোট (Subtotal):' : 'Subtotal:'}</span>
                        <span>{profile.currencySymbol}{sub.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>{language === 'bn' ? 'ডিসকাউন্ট (Discount):' : 'Discount:'}</span>
                        <span>-{profile.currencySymbol}{effectiveDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>{language === 'bn' ? 'ভ্যাট (VAT / Tax):' : 'VAT / Tax:'}</span>
                        <span>+{profile.currencySymbol}{effectiveVat.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center font-black text-slate-900 pt-1 border-t border-amber-200/50">
                        <span>{language === 'bn' ? 'সর্বমোট দর (Grand Total):' : 'Grand Total:'}</span>
                        <span className="text-amber-600 text-sm">
                          {profile.currencySymbol}{grand.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingInvoice(null);
                  setEditInvoiceItems([]);
                  setInvItemName('');
                  setInvSelectedProductId('');
                  setInvItemQty(1);
                  setInvItemPrice(1000);
                  setInvoiceDiscount(0);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                {language === 'bn' ? 'আপডেট করুন' : 'Update Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE QUOTATION MODAL */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuote}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] md:max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {editingQuotation
                  ? (language === 'bn' ? 'কোটেশন সংশোধন করুন' : 'Edit Quotation')
                  : (language === 'bn' ? 'নতুন কোটেশন / প্রাক্কলন তৈরি' : 'Create New Quotation')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewQuoteModal(false);
                  setEditingQuotation(null);
                  setAddedQuoteItems([]);
                  setQuoteType('Sales');
                  setSelectedProductId('');
                  setQuoteCustomerName('');
                  setQuoteCustomerPhone('');
                  setQuoteCustomerCompany('');
                  setQuoteItemName('');
                  setQuoteDiscount(0);
                  setQuoteNotes('');
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1.5 my-3 scrollbar-thin scrollbar-thumb-slate-200">
              {/* Quick Customer Search & Select for Quotation */}
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {language === 'bn'
                        ? 'বিদ্যমান গ্রাহক সার্চ করুন (নাম বা ফোন)'
                        : 'Quick Search Existing Customer (Name / Phone)'}
                    </span>
                  </label>
                  <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded">
                    {language === 'bn' ? 'অটো-ফিল' : 'Auto-fill'}
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={quoteCustomerSearch}
                    onChange={(e) => {
                      setQuoteCustomerSearch(e.target.value);
                      setIsQuoteCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsQuoteCustomerDropdownOpen(true)}
                    placeholder={
                      language === 'bn'
                        ? 'বিদ্যমান গ্রাহকের নাম বা ফোন নম্বর টাইপ করুন...'
                        : 'Type existing customer name or phone to auto-fill...'
                    }
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-amber-300/90 focus:border-amber-500 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500/20"
                  />
                  {quoteCustomerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteCustomerSearch('');
                        setIsQuoteCustomerDropdownOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Dropdown with matching customers */}
                  {isQuoteCustomerDropdownOpen && quoteCustomerSearch.trim() && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsQuoteCustomerDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredQuoteCustomers.length > 0 ? (
                          filteredQuoteCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setQuoteCustomerName(c.name);
                                setQuoteCustomerPhone(c.phone || '');
                                setQuoteCustomerCompany(c.company || '');
                                setQuoteCustomerSearch('');
                                setIsQuoteCustomerDropdownOpen(false);
                              }}
                              className="w-full text-left p-2.5 hover:bg-amber-50/80 transition-colors flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs text-slate-900 font-bold truncate">
                                  {c.name} {c.company ? `(${c.company})` : ''}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.phone}</div>
                              </div>
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold flex-shrink-0">
                                {language === 'bn' ? 'বাছাই করুন' : 'Select'}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-500">
                            {language === 'bn'
                              ? 'কোনো গ্রাহক পাওয়া যায়নি। নিচের বক্সে সরাসরি টাইপ করুন।'
                              : 'No matching customer found. Type manually below.'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'গ্রাহকের নাম *' : 'Client Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteCustomerName}
                    onChange={(e) => setQuoteCustomerName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'ফোন নম্বর' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={quoteCustomerPhone}
                    onChange={(e) => setQuoteCustomerPhone(e.target.value)}
                    placeholder="01730-581687"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'প্রতিষ্ঠান / কোম্পানি' : 'Company'}
                  </label>
                  <input
                    type="text"
                    value={quoteCustomerCompany}
                    onChange={(e) => setQuoteCustomerCompany(e.target.value)}
                    placeholder="e.g. Apex Apparel / Karnaphuli Group"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>{language === 'bn' ? 'রেফারেন্স / পিও নম্বর' : 'Reference / PO No.'}</span>
                    <span className="text-[10px] text-amber-700 font-extrabold bg-amber-100/70 px-1.5 rounded">Ref</span>
                  </label>
                  <input
                    type="text"
                    value={quoteReferenceNo}
                    onChange={(e) => setQuoteReferenceNo(e.target.value)}
                    placeholder={language === 'bn' ? 'যেমন: QT-REF-2024, PO-77' : 'e.g. QT-REF-2024, PO-77'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Quotation Type Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'কোটেশনের ধরন *' : 'Quotation Type *'}
                </label>
                <div className="flex gap-4 p-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer font-bold transition-all text-slate-700">
                    <input
                      type="radio"
                      name="quoteType"
                      value="Sales"
                      checked={quoteType === 'Sales'}
                      onChange={() => {
                        setQuoteType('Sales');
                        setSelectedProductId('');
                        setQuoteItemName('');
                      }}
                      className="accent-amber-600 cursor-pointer"
                    />
                    <span>{language === 'bn' ? 'সেল ও সার্ভিস' : 'Sales & Service'}</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer font-bold transition-all text-slate-700">
                    <input
                      type="radio"
                      name="quoteType"
                      value="Custom"
                      checked={quoteType === 'Custom'}
                      onChange={() => {
                        setQuoteType('Custom');
                        setSelectedProductId('');
                        setQuoteItemName('');
                      }}
                      className="accent-amber-600 cursor-pointer"
                    />
                    <span>{language === 'bn' ? 'কাস্টম কোটেশন' : 'Custom Quotation'}</span>
                  </label>
                </div>
              </div>

              {/* Service / Item Description Field */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-3">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between items-center">
                  <span>{language === 'bn' ? 'আইটেম এন্ট্রি করুন' : 'Add Item Row'}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{language === 'bn' ? 'নিচের বাটন দিয়ে লিস্টে যোগ করুন' : 'Click Add Row below to save to list'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">
                      {language === 'bn' ? 'কাজের বা সার্ভিসের নাম *' : 'Service / Item Description *'}
                    </label>
                    {quoteType === 'Custom' ? (
                      <input
                        type="text"
                        value={quoteItemName}
                        onChange={(e) => setQuoteItemName(e.target.value)}
                        placeholder={
                          language === 'bn'
                            ? 'যেকোনো বর্ণনা লিখুন...'
                            : 'Enter any custom description...'
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    ) : (
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          setSelectedProductId(prodId);
                          const prod = products.find((p) => p.id === prodId);
                          if (prod) {
                            setQuoteItemName(language === 'bn' && prod.nameBn ? prod.nameBn : prod.name);
                            setQuoteItemPrice(prod.unitPrice);
                          } else {
                            setQuoteItemName('');
                          }
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                      >
                        <option value="">{language === 'bn' ? '-- সিলেক্ট করুন --' : '-- Select Item --'}</option>
                        {(products || []).filter(p => !p.isRawMaterial).map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {language === 'bn' && prod.nameBn ? prod.nameBn : prod.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">
                        {language === 'bn' ? 'পরিমাণ' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quoteItemQty}
                        onChange={(e) => setQuoteItemQty(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">
                        {language === 'bn' ? 'দর (৳)' : 'Unit Rate (৳)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quoteItemPrice}
                        onChange={(e) => setQuoteItemPrice(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!quoteItemName.trim()) {
                        alert(language === 'bn' ? 'দয়া করে আইটেমের নাম লিখুন বা সিলেক্ট করুন!' : 'Please enter or select item name!');
                        return;
                      }
                      const subTotal = quoteItemQty * quoteItemPrice;
                      const newItem = {
                        productId: selectedProductId || `custom-${Date.now()}`,
                        name: quoteItemName.trim(),
                        category: 'BRANDED PROMOTIONAL GIFTS',
                        unit: 'pcs',
                        unitPrice: quoteItemPrice,
                        costPrice: Math.round(quoteItemPrice * 0.6),
                        qty: quoteItemQty,
                        totalPrice: subTotal,
                      };
                      setAddedQuoteItems([...addedQuoteItems, newItem]);
                      setQuoteItemName('');
                      setSelectedProductId('');
                      setQuoteItemQty(1);
                      setQuoteItemPrice(1000);
                    }}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'যোগ করুন (Add Row)' : 'Add Row'}</span>
                  </button>
                </div>
              </div>

              {/* Added Items Table */}
              {addedQuoteItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-200">
                    {language === 'bn' ? 'যুক্ত হওয়া আইটেমসমূহ' : 'Added Items List'}
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                          <th className="p-2 text-center w-10">SL</th>
                          <th className="p-2">{language === 'bn' ? 'বিবরণ' : 'Description'}</th>
                          <th className="p-2 text-center w-28">{language === 'bn' ? 'পরিমাণ (Qty)' : 'Qty'}</th>
                          <th className="p-2 text-right w-32">{language === 'bn' ? 'দর (Rate ৳)' : 'Rate (৳)'}</th>
                          <th className="p-2 text-right w-28">{language === 'bn' ? 'মোট (Total)' : 'Total (৳)'}</th>
                          <th className="p-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {addedQuoteItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-semibold text-slate-800">{item.name}</td>
                            <td className="p-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) =>
                                    handleUpdateQuoteItemRow(idx, 'qty', Math.max(1, Number(e.target.value)))
                                  }
                                  className="w-16 px-1.5 py-1 text-center font-bold text-slate-800 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900"
                                />
                                <span className="text-[10px] text-slate-500 font-medium">{item.unit || 'pcs'}</span>
                              </div>
                            </td>
                            <td className="p-1.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 font-semibold text-xs">৳</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleUpdateQuoteItemRow(idx, 'unitPrice', Math.max(0, Number(e.target.value)))
                                  }
                                  className="w-20 px-1.5 py-1 text-right font-bold text-slate-800 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900"
                                />
                              </div>
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">৳{item.totalPrice.toLocaleString()}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddedQuoteItems(addedQuoteItems.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Discount & VAT / Tax with Toggle */}
              {(() => {
                const sub = addedQuoteItems.reduce((acc, item) => acc + item.totalPrice, 0);
                const effectiveQuoteDiscount = quoteDiscountType === 'percent'
                  ? Math.round((sub * Math.min(100, Math.max(0, quoteDiscount))) / 100)
                  : Math.min(sub, Math.max(0, quoteDiscount));
                const taxable = Math.max(0, sub - effectiveQuoteDiscount);
                const effectiveQuoteVat = quoteVatType === 'percent'
                  ? Math.round((taxable * Math.min(100, Math.max(0, quoteVatAmountInput))) / 100)
                  : Math.max(0, quoteVatAmountInput);
                const grand = taxable + effectiveQuoteVat;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Controls */}
                    <div className="space-y-2">
                      {/* Discount Control */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 text-xs">
                            {language === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => setQuoteDiscountType('amount')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  quoteDiscountType === 'amount'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                ৳
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuoteDiscountType('percent')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  quoteDiscountType === 'percent'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                %
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={quoteDiscount}
                              onChange={(e) => setQuoteDiscount(Math.max(0, Number(e.target.value)))}
                              className="w-24 text-right px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* VAT / Tax Control (Like Discount) */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 text-xs">
                            {language === 'bn' ? 'ভ্যাট / ট্যাক্স' : 'VAT / Tax'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => setQuoteVatType('amount')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  quoteVatType === 'amount'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                ৳
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuoteVatType('percent')}
                                className={`px-2 py-0.5 text-[10px] font-black ${
                                  quoteVatType === 'percent'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                %
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={quoteVatAmountInput}
                              onChange={(e) => setQuoteVatAmountInput(Math.max(0, Number(e.target.value)))}
                              className="w-24 text-right px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary box */}
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 flex flex-col justify-center space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>{language === 'bn' ? 'উপ-মোট (Subtotal):' : 'Subtotal:'}</span>
                        <span>{profile.currencySymbol}{sub.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>{language === 'bn' ? 'ডিসকাউন্ট (Discount):' : 'Discount:'}</span>
                        <span>-{profile.currencySymbol}{effectiveQuoteDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>{language === 'bn' ? 'ভ্যাট (VAT / Tax):' : 'VAT / Tax:'}</span>
                        <span>+{profile.currencySymbol}{effectiveQuoteVat.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center font-black text-slate-900 pt-1 border-t border-amber-200/50">
                        <span>{language === 'bn' ? 'সর্বমোট দর (Grand Total):' : 'Grand Total:'}</span>
                        <span className="text-amber-600 text-sm">
                          {profile.currencySymbol}{grand.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'শর্তাবলী বা নোট' : 'Terms & Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. 50% advance on work order, 7 days delivery timeline"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNewQuoteModal(false);
                  setEditingQuotation(null);
                  setAddedQuoteItems([]);
                  setQuoteType('Sales');
                  setSelectedProductId('');
                  setQuoteCustomerName('');
                  setQuoteCustomerPhone('');
                  setQuoteCustomerCompany('');
                  setQuoteReferenceNo('');
                  setQuoteItemName('');
                  setQuoteDiscount(0);
                  setQuoteDiscountType('amount');
                  setQuoteVatType('percent');
                  setQuoteVatAmountInput(0);
                  setQuoteNotes('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'কোটেশন সংরক্ষণ করুন' : 'Save Quotation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales Report Print & PDF Modal */}
      {showReportModal && (
        <ReportPrintModal
          type="sales"
          salesData={filteredInvoices}
          profile={profile}
          language={language}
          dateRangeText={dateRangeLabel}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* ADD/EDIT CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCustomerFormSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingCustomer
                  ? (language === 'bn' ? 'গ্রাহকের তথ্য সংশোধন' : 'Edit Customer Information')
                  : (language === 'bn' ? 'নতুন গ্রাহক যোগ করুন' : 'Add New Customer')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCustomerModal(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'গ্রাহকের নাম *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  placeholder={language === 'bn' ? 'যেমন: মোহাম্মদ আব্দুর রহমান' : 'e.g. Md. Abdur Rahman'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    placeholder={language === 'bn' ? 'যেমন: ০১৮XXXXXXXX' : 'e.g. 018XXXXXXXX'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'কোম্পানি/প্রতিষ্ঠান' : 'Company/Business'}
                  </label>
                  <input
                    type="text"
                    value={customerFormData.company}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, company: e.target.value })}
                    placeholder={language === 'bn' ? 'যেমন: রহমান প্রিন্টার্স' : 'e.g. Rahman Printers'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'অগ্রিম জামানত/ব্যালেন্স (৳)' : 'Advance Balance (৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customerFormData.advanceBalance}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, advanceBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ঠিকানা' : 'Address'}
                </label>
                <textarea
                  rows={2}
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  placeholder={language === 'bn' ? 'যেমন: আন্দরকিল্লা, চট্টগ্রাম' : 'e.g. Anderkilla, Chittogram'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowCustomerModal(false);
                  setEditingCustomer(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODALS */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'bn' ? 'গ্রাহক মুছে ফেলার সতর্কতা' : 'Confirm Client Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn' 
                  ? `আপনি কি নিশ্চিতভাবে "${customerToDelete.name}" গ্রাহকটিকে মুছে ফেলতে চান? এই অ্যাকশনটি পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।`
                  : `Are you sure you want to delete client "${customerToDelete.name}"? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                {language === 'bn' ? 'ডিলিট করুন' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'bn' ? 'ইনভয়েস মুছে ফেলার সতর্কতা' : 'Confirm Invoice Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn' 
                  ? `আপনি কি নিশ্চিতভাবে "${invoiceToDelete.invoiceNo}" ইনভয়েসটি মুছে ফেলতে চান? এই অ্যাকশনটি পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।`
                  : `Are you sure you want to delete invoice "${invoiceToDelete.invoiceNo}"? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInvoice(invoiceToDelete.id);
                  setInvoiceToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                {language === 'bn' ? 'ডিলিট করুন' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quotationToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'bn' ? 'কোটেশন মুছে ফেলার সতর্কতা' : 'Confirm Quotation Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn' 
                  ? `আপনি কি নিশ্চিতভাবে "${quotationToDelete.quoteNo}" কোটেশনটি মুছে ফেলতে চান? এই অ্যাকশনটি পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।`
                  : `Are you sure you want to delete quotation "${quotationToDelete.quoteNo}"? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuotationToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteQuotation(quotationToDelete.id);
                  setQuotationToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                {language === 'bn' ? 'ডিলিট করুন' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SALES INVOICE CREATION MODAL */}
      <CreateSalesInvoiceModal
        isOpen={showDirectInvoiceModal}
        onClose={() => setShowDirectInvoiceModal(false)}
        onInvoiceCreated={(newInvoiceId) => {
          setShowDirectInvoiceModal(false);
          setActiveSubTab('invoices');
          onOpenInvoiceModal(newInvoiceId);
        }}
      />
    </div>
  );
};
