import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductItem, UnitType, ServiceCategory } from '../types';
import { Package, Boxes, ArrowRightLeft, AlertTriangle, Plus, Search, Filter, Layers, ArrowDownRight, ArrowUpRight, History, Factory, Building2, DollarSign, TrendingDown, Edit2, Trash2, UploadCloud, FileSpreadsheet, } from 'lucide-react';
import { BulkProductImportModal } from './BulkProductImportModal';
import { ProductCategoryManager } from './ProductCategoryManager';
export const InventoryModule: React.FC = () => {
    const { products, stockMovements, productCategories, profile, language, activeLocation, addProduct, updateProduct, deleteProduct, adjustStock, } = useApp();
    const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'history'>('inventory');
    const [filterType, setFilterType] = useState<'ALL' | 'RAW' | 'FINISHED' | 'LOW_STOCK'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
    const [adjustModalProduct, setAdjustModalProduct] = useState<ProductItem | null>(null);
    const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
    // Form states for Product Add/Edit
    const [formData, setFormData] = useState({
        name: '',
        nameBn: '',
        category: 'DIGITAL PRINTING' as ServiceCategory | 'RAW MATERIAL',
        isRawMaterial: false,
        unit: 'pcs' as UnitType,
        unitPrice: 100,
        costPrice: 60,
        stockFactory: 10,
        stockOffice: 0,
        minStockAlert: 5,
        description: '',
    });
    // Adjust Form state
    const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN');
    const [adjustQty, setAdjustQty] = useState(1);
    const [adjustLocation, setAdjustLocation] = useState<'Factory' | 'Office'>('Factory');
    const [adjustTargetLocation, setAdjustTargetLocation] = useState<'Factory' | 'Office'>('Office');
    const [adjustReason, setAdjustReason] = useState('');
    // Filtering
    const filteredProducts = products.filter((p) => {
        const totalStock = p.stockFactory + p.stockOffice;
        const isLow = !p.isRawMaterial && totalStock <= p.minStockAlert;
        if (filterType === 'RAW' && !p.isRawMaterial)
            return false;
        if (filterType === 'FINISHED' && p.isRawMaterial)
            return false;
        if (filterType === 'LOW_STOCK' && !isLow)
            return false;
        const q = (searchQuery || '').toLowerCase().trim();
        const match = !q ||
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.nameBn && p.nameBn.includes(q)) ||
            (p.code && p.code.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q));
        return match;
    });
    // Valuations
    const totalStockValuation = products.reduce((acc, p) => {
        const totalQty = p.stockFactory + p.stockOffice;
        return acc + totalQty * p.costPrice;
    }, 0);
    const rawMaterialsValuation = products
        .filter((p) => p.isRawMaterial)
        .reduce((acc, p) => acc + (p.stockFactory + p.stockOffice) * p.costPrice, 0);
    const lowStockCount = products.filter((p) => !p.isRawMaterial && p.stockFactory + p.stockOffice <= p.minStockAlert).length;
    const handleOpenAdd = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            nameBn: '',
            category: 'DIGITAL PRINTING',
            isRawMaterial: false,
            unit: 'pcs',
            unitPrice: 100,
            costPrice: 60,
            stockFactory: 10,
            stockOffice: 0,
            minStockAlert: 5,
            description: '',
        });
        setShowAddModal(true);
    };
    const handleOpenEdit = (p: ProductItem) => {
        setEditingProduct(p);
        setFormData({
            name: p.name,
            nameBn: p.nameBn || '',
            category: p.category,
            isRawMaterial: p.isRawMaterial,
            unit: p.unit,
            unitPrice: p.unitPrice,
            costPrice: p.costPrice,
            stockFactory: p.stockFactory,
            stockOffice: p.stockOffice,
            minStockAlert: p.minStockAlert,
            description: p.description || '',
        });
        setShowAddModal(true);
    };
    const handleSaveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name)
            return;
        if (editingProduct) {
            updateProduct(editingProduct.id, formData);
        }
        else {
            addProduct(formData);
        }
        setShowAddModal(false);
    };
    const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustModalProduct || adjustQty <= 0)
            return;
        adjustStock(adjustModalProduct.id, adjustType, adjustQty, adjustLocation, adjustType === 'TRANSFER' ? adjustTargetLocation : undefined, adjustReason || (adjustType === 'TRANSFER' ? 'Branch transfer' : 'Manual stock update'));
        setAdjustModalProduct(null);
        setAdjustQty(1);
        setAdjustReason('');
    };
    return (<div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">
            {'Total Stock Asset Value'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profile.currencySymbol}
            {totalStockValuation.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {products.length} {'SKUs tracked in total'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-700 block mb-1">
            {'Raw Materials Inventory Value'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            {profile.currencySymbol}
            {rawMaterialsValuation.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-600/80 mt-1 block font-medium">
            {'Flex, Vinyl, Inks, Acrylic & blanks'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-rose-600 block mb-1">
            {'Low Stock Items'}
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {lowStockCount} {'Items'}
          </div>
          <span className="text-[11px] text-rose-500 mt-1 block font-medium">
            {'Below safety threshold'}
          </span>
        </div>
      </div>

      {/* Tabs and Add Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button type="button" onClick={() => setActiveTab('inventory')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
            {'Inventory & Products'}
          </button>
          <button type="button" id="tab-inventory-categories" onClick={() => setActiveTab('categories')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'categories' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
            {'Category Manager'}
          </button>
          <button type="button" onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
            {'Movement Audit Log'}
          </button>
        </div>

        {activeTab === 'inventory' && (<div className="flex items-center gap-2 w-full md:w-auto">
            <button type="button" id="btn-open-bulk-import" onClick={() => setShowBulkImportModal(true)} className="flex-1 md:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all" title={'Bulk upload products via CSV template'}>
              <UploadCloud className="w-4 h-4 text-emerald-600"/>
              <span>{'Bulk Import CSV'}</span>
            </button>

            <button type="button" id="btn-open-add-product" onClick={handleOpenAdd} className="flex-1 md:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all">
              <Plus className="w-4 h-4 text-amber-400"/>
              <span>{'+ Add New Item'}</span>
            </button>
          </div>)}
      </div>

      {activeTab === 'inventory' && (<div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={'Search SKU, name or category...'} className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"/>
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'ALL', labelEn: 'All Items', labelBn: "" },
                { id: 'FINISHED', labelEn: 'Finished Services/Goods', labelBn: "" },
                { id: 'RAW', labelEn: 'Raw Materials', labelBn: "" },
                { id: 'LOW_STOCK', labelEn: 'Low Stock Only', labelBn: "" },
            ].map((f) => (<button key={f.id} type="button" onClick={() => setFilterType(f.id as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filterType === f.id
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {f.labelEn}
                </button>))}
            </div>
          </div>

          {/* Product Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4 text-center"></th>
                  <th className="py-3 px-4 text-center">Total Stock</th>
                  <th className="py-3 px-4 text-right"></th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                const total = p.stockFactory + p.stockOffice;
                const isLow = !p.isRawMaterial && total <= p.minStockAlert;
                return (<tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.code}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">
                              {p.name}
                            </div>
                            {p.description && (<div className="text-[10px] text-slate-400 truncate max-w-xs">
                                {p.description}
                              </div>)}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.isRawMaterial
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-slate-100 text-slate-800'}`}>
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {'Central Warehouse'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`font-black text-xs px-2.5 py-1 rounded-full ${isLow
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                          {total} {p.unit}
                        </span>
                        {isLow && (<div className="text-[10px] font-bold text-rose-600 mt-0.5">
                            {'Low Stock'}
                          </div>)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900">
                          {p.isRawMaterial ? (<span className="text-slate-600 font-medium">:</span>) : (<span className="text-slate-600 font-medium">:</span>)}
                          {profile.currencySymbol}
                          {(p.isRawMaterial ? p.costPrice : p.unitPrice).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">:{profile.currencySymbol}
                          {p.costPrice.toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Stock In/Out/Transfer Adjust button */}
                          <button type="button" onClick={() => {
                        setAdjustModalProduct(p);
                        setAdjustQty(1);
                        setAdjustType('IN');
                    }} className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 text-[10px] font-bold" title="Adjust / Transfer Stock">
                            <ArrowRightLeft className="w-3.5 h-3.5"/>
                          </button>

                          {/* Edit Product */}
                          <button type="button" onClick={() => handleOpenEdit(p)} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200" title="Edit Item">
                            <Edit2 className="w-3.5 h-3.5"/>
                          </button>

                          {/* Delete Product */}
                          <button type="button" onClick={() => setProductToDelete(p)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200" title={'Delete Item'}>
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                    </tr>);
            })}

                {filteredProducts.length === 0 && (<tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                          <Package className="w-6 h-6"/>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {'No inventory items found'}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            {searchQuery
                    ?
                        'Try adjusting your search criteria or filter tags.'
                    :
                        'Speed up setup by importing your product catalog and raw materials in bulk via CSV.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button type="button" onClick={() => setShowBulkImportModal(true)} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all">
                            <UploadCloud className="w-4 h-4"/>
                            <span>{'Bulk Import via CSV'}</span>
                          </button>
                          <button type="button" onClick={handleOpenAdd} className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all">
                            <Plus className="w-4 h-4 text-amber-400"/>
                            <span>{'Add Item'}</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* SUB-TAB: CATEGORIES */}
      {activeTab === 'categories' && <ProductCategoryManager />}

      {/* SUB-TAB: AUDIT LOG */}
      {activeTab === 'history' && (<div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              {'Stock Movements History'}
            </h3>
            <span className="text-xs text-slate-500">
              {stockMovements.length} {'movements recorded'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center"></th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.map((sm) => (<tr key={sm.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{sm.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{sm.productName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${sm.type === 'IN'
                    ? 'bg-emerald-100 text-emerald-800'
                    : sm.type === 'OUT'
                        ? 'bg-rose-100 text-rose-800'
                        : sm.type === 'TRANSFER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'}`}>
                        {sm.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {sm.qty} {sm.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {sm.sourceLocation && sm.targetLocation
                    ? `${sm.sourceLocation} ➔ ${sm.targetLocation}`
                    : sm.sourceLocation || sm.targetLocation}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{sm.refNo}</div>
                      <div className="text-[10px] text-slate-400">{sm.reason}</div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ADJUST / TRANSFER STOCK MODAL */}
      {adjustModalProduct && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleStockAdjustmentSubmit} className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {adjustModalProduct.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  {adjustModalProduct.name}
                </h3>
              </div>
              <button type="button" onClick={() => setAdjustModalProduct(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-around text-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Factory</span>
                  <span className="font-bold text-slate-800">
                    {adjustModalProduct.stockFactory} {adjustModalProduct.unit}
                  </span>
                </div>
                <div className="border-r border-slate-200"/>
                <div>
                  <span className="text-slate-400 block text-[10px]"></span>
                  <span className="font-bold text-slate-800">
                    {adjustModalProduct.stockOffice} {adjustModalProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Operation Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setAdjustType('IN')} className={`py-2 rounded-lg font-bold text-xs ${adjustType === 'IN'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>+IN</button>
                  <button type="button" onClick={() => setAdjustType('OUT')} className={`py-2 rounded-lg font-bold text-xs ${adjustType === 'OUT'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>OUT</button>
                  <button type="button" onClick={() => setAdjustType('TRANSFER')} className={`py-2 rounded-lg font-bold text-xs ${adjustType === 'TRANSFER'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>⇄</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {adjustType === 'TRANSFER'
                ?
                    'From'
                :
                    'Location'}
                  </label>
                  <select value={adjustLocation} onChange={(e) => setAdjustLocation(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    <option value="Office">
                      {'Central Warehouse'}
                    </option>
                  </select>
                </div>

                {adjustType === 'TRANSFER' ? (<div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {'To Branch'}
                    </label>
                    <select value={adjustTargetLocation} onChange={(e) => setAdjustTargetLocation(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                      <option value="Office">
                        {'Central Warehouse'}
                      </option>
                    </select>
                  </div>) : (<div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {'Quantity'}
                    </label>
                    <input type="number" step="any" min="1" required value={adjustQty} onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"/>
                  </div>)}
              </div>

              {adjustType === 'TRANSFER' && (<div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Transfer Quantity'}
                  </label>
                  <input type="number" step="any" min="1" required value={adjustQty} onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"/>
                </div>)}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Reason / Reference'}
                </label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Broken packaging, showroom sample, physical audit adjustment" className="w-full px-3 py-2 border border-slate-200 rounded-xl"/>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setAdjustModalProduct(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs">
                {'Apply Adjustment'}
              </button>
            </div>
          </form>
        </div>)}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddModal && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct
                ?
                    'Edit Item'
                :
                    'Add New Item / Raw Material'}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Item Name (EN) *'}
                  </label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Glossy Vinyl Sticker" className="w-full px-3 py-2 border border-slate-200 rounded-xl"/>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Bengali Name'}
                  </label>
                  <input type="text" value={formData.nameBn} onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })} placeholder=":" className="w-full px-3 py-2 border border-slate-200 rounded-xl"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Category'}
                  </label>
                  <select value={formData.category} onChange={(e) => {
                const selectedVal = e.target.value;
                const matchedCat = productCategories?.find((c) => c.name === selectedVal);
                setFormData({
                    ...formData,
                    category: selectedVal as any,
                    isRawMaterial: matchedCat ? Boolean(matchedCat.isRawMaterial) : selectedVal === 'RAW MATERIAL',
                });
            }} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    {productCategories && productCategories.length > 0 ? (productCategories.map((c) => (<option key={c.id} value={c.name}>
                          {c.name} {c.nameBn ? `(${c.nameBn})` : ''} {c.isRawMaterial ? "- []" : ''}
                        </option>))) : (<>
                        <option value="DIGITAL PRINTING">DIGITAL PRINTING</option>
                        <option value="SIGN MAKING & LETTERING">SIGN MAKING & LETTERING</option>
                        <option value="BRANDED PROMOTIONAL GIFTS">BRANDED PROMOTIONAL GIFTS</option>
                        <option value="PRINTING & PACKAGING">PRINTING & PACKAGING</option>
                        <option value="GRAPHIC DESIGN">GRAPHIC DESIGN</option>
                        <option value="EXHIBITION">EXHIBITION</option>
                        <option value="EVENTS MANAGEMENT">EVENTS MANAGEMENT</option>
                        <option value="VENUE SOURCING">VENUE SOURCING</option>
                        <option value="RAW MATERIAL">RAW MATERIAL</option>
                      </>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Unit'}
                  </label>
                  <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="sqft">Square Feet (sqft)</option>
                    <option value="roll">Rolls (roll)</option>
                    <option value="box">Boxes (box)</option>
                    <option value="set">Sets (set)</option>
                    <option value="job">Per Job (job)</option>
                    <option value="ream">Ream (ream)</option>
                    <option value="ltr">Liter (ltr)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Selling Price'}
                  </label>
                  <input type="number" step="any" min="0" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"/>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Cost / Production Price'}
                  </label>
                  <input type="number" step="any" min="0" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Central Stock Qty'}
                  </label>
                  <input type="number" step="any" min="0" value={formData.stockOffice + formData.stockFactory} onChange={(e) => setFormData({
                ...formData,
                stockOffice: Number(e.target.value),
                stockFactory: 0,
            })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"/>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Min Alert'}
                  </label>
                  <input type="number" step="any" min="0" value={formData.minStockAlert} onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"/>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Description'}
                </label>
                <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. 340gsm frontlit solvent roll, 10ft width" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"/>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs">
                {editingProduct
                ?
                    'Save Changes'
                :
                    'Add Item'}
              </button>
            </div>
          </form>
        </div>)}

      {/* BULK PRODUCT IMPORT MODAL */}
      <BulkProductImportModal isOpen={showBulkImportModal} onClose={() => setShowBulkImportModal(false)}/>

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {productToDelete && (<div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6"/>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {'Confirm Deletion'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {`Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button type="button" onClick={() => setProductToDelete(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {'Cancel'}
              </button>
              <button type="button" onClick={() => {
                deleteProduct(productToDelete.id);
                setProductToDelete(null);
            }} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                {'Delete'}
              </button>
            </div>
          </div>
        </div>)}
    </div>);
};
