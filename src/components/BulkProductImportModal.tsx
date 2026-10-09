import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, AlertCircle, FileText, RefreshCw, Search, Check, Layers, ArrowRight, PackagePlus, HelpCircle, } from 'lucide-react';
import { downloadProductCsvTemplate, parseProductFile, parseProductCsvText, ParseResult, ParsedProductRow, SAMPLE_CSV_PRODUCTS, generateProductCsvTemplate, } from '../utils/csvImportUtils';
interface BulkProductImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}
export const BulkProductImportModal: React.FC<BulkProductImportModalProps> = ({ isOpen, onClose, onSuccess, }) => {
    const { products, bulkImportProducts, language, profile } = useApp();
    const isBn = language === 'bn';
    const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [csvText, setCsvText] = useState<string>('');
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    // Parsed results
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [updateExisting, setUpdateExisting] = useState<boolean>(true);
    const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'UPDATE' | 'ERROR'>('ALL');
    const [searchPreview, setSearchPreview] = useState<string>('');
    // Import completion state
    const [importSummary, setImportSummary] = useState<{
        added: number;
        updated: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    if (!isOpen)
        return null;
    // Process File
    const handleFileChange = async (file: File) => {
        setSelectedFile(file);
        setIsParsing(true);
        try {
            const result = await parseProductFile(file, products);
            setParseResult(result);
            setImportSummary(null);
        }
        catch (err) {
            console.error('Failed to parse file', err);
        }
        finally {
            setIsParsing(false);
        }
    };
    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            await handleFileChange(file);
        }
    };
    // Handle Text Paste parsing
    const handleParseText = () => {
        if (!csvText.trim())
            return;
        setIsParsing(true);
        try {
            const result = parseProductCsvText(csvText, products);
            setParseResult(result);
            setImportSummary(null);
        }
        catch (err) {
            console.error('Failed to parse CSV text', err);
        }
        finally {
            setIsParsing(false);
        }
    };
    // Load sample demo data directly into parser
    const handleLoadDemoData = () => {
        const sampleCsv = generateProductCsvTemplate(true);
        setCsvText(sampleCsv);
        setIsParsing(true);
        try {
            const result = parseProductCsvText(sampleCsv, products);
            setParseResult(result);
            setImportSummary(null);
        }
        catch (err) {
            console.error('Failed to parse sample data', err);
        }
        finally {
            setIsParsing(false);
        }
    };
    // Reset/Clear
    const handleClear = () => {
        setSelectedFile(null);
        setCsvText('');
        setParseResult(null);
        setImportSummary(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    // Execute Import
    const handleExecuteImport = () => {
        if (!parseResult || parseResult.rows.length === 0)
            return;
        // Filter to rows that don't have errors
        const validRowsToImport = parseResult.rows.filter((r) => r.status !== 'error');
        if (validRowsToImport.length === 0)
            return;
        setIsImporting(true);
        try {
            const formattedItems = validRowsToImport.map((row) => ({
                id: row.existingId,
                code: row.code,
                name: row.name,
                nameBn: row.nameBn,
                category: row.category,
                isRawMaterial: row.isRawMaterial,
                unit: row.unit,
                unitPrice: row.unitPrice,
                costPrice: row.costPrice,
                stockFactory: row.stockFactory,
                stockOffice: row.stockOffice,
                minStockAlert: row.minStockAlert,
                description: row.description,
            }));
            const summary = bulkImportProducts(formattedItems, { updateExisting });
            setImportSummary(summary);
            if (onSuccess) {
                onSuccess();
            }
        }
        catch (error) {
            console.error('Error importing products', error);
        }
        finally {
            setIsImporting(false);
        }
    };
    // Filter preview rows
    const visiblePreviewRows = (parseResult?.rows || []).filter((r) => {
        if (filterView === 'VALID' && r.status === 'error')
            return false;
        if (filterView === 'UPDATE' && !r.willUpdate)
            return false;
        if (filterView === 'ERROR' && r.status !== 'error')
            return false;
        if (searchPreview.trim()) {
            const q = searchPreview.toLowerCase();
            const match = r.name.toLowerCase().includes(q) ||
                (r.nameBn && r.nameBn.includes(q)) ||
                r.code.toLowerCase().includes(q) ||
                r.category.toLowerCase().includes(q);
            if (!match)
                return false;
        }
        return true;
    });
    const importableCount = (parseResult?.rows || []).filter((r) => r.status !== 'error').length;
    return (<div id="bulk-import-modal-overlay" className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div id="bulk-import-modal" className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <PackagePlus className="w-5 h-5"/>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                {'Bulk Product Upload & Catalog Setup'}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  CSV / Excel
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {'Import product catalogs, raw materials, selling & cost prices, and opening stock via CSV template.'}
              </p>
            </div>
          </div>

          <button type="button" id="btn-close-bulk-import" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Download Templates Banner */}
          <div id="template-download-section" className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600"/>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {'Step 1: Download Standard Template'}
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">
                {'Download our pre-structured template containing exact headers for signage, printing, gifts, and raw materials.'}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Columns:</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  *Product Name
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  *Category
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  *Unit
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  *Prices
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  Code, Stock, Bengali Name (Optional)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button type="button" id="btn-download-sample-csv" onClick={() => downloadProductCsvTemplate(true)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all" title="Download template with 8 pre-filled sample items">
                <Download className="w-3.5 h-3.5 text-emerald-600"/>
                <span>{'Template with Samples'}</span>
              </button>

              <button type="button" id="btn-download-blank-csv" onClick={() => downloadProductCsvTemplate(false)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all" title="Download blank template with header columns only">
                <Download className="w-3.5 h-3.5 text-slate-500"/>
                <span>{'Blank Template'}</span>
              </button>

              <button type="button" id="btn-load-demo-data" onClick={handleLoadDemoData} className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all" title="Load 8 sample printing/signage items directly to preview">
                <Layers className="w-3.5 h-3.5 text-amber-600"/>
                <span>{'Load Demo Data'}</span>
              </button>
            </div>
          </div>

          {/* Import Success Screen */}
          {importSummary && (<div id="import-success-banner" className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6"/>
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    {'Bulk Import Completed Successfully!'}
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {`Successfully processed ${importSummary.added + importSummary.updated} products into your system.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-center">
                <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    {'New Items Added'}
                  </span>
                  <span className="text-xl font-black text-emerald-900">{importSummary.added}</span>
                </div>
                <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    {'Existing Updated'}
                  </span>
                  <span className="text-xl font-black text-emerald-900">{importSummary.updated}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white/80 rounded-xl p-2.5 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    {'Audit Trail Status'}
                  </span>
                  <span className="text-xs font-black text-emerald-800 block mt-1">
                    {'Logged with Staff ID'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={handleClear} className="px-3.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50">
                  {'Import Another File'}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs">
                  {'Done / View in Inventory'}
                </button>
              </div>
            </div>)}

          {/* STEP 2: Input Area (Upload or Paste) */}
          {!importSummary && (<div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600"/>
                  {'Step 2: Choose File or Paste CSV'}
                </span>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button type="button" onClick={() => setInputMode('upload')} className={`px-3 py-1 rounded-md transition-all ${inputMode === 'upload'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'}`}>
                    {'Upload File (.csv, .xlsx)'}
                  </button>
                  <button type="button" onClick={() => setInputMode('paste')} className={`px-3 py-1 rounded-md transition-all ${inputMode === 'paste'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'}`}>
                    {'Paste Raw CSV'}
                  </button>
                </div>
              </div>

              {inputMode === 'upload' ? (<div id="csv-drag-drop-zone" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'}`}>
                  <input type="file" ref={fileInputRef} accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        handleFileChange(e.target.files[0]);
                    }
                }}/>

                  {selectedFile ? (<div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                        <FileSpreadsheet className="w-6 h-6"/>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {selectedFile.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull;{' '}
                          {'File parsed'}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                          {'Change File'}
                        </button>
                        <button type="button" onClick={handleClear} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors">
                          {'Remove'}
                        </button>
                      </div>
                    </div>) : (<div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                        <UploadCloud className="w-6 h-6"/>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">
                          {'Drag & Drop your CSV or Excel file here'}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5 block">
                          {'or browse from your device (.csv, .xlsx, .xls supported)'}
                        </span>
                      </div>
                      <button type="button" id="btn-browse-file" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all inline-flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-amber-400"/>
                        <span>{'Browse File'}</span>
                      </button>
                    </div>)}
                </div>) : (<div className="space-y-2">
                  <textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={`Item Code,Product Name,Category,Unit,Selling Price,Cost Price,Factory Stock\nDIG-101,Star Flex Banner 300 GSM,DIGITAL PRINTING,sqft,22,13,1000\nRAW-201,Glossy Vinyl Sticker Roll,RAW MATERIAL,roll,0,3800,20`} className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"/>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {'You can directly copy-paste spreadsheet cells or CSV text above.'}
                    </span>
                    <button type="button" id="btn-parse-text" disabled={!csvText.trim() || isParsing} onClick={handleParseText} className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5">
                      {isParsing ? (<RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400"/>) : (<Check className="w-3.5 h-3.5 text-amber-400"/>)}
                      <span>{'Parse & Preview'}</span>
                    </button>
                  </div>
                </div>)}
            </div>)}

          {/* STEP 3: Preview and Validation Table */}
          {!importSummary && parseResult && (<div id="preview-validation-section" className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {'Step 3: Verification & Data Preview'}
                  </span>
                </div>

                {/* Conflict Options Toggle */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"/>
                  <span>
                    {'Update existing product if Code or Name already exists'}
                  </span>
                </label>
              </div>

              {/* KPI Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {'Total Rows Found'}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {parseResult.totalRows}
                  </span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    {'Ready (New Items)'}
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {parseResult.validCount}
                  </span>
                </div>

                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">
                    {'Existing to Update'}
                  </span>
                  <span className="text-lg font-black text-blue-700">
                    {parseResult.duplicateCount}
                  </span>
                </div>

                <div className={`rounded-xl p-2.5 border ${parseResult.errorCount > 0
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <span className="text-[10px] uppercase font-bold block">
                    {'Invalid Rows (Errors)'}
                  </span>
                  <span className="text-lg font-black">
                    {parseResult.errorCount}
                  </span>
                </div>
              </div>

              {/* Table Controls (Search & View Filters) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold w-full sm:w-auto">
                  <button type="button" onClick={() => setFilterView('ALL')} className={`px-2.5 py-1 rounded-md transition-all ${filterView === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'}`}>
                    {'All'} ({parseResult.totalRows})
                  </button>
                  <button type="button" onClick={() => setFilterView('VALID')} className={`px-2.5 py-1 rounded-md transition-all ${filterView === 'VALID'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'}`}>
                    {'Importable'} ({importableCount})
                  </button>
                  {parseResult.duplicateCount > 0 && (<button type="button" onClick={() => setFilterView('UPDATE')} className={`px-2.5 py-1 rounded-md transition-all ${filterView === 'UPDATE'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'}`}>
                      {'Updates'} ({parseResult.duplicateCount})
                    </button>)}
                  {parseResult.errorCount > 0 && (<button type="button" onClick={() => setFilterView('ERROR')} className={`px-2.5 py-1 rounded-md transition-all ${filterView === 'ERROR'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:text-rose-800'}`}>
                      {'Errors'} ({parseResult.errorCount})
                    </button>)}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="text" value={searchPreview} onChange={(e) => setSearchPreview(e.target.value)} placeholder={'Filter preview items...'} className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"/>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2.5 text-center w-20">Status</th>
                      <th className="py-2 px-2.5">Code</th>
                      <th className="py-2 px-3">Product Name & Category</th>
                      <th className="py-2 px-2 text-center">Unit</th>
                      <th className="py-2 px-2.5 text-right">Selling Price</th>
                      <th className="py-2 px-2.5 text-right">Cost Price</th>
                      <th className="py-2 px-2.5 text-center">Stock (F/O)</th>
                      <th className="py-2 px-3">Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {visiblePreviewRows.length === 0 ? (<tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                          {'No rows match the current preview filter'}
                        </td>
                      </tr>) : (visiblePreviewRows.map((row) => (<tr key={row.rowNumber} className={`hover:bg-slate-50 transition-colors ${row.status === 'error'
                    ? 'bg-rose-50/40'
                    : row.willUpdate
                        ? 'bg-blue-50/30'
                        : ''}`}>
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                            {row.rowNumber}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {row.status === 'error' ? (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3"/>
                                {'Error'}
                              </span>) : row.willUpdate ? (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                <RefreshCw className="w-2.5 h-2.5"/>
                                {'Update'}
                              </span>) : (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3"/>
                                {'Valid'}
                              </span>)}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                            {row.code}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 leading-tight">
                              {row.name}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {row.nameBn && <span>{row.nameBn} &bull;</span>}
                              <span className="text-amber-700 font-semibold">{row.category}</span>
                              {row.isRawMaterial && (<span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[9px]">
                                  RAW
                                </span>)}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600 font-medium whitespace-nowrap">
                            {row.unit}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {profile.currencySymbol}{row.unitPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">
                            {profile.currencySymbol}{row.costPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-700 font-mono text-[11px] whitespace-nowrap">
                            <span title="Factory Stock">{row.stockFactory}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span title="Office Stock">{row.stockOffice}</span>
                          </td>
                          <td className="py-2 px-3 max-w-xs">
                            {row.errors.length > 0 ? (<div className="text-rose-600 font-semibold text-[11px] leading-snug">
                                {row.errors.join('; ')}
                              </div>) : row.warnings.length > 0 ? (<div className="text-amber-700 text-[11px] leading-snug">
                                {row.warnings.join('; ')}
                              </div>) : (<span className="text-slate-400 text-[11px]">
                                {'Passed'}
                              </span>)}
                          </td>
                        </tr>)))}
                  </tbody>
                </table>
              </div>
            </div>)}
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {parseResult && !importSummary ? (<span>
                {`${importableCount} valid products ready for import into active database.`}
              </span>) : null}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button type="button" id="btn-cancel-bulk-import" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
              {'Cancel'}
            </button>

            {parseResult && !importSummary && (<button type="button" id="btn-execute-bulk-import" disabled={importableCount === 0 || isImporting} onClick={handleExecuteImport} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none shadow-2xs flex items-center gap-2 transition-all">
                {isImporting ? (<RefreshCw className="w-4 h-4 animate-spin text-white"/>) : (<PackagePlus className="w-4 h-4 text-emerald-200"/>)}
                <span>
                  {`Import ${importableCount} Products Now`}
                </span>
              </button>)}
          </div>
        </div>
      </div>
    </div>);
};
