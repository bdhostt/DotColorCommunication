import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductItem, InvoiceItem, Customer, PaymentMethod, ServiceCategory } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  CheckCircle2,
  Printer,
  UserPlus,
  Layers,
  Calculator,
  Tag,
  Clock,
  Building,
  DollarSign,
  AlertCircle,
  FileText,
  Smartphone,
  CreditCard,
  X,
  User,
} from 'lucide-react';

import { POSSalesOverview } from './POSSalesOverview';

interface POSModuleProps {
  onOpenInvoiceModal: (
    invoiceId: string,
    mode?: 'invoice' | 'challan' | 'pos',
    options?: { autoPrint?: boolean; isPadMode?: boolean }
  ) => void;
}

export const POSModule: React.FC<POSModuleProps> = ({ onOpenInvoiceModal }) => {
  const {
    products = [],
    customers = [],
    invoices = [],
    profile,
    language,
    activeLocation,
    paymentMethods = [],
    addInvoice,
    addCustomer,
  } = useApp();

  const activePaymentMethods = useMemo(() => {
    const list = (paymentMethods || []).filter((p) => p.isEnabled);
    return list.length > 0 ? list : [{ id: 'pm-cash', name: 'Cash', nameBn: 'নগদ ক্যাশ', type: 'cash' as const, isEnabled: true, isDefault: true }];
  }, [paymentMethods]);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  
  // Checkout form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (customers && customers.length > 0) {
      // Try to find a walk-in customer first
      const walkIn = customers.find(c => c.name.toLowerCase().includes('walk-in') || c.name.toLowerCase().includes('walk in'));
      return walkIn ? walkIn.id : customers[0].id;
    }
    return '';
  });

  // Ensure selectedCustomerId is always populated with a valid customer ID
  useEffect(() => {
    if ((!selectedCustomerId || !customers.some(c => c.id === selectedCustomerId)) && customers.length > 0) {
      const walkIn = customers.find(c => c.name.toLowerCase().includes('walk-in') || c.name.toLowerCase().includes('walk in'));
      setSelectedCustomerId(walkIn ? walkIn.id : customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const [checkoutFeedback, setCheckoutFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Discount & VAT & Payment
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [vatAmountInput, setVatAmountInput] = useState<number>(0);
  const [vatType, setVatType] = useState<'amount' | 'percent'>('percent');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  // Split Payment Inputs State - Fully dynamic for all configured gateways & methods
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitDue, setSplitDue] = useState<string>('');
  const [warehouseLocation, setWarehouseLocation] = useState<'Factory' | 'Office'>(
    activeLocation === 'Factory' ? 'Factory' : 'Office'
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  );
  const [jobSpecs, setJobSpecs] = useState('');
  const [notes, setNotes] = useState('');

  // Dimension Modal for Sqft products (Digital print / sign)
  const [dimModalProduct, setDimModalProduct] = useState<ProductItem | null>(null);
  const [dimWidth, setDimWidth] = useState<number>(10);
  const [dimHeight, setDimHeight] = useState<number>(4);
  const [dimQty, setDimQty] = useState<number>(1);
  const [dimNotes, setDimNotes] = useState<string>('');

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isRawMaterial && selectedCategory !== 'RAW MATERIAL') return false;
      const matchCat =
        selectedCategory === 'ALL'
          ? true
          : selectedCategory === 'RAW MATERIAL'
          ? p.isRawMaterial
          : p.category === selectedCategory;

      const q = (searchQuery || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameBn && p.nameBn.includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

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

  // Helper for Payment Method Icons
  const getMethodIcon = (type?: string, name: string = '') => {
    const n = name.toLowerCase();
    if (type === 'cash' || n.includes('cash')) return '💵';
    if (type === 'bank' || n.includes('bank')) return '🏦';
    if (type === 'card' || n.includes('card')) return '💳';
    if (n.includes('bkash')) return '📱';
    if (n.includes('nagad')) return '🍊';
    if (n.includes('rocket')) return '🚀';
    if (n.includes('upay')) return '📲';
    if (type === 'gateway' || n.includes('gateway') || n.includes('ssl')) return '🌐';
    if (type === 'cheque' || n.includes('cheque') || n.includes('check')) return '📜';
    return '💰';
  };

  const getMethodColorClass = (type?: string, name: string = '') => {
    const n = name.toLowerCase();
    if (n.includes('bkash')) return { border: 'border-pink-200', bg: 'bg-pink-50/50 hover:bg-pink-100/60', text: 'text-pink-800', ring: 'focus:ring-pink-500' };
    if (n.includes('nagad')) return { border: 'border-orange-200', bg: 'bg-orange-50/50 hover:bg-orange-100/60', text: 'text-orange-800', ring: 'focus:ring-orange-500' };
    if (n.includes('rocket')) return { border: 'border-purple-200', bg: 'bg-purple-50/50 hover:bg-purple-100/60', text: 'text-purple-800', ring: 'focus:ring-purple-500' };
    if (type === 'bank') return { border: 'border-sky-200', bg: 'bg-sky-50/50 hover:bg-sky-100/60', text: 'text-sky-800', ring: 'focus:ring-sky-500' };
    if (type === 'card') return { border: 'border-blue-200', bg: 'bg-blue-50/50 hover:bg-blue-100/60', text: 'text-blue-800', ring: 'focus:ring-blue-500' };
    if (type === 'gateway') return { border: 'border-indigo-200', bg: 'bg-indigo-50/50 hover:bg-indigo-100/60', text: 'text-indigo-800', ring: 'focus:ring-indigo-500' };
    if (type === 'cheque') return { border: 'border-slate-200', bg: 'bg-slate-50/50 hover:bg-slate-100/60', text: 'text-slate-800', ring: 'focus:ring-slate-500' };
    return { border: 'border-emerald-200', bg: 'bg-emerald-50/50 hover:bg-emerald-100/60', text: 'text-emerald-800', ring: 'focus:ring-emerald-500' };
  };

  // Numerical values of split payments
  const totalSplitPaid = useMemo(() => {
    return activePaymentMethods.reduce((sum, pm) => {
      const val = Number(splitAmounts[pm.id]) || 0;
      return sum + val;
    }, 0);
  }, [activePaymentMethods, splitAmounts]);

  const numDue = Number(splitDue) || 0;

  // Reactively auto-initialize / adjust payment split when grandTotal changes
  useEffect(() => {
    if (subtotal === 0) {
      setSplitAmounts({});
      setSplitDue('');
    } else {
      const defaultPm = activePaymentMethods.find((p) => p.isDefault) || activePaymentMethods[0];
      const hasAnyValue = Object.values(splitAmounts).some((v) => Number(v) > 0) || Number(splitDue) > 0;

      if (!hasAnyValue) {
        if (defaultPm) {
          setSplitAmounts({ [defaultPm.id]: grandTotal.toString() });
        }
        setSplitDue('0');
      } else {
        // Balance the due remainder
        const remainder = Math.max(0, grandTotal - totalSplitPaid);
        setSplitDue(remainder.toString());
      }
    }
  }, [grandTotal, activePaymentMethods]);

  const handleSelectFullPayment = (methodId: string) => {
    setSplitAmounts({ [methodId]: grandTotal.toString() });
    setSplitDue('0');
  };

  const handleSelectFullDue = () => {
    setSplitAmounts({});
    setSplitDue(grandTotal.toString());
  };

  const handleUpdateMethodAmount = (methodId: string, valStr: string) => {
    const val = Number(valStr) || 0;
    const nextAmounts = { ...splitAmounts, [methodId]: valStr };
    setSplitAmounts(nextAmounts);

    const otherPaid = activePaymentMethods.reduce((sum, pm) => {
      if (pm.id === methodId) return sum;
      return sum + (Number(nextAmounts[pm.id]) || 0);
    }, 0);

    const remainder = Math.max(0, grandTotal - (val + otherPaid));
    setSplitDue(remainder.toString());
  };

  const handleUpdateDueAmount = (valStr: string) => {
    setSplitDue(valStr);
    const dueVal = Number(valStr) || 0;
    const remainder = Math.max(0, grandTotal - dueVal);
    const defaultPm = activePaymentMethods.find((p) => p.isDefault) || activePaymentMethods[0];
    if (defaultPm) {
      setSplitAmounts({ [defaultPm.id]: remainder > 0 ? remainder.toString() : '0' });
    }
  };

  const selectedCustomer = (customers || []).find((c) => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    const term = customerSearchTerm.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.company && c.company.toLowerCase().includes(term)) ||
        (c.address && c.address.toLowerCase().includes(term))
    );
  }, [customers, customerSearchTerm]);

  // Add standard product to cart
  const handleAddToCart = (product: ProductItem) => {
    if (product.unit === 'sqft') {
      // Open dimension helper
      setDimModalProduct(product);
      setDimWidth(10);
      setDimHeight(4);
      setDimQty(1);
      setDimNotes('');
      return;
    }

    const existingIndex = cart.findIndex((i) => i.productId === product.id && !i.totalSqft);
    if (existingIndex > -1) {
      const updated = [...cart];
      const item = updated[existingIndex];
      const newQty = item.qty + 1;
      updated[existingIndex] = {
        ...item,
        qty: newQty,
        totalPrice: newQty * item.unitPrice,
      };
      setCart(updated);
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        unitPrice: product.unitPrice,
        costPrice: product.costPrice,
        qty: 1,
        totalPrice: product.unitPrice,
      };
      setCart([...cart, newItem]);
    }
  };

  // Add Sqft item with dimensions
  const handleConfirmDimensionItem = () => {
    if (!dimModalProduct) return;
    const sqft = Number((dimWidth * dimHeight).toFixed(2));
    const totalPrice = Math.round(sqft * dimModalProduct.unitPrice * dimQty);

    const newItem: InvoiceItem = {
      productId: dimModalProduct.id,
      name: `${dimModalProduct.name} (${dimWidth}' x ${dimHeight}' = ${sqft} sqft)`,
      category: dimModalProduct.category,
      unit: 'sqft',
      unitPrice: dimModalProduct.unitPrice,
      costPrice: dimModalProduct.costPrice,
      qty: dimQty,
      width: dimWidth,
      height: dimHeight,
      totalSqft: sqft * dimQty,
      totalPrice: totalPrice,
      notes: dimNotes || undefined,
    };

    setCart([...cart, newItem]);
    setDimModalProduct(null);
  };

  // Update item in cart
  const updateCartQty = (index: number, delta: number) => {
    const updated = [...cart];
    const item = updated[index];
    const newQty = Math.max(1, item.qty + delta);
    const unitP = item.unitPrice;
    
    let newTotal = 0;
    if (item.totalSqft && item.width && item.height) {
      const baseSqft = item.width * item.height;
      newTotal = Math.round(baseSqft * unitP * newQty);
    } else {
      newTotal = Math.round(unitP * newQty);
    }

    updated[index] = {
      ...item,
      qty: newQty,
      totalSqft: item.width && item.height ? (item.width * item.height * newQty) : undefined,
      totalPrice: newTotal,
    };
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Quick Customer Create
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    const created = addCustomer({
      name: newCustName,
      phone: newCustPhone,
      company: newCustCompany,
      address: newCustAddress,
    });
    setSelectedCustomerId(created.id);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCompany('');
    setNewCustAddress('');
  };

  // Checkout
  const handleCheckout = () => {
    setCheckoutFeedback(null);

    if (cart.length === 0) {
      setCheckoutFeedback({
        type: 'error',
        message: language === 'bn' ? 'আপনার কার্ট খালি! অনুগ্রহ করে পণ্য যোগ করুন।' : 'Your cart is empty! Please add products first.',
      });
      return;
    }

    setIsProcessingCheckout(true);

    try {
      // Find or fallback to a valid customer
      let customerToUse = selectedCustomer;
      if (!customerToUse && customers && customers.length > 0) {
        customerToUse =
          customers.find((c) => c.id === selectedCustomerId) ||
          customers.find((c) => c.name.toLowerCase().includes('walk-in') || c.name.toLowerCase().includes('walk in')) ||
          customers[0];
      }

      if (!customerToUse) {
        customerToUse = addCustomer({
          name: 'Walk-in Customer',
          company: 'Cash / Spot Sale',
          phone: '01819-000000',
          address: 'Chattogram',
        });
        setSelectedCustomerId(customerToUse.id);
      }

      const safeGrandTotal = Math.max(0, Number(grandTotal) || 0);
      let calculatedTotalPaid = 0;
      let maxPaidMethod = activePaymentMethods[0]?.name || 'Cash';
      let maxPaidVal = -1;
      const splitPaymentsRecord: Record<string, number> = {};

      activePaymentMethods.forEach((pm) => {
        const val = Number(splitAmounts[pm.id]) || 0;
        splitPaymentsRecord[pm.id] = val;
        splitPaymentsRecord[pm.name.toLowerCase().replace(/\s+/g, '_')] = val;
        splitPaymentsRecord[pm.name] = val;
        calculatedTotalPaid += val;
        if (val > maxPaidVal && val > 0) {
          maxPaidVal = val;
          maxPaidMethod = pm.name;
        }
      });

      const finalPaid = Math.max(0, calculatedTotalPaid);
      const finalDue = Math.max(0, safeGrandTotal - finalPaid);
      splitPaymentsRecord['due'] = finalDue;
      const payStatus = finalDue <= 0 ? 'Paid' : finalPaid <= 0 ? 'Due' : 'Partial';

      const newInvoice = addInvoice({
        date: new Date().toISOString().slice(0, 10),
        referenceNo: referenceNo.trim() || undefined,
        deliveryDate: deliveryDate || undefined,
        customerId: customerToUse.id,
        customerName: customerToUse.company ? `${customerToUse.company} (${customerToUse.name})` : customerToUse.name,
        customerPhone: customerToUse.phone || '01819-000000',
        customerAddress: customerToUse.address || '',
        items: cart,
        subtotal: Number(subtotal) || 0,
        discount: Number(effectiveDiscount) || 0,
        discountType,
        discountValue: Number(discountAmount) || 0,
        vatType,
        vatValue: Number(vatAmountInput) || 0,
        vatRate: Number(computedVatRate) || 0,
        vatAmount: Number(effectiveVat) || 0,
        grandTotal: safeGrandTotal,
        paidAmount: finalPaid,
        dueAmount: finalDue,
        paymentMethod: maxPaidVal > 0 ? maxPaidMethod : (activePaymentMethods[0]?.name || 'Cash'),
        paymentStatus: payStatus,
        productionStatus: 'Queued',
        warehouseLocation,
        notes: notes || undefined,
        jobSpecs: jobSpecs || undefined,
        splitPayments: splitPaymentsRecord,
      });

      // Reset Cart and state
      setCart([]);
      setReferenceNo('');
      setDiscountAmount(0);
      setDiscountType('amount');
      setVatAmountInput(0);
      setVatType('percent');
      setPaidAmount('');
      setSplitAmounts({});
      setSplitDue('');
      setNotes('');
      setJobSpecs('');

      setCheckoutFeedback({
        type: 'success',
        message: language === 'bn'
          ? `অর্ডার সফলভাবে নিশ্চিত হয়েছে! ইনভয়েস নং: ${newInvoice.invoiceNo}`
          : `Order confirmed successfully! Invoice: ${newInvoice.invoiceNo}`,
      });

      // Open Print Modal directly in POS thermal slip format with autoPrint
      onOpenInvoiceModal(newInvoice.id, 'pos', { autoPrint: true });
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutFeedback({
        type: 'error',
        message: language === 'bn'
          ? `অর্ডার তৈরিতে সমস্যা হয়েছে: ${err?.message || 'অনুগ্রহ করে আবার চেষ্টা করুন'}`
          : `Failed to create order: ${err?.message || 'Please try again'}`,
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const categories = [
    { id: 'ALL', labelEn: 'All Services', labelBn: 'সকল সার্ভিস' },
    { id: 'DIGITAL PRINTING', labelEn: 'Digital Printing', labelBn: 'ডিজিটাল প্রিন্ট' },
    { id: 'SIGN MAKING & LETTERING', labelEn: 'Signage & Letters', labelBn: 'সাইনবোর্ড ও ৩ডি' },
    { id: 'BRANDED PROMOTIONAL GIFTS', labelEn: 'Branded Gifts', labelBn: 'কর্পোরেট গিফটস' },
    { id: 'PRINTING & PACKAGING', labelEn: 'Printing & Packaging', labelBn: 'প্রিন্টিং ও প্যাকেজিং' },
    { id: 'GRAPHIC DESIGN', labelEn: 'Graphic Design', labelBn: 'গ্রাফিক ডিজাইন' },
    { id: 'EXHIBITION', labelEn: 'Exhibition', labelBn: 'এক্সপো স্টল' },
    { id: 'EVENTS MANAGEMENT', labelEn: 'Events', labelBn: 'ইভেন্ট ম্যানেজমেন্ট' },
    { id: 'RAW MATERIAL', labelEn: 'Raw Media & Stocks', labelBn: 'কাঁচামাল স্টক' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* POS Sales Overview with Daily Revenue Trends Bar Chart */}
      <POSSalesOverview
        invoices={invoices}
        profile={profile}
        currencySymbol={profile.currencySymbol}
        language={language}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Catalog & Item Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Category Pills */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'আইটেমের নাম, কোড বা সার্ভিস খুঁজুন (যেমন: PVC, Notebook, Mug, LED)...'
                    : 'Search items by name, code or keyword (e.g. PVC, Mug, LED, Sign)...'
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Service Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    {language === 'bn' ? cat.labelBn : cat.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => {
              const totalStock = prod.stockFactory + prod.stockOffice;
              const isLow = !prod.isRawMaterial && totalStock <= prod.minStockAlert;
              return (
                <div
                  key={prod.id}
                  onClick={() => handleAddToCart(prod)}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  {prod.unit === 'sqft' && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      <Calculator className="w-2.5 h-2.5" />
                      SqFt
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>{prod.code}</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {language === 'bn' && prod.nameBn ? prod.nameBn : prod.name}
                    </h4>

                    {prod.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-950">
                        {profile.currencySymbol}
                        {prod.unitPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-0.5">/{prod.unit}</span>
                    </div>

                    <div className="text-right">
                      {!prod.isRawMaterial && prod.category !== 'GRAPHIC DESIGN' && prod.category !== 'VENUE SOURCING' ? (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isLow
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {language === 'bn' ? 'স্টক:' : 'Stock:'} {totalStock}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {language === 'bn' ? 'সার্ভিস' : 'Service'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">
                {language === 'bn' ? 'কোন আইটেম খুঁজে পাওয়া যায়নি' : 'No items match your search'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="mt-2 text-xs text-amber-600 font-bold hover:underline"
              >
                {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset filters'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: POS Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'bn' ? 'বিক্রয় কার্ট' : 'Sales Cart'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {cart.length} {language === 'bn' ? 'টি আইটেম' : 'items'}
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'bn' ? 'খালি করুন' : 'Clear'}
              </button>
            )}
          </div>

          {/* Customer Selection & Search */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'bn' ? 'গ্রাহক / ক্লায়েন্ট' : 'Customer / Client'}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (customerSearchTerm.trim()) {
                    const isPhone = /^[0-9+ -]+$/.test(customerSearchTerm.trim());
                    if (isPhone) {
                      setNewCustPhone(customerSearchTerm.trim());
                      setNewCustName('');
                    } else {
                      setNewCustName(customerSearchTerm.trim());
                      setNewCustPhone('');
                    }
                  }
                  setShowNewCustomerModal(true);
                }}
                className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {language === 'bn' ? '+ নতুন কাস্টমার' : '+ New Customer'}
              </button>
            </div>

            {/* Quick Customer Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setIsCustomerSearchOpen(true);
                }}
                onFocus={() => setIsCustomerSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCustomers.length > 0) {
                    e.preventDefault();
                    setSelectedCustomerId(filteredCustomers[0].id);
                    setCustomerSearchTerm('');
                    setIsCustomerSearchOpen(false);
                  }
                }}
                placeholder={
                  language === 'bn'
                    ? 'নাম বা মোবাইল নম্বর দিয়ে গ্রাহক খুঁজুন...'
                    : 'Search customer by name or phone...'
                }
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {customerSearchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchTerm('');
                    setIsCustomerSearchOpen(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Floating Auto-suggest / Quick Select Dropdown */}
              {isCustomerSearchOpen && customerSearchTerm.trim() && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsCustomerSearchOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerSearchTerm('');
                            setIsCustomerSearchOpen(false);
                          }}
                          className={`w-full text-left p-2 hover:bg-amber-50/80 transition-colors flex items-center justify-between gap-2 ${
                            c.id === selectedCustomerId ? 'bg-amber-50/90 font-bold border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-slate-900 truncate">
                              <span className="font-bold">{c.name}</span>
                              {c.company && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-semibold px-1 rounded ml-1.5">
                                  {c.company}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.phone}</div>
                          </div>
                          {c.dueAmount > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              {language === 'bn' ? 'বকেয়া' : 'Due'}: ৳{c.dueAmount.toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          {language === 'bn'
                            ? `"${customerSearchTerm}" নামে কোনো গ্রাহক পাওয়া যায়নি`
                            : `No customer found matching "${customerSearchTerm}"`}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const isPhone = /^[0-9+ -]+$/.test(customerSearchTerm.trim());
                            if (isPhone) {
                              setNewCustPhone(customerSearchTerm.trim());
                              setNewCustName('');
                            } else {
                              setNewCustName(customerSearchTerm.trim());
                              setNewCustPhone('');
                            }
                            setIsCustomerSearchOpen(false);
                            setShowNewCustomerModal(true);
                          }}
                          className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>
                            {language === 'bn'
                              ? `+ নতুন গ্রাহক হিসেবে যোগ করুন`
                              : `+ Add as New Customer`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Customer Dropdown */}
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} - ` : ''}
                  {c.name} ({c.phone})
                  {c.dueAmount > 0 ? ` [বকেয়া: ${profile.currencySymbol}${c.dueAmount}]` : ''}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 flex justify-between items-center border border-slate-100">
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-800 truncate block">{selectedCustomer.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedCustomer.phone} {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}</span>
                </div>
                {selectedCustomer.dueAmount > 0 && (
                  <span className="text-rose-600 font-bold flex-shrink-0">
                    {language === 'bn' ? 'পূর্বের বকেয়া:' : 'Past Due:'} {profile.currencySymbol}
                    {selectedCustomer.dueAmount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Location, Delivery & Reference Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'ডেলিভারি শাখা' : 'Dispatch From'}
              </label>
              <select
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs focus:ring-1 focus:ring-amber-500/30 focus:outline-hidden"
              >
                <option value="Office">
                  {language === 'bn' ? 'সেন্ট্রাল ওয়্যারহাউজ ও আউটলেট' : 'Central Warehouse & Outlet'}
                </option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'ডেলিভারি তারিখ' : 'Delivery Date'}
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs focus:ring-1 focus:ring-amber-500/30 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'রেফারেন্স নং (PO/Ref)' : 'Reference / PO No.'}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: PO-8901, REF-12' : 'e.g. PO-8901, REF-12'}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs focus:ring-1 focus:ring-amber-500/30 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cart.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>
                      {profile.currencySymbol}
                      {item.unitPrice} × {item.qty} {item.unit}
                    </span>
                    {item.totalSqft && (
                      <span className="font-semibold text-amber-700 bg-amber-50 px-1 rounded">
                        ({item.totalSqft} sqft)
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-slate-500 italic mt-0.5">{item.notes}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, -1)}
                      className="p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-900">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, 1)}
                      className="p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-xs font-extrabold text-slate-900 w-16 text-right">
                    {profile.currencySymbol}
                    {item.totalPrice.toLocaleString()}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeFromCart(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">
                  {language === 'bn' ? 'কার্ট খালি আছে' : 'Your cart is empty'}
                </p>
                <p className="text-[11px]">
                  {language === 'bn'
                    ? 'বাম পাশের সার্ভিস তালিকা থেকে আইটেম যোগ করুন'
                    : 'Click any service or product from the catalog'}
                </p>
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          {cart.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{language === 'bn' ? 'মোট সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-bold text-slate-900">
                  {profile.currencySymbol}
                  {subtotal.toLocaleString()}
                </span>
              </div>

              {/* Discount Input with Toggle */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setDiscountType('amount')}
                      className={`px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                        discountType === 'amount'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ৳
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                        discountType === 'percent'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={discountType === 'percent' ? 100 : subtotal}
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-20 text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-1 focus:ring-amber-500/30 focus:outline-hidden"
                  />
                </div>
              </div>

              {discountType === 'percent' && effectiveDiscount > 0 && (
                <div className="flex justify-between text-slate-500 text-[10px] pl-4">
                  <span>{language === 'bn' ? 'ডিসকাউন্ট পরিমাণ:' : 'Discount Amount:'}</span>
                  <span className="font-bold">
                    -{profile.currencySymbol}
                    {effectiveDiscount.toLocaleString()}
                  </span>
                </div>
              )}

              {/* VAT / TAX Input with Toggle (Discount er moto) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 flex items-center gap-1">
                  <span>{language === 'bn' ? 'ভ্যাট / ট্যাক্স' : 'VAT / Tax'}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setVatType('amount')}
                      className={`px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                        vatType === 'amount'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ৳
                    </button>
                    <button
                      type="button"
                      onClick={() => setVatType('percent')}
                      className={`px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                        vatType === 'percent'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={vatType === 'percent' ? 100 : undefined}
                    value={vatAmountInput || ''}
                    onChange={(e) => setVatAmountInput(Number(e.target.value))}
                    placeholder="0"
                    className="w-20 text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-1 focus:ring-amber-500/30 focus:outline-hidden"
                  />
                </div>
              </div>

              {effectiveVat > 0 && (
                <div className="flex justify-between text-slate-500 text-[10px] pl-4">
                  <span>
                    {language === 'bn' ? 'ভ্যাট পরিমাণ' : 'VAT Amount'} {vatType === 'percent' ? `(${vatAmountInput}%)` : ''}:
                  </span>
                  <span className="font-bold text-slate-700">
                    +{profile.currencySymbol}
                    {effectiveVat.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-950">
                  {language === 'bn' ? 'সর্বমোট প্রদেয়' : 'Grand Total'}
                </span>
                <span className="text-base sm:text-lg font-black text-amber-600">
                  {profile.currencySymbol}
                  {grandTotal.toLocaleString()}
                </span>
              </div>

              {/* ⚡ 1-CLICK FULL PAYMENT SHORTCUT */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500 text-xs">⚡</span>
                    <span>{language === 'bn' ? '১-ক্লিক সম্পূর্ণ পেমেন্ট শর্টকাট' : '1-CLICK FULL PAYMENT SHORTCUT'}</span>
                  </div>
                  <span className="text-[9px] font-medium text-slate-400">
                    {activePaymentMethods.length} {language === 'bn' ? 'টি মেথড সক্রিয়' : 'active methods'}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-0.5">
                  {activePaymentMethods.map((pm) => {
                    const icon = getMethodIcon(pm.type, pm.name);
                    const color = getMethodColorClass(pm.type, pm.name);
                    return (
                      <button
                        key={`quick-${pm.id}`}
                        type="button"
                        onClick={() => handleSelectFullPayment(pm.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border ${color.border} ${color.bg} ${color.text} transition-all font-bold text-[10px] space-y-1 shadow-2xs hover:shadow-xs`}
                        title={`Full ${pm.name}`}
                      >
                        <span className="text-xs">{icon}</span>
                        <span className="leading-tight text-center truncate max-w-full px-1">
                          Full {pm.name}
                        </span>
                      </button>
                    );
                  })}

                  {/* Full Due */}
                  <button
                    type="button"
                    onClick={handleSelectFullDue}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 transition-all font-bold text-[10px] space-y-1 shadow-2xs hover:shadow-xs"
                    title="Full Due"
                  >
                    <span className="text-xs">👤</span>
                    <span className="leading-tight text-center">Full Due</span>
                  </button>
                </div>
              </div>

              {/* Split Payment Fields */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2 text-[11px] max-h-52 overflow-y-auto p-0.5">
                  {activePaymentMethods.map((pm) => {
                    const icon = getMethodIcon(pm.type, pm.name);
                    const color = getMethodColorClass(pm.type, pm.name);
                    const currentVal = splitAmounts[pm.id] ?? '';
                    return (
                      <div key={`split-${pm.id}`} className="space-y-1">
                        <label className="font-bold text-slate-700 flex items-center gap-1 justify-between">
                          <span className="flex items-center gap-1 truncate">
                            <span className="text-xs">{icon}</span>
                            <span className="truncate">{language === 'bn' ? (pm.nameBn || pm.name) : pm.name}</span>
                          </span>
                          {pm.isDefault && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-normal shrink-0">Default</span>
                          )}
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={currentVal}
                          onChange={(e) => handleUpdateMethodAmount(pm.id, e.target.value)}
                          className={`w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-xl font-mono font-bold text-xs text-slate-800 focus:bg-white focus:ring-1 ${color.ring} focus:outline-hidden`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Due Amount input */}
                <div className="space-y-1 text-[11px]">
                  <label className="font-bold text-amber-800 flex items-center gap-1">
                    <span className="text-xs">👤</span>
                    <span>
                      {language === 'bn'
                        ? `বকেয়া / কাস্টমার ক্রেডিট (${selectedCustomer?.name || 'Walk-in Customer'})`
                        : `Due / Customer Credit (${selectedCustomer?.name || 'Walk-in Customer'})`}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={splitDue}
                    onChange={(e) => handleUpdateDueAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 bg-amber-50/20 rounded-xl font-mono font-extrabold text-xs text-rose-700 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* Live balance review bar */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">
                    {language === 'bn' ? 'মোট সংগৃহীত পেমেন্ট:' : 'Total Received:'}{' '}
                    <strong className="text-slate-800 text-xs font-mono font-bold">
                      {profile.currencySymbol}{totalSplitPaid.toLocaleString()}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    {language === 'bn' ? 'বকেয়া:' : 'Due:'}{' '}
                    <strong className={`text-xs font-mono font-black ${numDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {profile.currencySymbol}{numDue.toLocaleString()}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Job Specs Note */}
              <div>
                <input
                  type="text"
                  value={jobSpecs}
                  onChange={(e) => setJobSpecs(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'কাজের বিবরণ (যেমন: ৪ কোনায় আইলেট হবে, ম্যাট লেমিনেশন)'
                      : 'Job specifications / design remarks...'
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* In-app Checkout Feedback Banner */}
              {checkoutFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    checkoutFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {checkoutFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="flex-1">{checkoutFeedback.message}</span>
                </div>
              )}

              {/* Checkout Button */}
              <button
                type="button"
                id="pos-confirm-and-print-button"
                onClick={handleCheckout}
                disabled={isProcessingCheckout || cart.length === 0}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>
                  {isProcessingCheckout
                    ? (language === 'bn' ? 'অর্ডার প্রক্রিয়াকরণ হচ্ছে...' : 'Processing Order...')
                    : (language === 'bn'
                    ? 'অর্ডার কনফার্ম ও ইনভয়েস প্রিন্ট'
                    : 'Confirm Order & Print Invoice')}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DIMENSION MODAL FOR SQFT ITEMS */}
      {dimModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {dimModalProduct.category}
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1">
                  {dimModalProduct.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDimModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {language === 'bn'
                ? 'ব্যানার বা সাইনবোর্ডের মাপ (প্রস্থ ও উচ্চতা ফিটে) ইনপুট করুন:'
                : 'Enter dimensions in feet (Width × Height) for square-feet calculation:'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'প্রস্থ (Width in Feet)' : 'Width (Feet)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.5"
                  value={dimWidth}
                  onChange={(e) => setDimWidth(Math.max(0.1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'উচ্চতা (Height in Feet)' : 'Height (Feet)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.5"
                  value={dimHeight}
                  onChange={(e) => setDimHeight(Math.max(0.1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'পরিমাণ (Quantity)' : 'Quantity (Pcs)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={dimQty}
                  onChange={(e) => setDimQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'মোট আয়তন' : 'Total Area'}
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-amber-600 text-sm">
                  {(dimWidth * dimHeight * dimQty).toFixed(2)} SqFt
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {language === 'bn' ? 'কাজের বিশেষ নির্দেশনা' : 'Special Specifications'}
              </label>
              <input
                type="text"
                value={dimNotes}
                onChange={(e) => setDimNotes(e.target.value)}
                placeholder="e.g. Ring eyelets, pocket pasting, wooden frame"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">
                {profile.currencySymbol}
                {dimModalProduct.unitPrice}/sqft × {(dimWidth * dimHeight * dimQty).toFixed(2)} sqft
              </span>
              <span className="text-base font-black text-slate-900">
                {profile.currencySymbol}
                {Math.round(dimWidth * dimHeight * dimQty * dimModalProduct.unitPrice).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDimModalProduct(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDimensionItem}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                {language === 'bn' ? 'কার্টে যোগ করুন' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER CREATE MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'bn' ? 'নতুন কাস্টমার নিবন্ধন' : 'Register New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'গ্রাহকের নাম *' : 'Client Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Ali Jowel / Tanvir Hossain"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'ফোন নম্বর *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 01730-581687"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'কোম্পানি / প্রতিষ্ঠান' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                    placeholder="e.g. Apex Apparel / Square Pharma"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
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
                    placeholder="e.g. Mehedibag / Agrabad C/A, Chattogram"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
