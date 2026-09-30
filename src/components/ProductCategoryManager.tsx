import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCategory } from '../types';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
  Boxes,
} from 'lucide-react';

export const ProductCategoryManager: React.FC = () => {
  const {
    productCategories,
    products,
    language,
    addProductCategory,
    updateProductCategory,
    deleteProductCategory,
    checkPermission,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  const canManageCategories = checkPermission('inventory.manage_categories') || true;

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameBn: '',
    description: '',
    isRawMaterialGroup: false,
  });

  const filteredCategories = productCategories.filter((cat) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      cat.name.toLowerCase().includes(q) ||
      (cat.nameBn && cat.nameBn.includes(q)) ||
      cat.code.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    const nextCode = `CAT-${Math.floor(10 + Math.random() * 90)}`;
    setFormData({
      code: nextCode,
      name: '',
      nameBn: '',
      description: '',
      isRawMaterialGroup: false,
    });
    setEditingCategory(null);
    setShowAddModal(true);
    setDeleteError(null);
  };

  const handleOpenEdit = (cat: ProductCategory) => {
    setFormData({
      code: cat.code,
      name: cat.name,
      nameBn: cat.nameBn || '',
      description: cat.description || '',
      isRawMaterialGroup: !!cat.isRawMaterialGroup,
    });
    setEditingCategory(cat);
    setShowAddModal(true);
    setDeleteError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    if (editingCategory) {
      updateProductCategory(editingCategory.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim(),
        description: formData.description.trim(),
        isRawMaterialGroup: formData.isRawMaterialGroup,
      });
    } else {
      addProductCategory({
        code: formData.code.trim(),
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim(),
        description: formData.description.trim(),
        isRawMaterialGroup: formData.isRawMaterialGroup,
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    const res = deleteProductCategory(id);
    if (!res.success) {
      setDeleteError(res.message || 'Cannot delete category');
      setTimeout(() => setDeleteError(null), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button type="button" onClick={() => setDeleteError(null)} className="text-rose-500 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'ক্যাটাগরির নাম দিয়ে খুঁজুন...' : 'Search product category...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
          />
        </div>

        {canManageCategories && (
          <button
            type="button"
            id="btn-add-product-category"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন ক্যাটাগরি তৈরি করুন' : 'Add New Category'}</span>
          </button>
        )}
      </div>

      {/* Categories Table List (Inventory & Products style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4">
                  {language === 'bn' ? 'ক্যাটাগরি কোড' : 'Category Code'}
                </th>
                <th className="py-3 px-4">
                  {language === 'bn' ? 'ক্যাটাগরির নাম ও বিবরণ' : 'Category Name & Description'}
                </th>
                <th className="py-3 px-4">
                  {language === 'bn' ? 'শ্রেণি / ধরন' : 'Classification'}
                </th>
                <th className="py-3 px-4 text-center">
                  {language === 'bn' ? 'যুক্ত পণ্যের সংখ্যা' : 'Linked Items'}
                </th>
                <th className="py-3 px-4 text-right">
                  {language === 'bn' ? 'অ্যাকশন' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {language === 'bn' ? 'কোনো ক্যাটাগরি পাওয়া যায়নি' : 'No categories found'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {language === 'bn'
                          ? 'অন্য কোনো নাম দিয়ে সার্চ করুন অথবা নতুন ক্যাটাগরি তৈরি করুন।'
                          : 'Try searching with another keyword or add a new category.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const itemCount = products.filter(
                    (p) => p.category?.toLowerCase() === cat.name.toLowerCase()
                  ).length;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 align-middle">
                        <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          {cat.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                        {cat.nameBn && (
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{cat.nameBn}</div>
                        )}
                        {cat.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                            {cat.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            cat.isRawMaterialGroup
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {cat.isRawMaterialGroup
                            ? language === 'bn'
                              ? 'র মেটেরিয়াল'
                              : 'Raw Material'
                            : language === 'bn'
                            ? 'ফিনিশড গুডস / সার্ভিস'
                            : 'Finished Goods / Service'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                          <Package className="w-3.5 h-3.5" />
                          <span>
                            {itemCount} {language === 'bn' ? 'টি আইটেম' : 'Items'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                            title={language === 'bn' ? 'সম্পাদনা' : 'Edit Category'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                            title={language === 'bn' ? 'মুছুন' : 'Delete Category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingCategory
                    ? language === 'bn'
                      ? 'ক্যাটাগরি সম্পাদনা'
                      : 'Edit Product Category'
                    : language === 'bn'
                    ? 'নতুন ক্যাটাগরি নিবন্ধন'
                    : 'Add New Product Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি কোড *' : 'Category Code *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CAT-PRINT"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ক্যাটাগরির নাম (English) *' : 'Category Name (EN) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. DIGITAL PRINTING"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বাংলা নাম' : 'Bengali Name'}
                </label>
                <input
                  type="text"
                  value={formData.nameBn}
                  onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                  placeholder="যেমন: ডিজিটাল প্রিন্টিং সেবা"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি ধরণ' : 'Category Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isRawMaterialGroup: false })}
                    className={`px-3 py-2 border rounded-xl text-center font-bold text-xs transition-all ${
                      !formData.isRawMaterialGroup
                        ? 'bg-slate-950 border-slate-950 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'bn' ? 'ফিনিশড গুডস / সার্ভিস' : 'Finished Goods / Services'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isRawMaterialGroup: true })}
                    className={`px-3 py-2 border rounded-xl text-center font-bold text-xs transition-all ${
                      formData.isRawMaterialGroup
                        ? 'bg-slate-950 border-slate-950 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'bn' ? 'র মেটেরিয়ালস' : 'Raw Materials'}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বিবরণ ও কার্যপরিধি' : 'Description / Scope'}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Items or services covered under this category..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE CATEGORY MODAL */}
      {categoryToDelete && (() => {
        const itemCount = products.filter(
          (p) => p.category?.toLowerCase() === categoryToDelete.name.toLowerCase()
        ).length;
        const hasProducts = itemCount > 0;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
                hasProducts 
                  ? 'bg-amber-50 text-amber-600 border-amber-100' 
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {hasProducts ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {hasProducts 
                    ? (language === 'bn' ? 'মুছে ফেলা সম্ভব নয়' : 'Cannot Delete Category')
                    : (language === 'bn' ? 'ক্যাটাগরি মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Category Deletion')
                  }
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  {hasProducts 
                    ? (language === 'bn'
                        ? `এই ক্যাটাগরিটির অধীনে বর্তমানে ${itemCount}টি প্রোডাক্ট/সার্ভিস যুক্ত রয়েছে। ক্যাটাগরি মুছে ফেলার আগে দয়া করে প্রোডাক্টগুলোকে অন্য ক্যাটাগরিতে স্থানান্তর করুন।`
                        : `This category cannot be deleted because it has ${itemCount} product(s) assigned to it. Please reassign them first.`)
                    : (language === 'bn'
                        ? `আপনি কি নিশ্চিত যে "${categoryToDelete.nameBn || categoryToDelete.name}" ক্যাটাগরিটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।`
                        : `Are you sure you want to delete the category "${categoryToDelete.name}"? This action cannot be undone.`)
                  }
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                {hasProducts ? (
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                  >
                    {language === 'bn' ? 'ঠিক আছে' : 'OK'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(categoryToDelete.id);
                        setCategoryToDelete(null);
                      }}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                    >
                      {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
