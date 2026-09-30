import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StaffMember, UserRole, StaffRole } from '../types';
import { ALL_SYSTEM_PERMISSIONS as SYSTEM_PERMISSIONS } from '../data/accountingAndConfigData';
import {
  Users,
  Shield,
  KeyRound,
  Trash2,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building2,
  Factory,
  Mail,
  Phone,
  Search,
  Lock,
  SlidersHorizontal,
  FolderSync,
  FileSpreadsheet,
  AlertOctagon,
  CheckSquare,
  Square,
  Sparkles,
  Server,
  Globe,
  ExternalLink,
  Cpu,
  HardDrive,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const {
    staffMembers = [],
    userRoles = [],
    activeStaff,
    setActiveStaff,
    language,
    profile,
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    addUserRole,
    updateUserRole,
    deleteUserRole,
    cleanModuleData,
    resetToDefaultData,
    checkPermission,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'data-clean' | 'system'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  // User modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    nameBn: '',
    role: 'Sales Executive' as StaffRole,
    roleBn: 'বিক্রয় প্রতিনিধি',
    location: 'Office' as 'Office' | 'Factory' | 'Both',
    phone: '',
    email: '',
    customRoleId: '',
    isActive: true,
  });

  // Role modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    nameBn: '',
    description: '',
    permissions: [] as string[],
  });

  // Data cleanup modal state
  const [cleanConfirmModule, setCleanConfirmModule] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  const canManageUsers = checkPermission('SETTINGS_MANAGE_USERS');
  const canManageRoles = checkPermission('SETTINGS_MANAGE_ROLES');
  const canCleanData = checkPermission('SETTINGS_CLEAN_DATA');

  // Filtered staff members
  const filteredStaff = staffMembers.filter((staff) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      staff.name.toLowerCase().includes(q) ||
      (staff.nameBn && staff.nameBn.includes(q)) ||
      staff.role.toLowerCase().includes(q) ||
      (staff.phone && staff.phone.includes(q))
    );
  });

  // User Handlers
  const handleOpenAddUser = () => {
    setUserFormData({
      name: '',
      nameBn: '',
      role: 'Sales Executive',
      roleBn: 'বিক্রয় প্রতিনিধি',
      location: 'Office',
      phone: '',
      email: '',
      customRoleId: userRoles[0]?.id || '',
      isActive: true,
    });
    setEditingStaff(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (staff: StaffMember) => {
    setUserFormData({
      name: staff.name,
      nameBn: staff.nameBn || '',
      role: staff.role,
      roleBn: staff.roleBn || '',
      location: staff.location,
      phone: staff.phone || '',
      email: staff.email || '',
      customRoleId: staff.customRoleId || '',
      isActive: staff.isActive !== false,
    });
    setEditingStaff(staff);
    setShowUserModal(true);
  };

  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name.trim()) return;

    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600', 'bg-indigo-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    if (editingStaff) {
      updateStaffMember(editingStaff.id, {
        name: userFormData.name.trim(),
        nameBn: userFormData.nameBn.trim(),
        role: userFormData.role,
        roleBn: userFormData.roleBn,
        location: userFormData.location,
        phone: userFormData.phone.trim(),
        email: userFormData.email.trim(),
        customRoleId: userFormData.customRoleId || undefined,
        isActive: userFormData.isActive,
      });
    } else {
      addStaffMember({
        name: userFormData.name.trim(),
        nameBn: userFormData.nameBn.trim(),
        role: userFormData.role,
        roleBn: userFormData.roleBn,
        location: userFormData.location,
        phone: userFormData.phone.trim(),
        email: userFormData.email.trim(),
        avatarColor: randomColor,
        customRoleId: userFormData.customRoleId || undefined,
        isActive: userFormData.isActive,
      });
    }

    setShowUserModal(false);
  };

  const handleDeleteUser = (id: string) => {
    if (staffMembers.length <= 1) {
      alert('Cannot delete the last remaining staff member.');
      return;
    }
    if (activeStaff.id === id) {
      alert('You cannot delete the currently active logged-in staff member.');
      return;
    }
    if (confirm('Are you sure you want to remove this staff user?')) {
      deleteStaffMember(id);
    }
  };

  // Role Handlers
  const handleOpenAddRole = () => {
    setRoleFormData({
      name: '',
      nameBn: '',
      description: '',
      permissions: ['POS_CREATE_INVOICE', 'SALES_VIEW_LIST', 'INVENTORY_VIEW_LIST'],
    });
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: UserRole) => {
    setRoleFormData({
      name: role.name,
      nameBn: role.nameBn || '',
      description: role.description || '',
      permissions: [...role.permissions],
    });
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleTogglePermission = (permCode: string) => {
    setRoleFormData((prev) => {
      const exists = prev.permissions.includes(permCode);
      const newPerms = exists
        ? prev.permissions.filter((p) => p !== permCode)
        : [...prev.permissions, permCode];
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSelectAllCategory = (cat: string) => {
    const categoryPerms = SYSTEM_PERMISSIONS.filter((p) => p.category === cat).map((p) => p.code);
    setRoleFormData((prev) => {
      const allSelected = categoryPerms.every((code) => prev.permissions.includes(code));
      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((code) => !categoryPerms.includes(code)),
        };
      } else {
        const union = Array.from(new Set([...prev.permissions, ...categoryPerms]));
        return { ...prev, permissions: union };
      }
    });
  };

  const handleRoleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) return;

    if (editingRole) {
      updateUserRole(editingRole.id, {
        name: roleFormData.name.trim(),
        nameBn: roleFormData.nameBn.trim(),
        description: roleFormData.description.trim(),
        permissions: roleFormData.permissions,
      });
    } else {
      addUserRole({
        name: roleFormData.name.trim(),
        nameBn: roleFormData.nameBn.trim(),
        description: roleFormData.description.trim(),
        permissions: roleFormData.permissions,
      });
    }

    setShowRoleModal(false);
  };

  // Module Cleanup
  const handleExecuteClean = (moduleKey: any) => {
    let mappedKey = moduleKey;
    if (moduleKey === 'invoices') {
      mappedKey = 'SALES';
      // Clear quotations too for a complete sales wipe
      cleanModuleData('QUOTATIONS');
    } else if (moduleKey === 'stockMovements') {
      mappedKey = 'INVENTORY_STOCK';
    } else if (moduleKey === 'purchaseOrders') {
      mappedKey = 'PURCHASES';
    } else if (moduleKey === 'transactions') {
      mappedKey = 'TRANSACTIONS';
      // Clear journals too for a complete accounting ledger wipe
      cleanModuleData('JOURNALS');
    } else if (moduleKey === 'WIPE_ALL_EXCEPT_PRODUCTS') {
      mappedKey = 'WIPE_ALL_EXCEPT_PRODUCTS';
    }

    cleanModuleData(mappedKey);
    setCleanConfirmModule(null);
    if (moduleKey === 'WIPE_ALL_EXCEPT_PRODUCTS') {
      setCleanFeedback(language === 'bn' ? 'প্রোডাক্ট তালিকা ছাড়া অন্য সকল ট্রানজেকশন সফলভাবে ক্লিন করা হয়েছে।' : 'All transactions wiped successfully except product catalog.');
    } else {
      setCleanFeedback(`Module '${moduleKey}' data purged successfully.`);
    }
    setTimeout(() => setCleanFeedback(null), 4000);
  };

  const handleFactoryReset = () => {
    if (
      confirm(
        'CRITICAL WARNING: This will reset the entire ERP database to default demo records and clear cached changes. Are you sure?'
      )
    ) {
      resetToDefaultData();
      setCleanFeedback('System successfully restored to default baseline.');
      setTimeout(() => setCleanFeedback(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Shield className="w-4 h-4" />
            <span>{language === 'bn' ? 'ইয়ারপি সিস্টেম কন্ট্রোল অ্যান্ড রোল পারমিশন' : 'ERP System Configuration & RBAC'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1">
            {language === 'bn' ? 'সিস্টেম কনফিগারেশন ও অ্যাডমিন মডিউল' : 'Enterprise Control & Settings'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {language === 'bn'
              ? 'ইউজার তৈরি, দায়িত্বভিত্তিক পারমিশন রোল নির্ধারণ, মডিউলার ডাটা ক্লিন ও নিরাপত্তা নিয়ন্ত্রণ করুন।'
              : 'Configure system users, assign role-based access control (RBAC), manage module data, and set security policies.'}
          </p>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
            {activeStaff.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">সক্রিয় অ্যাকাউন্ট (Current Session):</span>
            <span className="font-bold text-white">{activeStaff.name}</span>
            <span className="text-[11px] text-amber-400 font-semibold block">({activeStaff.role})</span>
          </div>
        </div>
      </div>

      {cleanFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{cleanFeedback}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          id="tab-settings-users"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === 'bn' ? 'ইউজার ও স্টাফ তালিকা' : 'Users & Staff'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-amber-300">
            {staffMembers.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-settings-roles"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>{language === 'bn' ? 'রোলস ও পারমিশন (RBAC)' : 'Roles & Permissions'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
            {userRoles.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-settings-dataclean"
          onClick={() => setActiveTab('data-clean')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'data-clean'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-rose-700 border border-slate-200'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>{language === 'bn' ? 'মডিউলার ডাটা ক্লিন / ডিলিট' : 'Module Data Clean'}</span>
        </button>

        <button
          type="button"
          id="tab-settings-system"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'system'
              ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-700 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4 text-blue-500" />
          <span>{language === 'bn' ? 'সিস্টেম ও আইটি পার্টনার' : 'System & IT Partner'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
            BD HOSTT
          </span>
        </button>
      </div>

      {/* TAB 1: USERS & STAFF */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'নাম বা পদবি দিয়ে খুঁজুন...' : 'Search staff by name or role...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            {canManageUsers && (
              <button
                type="button"
                id="btn-add-staff-member"
                onClick={handleOpenAddUser}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন ইউজার / স্টাফ যুক্ত করুন' : 'Add New User / Staff'}</span>
              </button>
            )}
          </div>

          {/* Users & Staff Table List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-3 px-4">
                      {language === 'bn' ? 'স্টাফ / ইউজার' : 'Staff / User'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'bn' ? 'পদবি ও দায়িত্ব' : 'Designation & Role'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'bn' ? 'কর্মস্থল' : 'Work Location'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'bn' ? 'যোগাযোগের তথ্য' : 'Contact'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'bn' ? 'RBAC পারমিশন রোল' : 'RBAC Access Role'}
                    </th>
                    <th className="py-3 px-4 text-center">
                      {language === 'bn' ? 'বর্তমান সেশন' : 'Current Session'}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {language === 'bn' ? 'অ্যাকশন' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                            <Users className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {language === 'bn' ? 'কোনো ইউজার বা স্টাফ পাওয়া যায়নি' : 'No staff members found'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {language === 'bn'
                              ? 'নাম অথবা পদবি দিয়ে আবার সার্চ করুন অথবা নতুন ইউজার যুক্ত করুন।'
                              : 'Try searching with another name/role or add a new user.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => {
                      const assignedRole = (userRoles || []).find((r) => r.id === staff.customRoleId);
                      const isCurrent = activeStaff.id === staff.id;

                      return (
                        <tr
                          key={staff.id}
                          className={`transition-colors ${
                            isCurrent
                              ? 'bg-amber-50/50 hover:bg-amber-50/80'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl ${staff.avatarColor || 'bg-slate-700'} text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0`}
                              >
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  <span>{staff.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded border border-amber-300">
                                      You
                                    </span>
                                  )}
                                </div>
                                {staff.nameBn && (
                                  <div className="text-xs text-slate-500 font-medium">{staff.nameBn}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-middle">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs inline-block">
                              {staff.role}
                            </span>
                            {staff.roleBn && (
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {staff.roleBn}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-middle">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              {staff.location === 'Factory' ? (
                                <Factory className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              <span>{staff.location}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-middle">
                            <div className="space-y-0.5 text-xs text-slate-600">
                              {staff.phone ? (
                                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{staff.phone}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                              {staff.email && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[150px]">{staff.email}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-middle">
                            {assignedRole ? (
                              <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                {assignedRole.name}
                              </span>
                            ) : (
                              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                {language === 'bn' ? 'ডিফল্ট অ্যাক্সেস' : 'Default Access'}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center align-middle">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active Now</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveStaff(staff)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              >
                                {language === 'bn' ? 'লগইন স্যুইচ' : 'Switch To'}
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(staff)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                title={language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(staff.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                                  title={language === 'bn' ? 'মুছুন' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      )}

      {/* TAB 2: ROLES & RBAC PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'bn' ? 'সিস্টেম অ্যাক্সেস রোল ও পারমিশন কন্ট্রোল' : 'Role-Based Access Control (RBAC)'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'প্রতিটি রোলের জন্য আলাদা পারমিশন চেক অন/অফ করতে পারবেন।'
                  : 'Define custom access roles and toggle granular module permissions.'}
              </p>
            </div>

            {canManageRoles && (
              <button
                type="button"
                id="btn-add-custom-role"
                onClick={handleOpenAddRole}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন রোল তৈরি করুন' : 'Create Custom Role'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRoles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">{role.name}</h4>
                        {role.isSystem && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            System Role
                          </span>
                        )}
                      </div>
                      {role.nameBn && <p className="text-xs text-slate-500">{role.nameBn}</p>}
                      <p className="text-xs text-slate-600 mt-1">{role.description}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        title="পারমিশন সম্পাদনা"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete role '${role.name}'?`)) {
                              deleteUserRole(role.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      অনুমোদিত পারমিশন ({role.permissions.length} টি সক্রিয়):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {role.permissions.map((permCode) => {
                        const permObj = SYSTEM_PERMISSIONS.find((p) => p.code === permCode);
                        return (
                          <span
                            key={permCode}
                            className="inline-block text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200"
                          >
                            {permObj ? (language === 'bn' ? permObj.nameBn : permObj.name) : permCode}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    নিযুক্ত ব্যবহারকারী:{' '}
                    <strong className="text-slate-900">
                      {staffMembers.filter((s) => s.customRoleId === role.id || s.role === role.name).length}
                    </strong>{' '}
                    জন
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditRole(role)}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    পারমিশন পরিবর্তন করুন ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MODULE DATA CLEAN & PURGE */}
      {activeTab === 'data-clean' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-900 text-sm">
                {language === 'bn' ? 'মডিউলার ডাটা ক্লিন ও রিসেট সেন্টার' : 'Modular Data Purge & Wipe Center'}
              </h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {language === 'bn'
                  ? 'আপনার অনুরোধ অনুযায়ী প্রতিটি মডিউলের ডাটা স্বতন্ত্রভাবে পরিষ্কার (Clean) করার ব্যবস্থা রাখা হয়েছে। সতর্কতার সাথে নির্বাচন করুন; মোছা ডাটা পুনরুদ্ধার করা যাবে না।'
                  : 'You can selectively purge data for specific modules (e.g., test sales invoices or purchase orders) or restore baseline demo data.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales / POS Invoices Clean */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">১. সেলস ও ইনভয়েস ডাটা ক্লিন</span>
                <span className="text-xs font-mono text-slate-500">POS & Sales</span>
              </div>
              <p className="text-xs text-slate-500">
                সমস্ত ইনভয়েস, ওয়ার্ক অর্ডার, ও কোটেশন ডিলিট করবে। কাস্টমার ও প্রোডাক্ট তালিকা অক্ষুণ্ণ থাকবে।
              </p>
              <button
                type="button"
                onClick={() => setCleanConfirmModule('invoices')}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ইনভয়েস ডাটা মুছে ফেলুন</span>
              </button>
            </div>

            {/* Inventory Movements Clean */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">২. স্টক মুভমেন্ট হিস্ট্রি ক্লিন</span>
                <span className="text-xs font-mono text-slate-500">Stock Movements</span>
              </div>
              <p className="text-xs text-slate-500">
                সমস্ত ট্রান্সফার ও স্টক এডজাস্টমেন্ট হিস্ট্রি মুছে ফেলবে। পণ্যের মূল তথ্য অপরিবর্তিত থাকবে।
              </p>
              <button
                type="button"
                onClick={() => setCleanConfirmModule('stockMovements')}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>মুভমেন্ট লগ মুছে ফেলুন</span>
              </button>
            </div>

            {/* Supply Chain PO Clean */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">৩. পারচেস অর্ডার (PO) ক্লিন</span>
                <span className="text-xs font-mono text-slate-500">Purchase Orders</span>
              </div>
              <p className="text-xs text-slate-500">
                সমস্ত সাপ্লায়ার পারচেস অর্ডার রেকর্ড ডিলিট করবে। সাপ্লায়ার তালিকা অক্ষুণ্ণ থাকবে।
              </p>
              <button
                type="button"
                onClick={() => setCleanConfirmModule('purchaseOrders')}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>পারচেস অর্ডার মুছে ফেলুন</span>
              </button>
            </div>

            {/* Accounting Transactions Clean */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">৪. ফিনান্সিয়াল লেনদেন ও লেজার ক্লিন</span>
                <span className="text-xs font-mono text-slate-500">Accounting Ledger</span>
              </div>
              <p className="text-xs text-slate-500">
                সকল দৈনিক খরচ, আয় ও জার্নাল ভাউচার ডিলিট করে ব্যালেন্স শূন্যে রিসেট করবে।
              </p>
              <button
                type="button"
                onClick={() => setCleanConfirmModule('transactions')}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>লেনদেন ডাটা মুছে ফেলুন</span>
              </button>
            </div>

            {/* Wipe All Except Products */}
            <div className="bg-rose-50/60 p-5 rounded-2xl border-2 border-dashed border-rose-200 shadow-2xs space-y-3 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-rose-950 text-sm">৫. সম্পূর্ণ সিস্টেম ডাটা রিসেট (প্রোডাক্ট বাদে)</span>
                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-100/60 px-2.5 py-0.5 rounded-full">RECOMMENDED START</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed font-medium">
                এটি সমস্ত ইনভয়েস, কোটেশন, পারচেস অর্ডার, কাস্টমার/সাপ্লায়ার ডিরেক্টরি এবং হিসাবের সমস্ত ট্রানজেকশন (ক্যাশ, ব্যাংক, বিকাশ ইত্যাদি ব্যালেন্স সহ) সম্পূর্ণ মুছে শূন্য (৳০) করবে। 
                <strong> তবে আপনার ইনভেন্টরি বা প্রোডাক্ট ক্যাটালগটি অক্ষুণ্ণ থাকবে এবং সমস্ত প্রোডাক্টের স্টক কোয়ান্টিটি ০ হয়ে যাবে।</strong>
              </p>
              <button
                type="button"
                onClick={() => setCleanConfirmModule('WIPE_ALL_EXCEPT_PRODUCTS')}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>সব ডাটা মুছুন কিন্তু প্রোডাক্ট ক্যাটালগ রাখুন (স্টক ০)</span>
              </button>
            </div>
          </div>

          {/* Master Reset */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-amber-400">সিস্টেম ফ্যাক্টরি রিসেট (Full Baseline Reset)</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                সমস্ত টেস্ট ডাটা মুছে প্রাথমিক স্ট্যান্ডার্ড ডেমো ডাটাবেসে সিস্টেম ফিরিয়ে আনুন।
              </p>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>রিসেট টু ডিফল্ট</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM & IT PARTNER (BD HOSTT) */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-extrabold tracking-widest uppercase bg-blue-500/20 text-cyan-300 border border-blue-400/40 px-3 py-1 rounded-full">
                    OFFICIAL TECHNOLOGY &amp; IT PARTNER
                  </span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Verified IT Infrastructure
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  BD HOSTT
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  <strong>DotColorCommunication Sales, POS &amp; ERP</strong> is proudly designed, engineered, and powered by <strong>BD HOSTT</strong>. We provide end-to-end cloud infrastructure, web hosting, domain registration, and custom enterprise software development.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    Hotline: <strong className="text-white">01846100900, 01756007600</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <strong className="text-white">info@bdhost.com</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <strong className="text-white">www.bdhost.com</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full sm:w-auto">
                <a
                  href="https://www.bdhost.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-center"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit BD HOSTT Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="tel:01846100900"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 text-center"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Contact IT Hotline</span>
                </a>
              </div>
            </div>
          </div>

          {/* BD HOSTT Services Grid */}
          <div>
            <h4 className="font-black text-slate-900 text-base mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{language === 'bn' ? 'BD HOSTT এর মূল আইটি সার্ভিস ও সেবা সমূহ' : 'BD HOSTT IT Services & Capabilities'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">Custom POS &amp; ERP Engineering</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tailored enterprise resource planning, automated sales billing, barcode scanning, manufacturing workflow, and double-entry accounting software.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">High-Performance NVMe Hosting</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ultra-fast NVMe SSD web hosting with LiteSpeed web server, cPanel management, 99.9% uptime SLA, and BDIX super-fast Bangladesh routing.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">Domain Registration &amp; Corporate Mail</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Instant global domain registration (.com, .net, .org, .xyz, .com.bd) with DNS management and dedicated corporate business email suites.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">Cloud VPS &amp; Dedicated Infrastructure</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Scalable cloud compute instances, KVM virtualization, dedicated root access, custom firewall, and high bandwidth network connectivity.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">Cybersecurity &amp; Cloud Backup</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Free Wildcard SSL certificates, anti-DDoS protection, automated daily database snapshots, and secure MongoDB Atlas cloud synchronization.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">24/7 Dedicated Support SLA</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Round-the-clock technical support desk, WhatsApp hotline, direct phone consultation, and guaranteed rapid response times for enterprise clients.
                </p>
              </div>
            </div>
          </div>

          {/* System Environment Specs */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
            <h4 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>{language === 'bn' ? 'বর্তমান সিস্টেম এনভায়রনমেন্ট ও স্পেসিফিকেশন' : 'System Environment & Architecture'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">APPLICATION</span>
                <span className="font-extrabold text-slate-900 mt-1 block">DotColorCommunication</span>
                <span className="text-slate-500 text-[11px]">Sales, POS &amp; ERP Edition</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DEVELOPER &amp; PARTNER</span>
                <span className="font-extrabold text-blue-700 mt-1 block">BD HOSTT</span>
                <span className="text-slate-500 text-[11px]">www.bdhost.com</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CLOUD SYNCHRONIZATION</span>
                <span className="font-extrabold text-emerald-700 mt-1 block">MongoDB Atlas Cloud</span>
                <span className="text-slate-500 text-[11px]">Hybrid Local &amp; Cloud Sync</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TECHNICAL HOTLINE</span>
                <span className="font-extrabold text-slate-900 mt-1 block">01846100900</span>
                <span className="text-slate-500 text-[11px]">24/7 Support Available</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Confirmation Modal */}
      {cleanConfirmModule && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">ডাটা মুছে ফেলার নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-500 mt-1">
                {cleanConfirmModule === 'WIPE_ALL_EXCEPT_PRODUCTS' ? (
                  <span>আপনি কি নিশ্চিত যে <strong>ইনভেন্টরি প্রোডাক্ট তালিকা বাদে</strong> অন্য সব ডাটা (ইনভয়েস, লেজার, কাস্টমার, ক্যাশ/ব্যাংক ব্যালেন্স) সম্পূর্ণ মুছে সিস্টেমের স্টক ০ করতে চান?</span>
                ) : (
                  <span>আপনি কি নিশ্চিত যে <strong className="text-slate-900">{cleanConfirmModule}</strong> মডিউলের সমস্ত রেকর্ড মুছে ফেলতে চান?</span>
                )}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCleanConfirmModule(null)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleExecuteClean(cleanConfirmModule)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUserFormSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingStaff
                    ? language === 'bn'
                      ? 'ইউজার তথ্য সম্পাদনা'
                      : 'Edit User / Staff'
                    : language === 'bn'
                    ? 'নতুন ইউজার নিবন্ধন'
                    : 'Add New Staff / User'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'নাম (English) *' : 'Full Name (EN) *'}
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বাংলা নাম' : 'Bengali Name'}
                </label>
                <input
                  type="text"
                  value={userFormData.nameBn}
                  onChange={(e) => setUserFormData({ ...userFormData, nameBn: e.target.value })}
                  placeholder="যেমন: তানভীর আহমেদ"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'পদবি (Primary Role)' : 'Primary Role'}
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => {
                      const r = e.target.value as StaffRole;
                      const bn =
                        r === 'Super Admin'
                          ? 'সুপার অ্যাডমিন'
                          : r === 'Branch Manager'
                          ? 'ব্রাঞ্চ ম্যানেজার'
                          : r === 'Factory Supervisor'
                          ? 'ফ্যাক্টরি সুপারভাইজার'
                          : r === 'Accountant'
                          ? 'প্রধান হিসাবরক্ষক'
                          : 'বিক্রয় প্রতিনিধি';
                      setUserFormData({ ...userFormData, role: r, roleBn: bn });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Branch Manager">Branch Manager</option>
                    <option value="Factory Supervisor">Factory Supervisor</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Sales Executive">Sales Executive</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'কর্মস্থল (Branch/Site)' : 'Site Location'}
                  </label>
                  <select
                    value={userFormData.location}
                    onChange={(e) => setUserFormData({ ...userFormData, location: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Both">Central Warehouse & Office (সেন্ট্রাল ওয়্যারহাউজ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'নিযুক্ত RBAC রোল পারমিশন' : 'Assign RBAC Role Profile'}
                </label>
                <select
                  value={userFormData.customRoleId}
                  onChange={(e) => setUserFormData({ ...userFormData, customRoleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-purple-700"
                >
                  <option value="">-- {language === 'bn' ? 'ডিফল্ট রোল পারমিশন' : 'Default Primary Role'} --</option>
                  {userRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} perms)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="+88018..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'ইমেইল' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="user@dotcolorcommunication.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'ইউজার সংরক্ষণ' : 'Save User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Role & Granular Permissions Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRoleFormSubmit}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingRole
                    ? language === 'bn'
                      ? 'রোল পারমিশন কনফিগারেশন'
                      : 'Edit Role Permissions'
                    : language === 'bn'
                    ? 'নতুন রোল তৈরি করুন'
                    : 'Create New Access Role'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'রোলের নাম (English) *' : 'Role Name (EN) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    placeholder="e.g. Inventory Controller"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'বাংলা নাম' : 'Role Name (BN)'}
                  </label>
                  <input
                    type="text"
                    value={roleFormData.nameBn}
                    onChange={(e) => setRoleFormData({ ...roleFormData, nameBn: e.target.value })}
                    placeholder="যেমন: ইনভেন্টরি নিয়ন্ত্রক"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {language === 'bn' ? 'বিবরণ ও দায়িত্ব' : 'Description'}
                </label>
                <input
                  type="text"
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Primary duties and access scope..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Module-wise Granular Permissions Matrix */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">
                    {language === 'bn' ? 'মডিউলভিত্তিক পারমিশন নির্বাচন' : 'Granular Permissions Matrix'}
                  </span>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {roleFormData.permissions.length} permissions active
                  </span>
                </div>

                {['POS', 'Sales', 'Inventory', 'Supply Chain', 'Accounting', 'Settings'].map((cat) => {
                  const perms = SYSTEM_PERMISSIONS.filter((p) => p.category === cat);
                  const allCatSelected = perms.every((p) => roleFormData.permissions.includes(p.code));

                  return (
                    <div key={cat} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="font-bold text-slate-800 text-xs">{cat} Module</span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllCategory(cat)}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          {allCatSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {perms.map((p) => {
                          const checked = roleFormData.permissions.includes(p.code);
                          return (
                            <label
                              key={p.code}
                              className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                checked
                                  ? 'bg-amber-50/60 border-amber-300 text-slate-900 font-semibold'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleTogglePermission(p.code)}
                                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
                              />
                              <div>
                                <span className="block text-xs leading-tight">
                                  {language === 'bn' ? p.nameBn : p.name}
                                </span>
                                <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{p.code}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {language === 'bn' ? 'রোল সংরক্ষণ করুন' : 'Save Role & Permissions'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
