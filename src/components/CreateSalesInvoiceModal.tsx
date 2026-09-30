import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, PaymentMethod, ProductionStatus, UnitType } from '../types';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  Building,
  CheckCircle2,
  Percent,
  Hash,
  Truck,
  DollarSign,
  Search,
  UserPlus,
} from 'lucide-react';

interface CreateSalesInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoiceId: string) => void;
}

export const CreateSalesInvoiceModal: React.FC<CreateSalesInvoiceModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
}) => {
  const {
    customers,
    products,
    profile,
    language,
    addInvoice,
    addCustomer,
  } = useApp();

  // Customer Mode: 'existing' or 'new'
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  // New Customer Fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Filtered existing customers for invoice creation
  const filteredExistingCustomers = useMemo(() => {
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

  // Invoice Meta
  const [invoiceType, setInvoiceType] = useState<'Sales' | 'Custom'>('Sales');
  const [referenceNo, setReferenceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  );
  const [warehouseLocation, setWarehouseLocation] = useState<'Factory' | 'Office'>('Factory');

  // Items in Invoice
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Item Entry Row
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('BRANDED PROMOTIONAL GIFTS');
  const [itemUnit, setItemUnit] = useState<UnitType>('pcs');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(1000);
  const [itemWidth, setItemWidth] = useState<number | ''>('');
  const [itemHeight, setItemHeight] = useState<number | ''>('');
  const [itemNotes, setItemNotes] = useState('');

  // Discount (৳ or %)
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');

  // VAT / Tax (same toggle style as Discount)
  const [vatAmountInput, setVatAmountInput] = useState<number>(0);
  const [vatType, setVatType] = useState<'amount' | 'percent'>('percent');

  // Payment & Settlement
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('Queued');
  const [notes, setNotes] = useState('');
  const [jobSpecs, setJobSpecs] = useState('');

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [items]);

  const effectiveDiscount = useMemo(() => {
    if (discountType === 'percent') {
      const pct = Math.max(0, Math.min(100, Number(discountAmount) || 0));
      return Math.round((subtotal * pct) / 100);
    }
    return Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  }, [subtotal, discountAmount, discountType]);

  const taxableAmount = Math.max(0, subtotal - effectiveDiscount);

  const effectiveVat = useMemo(() => {
    if (vatType === 'percent') {
      const pct = Math.max(0, Math.min(100, Number(vatAmountInput) || 0));
      return Math.round((taxableAmount * pct) / 100);
    }
    return Math.max(0, Number(vatAmountInput) || 0);
  }, [taxableAmount, vatAmountInput, vatType]);

  const computedVatRate = useMemo(() => {
    if (vatType === 'percent') return Number(vatAmountInput) || 0;
    return taxableAmount > 0 ? Number(((effectiveVat / taxableAmount) * 100).toFixed(2)) : 0;
  }, [vatType, vatAmountInput, effectiveVat, taxableAmount]);

  const grandTotal = taxableAmount + effectiveVat;

  const effectivePaid = paidAmount === '' ? grandTotal : Math.min(grandTotal, Math.max(0, Number(paidAmount)));
  const dueAmount = Math.max(0, grandTotal - effectivePaid);

  const paymentStatus =
    effectivePaid >= grandTotal && grandTotal > 0
      ? 'Paid'
      : effectivePaid > 0
      ? 'Partial'
      : 'Due';

  if (!isOpen) return null;

  // Add Item to List
  const handleAddItemRow = () => {
    if (!itemName.trim()) {
      alert(language === 'bn' ? 'দয়া করে পণ্যের বিবরণ লিখুন বা তালিকা থেকে সিলেক্ট করুন!' : 'Please enter or select item description!');
      return;
    }

    const w = Number(itemWidth) || 0;
    const h = Number(itemHeight) || 0;
    const sqft = w > 0 && h > 0 ? Number((w * h).toFixed(2)) : undefined;

    const rowTotal = sqft ? Math.round(sqft * itemQty * itemPrice) : Math.round(itemQty * itemPrice);

    const newItem: InvoiceItem = {
      productId: selectedProductId || `custom-${Date.now()}`,
      name: itemName.trim(),
      category: itemCategory,
      unit: itemUnit,
      unitPrice: itemPrice,
      costPrice: Math.round(itemPrice * 0.6),
      qty: itemQty,
      width: w > 0 ? w : undefined,
      height: h > 0 ? h : undefined,
      totalSqft: sqft,
      totalPrice: rowTotal,
      notes: itemNotes.trim() || undefined,
    };

    setItems([...items, newItem]);

    // Reset Item Entry Row
    setSelectedProductId('');
    setItemName('');
    setItemQty(1);
    setItemPrice(1000);
    setItemWidth('');
    setItemHeight('');
    setItemNotes('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItemRow = (index: number, field: 'qty' | 'unitPrice', val: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const newQty = field === 'qty' ? Math.max(1, val) : it.qty;
        const newPrice = field === 'unitPrice' ? Math.max(0, val) : it.unitPrice;
        const sqft = it.totalSqft;
        const rowTotal = sqft ? Math.round(sqft * newQty * newPrice) : Math.round(newQty * newPrice);
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

  // Submit Invoice
  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine Customer
    let finalCustId = '';
    let finalCustName = '';
    let finalCustPhone = '';
    let finalCustAddress = '';

    if (customerMode === 'existing') {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (!existing) {
        alert(language === 'bn' ? 'দয়া করে একজন গ্রাহক সিলেক্ট করুন!' : 'Please select a customer!');
        return;
      }
      finalCustId = existing.id;
      finalCustName = existing.company ? `${existing.company} (${existing.name})` : existing.name;
      finalCustPhone = existing.phone;
      finalCustAddress = existing.address || '';
    } else {
      if (!newCustName.trim()) {
        alert(language === 'bn' ? 'দয়া করে গ্রাহকের নাম লিখুন!' : 'Please enter customer name!');
        return;
      }
      const createdCustomer = addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || '01819-000000',
        company: newCustCompany.trim() || undefined,
        address: newCustAddress.trim() || undefined,
      });
      finalCustId = createdCustomer.id;
      finalCustName = createdCustomer.company ? `${createdCustomer.company} (${createdCustomer.name})` : createdCustomer.name;
      finalCustPhone = createdCustomer.phone;
      finalCustAddress = createdCustomer.address || '';
    }

    // Auto-add current row if user typed without clicking Add
    let finalItems = [...items];
    if (finalItems.length === 0 && itemName.trim()) {
      const w = Number(itemWidth) || 0;
      const h = Number(itemHeight) || 0;
      const sqft = w > 0 && h > 0 ? Number((w * h).toFixed(2)) : undefined;
      const rowTotal = sqft ? Math.round(sqft * itemQty * itemPrice) : Math.round(itemQty * itemPrice);

      finalItems.push({
        productId: selectedProductId || `custom-${Date.now()}`,
        name: itemName.trim(),
        category: itemCategory,
        unit: itemUnit,
        unitPrice: itemPrice,
        costPrice: Math.round(itemPrice * 0.6),
        qty: itemQty,
        width: w > 0 ? w : undefined,
        height: h > 0 ? h : undefined,
        totalSqft: sqft,
        totalPrice: rowTotal,
        notes: itemNotes.trim() || undefined,
      });
    }

    if (finalItems.length === 0) {
      alert(language === 'bn' ? 'দয়া করে অন্তত একটি আইটেম যোগ করুন!' : 'Please add at least one item!');
      return;
    }

    const created = addInvoice({
      date: invoiceDate,
      referenceNo: referenceNo.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      customerId: finalCustId,
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      customerAddress: finalCustAddress,
      items: finalItems,
      subtotal,
      discount: effectiveDiscount,
      discountType,
      discountValue: Number(discountAmount) || 0,
      vatType,
      vatValue: Number(vatAmountInput) || 0,
      vatRate: Number(computedVatRate) || 0,
      vatAmount: effectiveVat,
      grandTotal,
      paidAmount: effectivePaid,
      dueAmount,
      paymentMethod,
      paymentStatus,
      productionStatus,
      warehouseLocation,
      notes: notes.trim() || undefined,
      jobSpecs: jobSpecs.trim() || undefined,
      splitPayments: {
        cash: paymentMethod === 'Cash' ? effectivePaid : 0,
        card: paymentMethod === 'Credit Card' || paymentMethod === 'Bank Transfer' ? effectivePaid : 0,
        bkash: paymentMethod === 'bKash / Nagad' ? effectivePaid : 0,
        nagad: 0,
        due: dueAmount,
      },
    });

    onClose();
    onInvoiceCreated(created.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span>{language === 'bn' ? 'সরাসরি সেলস ইনভয়েস তৈরি' : 'Direct Sales Invoice Creation'}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {language === 'bn' ? 'কোটেশন ছাড়া' : 'No Quote Needed'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'গ্রাহক, রেফারেন্স নম্বর, ডিসকাউন্ট ও ভ্যাট যুক্ত করে সরাসরি ইনভয়েস ইস্যু করুন'
                  : 'Issue direct billing invoice with reference number, discount, and VAT'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitInvoice} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-200">
          {/* Section 1: Customer Selection & Reference Number */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-700" />
                <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  {language === 'bn' ? '১. গ্রাহক ও রেফারেন্স তথ্য' : '1. Customer & Reference Details'}
                </span>
              </div>
              {/* Customer Mode Tabs */}
              <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    customerMode === 'existing'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'bn' ? 'নিবন্ধিত গ্রাহক' : 'Existing Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    customerMode === 'new'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'bn' ? '+ নতুন গ্রাহক' : '+ New Customer'}
                </button>
              </div>
            </div>

            {/* Customer Inputs */}
            {customerMode === 'existing' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Search Input Field */}
                  <div className="relative">
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        {language === 'bn' ? 'গ্রাহক খুঁজুন (নাম বা ফোন)' : 'Search Customer (Name / Phone)'}
                      </span>
                      {customerSearchQuery && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {filteredExistingCustomers.length} {language === 'bn' ? 'টি পাওয়া গেছে' : 'found'}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        placeholder={
                          language === 'bn'
                            ? 'নাম বা মোবাইল নম্বর দিয়ে খুঁজুন...'
                            : 'Search customer by name or phone...'
                        }
                        className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-xl font-medium text-xs focus:ring-2 focus:ring-amber-500/20"
                      />
                      {customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery('');
                            setIsCustomerSearchOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Dropdown with matching customers */}
                      {isCustomerSearchOpen && customerSearchQuery.trim() && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsCustomerSearchOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100">
                            {filteredExistingCustomers.length > 0 ? (
                              filteredExistingCustomers.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomerId(c.id);
                                    setCustomerSearchQuery('');
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 hover:bg-amber-50/80 transition-colors flex items-center justify-between gap-2 ${
                                    c.id === selectedCustomerId ? 'bg-amber-50 font-bold border-l-2 border-amber-500' : ''
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs text-slate-900 font-bold truncate">
                                      {c.name} {c.company ? `(${c.company})` : ''}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.phone}</div>
                                  </div>
                                  {c.dueAmount > 0 && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex-shrink-0">
                                      {language === 'bn' ? 'বকেয়া' : 'Due'}: ৳{c.dueAmount.toLocaleString()}
                                    </span>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center space-y-2">
                                <p className="text-xs text-slate-500">
                                  {language === 'bn'
                                    ? `"${customerSearchQuery}" নামে কোনো গ্রাহক পাওয়া যায়নি`
                                    : `No customer found matching "${customerSearchQuery}"`}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isPhone = /^[0-9+ -]+$/.test(customerSearchQuery.trim());
                                    setCustomerMode('new');
                                    if (isPhone) {
                                      setNewCustPhone(customerSearchQuery.trim());
                                      setNewCustName('');
                                    } else {
                                      setNewCustName(customerSearchQuery.trim());
                                      setNewCustPhone('');
                                    }
                                    setCustomerSearchQuery('');
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>
                                    {language === 'bn'
                                      ? `+ নতুন গ্রাহক হিসেবে যুক্ত করুন`
                                      : `+ Add as New Customer`}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Customer Select Dropdown */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {language === 'bn' ? 'গ্রাহক নির্বাচন করুন *' : 'Select Customer *'}
                    </label>
                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:ring-1 focus:ring-amber-500/30"
                    >
                      <option value="">{language === 'bn' ? '-- গ্রাহক নির্বাচন করুন --' : '-- Choose Customer --'}</option>
                      {filteredExistingCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''} - {c.phone} {c.dueAmount > 0 ? `[বকেয়া: ৳${c.dueAmount}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Customer Info Badge */}
                {selectedCustomerId && (
                  <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between text-[11px]">
                    {(() => {
                      const sel = customers.find((c) => c.id === selectedCustomerId);
                      if (!sel) return null;
                      return (
                        <>
                          <div>
                            <span className="font-black text-slate-900">{sel.name}</span>
                            {sel.company && <span className="text-amber-800 font-semibold ml-1.5">({sel.company})</span>}
                            <span className="text-slate-500 block font-mono mt-0.5">{sel.phone} {sel.address ? `• ${sel.address}` : ''}</span>
                          </div>
                          {sel.dueAmount > 0 && (
                            <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {language === 'bn' ? 'পূর্বের বকেয়া' : 'Past Due'}: ৳{sel.dueAmount.toLocaleString()}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'গ্রাহকের নাম *' : 'Client Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'ফোন নম্বর' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="01730-581687"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'প্রতিষ্ঠান / কোম্পানি' : 'Company'}
                  </label>
                  <input
                    type="text"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                    placeholder="e.g. Apex Enterprise"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'ঠিকানা' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. GEC Circle, Chattogram"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>
            )}

            {/* Reference Number, Dates & Location Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>{language === 'bn' ? 'রেফারেন্স নম্বর (PO/Ref)' : 'Reference / PO No.'}</span>
                  <span className="text-[10px] text-amber-700 font-extrabold bg-amber-100/70 px-1.5 rounded">Ref</span>
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: PO-8901, REF-102' : 'e.g. PO-8901, REF-102'}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:ring-1 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ইনভয়েস তারিখ' : 'Invoice Date'}
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ডেলিভারি টার্গেট' : 'Delivery Target'}
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ডেলিভারি শাখা' : 'Branch Location'}
                </label>
                <select
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs"
                >
                  <option value="Office">
                    {language === 'bn' ? 'সেন্ট্রাল ওয়্যারহাউজ ও আউটলেট' : 'Central Warehouse & Outlet'}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Sales Invoice Type Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <label className="font-extrabold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
              {language === 'bn' ? 'সেলস ইনভয়েস টাইপ *' : 'Sales Invoice Type *'}
            </label>
            <div className="flex gap-4 p-1.5 bg-white border border-slate-200/80 rounded-xl">
              <label className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer font-bold transition-all text-slate-700 text-xs">
                <input
                  type="radio"
                  name="invoiceType"
                  value="Sales"
                  checked={invoiceType === 'Sales'}
                  onChange={() => {
                    setInvoiceType('Sales');
                    setSelectedProductId('');
                    setItemName('');
                    setItemPrice(1000);
                  }}
                  className="accent-slate-900 cursor-pointer"
                />
                <span>{language === 'bn' ? 'সেল ও সার্ভিস' : 'Sales & Service'}</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer font-bold transition-all text-slate-700 text-xs">
                <input
                  type="radio"
                  name="invoiceType"
                  value="Custom"
                  checked={invoiceType === 'Custom'}
                  onChange={() => {
                    setInvoiceType('Custom');
                    setSelectedProductId('');
                    setItemName('');
                    setItemPrice(1000);
                  }}
                  className="accent-slate-900 cursor-pointer"
                />
                <span>{language === 'bn' ? 'কাস্টম সেলস ইনভয়েস' : 'Custom Sales Invoice'}</span>
              </label>
            </div>
          </div>

          {/* Section 2: Items Entry Row & Table */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                {language === 'bn' ? '২. আইটেম বা সার্ভিস যোগ করুন' : '2. Add Items & Services'}
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                {language === 'bn' ? `মোট আইটেম: ${items.length}` : `Total Items: ${items.length}`}
              </span>
            </div>

            {/* Entry Row Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-3">
                <label className="font-bold text-slate-600 block mb-1 text-[11px] truncate">
                  {language === 'bn' ? 'কাজের বা পণ্যের বিবরণ *' : 'Service / Item Name *'}
                </label>
                {invoiceType === 'Custom' ? (
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder={language === 'bn' ? 'যেমন: ডিজিটাল সাইন ব্যানার, রিফ্লেক্টিভ স্টিকার...' : 'e.g. Digital Sign Banner, Acrylic Sign...'}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-1 focus:ring-slate-900/20 focus:border-slate-950"
                  />
                ) : (
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setSelectedProductId(pid);
                      const prod = products.find((p) => p.id === pid);
                      if (prod) {
                        setItemName(language === 'bn' && prod.nameBn ? prod.nameBn : prod.name);
                        setItemPrice(prod.unitPrice);
                        setItemCategory(prod.category);
                        setItemUnit(prod.unit);
                      } else {
                        setItemName('');
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-1 focus:ring-slate-900/20 focus:border-slate-950"
                  >
                    <option value="">{language === 'bn' ? '-- সিলেক্ট করুন --' : '-- Choose Item --'}</option>
                    {products.filter((p) => !p.isRawMaterial).map((p) => (
                      <option key={p.id} value={p.id}>
                        {language === 'bn' && p.nameBn ? p.nameBn : p.name} (৳{p.unitPrice}/{p.unit})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="font-bold text-slate-600 block mb-1 text-[11px] truncate">
                  {language === 'bn' ? 'ইউনিট' : 'Unit'}
                </label>
                <select
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value as any)}
                  className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-xs"
                >
                  <option value="pcs">pcs</option>
                  <option value="sqft">sqft</option>
                  <option value="set">set</option>
                  <option value="roll">roll</option>
                  <option value="packet">packet</option>
                </select>
              </div>

              {/* Dimensions if Sqft */}
              <div className="sm:col-span-1">
                <label className="font-bold text-slate-600 block mb-1 text-[11px] truncate" title="Width">
                  {language === 'bn' ? 'প্রস্থ (W)' : 'Width (W)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={itemWidth}
                  onChange={(e) => setItemWidth(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-center"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="font-bold text-slate-600 block mb-1 text-[11px] truncate" title="Height">
                  {language === 'bn' ? 'উচ্চতা (H)' : 'Height (H)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={itemHeight}
                  onChange={(e) => setItemHeight(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-center"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="font-bold text-slate-600 block mb-1 text-[11px] truncate">
                  {language === 'bn' ? 'পরিমাণ' : 'Qty'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-600 block mb-1 text-[11px] truncate">
                  {language === 'bn' ? 'দর / Rate (৳)' : 'Unit Rate (৳)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-right"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? '+ আইটেম যোগ করুন' : '+ Add Item'}</span>
                </button>
              </div>
            </div>

            {/* Added Items Table */}
            {items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                      <th className="p-2.5 text-center w-10">SL</th>
                      <th className="p-2.5">{language === 'bn' ? 'বিবরণ' : 'Description'}</th>
                      <th className="p-2.5 text-center w-20">{language === 'bn' ? 'ইউনিট' : 'Unit'}</th>
                      <th className="p-2.5 text-center w-28">{language === 'bn' ? 'পরিমাণ (Qty)' : 'Qty'}</th>
                      <th className="p-2.5 text-right w-32">{language === 'bn' ? 'দর (Rate ৳)' : 'Rate (৳)'}</th>
                      <th className="p-2.5 text-right w-28">{language === 'bn' ? 'মোট (৳)' : 'Total'}</th>
                      <th className="p-2.5 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.totalSqft && (
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              📐 মাপ: {item.width}' × {item.height}' = {item.totalSqft} SqFt
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-slate-500 italic">{item.notes}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-medium text-slate-600">{item.unit}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateItemRow(idx, 'qty', Math.max(1, Number(e.target.value)))
                              }
                              className="w-16 px-1.5 py-1 text-center font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-400 rounded-md text-xs focus:ring-1 focus:ring-slate-900 transition-colors"
                            />
                            <span className="text-[10px] text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 font-semibold text-xs">৳</span>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItemRow(idx, 'unitPrice', Math.max(0, Number(e.target.value)))
                              }
                              className="w-20 px-1.5 py-1 text-right font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-400 rounded-md text-xs focus:ring-1 focus:ring-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          ৳{item.totalPrice.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Remove row"
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

          {/* Section 3: Financial Calculations (Discount, VAT, Totals) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            {/* Left Col: Discount & VAT Inputs */}
            <div className="sm:col-span-6 space-y-3">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                {language === 'bn' ? '৩. ছাড় ও ট্যাক্স সমন্বয়' : '3. Discount & Tax Adjustments'}
              </span>

              {/* Discount Input with Toggle */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <span>{language === 'bn' ? 'ডিসকাউন্ট / ছাড়' : 'Discount'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setDiscountType('amount')}
                        className={`px-2.5 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                          discountType === 'amount'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ৳
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-2.5 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                          discountType === 'percent'
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
                      max={discountType === 'percent' ? 100 : subtotal}
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-right px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-[11px] text-rose-600 font-bold">
                    <span>{language === 'bn' ? 'ছাড়ের পরিমাণ:' : 'Discount Amount:'}</span>
                    <span>-{profile.currencySymbol}{effectiveDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* VAT / Tax Input with Toggle (Discount-er moto) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <span>{language === 'bn' ? 'ভ্যাট / ট্যাক্স (VAT / Tax)' : 'VAT / Tax'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setVatType('amount')}
                        className={`px-2.5 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                          vatType === 'amount'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ৳
                      </button>
                      <button
                        type="button"
                        onClick={() => setVatType('percent')}
                        className={`px-2.5 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                          vatType === 'percent'
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
                      max={vatType === 'percent' ? 100 : undefined}
                      value={vatAmountInput || ''}
                      onChange={(e) => setVatAmountInput(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-right px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                {effectiveVat > 0 && (
                  <div className="flex justify-between text-[11px] text-amber-800 font-bold">
                    <span>
                      {language === 'bn' ? 'ভ্যাট পরিমাণ' : 'VAT Amount'} {vatType === 'percent' ? `(${vatAmountInput}%)` : ''}:
                    </span>
                    <span>+{profile.currencySymbol}{effectiveVat.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Totals Display */}
            <div className="sm:col-span-6 bg-amber-50/70 p-4 rounded-xl border border-amber-200 flex flex-col justify-between space-y-2">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider block border-b border-amber-200 pb-1.5">
                {language === 'bn' ? 'হিসাবের সারসংক্ষেপ' : 'Financial Summary'}
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>{language === 'bn' ? 'উপ-মোট (Subtotal):' : 'Subtotal:'}</span>
                  <span className="font-bold text-slate-900">{profile.currencySymbol}{subtotal.toLocaleString()}</span>
                </div>

                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>{language === 'bn' ? 'ডিসকাউন্ট (Discount):' : 'Discount:'}</span>
                    <span className="font-bold">-{profile.currencySymbol}{effectiveDiscount.toLocaleString()}</span>
                  </div>
                )}

                {effectiveVat > 0 && (
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>{language === 'bn' ? 'ভ্যাট (VAT):' : 'VAT:'}</span>
                    <span className="font-bold">+{profile.currencySymbol}{effectiveVat.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200/80 flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-900">{language === 'bn' ? 'সর্বমোট বিল (Grand Total):' : 'Grand Total:'}</span>
                  <span className="text-lg font-black text-amber-700">
                    {profile.currencySymbol}{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Row inside Summary */}
              <div className="pt-3 border-t border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-extrabold text-slate-800 text-xs">
                    {language === 'bn' ? 'পরিশোধিত টাকা (Paid):' : 'Amount Paid:'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={grandTotal.toString()}
                      className="w-28 text-right px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-xs focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                {/* Quick Paid Presets */}
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(grandTotal)}
                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-extrabold cursor-pointer"
                  >
                    {language === 'bn' ? 'সম্পূর্ণ পরিশোধ' : 'Full Paid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(Math.round(grandTotal / 2))}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[10px] font-extrabold cursor-pointer"
                  >
                    {language === 'bn' ? '৫০% অগ্রিম' : '50% Advance'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(0)}
                    className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[10px] font-extrabold cursor-pointer"
                  >
                    {language === 'bn' ? 'বকেয়া' : 'Full Due'}
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-1">
                  <span className="text-slate-600">{language === 'bn' ? 'অবশিষ্ট বকেয়া (Due):' : 'Due Balance:'}</span>
                  <span className={`font-black ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {profile.currencySymbol}{dueAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Payment Method, Production Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs"
              >
                <option value="Cash">Cash (ক্যাশ)</option>
                <option value="bKash / Nagad">bKash / Nagad (বিকাশ / নগদ)</option>
                <option value="Bank Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                <option value="Credit Card">Credit / Debit Card</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'কাজের প্রাথমিক অবস্থা' : 'Initial Job Status'}
              </label>
              <select
                value={productionStatus}
                onChange={(e) => setProductionStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs"
              >
                <option value="Queued">Queued (অপেক্ষমাণ)</option>
                <option value="In Print / Fabrication">In Print / Fabrication (প্রিন্টিং চলছে)</option>
                <option value="Ready">Ready (প্রস্তুত)</option>
                <option value="Delivered">Delivered (ডেলিভার্ড)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'কাজের বিশেষ নির্দেশিকা (Job Specs)' : 'Job Instructions'}
              </label>
              <input
                type="text"
                value={jobSpecs}
                onChange={(e) => setJobSpecs(e.target.value)}
                placeholder="e.g. Eyelet 4 corners, Matt lamination"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-semibold hidden sm:block">
            {language === 'bn' ? 'সংরক্ষণ করলে তাৎক্ষণিক ইনভয়েস প্রিন্ট বা চালান প্রিন্ট করতে পারবেন' : 'Invoice can be printed immediately after saving'}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmitInvoice}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === 'bn' ? 'ইনভয়েস নিশ্চিত ও তৈরি করুন' : 'Confirm & Create Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
