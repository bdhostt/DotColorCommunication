const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function restoreToMongo() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected to DB:', mongoose.connection.name);

  const backupPath = path.join(__dirname, '..', 'dot-color-erp-backup-merged-all.json');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  const payload = {
    profile: backup.profile,
    products: backup.products,
    customers: backup.customers,
    suppliers: backup.suppliers,
    invoices: backup.invoices,
    quotations: backup.quotations,
    purchaseOrders: backup.purchaseOrders,
    transactions: backup.transactions,
    stockMovements: backup.stockMovements,
    auditLogs: backup.auditLogs,
    staffMembers: backup.staffMembers,
    userRoles: backup.userRoles,
    chartOfAccounts: backup.chartOfAccounts,
    expenseHeads: backup.expenseHeads,
    productCategories: backup.productCategories,
    journalEntries: backup.journalEntries,
    projects: backup.projects,
    paymentMethods: backup.paymentMethods,
  };

  const col = mongoose.connection.db.collection('erpstates');
  await col.findOneAndUpdate(
    { id: 'singleton' },
    { $set: { data: payload, updatedAt: new Date() } },
    { upsert: true }
  );

  console.log('✅ MongoDB Atlas restore completed successfully!');

  // Verify document
  const doc = await col.findOne({ id: 'singleton' });
  console.log('\n=== VERIFICATION IN MONGODB ATLAS ===');
  console.log('Invoices count:', doc.data.invoices?.length);
  console.log('Transactions count:', doc.data.transactions?.length);
  console.log('Products count:', doc.data.products?.length);
  console.log('Customers count:', doc.data.customers?.length);
  console.log('Suppliers count:', doc.data.suppliers?.length);
  console.log('Purchase Orders count:', doc.data.purchaseOrders?.length);
  console.log('Quotations count:', doc.data.quotations?.length);
  console.log('Projects count:', doc.data.projects?.length);
  console.log('Stock Movements count:', doc.data.stockMovements?.length);
  console.log('Audit Logs count:', doc.data.auditLogs?.length);
  console.log('Journal Entries count:', doc.data.journalEntries?.length);
  console.log('Staff Members count:', doc.data.staffMembers?.length);

  await mongoose.disconnect();
}

restoreToMongo().catch((err) => {
  console.error('Error during restore:', err);
  process.exit(1);
});
