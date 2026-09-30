import React, { useState, useMemo } from 'react';
import {
  SalesInvoice,
  Customer,
  Product,
  Language,
  CompanyProfile,
  StaffMember,
} from '../../types';
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Search,
  AlertCircle,
  CreditCard,
  Building2,
  Phone,
  Layers,
  ArrowUpRight,
  Receipt,
  PiggyBank,
} from 'lucide-react';

interface SalesReportsProps {
  reportId: string;
  invoices: SalesInvoice[];
  customers: Customer[];
  products: Product[];
  staffMembers: StaffMember[];
  profile: CompanyProfile;
  language: Language;
}

export const SalesReports: React.FC<SalesReportsProps> = ({
  reportId,
  invoices,
  customers,
  products,
  staffMembers,
  profile,
  language,
}) => {
  const isBn = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const currency = profile.currencySymbol || '৳';

  // -------------------------------------------------------------
  // 1. ITEM-WISE SALES REPORT
  // -------------------------------------------------------------
  const itemSalesData = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        unit: string;
        totalQty: number;
        totalRevenue: number;
        totalCost: number;
        invoiceCount: number;
      }
    >();

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.productId || item.name;
        const current = map.get(key) || {
          id: key,
          name: item.name,
          category: item.category || 'General',
          unit: item.unit || 'pcs',
          totalQty: 0,
          totalRevenue: 0,
          totalCost: 0,
          invoiceCount: 0,
        };

        const itemQty = item.qty || 1;
        const itemRevenue = item.totalPrice || item.unitPrice * itemQty;
        const itemCost = (item.costPrice || 0) * itemQty;

        current.totalQty += itemQty;
        current.totalRevenue += itemRevenue;
        current.totalCost += itemCost;
        current.invoiceCount += 1;

        map.set(key, current);
      });
    });

    return Array.from(map.values()).map((row) => {
      const avgSellingPrice = row.totalQty > 0 ? row.totalRevenue / row.totalQty : 0;
      const profit = row.totalRevenue - row.totalCost;
      const marginPct = row.totalRevenue > 0 ? (profit / row.totalRevenue) * 100 : 0;
      return {
        ...row,
        avgSellingPrice,
        profit,
        marginPct,
      };
    });
  }, [invoices]);

  const filteredItemSales = useMemo(() => {
    return itemSalesData.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [itemSalesData, searchTerm, selectedCategory]);

  const itemCategories = useMemo(() => {
    const set = new Set<string>();
    itemSalesData.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [itemSalesData]);

  // -------------------------------------------------------------
  // 2. USER / STAFF-WISE SALES REPORT
  // -------------------------------------------------------------
  const userSalesData = useMemo(() => {
    const map = new Map<
      string,
      {
        staffName: string;
        role: string;
        location: string;
        invoicesCount: number;
        totalAmount: number;
        totalPaid: number;
        totalDue: number;
        totalItemsSold: number;
      }
    >();

    // Initialize with active staff
    staffMembers.forEach((staff) => {
      map.set(staff.name, {
        staffName: staff.name,
        role: staff.role,
        location: staff.location,
        invoicesCount: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        totalItemsSold: 0,
      });
    });

    invoices.forEach((inv) => {
      // Find staff name or fallback
      const staffName = inv.staffName || inv.salesPerson || 'Sales Counter';
      const current = map.get(staffName) || {
        staffName,
        role: 'Sales Representative',
        location: inv.warehouseLocation || 'Office',
        invoicesCount: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        totalItemsSold: 0,
      };

      current.invoicesCount += 1;
      current.totalAmount += inv.grandTotal || 0;
      current.totalPaid += inv.paidAmount || 0;
      current.totalDue += inv.dueAmount || 0;
      current.totalItemsSold += inv.items.reduce((s, it) => s + (it.qty || 1), 0);

      map.set(staffName, current);
    });

    return Array.from(map.values()).filter((row) => row.invoicesCount > 0 || staffMembers.some((s) => s.name === row.staffName));
  }, [invoices, staffMembers]);

  // -------------------------------------------------------------
  // 3. CATEGORY-WISE SALES REPORT
  // -------------------------------------------------------------
  const categorySalesData = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        itemCount: number;
        totalQty: number;
        totalRevenue: number;
        totalCost: number;
      }
    >();

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const cat = item.category || 'General';
        const current = map.get(cat) || {
          category: cat,
          itemCount: 0,
          totalQty: 0,
          totalRevenue: 0,
          totalCost: 0,
        };

        const qty = item.qty || 1;
        const rev = item.totalPrice || item.unitPrice * qty;
        const cost = (item.costPrice || 0) * qty;

        current.itemCount += 1;
        current.totalQty += qty;
        current.totalRevenue += rev;
        current.totalCost += cost;

        map.set(cat, current);
      });
    });

    const totalRevAll = Array.from(map.values()).reduce((acc, c) => acc + c.totalRevenue, 0);

    return Array.from(map.values()).map((row) => ({
      ...row,
      profit: row.totalRevenue - row.totalCost,
      marginPct: row.totalRevenue > 0 ? ((row.totalRevenue - row.totalCost) / row.totalRevenue) * 100 : 0,
      sharePct: totalRevAll > 0 ? (row.totalRevenue / totalRevAll) * 100 : 0,
    }));
  }, [invoices]);

  // -------------------------------------------------------------
  // 4. PAYMENT-WISE SALES REPORT
  // -------------------------------------------------------------
  const paymentSalesData = useMemo(() => {
    const methods: { method: string; methodBn: string }[] = [
      { method: 'Cash', methodBn: 'নগদ ক্যাশ' },
      { method: 'Bank Transfer', methodBn: 'ব্যাংক ট্রান্সফার' },
      { method: 'bKash / Nagad', methodBn: 'বিকাশ / নগদ' },
      { method: 'Cheque', methodBn: 'চেক' },
    ];

    return methods.map(({ method, methodBn }) => {
      const matchingInvoices = invoices.filter((inv) => inv.paymentMethod === method);
      const invoiceCount = matchingInvoices.length;
      const totalAmount = matchingInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
      const paidCollected = matchingInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
      const dueRemaining = matchingInvoices.reduce((acc, inv) => acc + (inv.dueAmount || 0), 0);

      return {
        method,
        methodBn,
        invoiceCount,
        totalAmount,
        paidCollected,
        dueRemaining,
        collectionRate: totalAmount > 0 ? (paidCollected / totalAmount) * 100 : 0,
      };
    });
  }, [invoices]);

  // -------------------------------------------------------------
  // 5. CUSTOMER-WISE SALES REPORT
  // -------------------------------------------------------------
  const customerSalesData = useMemo(() => {
    const map = new Map<
      string,
      {
        customerId: string;
        name: string;
        company: string;
        phone: string;
        address: string;
        invoiceCount: number;
        totalInvoiced: number;
        totalPaid: number;
        dueAmount: number;
        lastInvoiceDate: string;
      }
    >();

    invoices.forEach((inv) => {
      const key = inv.customerId || inv.customerPhone || inv.customerName;
      const current = map.get(key) || {
        customerId: inv.customerId || '',
        name: inv.customerName || 'Walk-in Customer',
        company: '',
        phone: inv.customerPhone || '',
        address: inv.customerAddress || '',
        invoiceCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        dueAmount: 0,
        lastInvoiceDate: inv.date,
      };

      current.invoiceCount += 1;
      current.totalInvoiced += inv.grandTotal || 0;
      current.totalPaid += inv.paidAmount || 0;
      current.dueAmount += inv.dueAmount || 0;
      if (inv.date > current.lastInvoiceDate) {
        current.lastInvoiceDate = inv.date;
      }

      const matchCust = (customers || []).find((c) => c.id === inv.customerId || c.phone === inv.customerPhone);
      if (matchCust && matchCust.company) {
        current.company = matchCust.company;
      }

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.totalInvoiced - a.totalInvoiced);
  }, [invoices, customers]);

  // -------------------------------------------------------------
  // 6. CUSTOMER RECEIVABLES REPORT (AGING & DUES)
  // -------------------------------------------------------------
  const customerReceivablesData = useMemo(() => {
    const now = new Date().getTime();

    return invoices
      .filter((inv) => (inv.dueAmount || 0) > 0)
      .map((inv) => {
        const invDate = new Date(inv.date).getTime();
        const diffDays = Math.max(0, Math.floor((now - invDate) / (1000 * 60 * 60 * 24)));

        let agingBracket = '0 - 15 Days';
        let agingBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (diffDays > 60) {
          agingBracket = '60+ Days (Overdue)';
          agingBadge = 'bg-red-50 text-red-700 border-red-200';
        } else if (diffDays > 30) {
          agingBracket = '31 - 60 Days';
          agingBadge = 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (diffDays > 15) {
          agingBracket = '16 - 30 Days';
          agingBadge = 'bg-blue-50 text-blue-700 border-blue-200';
        }

        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          grandTotal: inv.grandTotal,
          paidAmount: inv.paidAmount,
          dueAmount: inv.dueAmount,
          daysPassed: diffDays,
          agingBracket,
          agingBadge,
          productionStatus: inv.productionStatus,
        };
      })
      .sort((a, b) => b.dueAmount - a.dueAmount);
  }, [invoices]);

  // -------------------------------------------------------------
  // 7. CUSTOMER ADVANCE REPORT
  // -------------------------------------------------------------
  const customerAdvanceData = useMemo(() => {
    // Customers with advance balances or deposits
    return customers
      .filter((c) => (c.advanceBalance && c.advanceBalance > 0) || (c.dueAmount < 0))
      .map((c) => {
        const advanceAmount = c.advanceBalance || Math.abs(c.dueAmount);
        return {
          id: c.id,
          name: c.name,
          company: c.company || 'N/A',
          phone: c.phone,
          advanceAmount,
          lastActivity: c.createdAt || '2026-09-01',
          status: 'Active Advance Balance',
        };
      });
  }, [customers]);

  // RENDER BASED ON REPORT ID
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* REPORT 1: ITEM-WISE SALES */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'item-sales' && (
        <div>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'মোট বিক্রি হওয়া আইটেম' : 'Unique Items Sold'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{filteredItemSales.length}</p>
              <span className="text-[11px] text-slate-400">
                {filteredItemSales.reduce((a, b) => a + b.totalQty, 0)} {isBn ? 'মোট পরিমাণ' : 'total units'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'মোট বিক্রয় মূল্য (রাজস্ব)' : 'Total Sales Revenue'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {currency} {filteredItemSales.reduce((a, b) => a + b.totalRevenue, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Gross revenue billed</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'মোট পণ্যের উৎপাদন খরচ (COGS)' : 'Cost of Goods Sold (COGS)'}
              </span>
              <p className="text-2xl font-bold text-slate-700 mt-1">
                {currency} {filteredItemSales.reduce((a, b) => a + b.totalCost, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">Direct material & job costs</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'মোট গ্রস মুনাফা ও মার্জিন' : 'Total Gross Profit & Margin'}
              </span>
              {(() => {
                const totalRev = filteredItemSales.reduce((a, b) => a + b.totalRevenue, 0);
                const totalCost = filteredItemSales.reduce((a, b) => a + b.totalCost, 0);
                const grossProfit = totalRev - totalCost;
                const margin = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : '0';
                return (
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {currency} {grossProfit.toLocaleString()}
                    </p>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {margin}% {isBn ? 'গ্রস মার্জিন' : 'margin'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={isBn ? 'আইটেম নাম বা ক্যাটাগরি খুঁজুন...' : 'Search items or category...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">{isBn ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
              {itemCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'আইটেম বিবরণী' : 'Item Description'}</th>
                    <th className="py-3 px-4">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'পরিমাণ (Qty)' : 'Quantity Sold'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'গড় বিক্রয় মূল্য' : 'Avg Rate'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট বিক্রয় (৳)' : 'Sales Value'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট খরচ (৳)' : 'Cost Value'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'গ্রস প্রফিট' : 'Gross Profit'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মার্জিন (%)' : 'Margin %'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItemSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {isBn ? 'কোন আইটেম বিক্রয়ের তথ্য পাওয়া যায়নি' : 'No item sales records found'}
                      </td>
                    </tr>
                  ) : (
                    filteredItemSales.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{item.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                          {item.totalQty.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {currency} {item.avgSellingPrice.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {currency} {item.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {currency} {item.totalCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {currency} {item.profit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              item.marginPct >= 35
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.marginPct >= 15
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.marginPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'সর্বমোট (Total):' : 'Grand Total:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {filteredItemSales.reduce((a, b) => a + b.totalQty, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {filteredItemSales.reduce((a, b) => a + b.totalRevenue, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {currency} {filteredItemSales.reduce((a, b) => a + b.totalCost, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {filteredItemSales.reduce((a, b) => a + b.profit, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {(() => {
                        const r = filteredItemSales.reduce((a, b) => a + b.totalRevenue, 0);
                        const c = filteredItemSales.reduce((a, b) => a + b.totalCost, 0);
                        return r > 0 ? `${(((r - c) / r) * 100).toFixed(1)}%` : '0%';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 2: USER / STAFF-WISE SALES */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'user-sales' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'মোট বিক্রয়কর্মী ও স্টাফ' : 'Active Sales Staff'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{userSalesData.length}</p>
              <span className="text-[11px] text-slate-400">Invoicing & counter sales</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'মোট সেলস আদায় (ক্যাশ/ব্যাংক)' : 'Total Collections by Staff'}
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {currency} {userSalesData.reduce((a, b) => a + b.totalPaid, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">Cash in hand & deposited</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {isBn ? 'স্টাফ ভিত্তিক বকেয়া বাকি' : 'Pending Receivables'}
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {currency} {userSalesData.reduce((a, b) => a + b.totalDue, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-rose-500 font-medium">Customer dues to follow up</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'স্টাফ ও বিক্রয়কর্মী' : 'Sales Representative / Staff'}</th>
                    <th className="py-3 px-4">{isBn ? 'পদবী ও শাখা' : 'Role & Location'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'ইনভয়েস সংখ্যা' : 'Invoices'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'আইটেম সংখ্যা' : 'Items Sold'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট বিক্রয় (৳)' : 'Total Invoiced (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'আদায়কৃত টাকা (৳)' : 'Amount Collected'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'বকেয়া (৳)' : 'Due Outstanding'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'গড় অর্ডার মান' : 'Avg Order Value'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userSalesData.map((row, idx) => {
                    const aov = row.invoicesCount > 0 ? row.totalAmount / row.invoicesCount : 0;
                    return (
                      <tr key={row.staffName} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{row.staffName}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="text-[11px] font-medium block">{row.role}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{row.location}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                            {row.invoicesCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">{row.totalItemsSold}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {currency} {row.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                          {currency} {row.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                          {currency} {row.totalDue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {currency} {aov.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'সর্বমোট (Total):' : 'Grand Total:'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {userSalesData.reduce((a, b) => a + b.invoicesCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {userSalesData.reduce((a, b) => a + b.totalItemsSold, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {userSalesData.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {userSalesData.reduce((a, b) => a + b.totalPaid, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      {currency} {userSalesData.reduce((a, b) => a + b.totalDue, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 3: CATEGORY-WISE SALES */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'category-sales' && (
        <div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'প্রডাক্ট ক্যাটাগরি' : 'Category Name'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'আইটেম অর্ডার সংখ্যা' : 'Item Lines'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট পরিমাণ (Qty)' : 'Total Units Sold'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট রাজস্ব (৳)' : 'Sales Revenue (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'উৎপাদন খরচ (৳)' : 'Direct Cost (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'গ্রস লাভ (৳)' : 'Gross Profit (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মার্জিন' : 'Margin %'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট বিক্রয়ের অংশ (%)' : 'Share of Sales'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorySalesData.map((cat, idx) => (
                    <tr key={cat.category} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{cat.category}</td>
                      <td className="py-3 px-4 text-center font-mono">{cat.itemCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{cat.totalQty.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {currency} {cat.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {currency} {cat.totalCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {currency} {cat.profit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        {cat.marginPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold text-slate-800">{cat.sharePct.toFixed(1)}%</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, cat.sharePct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'সর্বমোট (Total):' : 'Grand Total:'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {categorySalesData.reduce((a, b) => a + b.itemCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {categorySalesData.reduce((a, b) => a + b.totalQty, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {categorySalesData.reduce((a, b) => a + b.totalRevenue, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {currency} {categorySalesData.reduce((a, b) => a + b.totalCost, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {categorySalesData.reduce((a, b) => a + b.profit, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">-</td>
                    <td className="py-3 px-4 text-right font-mono">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 4: PAYMENT-WISE SALES */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'payment-sales' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {paymentSalesData.map((item) => (
              <div key={item.method} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{isBn ? item.methodBn : item.method}</span>
                  <CreditCard className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  {currency} {item.paidCollected.toLocaleString()}
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>{item.invoiceCount} invoices</span>
                  <span className="font-semibold text-emerald-600">{item.collectionRate.toFixed(0)}% collected</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'ইনভয়েস সংখ্যা' : 'Invoice Count'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট বিল (৳)' : 'Total Billed (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'আদায়কৃত টাকা (৳)' : 'Collected Amount (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'বকেয়া বাকি (৳)' : 'Due Balance (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'আদায়ের হার (%)' : 'Collection Rate'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentSalesData.map((p, idx) => (
                    <tr key={p.method} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {isBn ? p.methodBn : p.method}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{p.invoiceCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {currency} {p.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {currency} {p.paidCollected.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                        {currency} {p.dueRemaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        {p.collectionRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'সর্বমোট (Total):' : 'Grand Total:'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {paymentSalesData.reduce((a, b) => a + b.invoiceCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {paymentSalesData.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {paymentSalesData.reduce((a, b) => a + b.paidCollected, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      {currency} {paymentSalesData.reduce((a, b) => a + b.dueRemaining, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {(() => {
                        const b = paymentSalesData.reduce((acc, i) => acc + i.totalAmount, 0);
                        const c = paymentSalesData.reduce((acc, i) => acc + i.paidCollected, 0);
                        return b > 0 ? `${((c / b) * 100).toFixed(1)}%` : '0%';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 5: CUSTOMER-WISE SALES */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'customer-sales' && (
        <div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'কাস্টমার / প্রতিষ্ঠান' : 'Customer & Company'}</th>
                    <th className="py-3 px-4">{isBn ? 'যোগাযোগ' : 'Contact Phone'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'মোট অর্ডার' : 'Invoices'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট ক্রয়মূল্য (৳)' : 'Total Billed (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'পরিশোধিত টাকা (৳)' : 'Total Paid (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'বর্তমান বকেয়া (৳)' : 'Due Balance (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'সর্বশেষ অর্ডার' : 'Last Purchase'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerSalesData.map((c, idx) => (
                    <tr key={c.customerId || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        {c.company && <span className="text-[11px] text-slate-500 block">{c.company}</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.phone || '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-800">
                          {c.invoiceCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {currency} {c.totalInvoiced.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {currency} {c.totalPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        {currency} {c.dueAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{c.lastInvoiceDate}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'সর্বমোট (Total):' : 'Grand Total:'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {customerSalesData.reduce((a, b) => a + b.invoiceCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {customerSalesData.reduce((a, b) => a + b.totalInvoiced, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {customerSalesData.reduce((a, b) => a + b.totalPaid, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      {currency} {customerSalesData.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 6: CUSTOMER RECEIVABLES REPORT */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'customer-receivable' && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
              <span className="text-xs text-rose-700 font-bold uppercase tracking-wider">
                {isBn ? 'মোট বকেয়া প্রাপ্যতা (Total Receivables)' : 'Total Accounts Receivable'}
              </span>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {currency} {customerReceivablesData.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">
                {customerReceivablesData.length} {isBn ? 'টি বকেয়া ইনভয়েস' : 'unpaid invoices'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
              <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                {isBn ? '১৫ দিনের বেশি মেয়াদোত্তীর্ণ' : 'Aging > 15 Days'}
              </span>
              <p className="text-2xl font-bold text-amber-800 mt-1">
                {currency}{' '}
                {customerReceivablesData
                  .filter((r) => r.daysPassed > 15)
                  .reduce((a, b) => a + b.dueAmount, 0)
                  .toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">Requires follow-up calls</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                {isBn ? 'বকেয়া রিসিভার সংখ্যা' : 'Customers with Dues'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {new Set(customerReceivablesData.map((r) => r.customerName)).size}
              </p>
              <span className="text-[11px] text-slate-500">Unique accounts in ledger</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'ইনভয়েস নং ও তারিখ' : 'Invoice & Date'}</th>
                    <th className="py-3 px-4">{isBn ? 'কাস্টমার নাম ও ফোন' : 'Customer & Phone'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'মোট বিল (৳)' : 'Bill Amount (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'পরিশোধিত (৳)' : 'Paid (৳)'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'বকেয়া টাকা (৳)' : 'Receivable Due (৳)'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'অতিবাহিত দিন' : 'Days Past'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'এজিং ক্যাটাগরি' : 'Aging Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerReceivablesData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {isBn ? 'কোন বকেয়া ইনভয়েস নেই! সকল পেমেন্ট পরিশোধিত।' : 'No outstanding customer receivables found!'}
                      </td>
                    </tr>
                  ) : (
                    customerReceivablesData.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 font-mono block">{row.invoiceNo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{row.date}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{row.customerName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{row.customerPhone}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {currency} {row.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {currency} {row.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                          {currency} {row.dueAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                          {row.daysPassed} days
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${row.agingBadge}`}>
                            {row.agingBracket}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'মোট বকেয়া (Total Receivables):' : 'Total Receivables:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {currency} {customerReceivablesData.reduce((a, b) => a + b.grandTotal, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {currency} {customerReceivablesData.reduce((a, b) => a + b.paidAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm font-black">
                      {currency} {customerReceivablesData.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right font-mono text-slate-400">
                      -
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 7: CUSTOMER ADVANCE REPORT */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'customer-advance' && (
        <div>
          <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs mb-6 max-w-sm">
            <span className="text-xs text-blue-800 font-bold uppercase tracking-wider">
              {isBn ? 'মোট কাস্টমার অগ্রিম জমা (Total Advances Held)' : 'Total Customer Advances Held'}
            </span>
            <p className="text-2xl font-black text-blue-800 mt-1">
              {currency} {customerAdvanceData.reduce((a, b) => a + b.advanceAmount, 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-500">
              {customerAdvanceData.length} {isBn ? 'জন গ্রাহকের জামানত / অগ্রিম জমা' : 'customer deposit accounts'}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'কাস্টমার নাম' : 'Customer Name'}</th>
                    <th className="py-3 px-4">{isBn ? 'কোম্পানি / প্রতিষ্ঠান' : 'Company'}</th>
                    <th className="py-3 px-4">{isBn ? 'মোবাইল' : 'Phone'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'অগ্রিম ব্যালেন্স (৳)' : 'Advance Balance (৳)'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerAdvanceData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {isBn ? 'কোন কাস্টমার অগ্রিম ব্যালেন্স পাওয়া যায়নি' : 'No active customer advance balances found'}
                      </td>
                    </tr>
                  ) : (
                    customerAdvanceData.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.company}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{row.phone}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 text-sm">
                          {currency} {row.advanceAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px]">
                      {isBn ? 'সর্বমোট অগ্রিম জমা:' : 'Total Customer Advance:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800 text-sm font-black">
                      {currency} {customerAdvanceData.reduce((a, b) => a + b.advanceAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
