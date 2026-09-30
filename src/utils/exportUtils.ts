import * as XLSX from 'xlsx';
import { SalesInvoice, AccountingTransaction, CompanyProfile, AuditLogEntry } from '../types';

/**
 * Format date for professional display
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Export Sales Invoices to a formatted Excel file (.xlsx)
 */
export const exportSalesToExcel = (
  invoices: SalesInvoice[],
  profile: CompanyProfile,
  dateRangeText: string = 'All Records'
) => {
  const wb = XLSX.utils.book_new();

  // 1. Data Rows
  const rows = invoices.map((inv, index) => ({
    'SL': index + 1,
    'Invoice No': inv.invoiceNo,
    'Date': inv.date,
    'Customer Name': inv.customerName || 'Walk-in Customer',
    'Customer Phone': inv.customerPhone || 'N/A',
    'Items Summary': inv.items.map((i) => `${i.name} (x${i.qty} ${i.unit})`).join(', '),
    'Location': inv.warehouseLocation || 'Office',
    'Sub Total (BDT)': inv.subtotal,
    'Discount (BDT)': inv.discount || 0,
    'Tax / VAT (BDT)': inv.vatAmount || 0,
    'Grand Total (BDT)': inv.grandTotal,
    'Paid Amount (BDT)': inv.paidAmount,
    'Due Amount (BDT)': inv.dueAmount,
    'Payment Status': inv.paymentStatus,
    'Production Status': inv.productionStatus,
    'Payment Method': inv.paymentMethod || 'Cash',
  }));

  const totalGrandTotal = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalDue = invoices.reduce((acc, inv) => acc + (inv.dueAmount || 0), 0);

  const companyAddress = profile.officeAddress || profile.factoryAddress || 'Chattogram, Bangladesh';
  const companyEmail = profile.emails?.join(', ') || '';

  // 2. Build Worksheet with Title Header & Metadata
  const wsData = [
    [profile.name],
    [profile.tagline || 'Printing, Packaging & Commercial Branding ERP'],
    [`Address: ${companyAddress} | Phone: ${profile.phone} | Email: ${companyEmail}`],
    [profile.vatTaxNumber ? `BIN/Tax: ${profile.vatTaxNumber}` : ''],
    [],
    ['SALES & REVENUE PERFORMANCE REPORT'],
    [`Period / Date Range: ${dateRangeText}`],
    [`Generated On: ${new Date().toLocaleString()} | Currency: ${profile.currencySymbol}`],
    [],
    // Table Column Headers
    [
      'SL',
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Items Summary',
      'Location',
      'Sub Total (BDT)',
      'Discount (BDT)',
      'VAT (BDT)',
      'Grand Total (BDT)',
      'Paid (BDT)',
      'Due (BDT)',
      'Payment Status',
      'Production Status',
      'Payment Method',
    ],
    // Rows
    ...rows.map((r) => [
      r['SL'],
      r['Invoice No'],
      r['Date'],
      r['Customer Name'],
      r['Customer Phone'],
      r['Items Summary'],
      r['Location'],
      r['Sub Total (BDT)'],
      r['Discount (BDT)'],
      r['Tax / VAT (BDT)'],
      r['Grand Total (BDT)'],
      r['Paid Amount (BDT)'],
      r['Due Amount (BDT)'],
      r['Payment Status'],
      r['Production Status'],
      r['Payment Method'],
    ]),
    [],
    // Summary Row
    [
      'SUMMARY TOTALS',
      '',
      '',
      '',
      '',
      '',
      `Total Invoices: ${invoices.length}`,
      '',
      '',
      '',
      totalGrandTotal,
      totalPaid,
      totalDue,
      '',
      '',
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Adjust column widths for clean readability
  ws['!cols'] = [
    { wch: 5 },  // SL
    { wch: 14 }, // Inv No
    { wch: 12 }, // Date
    { wch: 24 }, // Customer
    { wch: 15 }, // Phone
    { wch: 38 }, // Items
    { wch: 12 }, // Location
    { wch: 14 }, // Subtotal
    { wch: 12 }, // Discount
    { wch: 10 }, // Tax
    { wch: 16 }, // Grand Total
    { wch: 14 }, // Paid
    { wch: 14 }, // Due
    { wch: 14 }, // Payment Status
    { wch: 16 }, // Production Status
    { wch: 15 }, // Payment Method
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoices');

  const fileName = `DotColor_Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Accounting Transactions & Ledger to formatted Excel (.xlsx)
 */
export const exportAccountingToExcel = (
  transactions: AccountingTransaction[],
  profile: CompanyProfile,
  dateRangeText: string = 'All Records',
  totals: { income: number; expense: number; net: number }
) => {
  const wb = XLSX.utils.book_new();

  const companyAddress = profile.officeAddress || profile.factoryAddress || 'Chattogram, Bangladesh';
  const companyEmail = profile.emails?.join(', ') || '';

  const wsData = [
    [profile.name],
    [profile.tagline || 'Printing, Packaging & Commercial Branding ERP'],
    [`Address: ${companyAddress} | Phone: ${profile.phone} | Email: ${companyEmail}`],
    [profile.vatTaxNumber ? `BIN/Tax: ${profile.vatTaxNumber}` : ''],
    [],
    ['FINANCIAL TRANSACTIONS & LEDGER REPORT'],
    [`Reporting Period: ${dateRangeText}`],
    [`Generated On: ${new Date().toLocaleString()} | Currency: ${profile.currencySymbol}`],
    [],
    // Table Headers
    [
      'SL',
      'Date',
      'Ref No',
      'Transaction Type',
      'Category',
      'Description / Particulars',
      'Account / Channel',
      'Amount (BDT)',
    ],
    // Rows
    ...transactions.map((tx, idx) => [
      idx + 1,
      tx.date,
      tx.refNo || 'N/A',
      tx.type,
      tx.category,
      tx.description,
      tx.account,
      tx.amount,
    ]),
    [],
    // Summary
    ['FINANCIAL SUMMARY', '', '', '', '', '', '', ''],
    ['Total Income (Inflow)', '', '', '', '', '', '', totals.income],
    ['Total Expense (Outflow)', '', '', '', '', '', '', totals.expense],
    ['Net Operating Margin / Balance', '', '', '', '', '', '', totals.net],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 6 },  // SL
    { wch: 12 }, // Date
    { wch: 14 }, // Ref No
    { wch: 16 }, // Type
    { wch: 22 }, // Category
    { wch: 36 }, // Description
    { wch: 20 }, // Account
    { wch: 16 }, // Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Accounting Ledger');

  const fileName = `DotColor_Accounting_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Staff Audit Trail to formatted Excel (.xlsx)
 */
export const exportAuditTrailToExcel = (
  logs: AuditLogEntry[],
  profile: CompanyProfile,
  filterInfo: string = 'All Staff Actions'
) => {
  const wb = XLSX.utils.book_new();

  const companyAddress = profile.officeAddress || profile.factoryAddress || 'Chattogram, Bangladesh';
  const companyEmail = profile.emails?.join(', ') || '';

  const wsData = [
    [profile.name],
    [profile.tagline || 'Printing, Packaging & Commercial Branding ERP'],
    [`Address: ${companyAddress} | Phone: ${profile.phone} | Email: ${companyEmail}`],
    [profile.vatTaxNumber ? `BIN/Tax: ${profile.vatTaxNumber}` : ''],
    [],
    ['INTERNAL AUDIT TRAIL & STAFF ACTIVITY REPORT'],
    [`Scope / Filter: ${filterInfo}`],
    [`Generated On: ${new Date().toLocaleString()} | Currency: ${profile.currencySymbol}`],
    [],
    // Table Headers
    [
      'SL',
      'Timestamp',
      'Staff Member',
      'Role / Designation',
      'Site Location',
      'Module / Entity',
      'Action Type',
      'Reference No',
      'Action Details / Particulars',
      'Amount (BDT)',
      'Severity',
    ],
    // Rows
    ...logs.map((log, idx) => [
      idx + 1,
      log.timestamp,
      log.staffName,
      log.staffRole,
      log.location,
      log.entityType,
      log.actionType,
      log.refNo || 'N/A',
      log.details,
      log.amount ? log.amount : '',
      log.severity || 'info',
    ]),
    [],
    // Summary
    [
      'AUDIT LOG SUMMARY',
      '',
      `Total Events: ${logs.length}`,
      '',
      '',
      '',
      '',
      '',
      'Total Financial Volume:',
      logs.reduce((acc, l) => acc + (l.amount || 0), 0),
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 6 },  // SL
    { wch: 18 }, // Timestamp
    { wch: 22 }, // Staff Member
    { wch: 24 }, // Role
    { wch: 12 }, // Site Location
    { wch: 14 }, // Module
    { wch: 20 }, // Action Type
    { wch: 18 }, // Ref No
    { wch: 48 }, // Details
    { wch: 16 }, // Amount
    { wch: 10 }, // Severity
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');

  const fileName = `DotColor_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

