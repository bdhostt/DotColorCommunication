import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  CompanyProfile,
  ProductItem,
  Customer,
  Supplier,
  SalesInvoice,
  Quotation,
  PurchaseOrder,
  AccountingTransaction,
  StockMovement,
  Language,
  LocationType,
  AccountBalances,
  StaffMember,
  AuditLogEntry,
  ChartOfAccount,
  ExpenseHead,
  ProductCategory,
  UserRole,
  RolePermission,
  JournalEntry,
} from '../types';
import {
  INITIAL_COMPANY_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_INVOICES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_TRANSACTIONS,
  INITIAL_QUOTATIONS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_STAFF_MEMBERS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import {
  INITIAL_CHART_OF_ACCOUNTS,
  INITIAL_EXPENSE_HEADS,
  INITIAL_PRODUCT_CATEGORIES,
  INITIAL_USER_ROLES,
  INITIAL_JOURNAL_ENTRIES,
  ALL_SYSTEM_PERMISSIONS,
} from '../data/accountingAndConfigData';

const STORAGE_KEY = 'DOT_COLOR_ERP_V1_STATE';

interface AppContextType {
  profile: CompanyProfile;
  products: ProductItem[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: SalesInvoice[];
  quotations: Quotation[];
  purchaseOrders: PurchaseOrder[];
  transactions: AccountingTransaction[];
  stockMovements: StockMovement[];
  accountBalances: AccountBalances;
  language: Language;
  activeLocation: 'All' | 'Factory' | 'Office';
  setLanguage: (lang: Language) => void;
  setActiveLocation: (loc: 'All' | 'Factory' | 'Office') => void;
  updateProfile: (profile: Partial<CompanyProfile>) => void;

  // Staff & RBAC
  auditLogs: AuditLogEntry[];
  staffMembers: StaffMember[];
  activeStaff: StaffMember;
  setActiveStaff: (staff: StaffMember) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  addStaffMember: (staff: Omit<StaffMember, 'id'>) => StaffMember;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaffMember: (id: string) => { success: boolean; message?: string };
  userRoles: UserRole[];
  systemPermissions: RolePermission[];
  addUserRole: (role: Omit<UserRole, 'id'>) => UserRole;
  updateUserRole: (id: string, updates: Partial<UserRole>) => void;
  deleteUserRole: (id: string) => { success: boolean; message?: string };
  checkPermission: (permissionCode: string) => boolean;
  
  // Authentication
  isAuthenticated: boolean;
  login: (staffId: string, passcode: string) => { success: boolean; message: string };
  logout: () => void;
  
  // Sales & Invoices
  addInvoice: (invoice: Omit<SalesInvoice, 'id' | 'invoiceNo'>) => SalesInvoice;
  updateInvoice: (id: string, updates: Partial<SalesInvoice>) => void;
  deleteInvoice: (id: string) => void;
  collectInvoicePayment: (invoiceId: string, amount: number, method: any) => void;
  updateProductionStatus: (invoiceId: string, status: any) => void;
  
  // Quotations
  addQuotation: (quotation: Omit<Quotation, 'id' | 'quoteNo'>) => Quotation;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  updateQuotationStatus: (id: string, status: Quotation['status']) => void;
  deleteQuotation: (id: string) => void;
  convertQuotationToInvoice: (quotationId: string) => SalesInvoice | null;

  // Products & Categories
  productCategories: ProductCategory[];
  addProductCategory: (cat: Omit<ProductCategory, 'id'>) => ProductCategory;
  updateProductCategory: (id: string, updates: Partial<ProductCategory>) => void;
  deleteProductCategory: (id: string) => { success: boolean; message?: string };
  addProduct: (product: Omit<ProductItem, 'id' | 'code'>) => void;
  bulkImportProducts: (
    items: Array<Omit<ProductItem, 'id'> & { id?: string }>,
    options?: { updateExisting?: boolean }
  ) => { added: number; updated: number };
  updateProduct: (id: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (
    productId: string,
    type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT',
    qty: number,
    location: 'Factory' | 'Office',
    targetLocation?: 'Factory' | 'Office',
    reason?: string
  ) => void;

  // Supply Chain & Purchase
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNo'>) => PurchaseOrder;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  receivePurchaseOrder: (poId: string, receivedItems?: { productId: string; receivedQty: number }[]) => void;
  payPurchaseOrder: (poId: string, amount: number, paymentAccount?: any, paymentMethod?: any) => void;
  paySupplierDue: (supplierId: string, amount: number, account?: any, targetPoId?: string) => void;
  paySupplier: (supplierId: string, amount: number, account?: any, targetPoId?: string) => void;

  // Customers & Suppliers
  addCustomer: (cust: Omit<Customer, 'id' | 'totalPurchased' | 'dueAmount' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addSupplier: (sup: Omit<Supplier, 'id' | 'totalPurchased' | 'dueAmount'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Accounting & COA & Expense Heads
  chartOfAccounts: ChartOfAccount[];
  addChartOfAccount: (account: Omit<ChartOfAccount, 'id' | 'currentBalance'>) => ChartOfAccount;
  updateChartOfAccount: (id: string, updates: Partial<ChartOfAccount>) => void;
  deleteChartOfAccount: (id: string) => { success: boolean; message?: string };
  expenseHeads: ExpenseHead[];
  addExpenseHead: (head: Omit<ExpenseHead, 'id'>) => ExpenseHead;
  updateExpenseHead: (id: string, updates: Partial<ExpenseHead>) => void;
  deleteExpenseHead: (id: string) => { success: boolean; message?: string };
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryNo'>) => JournalEntry;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  addTransaction: (tx: Omit<AccountingTransaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<AccountingTransaction>) => void;
  deleteTransaction: (id: string) => void;

  // Utilities & Module Data Cleanup
  cleanModuleData: (moduleKey: 'SALES' | 'QUOTATIONS' | 'PURCHASES' | 'INVENTORY_STOCK' | 'CUSTOM_PRODUCTS' | 'TRANSACTIONS' | 'JOURNALS' | 'AUDIT_LOGS' | 'ALL' | 'WIPE_ALL_EXCEPT_PRODUCTS') => void;
  resetToDefaultData: () => void;
  exportDatabase: () => string;
  importDatabase: (jsonString: string) => boolean;

  // Cloud & MongoDB Synchronization
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  isCloudConnected: boolean;
  lastSyncedAt: string | null;
  syncWithCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateUniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${Math.floor(100 + Math.random() * 900)}`;

const ensureUniqueTransactions = (list: AccountingTransaction[]): AccountingTransaction[] => {
  const seenIds = new Set<string>();
  return list.map((tx, idx) => {
    if (!tx.id || seenIds.has(tx.id)) {
      const uniqueId = `tx-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
      seenIds.add(uniqueId);
      return { ...tx, id: uniqueId };
    }
    seenIds.add(tx.id);
    return tx;
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Safe LocalStorage parsing helper
  const safeGetLocalStorage = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      if (parsed === null || parsed === undefined) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed;
    } catch {
      return fallback;
    }
  };

  const [profile, setProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_PROFILE`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (
            parsed.logoUrl &&
            (parsed.logoUrl.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALL') ||
             parsed.logoUrl.includes('ALLCAYAAACHp'))
          ) {
            parsed.logoUrl = '/dotcolor-logo.svg';
          }
          if (parsed.name === 'DotColorCommunication Sales, POS & ERP' || parsed.name === 'Dot Color') {
            parsed.name = 'Dot Color Communication';
          }
          if (parsed.footerBrandText === 'DotColorCommunication Sales, POS & ERP') {
            parsed.footerBrandText = 'Dot Color Communication';
          }
          if (!parsed.officeAddress || parsed.officeAddress.includes('South Noya Para')) {
            parsed.officeAddress = 'Nazir Ahmed Chowdhury Road Raja Pukur By lane, G A Bhaban Mat, Chattogram, Bangladesh.';
          }
          if (!parsed.phone || parsed.phone.includes('01846100900')) {
            parsed.phone = '01730581687';
          }
          if (!parsed.emails || (parsed.emails.length === 1 && parsed.emails[0] === 'info@dotcolorcommunication.com')) {
            parsed.emails = ['info.dotcolor@gmail.com'];
          }
          return {
            ...INITIAL_COMPANY_PROFILE,
            ...parsed,
            servicesCapabilities:
              Array.isArray(parsed?.servicesCapabilities) && parsed.servicesCapabilities.length > 0
                ? parsed.servicesCapabilities
                : INITIAL_COMPANY_PROFILE.servicesCapabilities,
            customPremises: Array.isArray(parsed?.customPremises) ? parsed.customPremises : [],
          };
        }
      }
      return INITIAL_COMPANY_PROFILE;
    } catch {
      return INITIAL_COMPANY_PROFILE;
    }
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    return safeGetLocalStorage<ProductItem[]>(`${STORAGE_KEY}_PRODUCTS`, INITIAL_PRODUCTS);
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    return safeGetLocalStorage<Customer[]>(`${STORAGE_KEY}_CUSTOMERS`, INITIAL_CUSTOMERS);
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const list = safeGetLocalStorage<Supplier[]>(`${STORAGE_KEY}_SUPPLIERS`, INITIAL_SUPPLIERS);
    return list.map((s: any) => ({
      ...s,
      balancePayable: s.balancePayable ?? s.dueAmount ?? 0,
      dueAmount: s.dueAmount ?? s.balancePayable ?? 0,
    }));
  });

  const [invoices, setInvoices] = useState<SalesInvoice[]>(() => {
    return safeGetLocalStorage<SalesInvoice[]>(`${STORAGE_KEY}_INVOICES`, INITIAL_INVOICES);
  });

  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    return safeGetLocalStorage<Quotation[]>(`${STORAGE_KEY}_QUOTATIONS`, INITIAL_QUOTATIONS);
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const list = safeGetLocalStorage<PurchaseOrder[]>(`${STORAGE_KEY}_PURCHASE_ORDERS`, INITIAL_PURCHASE_ORDERS);
    return list.map((po: any) => {
      const num = po.poNumber || po.poNo || 'DCC-PO';
      const dest = po.destinationLocation || po.destination || 'Factory';
      const total = po.grandTotal ?? po.totalAmount ?? 0;
      return {
        ...po,
        poNo: num,
        poNumber: num,
        destination: dest,
        destinationLocation: dest,
        grandTotal: total,
        totalAmount: total,
        subtotal: po.subtotal ?? total,
        paymentStatus:
          po.status !== 'Received'
            ? 'Pending'
            : (po.paymentStatus && po.paymentStatus !== 'Pending' ? po.paymentStatus : (po.dueAmount <= 0 ? 'Paid' : po.paidAmount > 0 ? 'Partial' : 'Due')),
      };
    });
  });

  const [transactions, setTransactions] = useState<AccountingTransaction[]>(() => {
    const list = safeGetLocalStorage<AccountingTransaction[]>(`${STORAGE_KEY}_TRANSACTIONS`, INITIAL_TRANSACTIONS);
    return ensureUniqueTransactions(list);
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    return safeGetLocalStorage<StockMovement[]>(`${STORAGE_KEY}_STOCK_MOVEMENTS`, INITIAL_STOCK_MOVEMENTS);
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_LANG`);
    return saved === 'bn' ? 'bn' : 'en';
  });

  const [activeLocation, setActiveLocation] = useState<'All' | 'Factory' | 'Office'>('All');

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    return safeGetLocalStorage<AuditLogEntry[]>(`${STORAGE_KEY}_AUDIT_LOGS`, INITIAL_AUDIT_LOGS);
  });

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    const list = safeGetLocalStorage<StaffMember[]>(`${STORAGE_KEY}_STAFF`, INITIAL_STAFF_MEMBERS);
    return list.map((s) => {
      if (s.id === 'staff-01' || (s.name && s.name.includes('Javed'))) {
        return { ...s, name: 'Md. Ali Jowel', nameBn: 'মোঃ আলী জয়েল' };
      }
      return s;
    });
  });

  const [userRoles, setUserRoles] = useState<UserRole[]>(() => {
    return safeGetLocalStorage<UserRole[]>(`${STORAGE_KEY}_ROLES`, INITIAL_USER_ROLES);
  });

  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() => {
    return safeGetLocalStorage<ChartOfAccount[]>(`${STORAGE_KEY}_COA`, INITIAL_CHART_OF_ACCOUNTS);
  });

  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>(() => {
    return safeGetLocalStorage<ExpenseHead[]>(`${STORAGE_KEY}_EXPENSE_HEADS`, INITIAL_EXPENSE_HEADS);
  });

  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => {
    return safeGetLocalStorage<ProductCategory[]>(`${STORAGE_KEY}_CATEGORIES`, INITIAL_PRODUCT_CATEGORIES);
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    return safeGetLocalStorage<JournalEntry[]>(`${STORAGE_KEY}_JOURNALS`, INITIAL_JOURNAL_ENTRIES);
  });

  const [activeStaff, setActiveStaff] = useState<StaffMember>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_ACTIVE_STAFF`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const found = INITIAL_STAFF_MEMBERS.find((s) => s.id === parsed.id);
          if (found) return found;
        }
      }
    } catch {}
    return INITIAL_STAFF_MEMBERS[1]; // Default to Tanvir Ahmed (Senior Accountant)
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_IS_AUTHENTICATED`);
    return saved === 'true';
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_PROFILE`, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_PRODUCTS`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_CUSTOMERS`, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_SUPPLIERS`, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_INVOICES`, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_QUOTATIONS`, JSON.stringify(quotations));
  }, [quotations]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_PURCHASE_ORDERS`, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_TRANSACTIONS`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_STOCK_MOVEMENTS`, JSON.stringify(stockMovements));
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_LANG`, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_AUDIT_LOGS`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_STAFF`, JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_ROLES`, JSON.stringify(userRoles));
  }, [userRoles]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_COA`, JSON.stringify(chartOfAccounts));
  }, [chartOfAccounts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_EXPENSE_HEADS`, JSON.stringify(expenseHeads));
  }, [expenseHeads]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_CATEGORIES`, JSON.stringify(productCategories));
  }, [productCategories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_JOURNALS`, JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_ACTIVE_STAFF`, JSON.stringify(activeStaff));
  }, [activeStaff]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_IS_AUTHENTICATED`, String(isAuthenticated));
  }, [isAuthenticated]);

  const login = (staffId: string, passcode: string): { success: boolean; message: string } => {
    const staff = staffMembers.find((s) => s.id === staffId);
    if (!staff) {
      return { success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি (User not found)' };
    }
    
    if (staff.isActive === false) {
      return { success: false, message: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে (This account is deactivated)' };
    }

    const correctPassword = staff.password || '1234';
    if (passcode === correctPassword) {
      setActiveStaff(staff);
      setIsAuthenticated(true);
      
      addAuditLog({
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        actionType: 'PROFILE_UPDATED',
        entityType: 'System',
        details: `${staff.name} logged in successfully`,
        detailsBn: `${staff.name} সফলভাবে লগইন করেছেন`,
        location: staff.location === 'Both' ? 'Office' : staff.location,
      });

      return { success: true, message: 'সফলভাবে লগইন হয়েছে (Login successful)' };
    } else {
      return { success: false, message: 'ভুল পাসওয়ার্ড (Incorrect password)' };
    }
  };

  const logout = () => {
    const prevStaff = activeStaff;
    setIsAuthenticated(false);

    try {
      if (typeof window !== 'undefined' && window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}

    if (prevStaff?.id) {
      addAuditLog({
        staffId: prevStaff.id,
        staffName: prevStaff.name || 'User',
        staffRole: prevStaff.role || 'Staff',
        actionType: 'PROFILE_UPDATED',
        entityType: 'System',
        details: `${prevStaff.name || 'User'} logged out`,
        detailsBn: `${prevStaff.name || 'ব্যবহারকারী'} লগআউট করেছেন`,
        location: prevStaff.location === 'Both' ? 'Office' : (prevStaff.location || 'Office'),
      });
    }
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => {
    const now = new Date();
    const formattedTime =
      entry.timestamp ||
      `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: formattedTime,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const updateProfile = (updates: Partial<CompanyProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  // Add Sales Invoice
  const addInvoice = (data: Omit<SalesInvoice, 'id' | 'invoiceNo'>): SalesInvoice => {
    const id = `inv-${Date.now()}`;
    const invoiceNo = `DCC-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice: SalesInvoice = {
      ...data,
      id,
      invoiceNo,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // Update Customer safely
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === data.customerId || (Boolean(data.customerPhone) && c.phone === data.customerPhone)) {
          return {
            ...c,
            totalPurchased: (c.totalPurchased || 0) + (Number(data.grandTotal) || 0),
            dueAmount: (c.dueAmount || 0) + (Number(data.dueAmount) || 0),
          };
        }
        return c;
      })
    );

    // If paid amount > 0, record accounting entry
    if (data.splitPayments) {
      const txs: AccountingTransaction[] = [];
      const cashAcct = data.warehouseLocation === 'Factory' ? 'Factory Cash' : 'Office Cash';

      if (data.splitPayments.cash > 0) {
        txs.push({
          id: generateUniqueId('tx'),
          date: data.date,
          type: 'INCOME',
          category: 'Sales Revenue',
          amount: data.splitPayments.cash,
          paymentAccount: cashAcct,
          refNo: invoiceNo,
          customerOrSupplier: data.customerName,
          description: `POS Payment: Cash (${data.paymentStatus}) - ${(data.items || []).map((i) => i.name).join(', ')}`,
        });
      }
      if (data.splitPayments.card > 0) {
        txs.push({
          id: generateUniqueId('tx'),
          date: data.date,
          type: 'INCOME',
          category: 'Sales Revenue',
          amount: data.splitPayments.card,
          paymentAccount: 'BRAC Bank',
          refNo: invoiceNo,
          customerOrSupplier: data.customerName,
          description: `POS Payment: Card (${data.paymentStatus}) - ${(data.items || []).map((i) => i.name).join(', ')}`,
        });
      }
      if (data.splitPayments.bkash > 0) {
        txs.push({
          id: generateUniqueId('tx'),
          date: data.date,
          type: 'INCOME',
          category: 'Sales Revenue',
          amount: data.splitPayments.bkash,
          paymentAccount: 'bKash / Nagad',
          refNo: invoiceNo,
          customerOrSupplier: data.customerName,
          description: `POS Payment: bKash (${data.paymentStatus}) - ${(data.items || []).map((i) => i.name).join(', ')}`,
        });
      }
      if (data.splitPayments.nagad > 0) {
        txs.push({
          id: generateUniqueId('tx'),
          date: data.date,
          type: 'INCOME',
          category: 'Sales Revenue',
          amount: data.splitPayments.nagad,
          paymentAccount: 'bKash / Nagad',
          refNo: invoiceNo,
          customerOrSupplier: data.customerName,
          description: `POS Payment: Nagad (${data.paymentStatus}) - ${(data.items || []).map((i) => i.name).join(', ')}`,
        });
      }

      if (txs.length > 0) {
        setTransactions((prev) => ensureUniqueTransactions([...txs, ...prev]));
      }
    } else if (data.paidAmount > 0) {
      const accountMap: Record<string, AccountingTransaction['paymentAccount']> = {
        'Cash': data.warehouseLocation === 'Factory' ? 'Factory Cash' : 'Office Cash',
        'bKash / Nagad': 'bKash / Nagad',
        'Bank Transfer': 'BRAC Bank',
        'Cheque': 'BRAC Bank',
      };
      const newTx: AccountingTransaction = {
        id: generateUniqueId('tx'),
        date: data.date,
        type: 'INCOME',
        category: 'Sales Revenue',
        amount: data.paidAmount,
        paymentAccount: accountMap[data.paymentMethod] || 'Office Cash',
        refNo: invoiceNo,
        customerOrSupplier: data.customerName,
        description: `Sales Invoice payment (${data.paymentStatus}) - ${(data.items || []).map((i) => i.name).join(', ')}`,
      };
      setTransactions((prev) => ensureUniqueTransactions([newTx, ...prev]));
    }

    // Decrement stock for physical items
    if (data.items && data.items.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = data.items.find((i) => i.productId === p.id);
          if (item) {
            const locKey = data.warehouseLocation === 'Factory' ? 'stockFactory' : 'stockOffice';
            const currentStock = p[locKey] !== undefined ? p[locKey] : 0;
            const newStock = Math.max(0, currentStock - (item.qty || 0));
            return { ...p, [locKey]: newStock };
          }
          return p;
        })
      );

      const newMovements: StockMovement[] = data.items.map((item, idx) => ({
        id: generateUniqueId(`sm-${idx}-${item.productId}`),
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        productId: item.productId,
        productName: item.name,
        type: 'OUT',
        qty: item.qty,
        unit: item.unit,
        sourceLocation: data.warehouseLocation,
        refNo: invoiceNo,
        reason: `Sales Invoice to ${data.customerName}`,
      }));
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // Record audit log entry
    try {
      addAuditLog({
        staffId: activeStaff?.id || 'staff-admin',
        staffName: activeStaff?.name || 'Staff',
        staffRole: activeStaff?.role || 'Managing Director',
        location: data.warehouseLocation === 'Factory' ? 'Factory' : 'Office',
        actionType: 'INVOICE_CREATED',
        entityType: 'POS',
        refNo: invoiceNo,
        details: `Issued sales invoice ${invoiceNo} for ${data.customerName || 'Walk-in Customer'} - Total: ৳${(Number(data.grandTotal) || 0).toLocaleString()} (Paid: ৳${(Number(data.paidAmount) || 0).toLocaleString()})`,
        detailsBn: `${data.customerName || 'কাস্টমার'} এর জন্য বিক্রয় ইনভয়েস ${invoiceNo} তৈরি (মোট: ৳${(Number(data.grandTotal) || 0).toLocaleString()}, পরিশোধ: ৳${(Number(data.paidAmount) || 0).toLocaleString()})`,
        amount: Number(data.grandTotal) || 0,
        severity: 'info',
      });
    } catch (e) {
      console.warn('Audit log write skipped:', e);
    }

    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<SalesInvoice>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)));
  };

  const collectInvoicePayment = (invoiceId: string, amount: number, method: any) => {
    const targetInv = invoices.find((i) => i.id === invoiceId);
    if (!targetInv) return;

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'PAYMENT_COLLECTED',
      entityType: 'Sales',
      refNo: targetInv.invoiceNo,
      details: `Collected payment of ৳${amount.toLocaleString()} via ${method} for invoice ${targetInv.invoiceNo} (${targetInv.customerName})`,
      detailsBn: `ইনভয়েস ${targetInv.invoiceNo} এর জন্য ${method} মাধ্যমে ৳${amount.toLocaleString()} আদায় করা হয়েছে (${targetInv.customerName})`,
      amount: amount,
      severity: 'success',
    });

    const newPaid = targetInv.paidAmount + amount;
    const newDue = Math.max(0, targetInv.grandTotal - newPaid);
    const newStatus = newDue <= 0 ? 'Paid' : 'Partial';

    // Update invoice
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              paidAmount: newPaid,
              dueAmount: newDue,
              paymentStatus: newStatus,
            }
          : inv
      )
    );

    // Update customer due
    if (targetInv.customerId) {
      setCustomers((custs) =>
        custs.map((c) => (c.id === targetInv.customerId ? { ...c, dueAmount: Math.max(0, c.dueAmount - amount) } : c))
      );
    }

    // Add transaction with guaranteed unique ID
    const newTx: AccountingTransaction = {
      id: generateUniqueId('tx'),
      date: new Date().toISOString().slice(0, 10),
      type: 'INCOME',
      category: 'Client Due Collection',
      amount: amount,
      paymentAccount: method === 'Cash' ? 'Office Cash' : method === 'Bank Transfer' ? 'BRAC Bank' : 'bKash / Nagad',
      refNo: targetInv.invoiceNo,
      customerOrSupplier: targetInv.customerName,
      description: `Due collection against invoice ${targetInv.invoiceNo}`,
    };
    setTransactions((txs) => ensureUniqueTransactions([newTx, ...txs]));
  };

  const updateProductionStatus = (invoiceId: string, status: any) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, productionStatus: status } : inv)));
  };

  // Quotations
  const addQuotation = (data: Omit<Quotation, 'id' | 'quoteNo'>): Quotation => {
    const id = `qt-${Date.now()}`;
    const quoteNo = `DCC-EST-${new Date().getFullYear()}-${Math.floor(2000 + Math.random() * 8000)}`;
    const newQuote: Quotation = {
      ...data,
      id,
      quoteNo,
    };
    setQuotations((prev) => [newQuote, ...prev]);
    return newQuote;
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateQuotationStatus = (id: string, status: Quotation['status']) => {
    setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
  };

  const convertQuotationToInvoice = (quotationId: string): SalesInvoice | null => {
    const q = quotations.find((quote) => quote.id === quotationId);
    if (!q) return null;

    let cust = customers.find(
      (c) =>
        ((c.name || '').toLowerCase() === (q.customerName || '').toLowerCase() && q.customerName) ||
        (q.customerPhone && c.phone === q.customerPhone)
    );
    let custId = cust?.id;
    if (!custId) {
      custId = `cust-${Date.now()}`;
      const newCust: Customer = {
        id: custId,
        name: q.customerName,
        phone: q.customerPhone,
        company: q.customerCompany || '',
        totalPurchased: 0,
        dueAmount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setCustomers((prev) => [...prev, newCust]);
    }

    const created = addInvoice({
      date: new Date().toISOString().slice(0, 10),
      referenceNo: q.referenceNo,
      customerId: custId,
      customerName: q.customerName,
      customerPhone: q.customerPhone,
      items: q.items,
      subtotal: q.subtotal,
      discount: q.discount,
      discountType: q.discountType || 'amount',
      discountValue: q.discountValue || q.discount,
      vatRate: q.vatRate,
      vatAmount: q.vatAmount !== undefined ? q.vatAmount : Math.round((q.subtotal - q.discount) * (q.vatRate / 100)),
      vatType: q.vatType || 'percent',
      vatValue: q.vatValue !== undefined ? q.vatValue : q.vatRate,
      grandTotal: q.grandTotal,
      paidAmount: 0,
      dueAmount: q.grandTotal,
      paymentMethod: 'Cash',
      paymentStatus: 'Due',
      productionStatus: 'Queued',
      warehouseLocation: 'Factory',
      notes: `Generated from Quotation #${q.quoteNo}. ${q.notes || ''}`,
    });

    updateQuotation(quotationId, { status: 'Approved', isConverted: true });
    return created;
  };

  // Products & Stock
  const addProduct = (data: Omit<ProductItem, 'id' | 'code'>) => {
    const codePrefix = (data.category || 'GEN').slice(0, 3).toUpperCase();
    const code = `${codePrefix}-${Math.floor(100 + Math.random() * 900)}`;
    const newProd: ProductItem = {
      ...data,
      id: `prod-${Date.now()}`,
      code,
    };
    setProducts((prev) => [newProd, ...prev]);
  };

  const bulkImportProducts = (
    items: Array<Omit<ProductItem, 'id'> & { id?: string }>,
    options: { updateExisting?: boolean } = { updateExisting: true }
  ): { added: number; updated: number } => {
    const shouldUpdate = options.updateExisting !== false;
    let addedCount = 0;
    let updatedCount = 0;

    setProducts((prev) => {
      const updatedList = [...prev];
      const timestamp = Date.now();

      items.forEach((item, index) => {
        // Find if item already exists by id, code or name
        const existingIdx = updatedList.findIndex((p) => {
          if (item.id && p.id === item.id) return true;
          if (item.code && p.code && p.code.trim().toLowerCase() === item.code.trim().toLowerCase()) return true;
          if (item.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase()) return true;
          return false;
        });

        if (existingIdx !== -1 && shouldUpdate) {
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            ...item,
            id: updatedList[existingIdx].id,
            code: item.code || updatedList[existingIdx].code,
          };
          updatedCount++;
        } else if (existingIdx === -1) {
          const codePrefix = (item.category || 'GEN').slice(0, 3).toUpperCase();
          const generatedCode = item.code || `${codePrefix}-${Math.floor(100 + Math.random() * 900)}`;
          const newProd: ProductItem = {
            id: item.id || `prod-${timestamp}-${index}-${Math.floor(10 + Math.random() * 90)}`,
            code: generatedCode,
            name: item.name,
            nameBn: item.nameBn || '',
            category: item.category || 'DIGITAL PRINTING',
            isRawMaterial: Boolean(item.isRawMaterial),
            unit: item.unit || 'pcs',
            unitPrice: item.unitPrice || 0,
            costPrice: item.costPrice || 0,
            stockFactory: item.stockFactory || 0,
            stockOffice: item.stockOffice || 0,
            minStockAlert: item.minStockAlert ?? 5,
            description: item.description || '',
          };
          updatedList.unshift(newProd);
          addedCount++;
        }
      });

      return updatedList;
    });

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'All',
      actionType: 'BULK_PRODUCTS_IMPORTED',
      entityType: 'Inventory',
      refNo: `CSV-${Date.now().toString().slice(-4)}`,
      details: `Bulk imported ${addedCount + updatedCount} products (${addedCount} new items, ${updatedCount} updated)`,
      detailsBn: `সিএসভি ফাইলের মাধ্যমে ${addedCount + updatedCount}টি পণ্য বাল্ক আমদানি সম্পন্ন (${addedCount}টি নতুন যোগ, ${updatedCount}টি আপডেট)`,
      severity: 'info',
    });

    return { added: addedCount, updated: updatedCount };
  };

  const updateProduct = (id: string, updates: Partial<ProductItem>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustStock = (
    productId: string,
    type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT',
    qty: number,
    location: 'Factory' | 'Office',
    targetLocation?: 'Factory' | 'Office',
    reason: string = 'Stock manual entry'
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        if (type === 'IN') {
          return location === 'Factory'
            ? { ...p, stockFactory: p.stockFactory + qty }
            : { ...p, stockOffice: p.stockOffice + qty };
        } else if (type === 'OUT' || type === 'ADJUSTMENT') {
          return location === 'Factory'
            ? { ...p, stockFactory: Math.max(0, p.stockFactory - qty) }
            : { ...p, stockOffice: Math.max(0, p.stockOffice - qty) };
        } else if (type === 'TRANSFER' && targetLocation) {
          const fromKey = location === 'Factory' ? 'stockFactory' : 'stockOffice';
          const toKey = targetLocation === 'Factory' ? 'stockFactory' : 'stockOffice';
          return {
            ...p,
            [fromKey]: Math.max(0, p[fromKey] - qty),
            [toKey]: p[toKey] + qty,
          };
        }
        return p;
      })
    );

    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      productId,
      productName: prod.name,
      type,
      qty,
      unit: prod.unit,
      sourceLocation: location,
      targetLocation: targetLocation,
      refNo: `ADJ-${Date.now().toString().slice(-4)}`,
      reason,
    };
    setStockMovements((prev) => [movement, ...prev]);

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: location,
      actionType: type === 'TRANSFER' ? 'STOCK_TRANSFERRED' : 'STOCK_ADJUSTED',
      entityType: 'Inventory',
      refNo: movement.refNo,
      details: `${type} ${qty} ${prod.unit} of ${prod.name} at ${location}${targetLocation ? ` -> ${targetLocation}` : ''} (${reason})`,
      detailsBn: `${prod.name} এর ${qty} ${prod.unit} স্টক ${type === 'TRANSFER' ? 'স্থানান্তর' : 'অ্যাডজাস্ট'} সম্পন্ন (${location})`,
      severity: 'info',
    });
  };

  // Supply Chain & Purchase Orders
  const addPurchaseOrder = (data: Omit<PurchaseOrder, 'id' | 'poNo'>): PurchaseOrder => {
    const id = `po-${Date.now()}`;
    const poNo = `DCC-PO-${new Date().getFullYear()}-${Math.floor(5000 + Math.random() * 5000)}`;
    const total = data.grandTotal ?? data.totalAmount ?? 0;
    const dest = data.destination || data.destinationLocation || 'Factory';
    const newPO: PurchaseOrder = {
      ...data,
      id,
      poNo,
      poNumber: poNo,
      destination: dest,
      destinationLocation: dest,
      totalAmount: total,
      grandTotal: total,
      subtotal: data.subtotal ?? total,
      paymentStatus:
        data.status !== 'Received'
          ? 'Pending'
          : (data.paymentStatus || (data.dueAmount <= 0 ? 'Paid' : data.paidAmount > 0 ? 'Partial' : 'Due')),
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Only update Supplier balance if goods are already received upon creation
    if (data.status === 'Received') {
      setSuppliers((prev) =>
        prev.map((s) => {
          const sName = s.name?.toLowerCase().trim();
          const sCompany = s.company?.toLowerCase().trim();
          const supNameData = data.supplierName?.toLowerCase().trim();
          const sPhoneClean = s.phone ? s.phone.replace(/\D/g, '') : '';
          const dataPhoneClean = data.supplierPhone ? data.supplierPhone.replace(/\D/g, '') : '';

          const matches =
            (data.supplierId && s.id === data.supplierId) ||
            (supNameData && sName && (sName === supNameData || sName.includes(supNameData) || supNameData.includes(sName))) ||
            (supNameData && sCompany && (sCompany === supNameData || sCompany.includes(supNameData) || supNameData.includes(sCompany))) ||
            (dataPhoneClean && sPhoneClean && dataPhoneClean === sPhoneClean);

          if (matches) {
            const prevPurchased = Number(s.totalPurchased) || 0;
            const prevDue = Number(s.dueAmount ?? s.balancePayable ?? 0);
            const newDue = prevDue + (Number(data.dueAmount) || 0);
            return {
              ...s,
              totalPurchased: prevPurchased + (Number(data.totalAmount ?? data.grandTotal) || 0),
              dueAmount: newDue,
              balancePayable: newDue,
            };
          }
          return s;
        })
      );
    }

    // If paid amount > 0, record accounting transaction
    if (data.paidAmount > 0) {
      const newTx: AccountingTransaction = {
        id: generateUniqueId('tx'),
        date: data.date,
        type: 'EXPENSE',
        category: 'Raw Material Purchase',
        amount: data.paidAmount,
        paymentAccount: data.destination === 'Factory' ? 'BRAC Bank' : 'Office Cash',
        refNo: poNo,
        customerOrSupplier: data.supplierName,
        description: `Payment for Purchase Order ${poNo} - ${data.items.map((i) => i.name).join(', ')}`,
      };
      setTransactions((prev) => ensureUniqueTransactions([newTx, ...prev]));
    }

    // Auto receive stock if marked Received
    if (data.status === 'Received' && data.items.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = data.items.find((i) => i.productId === p.id);
          if (item) {
            const locKey = data.destination === 'Factory' ? 'stockFactory' : 'stockOffice';
            return { ...p, [locKey]: p[locKey] + item.qty };
          }
          return p;
        })
      );

      const movements: StockMovement[] = data.items.map((item, idx) => ({
        id: generateUniqueId(`sm-${idx}-${item.productId}`),
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        productId: item.productId,
        productName: item.name,
        type: 'IN',
        qty: item.qty,
        unit: item.unit,
        targetLocation: data.destination,
        refNo: poNo,
        reason: `PO Received from ${data.supplierName}`,
      }));
      setStockMovements((prev) => [...movements, ...prev]);
    }

    return newPO;
  };

  const receivePurchaseOrder = (poId: string, receivedItems?: { productId: string; receivedQty: number }[]) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status === 'Received') return;

    let updatedItems = [...po.items];
    let newSubtotal = po.subtotal || po.totalAmount;
    
    if (receivedItems && receivedItems.length > 0) {
      newSubtotal = 0;
      updatedItems = po.items.map(item => {
        const recItem = receivedItems.find(ri => ri.productId === item.productId);
        const rQty = recItem ? recItem.receivedQty : item.qty;
        const newTotal = rQty * item.unitCost;
        newSubtotal += newTotal;
        return {
          ...item,
          receivedQty: rQty,
          totalCost: newTotal,
        };
      });
    }

    const newDue = Math.max(0, newSubtotal - po.paidAmount);
    const newPaymentStatus = newDue <= 0 ? 'Paid' : (po.paidAmount > 0 ? 'Partial' : 'Due');

    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === poId ? {
        ...p,
        status: 'Received',
        items: updatedItems,
        subtotal: newSubtotal,
        totalAmount: newSubtotal,
        grandTotal: newSubtotal,
        dueAmount: newDue,
        paymentStatus: newPaymentStatus
      } : p))
    );

    // Update supplier due amount and total purchased when goods are received
    setSuppliers((prev) =>
      prev.map((s) => {
        const sName = s.name?.toLowerCase().trim();
        const sCompany = s.company?.toLowerCase().trim();
        const supNameData = po.supplierName?.toLowerCase().trim();
        const sPhoneClean = s.phone ? s.phone.replace(/\D/g, '') : '';
        const dataPhoneClean = po.supplierPhone ? po.supplierPhone.replace(/\D/g, '') : '';

        const matches =
          (po.supplierId && s.id === po.supplierId) ||
          (supNameData && sName && (sName === supNameData || sName.includes(supNameData) || supNameData.includes(sName))) ||
          (supNameData && sCompany && (sCompany === supNameData || sCompany.includes(supNameData) || supNameData.includes(sCompany))) ||
          (dataPhoneClean && sPhoneClean && dataPhoneClean === sPhoneClean);

        if (matches) {
          const prevPurchased = Number(s.totalPurchased) || 0;
          const prevDue = Number(s.dueAmount ?? s.balancePayable ?? 0);
          const newTotalDue = prevDue + newDue;
          return {
            ...s,
            totalPurchased: prevPurchased + newSubtotal,
            dueAmount: newTotalDue,
            balancePayable: newTotalDue,
          };
        }
        return s;
      })
    );

    if (updatedItems.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = updatedItems.find((i) => i.productId === p.id);
          if (item) {
            const rQty = item.receivedQty !== undefined ? item.receivedQty : item.qty;
            const locKey = po.destination === 'Factory' ? 'stockFactory' : 'stockOffice';
            return { ...p, [locKey]: p[locKey] + rQty };
          }
          return p;
        })
      );

      const movements: StockMovement[] = updatedItems.map((item, idx) => {
        const rQty = item.receivedQty !== undefined ? item.receivedQty : item.qty;
        return {
          id: generateUniqueId(`sm-${idx}-${item.productId}`),
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          productId: item.productId,
          productName: item.name,
          type: 'IN',
          qty: rQty,
          unit: item.unit,
          targetLocation: po.destination,
          refNo: po.poNo,
          reason: `PO marked received from ${po.supplierName}`,
        };
      });
      setStockMovements((prev) => [...movements, ...prev]);
    }

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: po.destination === 'Factory' ? 'Factory' : 'Office',
      actionType: 'PO_RECEIVED',
      entityType: 'Supply Chain',
      refNo: po.poNo,
      details: `Received material delivery for PO ${po.poNo} from ${po.supplierName} (Total: ৳${(po.grandTotal || po.totalAmount || 0).toLocaleString()})`,
      detailsBn: `সাপ্লায়ার ${po.supplierName} থেকে পারচেস অর্ডার ${po.poNo} এর মালামাল বুঝে নেওয়া হয়েছে`,
      amount: po.grandTotal || po.totalAmount || 0,
      severity: 'info',
    });
  };

  const payPurchaseOrder = (
    poId: string,
    amount: number,
    paymentAccount: any = 'BRAC Bank',
    paymentMethod: any = 'Bank Transfer'
  ) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) return;

    const currentGrandTotal = po.grandTotal ?? po.totalAmount ?? 0;
    const currentPaid = po.paidAmount || 0;
    const newPaid = Math.min(currentGrandTotal, currentPaid + safeAmount);
    const newDue = Math.max(0, currentGrandTotal - newPaid);
    const newStatus: 'Paid' | 'Partial' | 'Due' = newDue <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Due';

    // 1. Update the Purchase Order
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? {
              ...p,
              paidAmount: newPaid,
              dueAmount: newDue,
              paymentStatus: newStatus,
              paymentMethod: paymentMethod || p.paymentMethod || 'Bank Transfer',
            }
          : p
      )
    );

    // 2. Also reduce the Supplier's due amount / balance payable
    const poSupName = po.supplierName?.toLowerCase().trim();
    setSuppliers((prev) =>
      prev.map((s) => {
        const sName = s.name?.toLowerCase().trim();
        const sCompany = s.company?.toLowerCase().trim();
        const matches =
          (po.supplierId && s.id === po.supplierId) ||
          (poSupName && sName && sName === poSupName) ||
          (poSupName && sCompany && sCompany === poSupName);

        if (matches) {
          const currentSupDue = Number(s.dueAmount ?? s.balancePayable ?? 0);
          const updatedSupDue = Math.max(0, currentSupDue - safeAmount);
          return {
            ...s,
            dueAmount: updatedSupDue,
            balancePayable: updatedSupDue,
          };
        }
        return s;
      })
    );

    // 3. Add accounting transaction
    const newTx: AccountingTransaction = {
      id: generateUniqueId('tx'),
      date: new Date().toISOString().slice(0, 10),
      type: 'EXPENSE',
      category: 'Raw Materials / PO Payment',
      amount: safeAmount,
      paymentAccount: paymentAccount || (po.destination === 'Factory' ? 'BRAC Bank' : 'Office Cash'),
      refNo: po.poNo,
      customerOrSupplier: po.supplierName,
      description: `Payment for Purchase Order ${po.poNo} (${newStatus}) - Supplier: ${po.supplierName}`,
    };
    setTransactions((prev) => ensureUniqueTransactions([newTx, ...prev]));

    // 4. Audit log
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: po.destination === 'Factory' ? 'Factory' : 'Office',
      actionType: 'SUPPLIER_PAID',
      entityType: 'Supply Chain',
      refNo: po.poNo,
      details: `Paid ৳${safeAmount.toLocaleString()} for Purchase Order ${po.poNo} to ${po.supplierName}. Status: ${newStatus}`,
      detailsBn: `পারচেস অর্ডার ${po.poNo} এর জন্য ৳${safeAmount.toLocaleString()} পরিশোধ করা হয়েছে (পেমেন্ট স্ট্যাটাস: ${newStatus === 'Paid' ? 'পরিশোধিত (Paid)' : newStatus === 'Partial' ? 'আংশিক (Partial)' : 'বকেয়া (Due)'})`,
      amount: safeAmount,
      severity: 'success',
    });
  };

  const paySupplierDue = (supplierId: string, amount: number, account: any, targetPoId?: string) => {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) return;

    const sup = suppliers.find(
      (s) => s.id === supplierId || s.name.toLowerCase().trim() === supplierId.toLowerCase().trim()
    );
    const supName = sup?.name?.toLowerCase().trim();
    const supCompany = sup?.company?.toLowerCase().trim();
    const supPhone = sup?.phone ? sup.phone.replace(/\D/g, '') : '';
    const supId = sup?.id || supplierId;

    setSuppliers((prev) =>
      prev.map((s) => {
        const isThisSup =
          s.id === supplierId ||
          s.id === supId ||
          (supName && s.name.toLowerCase().trim() === supName) ||
          (supCompany && s.company?.toLowerCase().trim() === supCompany) ||
          (supPhone && s.phone && s.phone.replace(/\D/g, '') === supPhone);
        if (isThisSup) {
          const currentDue = Number(s.dueAmount ?? s.balancePayable ?? 0);
          const newDue = Math.max(0, currentDue - safeAmount);
          return { ...s, dueAmount: newDue, balancePayable: newDue };
        }
        return s;
      })
    );

    // Update POs for this supplier so PO statuses & action buttons sync immediately with payment
    setPurchaseOrders((prev) => {
      let remaining = safeAmount;
      return prev.map((p) => {
        const isTarget = targetPoId && targetPoId !== 'all' ? p.id === targetPoId : true;
        const pSuppName = (p.supplierName || '').toLowerCase().trim();
        const pSuppPhone = (p.supplierPhone || '').replace(/\D/g, '');
        const matchesSupplier =
          (targetPoId && targetPoId !== 'all' && p.id === targetPoId) ||
          p.supplierId === supplierId ||
          p.supplierId === supId ||
          (supName && pSuppName === supName) ||
          (supName && (pSuppName.includes(supName) || supName.includes(pSuppName))) ||
          (supCompany && pSuppName === supCompany) ||
          (supCompany && (pSuppName.includes(supCompany) || supCompany.includes(pSuppName))) ||
          (supPhone && pSuppPhone && supPhone === pSuppPhone);

        const currentTotal = Number(p.grandTotal ?? p.totalAmount ?? 0);
        const currentPaid = Number(p.paidAmount || 0);
        const currentDue = p.dueAmount !== undefined ? Number(p.dueAmount) : Math.max(0, currentTotal - currentPaid);

        if (matchesSupplier && isTarget && (targetPoId && targetPoId !== 'all' ? true : p.status === 'Received') && currentDue > 0 && remaining > 0) {
          const payForThisPo = Math.min(currentDue, remaining);
          remaining -= payForThisPo;
          const newPaid = currentPaid + payForThisPo;
          const newDue = Math.max(0, currentTotal - newPaid);
          const newStatus: 'Paid' | 'Partial' | 'Due' =
            newDue <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Due';
          return {
            ...p,
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newStatus,
          };
        }
        return p;
      });
    });

    const newTx: AccountingTransaction = {
      id: generateUniqueId('tx'),
      date: new Date().toISOString().slice(0, 10),
      type: 'EXPENSE',
      category: 'Supplier Due Payment',
      amount: safeAmount,
      paymentAccount: account || 'BRAC Bank',
      customerOrSupplier: sup?.company || sup?.name || 'Vendor',
      description: `Payment to supplier ${sup?.name} for clearing dues`,
    };
    setTransactions((prev) => ensureUniqueTransactions([newTx, ...prev]));

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'SUPPLIER_PAID',
      entityType: 'Supply Chain',
      refNo: `SUP-PAY-${Date.now().toString().slice(-4)}`,
      details: `Paid supplier due of ৳${safeAmount.toLocaleString()} to ${sup?.company || sup?.name || 'Vendor'} via ${account || 'BRAC Bank'}`,
      detailsBn: `সাপ্লায়ার ${sup?.name || 'ভেন্ডর'} কে বকেয়া বাবদ ৳${safeAmount.toLocaleString()} পরিশোধ সম্পন্ন`,
      amount: safeAmount,
      severity: 'warning',
    });
  };

  // Customers & Suppliers
  const addCustomer = (cust: Omit<Customer, 'id' | 'totalPurchased' | 'dueAmount' | 'createdAt'>): Customer => {
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      totalPurchased: 0,
      dueAmount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCustomers((prev) => [newCust, ...prev]);
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addSupplier = (sup: Omit<Supplier, 'id' | 'totalPurchased' | 'dueAmount'>): Supplier => {
    const newSup: Supplier = {
      ...sup,
      id: `sup-${Date.now()}`,
      totalPurchased: 0,
      dueAmount: 0,
    };
    setSuppliers((prev) => [newSup, ...prev]);
    return newSup;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (cust) {
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'Office',
        actionType: 'CUSTOMER_CREATED',
        entityType: 'Sales',
        refNo: cust.code || cust.phone,
        details: `Deleted customer record: ${cust.name} (${cust.phone})`,
        detailsBn: `গ্রাহকের তথ্য মুছে ফেলা হয়েছে: ${cust.name}`,
        severity: 'warning',
      });
    }
  };

  const deleteSupplier = (id: string) => {
    const sup = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (sup) {
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'Factory',
        actionType: 'SUPPLIER_UPDATED',
        entityType: 'Supply Chain',
        refNo: sup.phone,
        details: `Deleted supplier record: ${sup.name}`,
        detailsBn: `সাপ্লায়ার রেকর্ড মুছে ফেলা হয়েছে: ${sup.name}`,
        severity: 'warning',
      });
    }
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === inv.customerId) {
          return {
            ...c,
            totalPurchased: Math.max(0, c.totalPurchased - inv.grandTotal),
            dueAmount: Math.max(0, c.dueAmount - inv.dueAmount),
          };
        }
        return c;
      })
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: inv.warehouseLocation || 'Office',
      actionType: 'INVOICE_UPDATED',
      entityType: 'Sales',
      refNo: inv.invoiceNo,
      details: `Deleted sales invoice ${inv.invoiceNo} (৳${inv.grandTotal.toLocaleString()}) for customer ${inv.customerName}`,
      detailsBn: `ইনভয়েস ${inv.invoiceNo} (৳${inv.grandTotal.toLocaleString()}) সফলভাবে মুছে ফেলা হয়েছে`,
      amount: inv.grandTotal,
      severity: 'warning',
    });
  };

  const deleteQuotation = (id: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  const deletePurchaseOrder = (id: string) => {
    const po = purchaseOrders.find((p) => p.id === id);
    if (!po) return;
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: po.destination || 'Factory',
      actionType: 'PO_CREATED',
      entityType: 'Supply Chain',
      refNo: po.poNo,
      details: `Deleted purchase order ${po.poNo} for supplier ${po.supplierName}`,
      detailsBn: `পারচেস অর্ডার ${po.poNo} মুছে ফেলা হয়েছে`,
      amount: po.totalAmount,
      severity: 'warning',
    });
  };

  const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Factory',
      actionType: 'PO_CREATED',
      entityType: 'Supply Chain',
      refNo: id,
      details: `Updated purchase order details`,
      detailsBn: `পারচেস অর্ডার আপডেট করা হয়েছে`,
      amount: updates.grandTotal || updates.totalAmount,
      severity: 'info',
    });
  };

  // Product Categories
  const addProductCategory = (cat: Omit<ProductCategory, 'id'>): ProductCategory => {
    const newCat: ProductCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
    };
    setProductCategories((prev) => [...prev, newCat]);
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'CATEGORY_CREATED',
      entityType: 'Inventory',
      refNo: newCat.code,
      details: `Added new Product Category: ${newCat.name} (${newCat.nameBn})`,
      detailsBn: `নতুন পণ্যের ক্যাটাগরি তৈরি করা হয়েছে: ${newCat.nameBn || newCat.name}`,
      severity: 'info',
    });
    return newCat;
  };

  const updateProductCategory = (id: string, updates: Partial<ProductCategory>) => {
    setProductCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'CATEGORY_UPDATED',
      entityType: 'Inventory',
      details: `Updated Product Category (${id})`,
      detailsBn: `পণ্যের ক্যাটাগরি তথ্য পরিবর্তন করা হয়েছে (${id})`,
      severity: 'info',
    });
  };

  const deleteProductCategory = (id: string): { success: boolean; message?: string } => {
    const cat = productCategories.find((c) => c.id === id);
    if (!cat) return { success: false, message: 'Category not found' };
    const hasProducts = products.some((p) => p.category?.toLowerCase() === cat.name.toLowerCase());
    if (hasProducts) {
      return {
        success: false,
        message: `Cannot delete category: products are assigned to "${cat.name}". Please reassign them first.`,
      };
    }
    setProductCategories((prev) => prev.filter((c) => c.id !== id));
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'CATEGORY_DELETED',
      entityType: 'Inventory',
      refNo: cat.code,
      details: `Deleted Product Category: ${cat.name}`,
      detailsBn: `পণ্যের ক্যাটাগরি মুছে ফেলা হয়েছে: ${cat.nameBn || cat.name}`,
      severity: 'warning',
    });
    return { success: true };
  };

  // Chart of Accounts
  const addChartOfAccount = (account: Omit<ChartOfAccount, 'id' | 'currentBalance'>): ChartOfAccount => {
    const newAcct: ChartOfAccount = {
      ...account,
      id: `coa-${Date.now()}`,
      currentBalance: account.openingBalance || 0,
      isActive: true,
    };
    setChartOfAccounts((prev) => [...prev, newAcct]);
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'COA_CREATED',
      entityType: 'Accounting',
      refNo: newAcct.code,
      details: `Created Chart of Accounts head: [${newAcct.code}] ${newAcct.name} (${newAcct.classification})`,
      detailsBn: `চার্ট অব অ্যাকাউন্টসে নতুন হিসাব খাত যুক্ত করা হয়েছে: [${newAcct.code}] ${newAcct.nameBn || newAcct.name}`,
      severity: 'info',
    });
    return newAcct;
  };

  const updateChartOfAccount = (id: string, updates: Partial<ChartOfAccount>) => {
    setChartOfAccounts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const newAccount = { ...a, ...updates };
          if (updates.openingBalance !== undefined && updates.openingBalance !== a.openingBalance) {
            const diff = updates.openingBalance - a.openingBalance;
            newAccount.currentBalance = (a.currentBalance || 0) + diff;
          }
          return newAccount;
        }
        return a;
      })
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'COA_UPDATED',
      entityType: 'Accounting',
      details: `Updated Chart of Account entry (${id})`,
      detailsBn: `চার্ট অব অ্যাকাউন্টস তথ্য পরিবর্তন করা হয়েছে (${id})`,
      severity: 'info',
    });
  };

  const deleteChartOfAccount = (id: string): { success: boolean; message?: string } => {
    const target = chartOfAccounts.find((a) => a.id === id);
    if (!target) return { success: false, message: 'Account not found' };
    const hasJournals = journalEntries.some((j) => j.debitAccountId === id || j.creditAccountId === id);
    if (hasJournals) {
      return { success: false, message: 'Cannot delete account with existing recorded journal entries.' };
    }
    setChartOfAccounts((prev) => prev.filter((a) => a.id !== id));
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'COA_DELETED',
      entityType: 'Accounting',
      refNo: target.code,
      details: `Deleted Chart of Account head: [${target.code}] ${target.name}`,
      detailsBn: `চার্ট অব অ্যাকাউন্টস থেকে হিসাব মুছে ফেলা হয়েছে: [${target.code}] ${target.nameBn || target.name}`,
      severity: 'warning',
    });
    return { success: true };
  };

  // Expense Heads
  const addExpenseHead = (head: Omit<ExpenseHead, 'id'>): ExpenseHead => {
    const newHead: ExpenseHead = {
      ...head,
      id: `eh-${Date.now()}`,
      isActive: head.isActive ?? true,
    };
    setExpenseHeads((prev) => [newHead, ...prev]);
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'EXPENSE_HEAD_CREATED',
      entityType: 'Accounting',
      refNo: newHead.code,
      details: `Added new Expense Head: ${newHead.name} (${newHead.nameBn})`,
      detailsBn: `নতুন ব্যয় খাত যুক্ত করা হয়েছে: ${newHead.nameBn || newHead.name}`,
      severity: 'info',
    });
    return newHead;
  };

  const updateExpenseHead = (id: string, updates: Partial<ExpenseHead>) => {
    setExpenseHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'EXPENSE_HEAD_UPDATED',
      entityType: 'Accounting',
      details: `Updated Expense Head details for ID ${id}`,
      detailsBn: `ব্যয় খাতের বিবরণ পরিবর্তন করা হয়েছে (${id})`,
      severity: 'info',
    });
  };

  const deleteExpenseHead = (id: string): { success: boolean; message?: string } => {
    const head = expenseHeads.find((h) => h.id === id);
    if (!head) return { success: false, message: 'Expense head not found' };
    setExpenseHeads((prev) => prev.filter((h) => h.id !== id));
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'EXPENSE_HEAD_DELETED',
      entityType: 'Accounting',
      refNo: head.code,
      details: `Deleted Expense Head: ${head.name}`,
      detailsBn: `ব্যয় খাত মুছে ফেলা হয়েছে: ${head.nameBn || head.name}`,
      severity: 'warning',
    });
    return { success: true };
  };

  // Staff & User Management
  const addStaffMember = (staff: Omit<StaffMember, 'id'>): StaffMember => {
    const newStaff: StaffMember = {
      ...staff,
      id: `staff-${Date.now()}`,
      isActive: staff.isActive ?? true,
    };
    setStaffMembers((prev) => [...prev, newStaff]);
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: newStaff.location === 'Both' ? 'All' : newStaff.location,
      actionType: 'USER_CREATED',
      entityType: 'Configuration',
      details: `Added new user/staff: ${newStaff.name} (${newStaff.role})`,
      detailsBn: `নতুন ইউজার ও স্টাফ যুক্ত করা হয়েছে: ${newStaff.nameBn || newStaff.name} (${newStaff.roleBn || newStaff.role})`,
      severity: 'info',
    });
    return newStaff;
  };

  const updateStaffMember = (id: string, updates: Partial<StaffMember>) => {
    setStaffMembers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          if (activeStaff.id === id) {
            setActiveStaff(updated);
          }
          return updated;
        }
        return s;
      })
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'All',
      actionType: 'USER_UPDATED',
      entityType: 'Configuration',
      details: `Updated staff profile/role for ID ${id}`,
      detailsBn: `ইউজার ও স্টাফ তথ্য বা রোল আপডেট করা হয়েছে (${id})`,
      severity: 'info',
    });
  };

  const deleteStaffMember = (id: string): { success: boolean; message?: string } => {
    if (staffMembers.length <= 1) {
      return { success: false, message: 'System requires at least one active administrator.' };
    }
    const staff = staffMembers.find((s) => s.id === id);
    if (!staff) return { success: false, message: 'User not found' };
    if (staff.id === activeStaff.id) {
      return { success: false, message: 'You cannot delete the currently logged-in active user. Please switch user profile first.' };
    }
    setStaffMembers((prev) => prev.filter((s) => s.id !== id));
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'All',
      actionType: 'USER_DELETED',
      entityType: 'Configuration',
      details: `Removed user/staff: ${staff.name} (${staff.role})`,
      detailsBn: `ইউজার মুছে ফেলা হয়েছে: ${staff.nameBn || staff.name}`,
      severity: 'warning',
    });
    return { success: true };
  };

  // Roles & Permissions (RBAC)
  const addUserRole = (role: Omit<UserRole, 'id'>): UserRole => {
    const newRole: UserRole = {
      ...role,
      id: `role-${Date.now()}`,
      isSystem: false,
    };
    setUserRoles((prev) => [...prev, newRole]);
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'All',
      actionType: 'ROLE_UPDATED',
      entityType: 'Configuration',
      details: `Created new custom role: ${newRole.name} with ${newRole.permissions.length} permissions`,
      detailsBn: `নতুন ইউজার রোল তৈরি করা হয়েছে: ${newRole.nameBn || newRole.name}`,
      severity: 'info',
    });
    return newRole;
  };

  const updateUserRole = (id: string, updates: Partial<UserRole>) => {
    setUserRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'All',
      actionType: 'ROLE_UPDATED',
      entityType: 'Configuration',
      details: `Updated role permissions for role ID ${id}`,
      detailsBn: `ইউজার রোলের পারমিশন পরিবর্তন করা হয়েছে (${id})`,
      severity: 'info',
    });
  };

  const deleteUserRole = (id: string): { success: boolean; message?: string } => {
    const role = userRoles.find((r) => r.id === id);
    if (!role) return { success: false, message: 'Role not found' };
    if (role.isSystem) {
      return { success: false, message: 'Core system predefined roles cannot be deleted.' };
    }
    const isAssigned = staffMembers.some((s) => s.customRoleId === id || s.role === role.name);
    if (isAssigned) {
      return { success: false, message: 'Cannot delete role: active staff members are currently assigned to this role.' };
    }
    setUserRoles((prev) => prev.filter((r) => r.id !== id));
    return { success: true };
  };

  const checkPermission = (permissionCode: string): boolean => {
    if (!activeStaff || !activeStaff.role) return false;
    if (activeStaff.role === 'Managing Director') return true;
    const role = (userRoles || []).find(
      (r) => (activeStaff.customRoleId && r.id === activeStaff.customRoleId) || r.name === activeStaff.role
    );
    if (role && role.permissions) {
      return role.permissions.includes(permissionCode);
    }
    const fallback = (INITIAL_USER_ROLES || []).find((r) => r.name === activeStaff.role);
    if (fallback && fallback.permissions) {
      return fallback.permissions.includes(permissionCode);
    }
    return false;
  };

  // Journal Entries
  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'entryNo'>): JournalEntry => {
    const newEntry: JournalEntry = {
      ...entry,
      id: `jnl-${Date.now()}`,
      entryNo: `JNL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
    };
    setJournalEntries((prev) => [newEntry, ...prev]);

    setChartOfAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === entry.debitAccountId) {
          const delta = acc.normalBalance === 'Debit' ? entry.amount : -entry.amount;
          return { ...acc, currentBalance: acc.currentBalance + delta };
        }
        if (acc.id === entry.creditAccountId) {
          const delta = acc.normalBalance === 'Credit' ? entry.amount : -entry.amount;
          return { ...acc, currentBalance: acc.currentBalance + delta };
        }
        return acc;
      })
    );

    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: 'Office',
      actionType: 'JOURNAL_ENTRY_CREATED',
      entityType: 'Accounting',
      refNo: newEntry.entryNo,
      details: `Recorded Journal Entry ${newEntry.entryNo}: Dr. ${newEntry.debitAccountName} / Cr. ${newEntry.creditAccountName} (৳${newEntry.amount.toLocaleString()})`,
      detailsBn: `নতুন জার্নাল এন্ট্রি করা হয়েছে ${newEntry.entryNo}: ডেবিট ${newEntry.debitAccountName} / ক্রেডিট ${newEntry.creditAccountName} (৳${newEntry.amount.toLocaleString()})`,
      amount: newEntry.amount,
      severity: 'info',
    });
    return newEntry;
  };

  // Accounting
  const addTransaction = (tx: Omit<AccountingTransaction, 'id'>) => {
    const newTx: AccountingTransaction = {
      ...tx,
      id: generateUniqueId('tx'),
    };
    setTransactions((prev) => ensureUniqueTransactions([newTx, ...prev]));

    const isExp = tx.type === 'EXPENSE';
    addAuditLog({
      staffId: activeStaff.id,
      staffName: activeStaff.name,
      staffRole: activeStaff.role,
      location: tx.account === 'Factory Cash' ? 'Factory' : 'Office',
      actionType: isExp ? 'EXPENSE_RECORDED' : 'PAYMENT_COLLECTED',
      entityType: 'Accounting',
      refNo: tx.refNo || `TX-${newTx.id.slice(-6)}`,
      details: `Recorded ${isExp ? 'expense' : 'income'}: ${tx.description} (${tx.category}) - ৳${tx.amount.toLocaleString()} via ${tx.account || tx.paymentAccount || 'Cash'}`,
      detailsBn: `${tx.category} খাতে ৳${tx.amount.toLocaleString()} এর ${isExp ? 'খরচ' : 'জমা'} হিসাবভুক্ত করা হয়েছে (${tx.account || 'ক্যাশ'})`,
      amount: tx.amount,
      severity: isExp ? 'info' : 'success',
    });
  };

  const updateTransaction = (id: string, updates: Partial<AccountingTransaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateJournalEntry = (id: string, updates: Partial<JournalEntry>) => {
    setJournalEntries((prev) =>
      prev.map((je) => (je.id === id ? { ...je, ...updates } : je))
    );
  };

  // Module Data Clean & Purge
  const cleanModuleData = (moduleKey: 'SALES' | 'QUOTATIONS' | 'PURCHASES' | 'INVENTORY_STOCK' | 'CUSTOM_PRODUCTS' | 'TRANSACTIONS' | 'JOURNALS' | 'AUDIT_LOGS' | 'ALL' | 'WIPE_ALL_EXCEPT_PRODUCTS') => {
    if (moduleKey === 'SALES') {
      setInvoices([]);
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'All',
        actionType: 'DATA_CLEANED',
        entityType: 'System',
        details: 'Purged/cleaned all sales invoice records and POS transactions from system.',
        detailsBn: 'সমস্ত বিক্রয় ও পিওএস ইনভয়েস রেকর্ড সিস্টেম থেকে মুছে ফেলা হয়েছে।',
        severity: 'critical',
      });
    } else if (moduleKey === 'QUOTATIONS') {
      setQuotations([]);
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'All',
        actionType: 'DATA_CLEANED',
        entityType: 'System',
        details: 'Purged/cleaned all quotation records from system.',
        detailsBn: 'সমস্ত কোটেশন তালিকা সিস্টেম থেকে মুছে ফেলা হয়েছে।',
        severity: 'critical',
      });
    } else if (moduleKey === 'PURCHASES') {
      setPurchaseOrders([]);
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'All',
        actionType: 'DATA_CLEANED',
        entityType: 'System',
        details: 'Purged/cleaned all purchase orders and vendor procurement records.',
        detailsBn: 'সমস্ত পারচেস অর্ডার ও ক্রয় রেকর্ড সিস্টেম থেকে মুছে ফেলা হয়েছে।',
        severity: 'critical',
      });
    } else if (moduleKey === 'INVENTORY_STOCK') {
      setProducts((prev) => prev.map((p) => ({ ...p, stockFactory: 0, stockOffice: 0 })));
      setStockMovements([]);
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'All',
        actionType: 'DATA_CLEANED',
        entityType: 'System',
        details: 'Zeroed out stock quantities across all factory and office warehouse items.',
        detailsBn: 'কারখানা ও অফিসের সকল পণ্যের স্টক শূন্য (Zero-out) করা হয়েছে।',
        severity: 'critical',
      });
    } else if (moduleKey === 'CUSTOM_PRODUCTS') {
      setProducts(INITIAL_PRODUCTS);
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'All',
        actionType: 'DATA_CLEANED',
        entityType: 'System',
        details: 'Reset product catalog to standard default catalog.',
        detailsBn: 'পণ্য তালিকা ডিফল্ট ক্যাটালগে রিসেট করা হয়েছে।',
        severity: 'critical',
      });
    } else if (moduleKey === 'TRANSACTIONS') {
      setTransactions([]);
      addAuditLog({
        staffId: activeStaff.id,
        staffName: activeStaff.name,
        staffRole: activeStaff.role,
        location: 'All',
        actionType: 'DATA_CLEANED',
        entityType: 'System',
        details: 'Purged/cleaned operating cash transactions and expense registers.',
        detailsBn: 'সমস্ত অপারেটিং লেনদেন ও খরচের হিসাব পরিষ্কার করা হয়েছে।',
        severity: 'critical',
      });
    } else if (moduleKey === 'JOURNALS') {
      setJournalEntries([]);
    } else if (moduleKey === 'AUDIT_LOGS') {
      setAuditLogs([]);
    } else if (moduleKey === 'ALL') {
      resetToDefaultData();
    } else if (moduleKey === 'WIPE_ALL_EXCEPT_PRODUCTS') {
      setInvoices([]);
      setQuotations([]);
      setPurchaseOrders([]);
      setTransactions([]);
      setStockMovements([]);
      setJournalEntries([]);
      setCustomers([]);
      setSuppliers([]);
      setAuditLogs([]);
      setProducts((prev) => prev.map((p) => ({ ...p, stockFactory: 0, stockOffice: 0 })));
      setChartOfAccounts((prev) => prev.map((acc) => ({ ...acc, openingBalance: 0, currentBalance: 0 })));
    }
  };

  // Utilities
  const resetToDefaultData = () => {
    setProfile(INITIAL_COMPANY_PROFILE);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setInvoices(INITIAL_INVOICES);
    setQuotations(INITIAL_QUOTATIONS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setStaffMembers(INITIAL_STAFF_MEMBERS);
    setUserRoles(INITIAL_USER_ROLES);
    setChartOfAccounts(INITIAL_CHART_OF_ACCOUNTS);
    setExpenseHeads(INITIAL_EXPENSE_HEADS);
    setProductCategories(INITIAL_PRODUCT_CATEGORIES);
    setJournalEntries(INITIAL_JOURNAL_ENTRIES);
    localStorage.clear();
  };

  const exportDatabase = (): string => {
    const state = {
      profile,
      products,
      customers,
      suppliers,
      invoices,
      quotations,
      purchaseOrders,
      transactions,
      stockMovements,
      auditLogs,
      staffMembers,
      userRoles,
      chartOfAccounts,
      expenseHeads,
      productCategories,
      journalEntries,
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    return JSON.stringify(state, null, 2);
  };

  const importDatabase = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) {
        if (
          data.profile.logoUrl &&
          (data.profile.logoUrl.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALL') ||
           data.profile.logoUrl.includes('ALLCAYAAACHp'))
        ) {
          data.profile.logoUrl = '/dotcolor-logo.svg';
        }
        if (data.profile.name === 'DotColorCommunication Sales, POS & ERP') {
          data.profile.name = 'Dot Color';
        }
        if (data.profile.footerBrandText === 'DotColorCommunication Sales, POS & ERP') {
          data.profile.footerBrandText = 'Dot Color';
        }
        setProfile(data.profile);
      }
      if (data.products) setProducts(data.products);
      if (data.customers) setCustomers(data.customers);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.invoices) setInvoices(data.invoices);
      if (data.quotations) setQuotations(data.quotations);
      if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
      if (data.transactions) setTransactions(ensureUniqueTransactions(data.transactions));
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.staffMembers) setStaffMembers(data.staffMembers);
      if (data.userRoles) setUserRoles(data.userRoles);
      if (data.chartOfAccounts) setChartOfAccounts(data.chartOfAccounts);
      if (data.expenseHeads) setExpenseHeads(data.expenseHeads);
      if (data.productCategories) setProductCategories(data.productCategories);
      if (data.journalEntries) setJournalEntries(data.journalEntries);
      return true;
    } catch (e) {
      console.error('Import error', e);
      return false;
    }
  };

  // Cloud & MongoDB Synchronization State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'error'>('idle');
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isCloudLoadedRef = React.useRef(false);
  const syncTimeoutRef = React.useRef<any>(null);

  // Initial load from MongoDB Atlas
  useEffect(() => {
    let isCancelled = false;

    const checkAndLoadFromCloud = async () => {
      try {
        const healthRes = await fetch('/api/health');
        if (!healthRes.ok) throw new Error('Health check failed');
        const healthData = await healthRes.json();

        if (healthData.database === 'connected') {
          if (!isCancelled) setIsCloudConnected(true);

          const stateRes = await fetch('/api/state');
          if (stateRes.ok) {
            const stateData = await stateRes.json();
            if (stateData.success && stateData.data) {
              if (!isCancelled) {
                importDatabase(JSON.stringify(stateData.data));
                setCloudSyncStatus('synced');
                setLastSyncedAt(
                  stateData.updatedAt
                    ? new Date(stateData.updatedAt).toLocaleTimeString()
                    : new Date().toLocaleTimeString()
                );
                isCloudLoadedRef.current = true;
                console.log('✅ Synchronized state from MongoDB Atlas!');
              }
              return;
            } else {
              // Cloud database is brand new and empty, seed it with current data
              isCloudLoadedRef.current = true;
              syncWithCloud();
              return;
            }
          }
        } else {
          if (!isCancelled) {
            setIsCloudConnected(false);
            setCloudSyncStatus('offline');
          }
        }
      } catch {
        if (!isCancelled) {
          setIsCloudConnected(false);
          setCloudSyncStatus('offline');
        }
      } finally {
        isCloudLoadedRef.current = true;
      }
    };

    checkAndLoadFromCloud();

    return () => {
      isCancelled = true;
    };
  }, []);

  const syncWithCloud = async () => {
    try {
      setCloudSyncStatus('syncing');
      const stateJson = exportDatabase();
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: JSON.parse(stateJson) }),
      });
      if (res.ok) {
        const data = await res.json();
        setCloudSyncStatus('synced');
        setIsCloudConnected(true);
        setLastSyncedAt(new Date(data.updatedAt).toLocaleTimeString());
      } else {
        setCloudSyncStatus('offline');
      }
    } catch {
      setCloudSyncStatus('offline');
    }
  };

  useEffect(() => {
    // Prevent syncing until initial cloud check and load has completed!
    if (!isCloudLoadedRef.current) {
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncWithCloud();
    }, 2500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [
    profile,
    products,
    customers,
    suppliers,
    invoices,
    quotations,
    purchaseOrders,
    transactions,
    stockMovements,
    auditLogs,
    staffMembers,
    userRoles,
    chartOfAccounts,
    expenseHeads,
    productCategories,
    journalEntries,
  ]);

  const accountBalances: AccountBalances = useMemo(() => {
    // Dynamically calculate starting balances from the current Chart of Accounts opening balances
    const cashAccs = (chartOfAccounts || []).filter(acc => acc.id === 'coa-1010' || acc.id === 'coa-1020');
    const bankAccs = (chartOfAccounts || []).filter(acc => acc.id === 'coa-1030');
    const mobileAccs = (chartOfAccounts || []).filter(acc => acc.id === 'coa-1040');

    let cash = cashAccs.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
    let bank = bankAccs.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
    let mobile = mobileAccs.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);

    transactions.forEach((tx) => {
      const acct = (tx.paymentAccount || tx.account || '').toLowerCase();
      const delta = tx.type === 'INCOME' ? tx.amount : tx.type === 'EXPENSE' ? -tx.amount : 0;

      if (acct.includes('bank') || acct.includes('brac')) {
        bank += delta;
      } else if (acct.includes('bkash') || acct.includes('nagad') || acct.includes('mobile')) {
        mobile += delta;
      } else {
        cash += delta;
      }
    });

    return {
      cash: Math.max(0, cash),
      bank: Math.max(0, bank),
      mobile: Math.max(0, mobile),
    };
  }, [transactions, chartOfAccounts]);

  return (
    <AppContext.Provider
      value={{
        profile,
        products,
        customers,
        suppliers,
        invoices,
        quotations,
        purchaseOrders,
        transactions,
        stockMovements,
        accountBalances,
        language,
        activeLocation,
        setLanguage,
        setActiveLocation,
        updateProfile,
        auditLogs,
        staffMembers,
        activeStaff,
        setActiveStaff,
        isAuthenticated,
        login,
        logout,
        addAuditLog,
        addStaffMember,
        updateStaffMember,
        deleteStaffMember,
        userRoles,
        systemPermissions: ALL_SYSTEM_PERMISSIONS,
        addUserRole,
        updateUserRole,
        deleteUserRole,
        checkPermission,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        collectInvoicePayment,
        updateProductionStatus,
        addQuotation,
        updateQuotation,
        updateQuotationStatus,
        deleteQuotation,
        convertQuotationToInvoice,
        productCategories,
        addProductCategory,
        updateProductCategory,
        deleteProductCategory,
        addProduct,
        bulkImportProducts,
        updateProduct,
        deleteProduct,
        adjustStock,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        receivePurchaseOrder,
        payPurchaseOrder,
        paySupplierDue,
        paySupplier: paySupplierDue,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        chartOfAccounts,
        addChartOfAccount,
        updateChartOfAccount,
        deleteChartOfAccount,
        expenseHeads,
        addExpenseHead,
        updateExpenseHead,
        deleteExpenseHead,
        journalEntries,
        addJournalEntry,
        updateJournalEntry,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        cleanModuleData,
        resetToDefaultData,
        exportDatabase,
        importDatabase,
        cloudSyncStatus,
        isCloudConnected,
        lastSyncedAt,
        syncWithCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
