import * as XLSX from 'xlsx';
import { ProductItem, ServiceCategory, UnitType } from '../types';
export const VALID_CATEGORIES: Array<ServiceCategory | 'RAW MATERIAL'> = [
    'DIGITAL PRINTING',
    'PRINTING & PACKAGING',
    'SIGN MAKING & LETTERING',
    'BRANDED PROMOTIONAL GIFTS',
    'GRAPHIC DESIGN',
    'EXHIBITION',
    'EVENTS MANAGEMENT',
    'VENUE SOURCING',
    'RAW MATERIAL',
];
export const VALID_UNITS: UnitType[] = [
    'pcs',
    'sqft',
    'roll',
    'ream',
    'ltr',
    'box',
    'set',
    'job',
    'pack',
];
export interface ParsedProductRow {
    rowNumber: number;
    code: string;
    name: string;
    nameBn?: string;
    category: ServiceCategory | 'RAW MATERIAL';
    isRawMaterial: boolean;
    unit: UnitType;
    unitPrice: number;
    costPrice: number;
    stockFactory: number;
    stockOffice: number;
    minStockAlert: number;
    description?: string;
    status: 'valid' | 'warning' | 'error';
    errors: string[];
    warnings: string[];
    isDuplicate: boolean;
    existingId?: string;
    willUpdate: boolean;
}
export interface ParseResult {
    rows: ParsedProductRow[];
    totalRows: number;
    validCount: number;
    warningCount: number;
    errorCount: number;
    duplicateCount: number;
}
export const SAMPLE_CSV_PRODUCTS = [
    {
        code: 'DIG-101',
        name: 'Star Flex Banner 300 GSM Frontlit',
        nameBn: "",
        category: 'DIGITAL PRINTING',
        isRawMaterial: 'No',
        unit: 'sqft',
        unitPrice: '22',
        costPrice: '13',
        stockFactory: '1500',
        stockOffice: '250',
        minStockAlert: '300',
        description: 'Solvent & Eco-Solvent outdoor printable banner fabric roll',
    },
    {
        code: 'RAW-201',
        name: 'White Glossy Self-Adhesive Vinyl Roll (4.2ft x 164ft)',
        nameBn: "",
        category: 'RAW MATERIAL',
        isRawMaterial: 'Yes',
        unit: 'roll',
        unitPrice: '0',
        costPrice: '3800',
        stockFactory: '25',
        stockOffice: '5',
        minStockAlert: '6',
        description: '100 micron waterproof outdoor adhesive vinyl for eco-solvent printers',
    },
    {
        code: 'SGN-301',
        name: '3D Golden Mirror Acrylic Letter Signage',
        nameBn: "",
        category: 'SIGN MAKING & LETTERING',
        isRawMaterial: 'No',
        unit: 'pcs',
        unitPrice: '120',
        costPrice: '65',
        stockFactory: '60',
        stockOffice: '15',
        minStockAlert: '10',
        description: 'Laser-cut 3mm golden acrylic with 18mm high-density foam base',
    },
    {
        code: 'PKG-401',
        name: 'Custom Printed Duplex Board Folding Box 350 GSM',
        nameBn: "Print",
        category: 'PRINTING & PACKAGING',
        isRawMaterial: 'No',
        unit: 'pcs',
        unitPrice: '18',
        costPrice: '9.5',
        stockFactory: '8000',
        stockOffice: '500',
        minStockAlert: '1500',
        description: 'Offset printed 4-color with matte thermal lamination & die cutting',
    },
    {
        code: 'GFT-501',
        name: 'Corporate Executive Metal Pen with Custom Laser Engraving',
        nameBn: "",
        category: 'BRANDED PROMOTIONAL GIFTS',
        isRawMaterial: 'No',
        unit: 'pcs',
        unitPrice: '160',
        costPrice: '85',
        stockFactory: '350',
        stockOffice: '60',
        minStockAlert: '50',
        description: 'Matte black metal twist-action pen in individual gift sleeve',
    },
    {
        code: 'DES-601',
        name: 'Corporate Brand Identity & Logo Master Package',
        nameBn: "",
        category: 'GRAPHIC DESIGN',
        isRawMaterial: 'No',
        unit: 'job',
        unitPrice: '5000',
        costPrice: '1500',
        stockFactory: '99',
        stockOffice: '99',
        minStockAlert: '5',
        description: 'Vector logo, stationery suite, brand guideline handbook (PDF/AI)',
    },
    {
        code: 'RAW-701',
        name: 'Solvent Cyan Ink Bottle (5 Liters)',
        nameBn: "Print",
        category: 'RAW MATERIAL',
        isRawMaterial: 'Yes',
        unit: 'ltr',
        unitPrice: '0',
        costPrice: '750',
        stockFactory: '35',
        stockOffice: '5',
        minStockAlert: '10',
        description: 'Industrial heavy-duty solvent Cyan ink for Seiko/Konica printheads',
    },
    {
        code: 'EXH-801',
        name: 'Aluminium Teardrop Roll-Up Banner Stand (2.5ft x 6ft)',
        nameBn: "-",
        category: 'EXHIBITION',
        isRawMaterial: 'No',
        unit: 'set',
        unitPrice: '1750',
        costPrice: '1100',
        stockFactory: '45',
        stockOffice: '12',
        minStockAlert: '10',
        description: 'Luxury heavy-duty aluminium base with oxford carrying bag',
    },
];
/**
 * Generate CSV template string with UTF-8 BOM so Excel opens Bengali correctly
 */
export const generateProductCsvTemplate = (includeSampleRows: boolean = true): string => {
    const headers = [
        'Item Code (Optional)',
        'Product Name (Required)',
        'Bengali Name (Optional)',
        'Category (Required)',
        'Is Raw Material (Yes/No)',
        'Unit (Required)',
        'Selling Price (BDT)',
        'Cost Price (BDT)',
        'Factory Stock',
        'Office Stock',
        'Min Stock Alert',
        'Description (Optional)',
    ];
    const escapeCsv = (val: string | number | undefined): string => {
        if (val === undefined || val === null)
            return '';
        const str = String(val).trim();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const rows: string[] = [headers.map(escapeCsv).join(',')];
    if (includeSampleRows) {
        SAMPLE_CSV_PRODUCTS.forEach((p) => {
            rows.push([
                p.code,
                p.name,
                p.nameBn,
                p.category,
                p.isRawMaterial,
                p.unit,
                p.unitPrice,
                p.costPrice,
                p.stockFactory,
                p.stockOffice,
                p.minStockAlert,
                p.description,
            ]
                .map(escapeCsv)
                .join(','));
        });
    }
    // Prepend UTF-8 BOM for perfect Excel compatibility with Bangla
    return `\uFEFF${rows.join('\r\n')}`;
};
/**
 * Download CSV Template file
 */
export const downloadProductCsvTemplate = (withSamples: boolean = true) => {
    const csvContent = generateProductCsvTemplate(withSamples);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', withSamples
        ? 'DCC_Product_Import_Template_With_Samples.csv'
        : 'DCC_Product_Import_Blank_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
/**
 * Split CSV line taking quoted values and commas into account
 */
function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        }
        else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}
/**
 * Normalize header name to canonical key
 */
function matchHeaderKey(header: string): string | null {
    const cleaned = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleaned.includes('code') || cleaned.includes('sku'))
        return 'code';
    if (cleaned.includes('bengali') ||
        cleaned.includes('bangla') ||
        cleaned.includes('namebn') ||
        header.includes("")) {
        return 'nameBn';
    }
    if (cleaned.includes('name') || cleaned.includes('title') || cleaned.includes('product') || header.includes("Product")) {
        return 'name';
    }
    if (cleaned.includes('rawmaterial') || cleaned.includes('israw') || header.includes("")) {
        return 'isRawMaterial';
    }
    if (cleaned.includes('category') || cleaned.includes('cat') || header.includes("")) {
        return 'category';
    }
    if (cleaned.includes('unit') || cleaned.includes('uom') || header.includes("")) {
        return 'unit';
    }
    if (cleaned.includes('selling') || cleaned.includes('sale') || cleaned.includes('price') || header.includes("")) {
        return 'unitPrice';
    }
    if (cleaned.includes('cost') || cleaned.includes('purchase') || cleaned.includes('buy') || header.includes("")) {
        return 'costPrice';
    }
    if (cleaned.includes('factory') || header.includes("Factory")) {
        return 'stockFactory';
    }
    if (cleaned.includes('office') || cleaned.includes('showroom') || header.includes("")) {
        return 'stockOffice';
    }
    if (cleaned.includes('alert') || cleaned.includes('min') || cleaned.includes('threshold') || header.includes("")) {
        return 'minStockAlert';
    }
    if (cleaned.includes('desc') || cleaned.includes('note') || cleaned.includes('detail') || header.includes("Description")) {
        return 'description';
    }
    return null;
}
/**
 * Validate and parse product data rows against existing products
 */
export const validateProductRows = (rawRows: Record<string, any>[], existingProducts: ProductItem[]): ParseResult => {
    const resultRows: ParsedProductRow[] = [];
    rawRows.forEach((row, idx) => {
        const rowNumber = idx + 2; // +1 for 0-index, +1 for header line
        const errors: string[] = [];
        const warnings: string[] = [];
        // 1. Name
        const name = String(row.name || '').trim();
        if (!name) {
            errors.push('Product Name is required.');
        }
        // 2. Bengali Name
        const nameBn = row.nameBn ? String(row.nameBn).trim() : undefined;
        // 3. Category
        let categoryInput = String(row.category || '').toUpperCase().trim();
        let isRawMaterial = String(row.isRawMaterial || '').toLowerCase().trim() === 'yes' ||
            String(row.isRawMaterial || '').toLowerCase().trim() === 'true' ||
            String(row.isRawMaterial || '').toLowerCase().trim() === '1';
        if (categoryInput === 'RAW' || categoryInput === 'RAW MATERIAL' || categoryInput === 'RAW MATERIALS') {
            categoryInput = 'RAW MATERIAL';
            isRawMaterial = true;
        }
        let category: ServiceCategory | 'RAW MATERIAL' = 'DIGITAL PRINTING';
        const matchedCat = VALID_CATEGORIES.find((c) => c === categoryInput || categoryInput.includes(c) || c.includes(categoryInput));
        if (matchedCat) {
            category = matchedCat;
            if (category === 'RAW MATERIAL')
                isRawMaterial = true;
        }
        else if (categoryInput) {
            warnings.push(`Unknown category "${categoryInput}", defaulted to DIGITAL PRINTING`);
        }
        // 4. Unit
        let unitInput = String(row.unit || '').toLowerCase().trim() as UnitType;
        let unit: UnitType = 'pcs';
        if (VALID_UNITS.includes(unitInput)) {
            unit = unitInput;
        }
        else if (unitInput) {
            if (unitInput.includes('sq') || unitInput.includes('sft'))
                unit = 'sqft';
            else if (unitInput.includes('rol'))
                unit = 'roll';
            else if (unitInput.includes('rea'))
                unit = 'ream';
            else if (unitInput.includes('lit') || unitInput.includes('ltr'))
                unit = 'ltr';
            else if (unitInput.includes('box'))
                unit = 'box';
            else if (unitInput.includes('set'))
                unit = 'set';
            else if (unitInput.includes('pack'))
                unit = 'pack';
            else if (unitInput.includes('job'))
                unit = 'job';
            else {
                warnings.push(`Unit "${unitInput}" recognized as standard 'pcs'`);
                unit = 'pcs';
            }
        }
        // 5. Prices
        const rawUnitPrice = row.unitPrice !== undefined && row.unitPrice !== '' ? Number(row.unitPrice) : 0;
        const rawCostPrice = row.costPrice !== undefined && row.costPrice !== '' ? Number(row.costPrice) : 0;
        let unitPrice = isNaN(rawUnitPrice) ? 0 : Math.max(0, rawUnitPrice);
        let costPrice = isNaN(rawCostPrice) ? 0 : Math.max(0, rawCostPrice);
        if (isNaN(rawCostPrice) || rawCostPrice < 0) {
            errors.push('Cost Price must be a valid non-negative number.');
        }
        if (isNaN(rawUnitPrice) || rawUnitPrice < 0) {
            errors.push('Selling Price must be a valid non-negative number.');
        }
        if (!isRawMaterial && unitPrice === 0 && costPrice > 0) {
            warnings.push('Selling price is set to 0 BDT for finished goods.');
        }
        // 6. Stocks
        const stockFactory = Math.max(0, Number(row.stockFactory) || 0);
        const stockOffice = Math.max(0, Number(row.stockOffice) || 0);
        const minStockAlert = Math.max(1, Number(row.minStockAlert) || 5);
        const description = row.description ? String(row.description).trim() : undefined;
        // 7. Code & Duplication Check
        let code = String(row.code || '').trim();
        let isDuplicate = false;
        let existingId: string | undefined = undefined;
        // Check existing products by Code or Name
        const existingByCode = code
            ? existingProducts.find((p) => p.code.toLowerCase() === code.toLowerCase())
            : undefined;
        const existingByName = name
            ? existingProducts.find((p) => p.name.toLowerCase() === name.toLowerCase())
            : undefined;
        const existingMatch = existingByCode || existingByName;
        if (existingMatch) {
            isDuplicate = true;
            existingId = existingMatch.id;
            code = existingMatch.code; // Keep original code
            warnings.push(`Matches existing item "${existingMatch.name}" (${existingMatch.code}). Existing item will be updated.`);
        }
        else if (!code) {
            const prefix = category === 'RAW MATERIAL' ? 'RAW' : category.slice(0, 3).toUpperCase();
            code = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
        }
        const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';
        resultRows.push({
            rowNumber,
            code,
            name,
            nameBn,
            category,
            isRawMaterial,
            unit,
            unitPrice,
            costPrice,
            stockFactory,
            stockOffice,
            minStockAlert,
            description,
            status,
            errors,
            warnings,
            isDuplicate,
            existingId,
            willUpdate: isDuplicate,
        });
    });
    const totalRows = resultRows.length;
    const validCount = resultRows.filter((r) => r.status === 'valid').length;
    const warningCount = resultRows.filter((r) => r.status === 'warning').length;
    const errorCount = resultRows.filter((r) => r.status === 'error').length;
    const duplicateCount = resultRows.filter((r) => r.isDuplicate).length;
    return {
        rows: resultRows,
        totalRows,
        validCount,
        warningCount,
        errorCount,
        duplicateCount,
    };
};
/**
 * Parse CSV raw text string
 */
export const parseProductCsvText = (csvText: string, existingProducts: ProductItem[]): ParseResult => {
    // Strip BOM if present
    let cleanText = csvText.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
        return {
            rows: [],
            totalRows: 0,
            validCount: 0,
            warningCount: 0,
            errorCount: 0,
            duplicateCount: 0,
        };
    }
    const lines = cleanText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
        return {
            rows: [],
            totalRows: 0,
            validCount: 0,
            warningCount: 0,
            errorCount: 0,
            duplicateCount: 0,
        };
    }
    const headerCells = splitCsvLine(lines[0]);
    const headerMap: {
        [key: number]: string;
    } = {};
    headerCells.forEach((h, idx) => {
        const key = matchHeaderKey(h);
        if (key) {
            headerMap[idx] = key;
        }
    });
    const rawRows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = splitCsvLine(lines[i]);
        // Skip empty lines
        if (cells.every((c) => !c.trim()))
            continue;
        const rowObj: Record<string, any> = {};
        cells.forEach((cell, idx) => {
            const fieldKey = headerMap[idx];
            if (fieldKey) {
                rowObj[fieldKey] = cell;
            }
        });
        rawRows.push(rowObj);
    }
    return validateProductRows(rawRows, existingProducts);
};
/**
 * Parse uploaded file (supports .csv, .xlsx, .xls)
 */
export const parseProductFile = async (file: File, existingProducts: ProductItem[]): Promise<ParseResult> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        if (!jsonData || jsonData.length < 2) {
            return {
                rows: [],
                totalRows: 0,
                validCount: 0,
                warningCount: 0,
                errorCount: 0,
                duplicateCount: 0,
            };
        }
        const headerRow = jsonData[0];
        const headerMap: {
            [key: number]: string;
        } = {};
        headerRow.forEach((h: any, idx: number) => {
            if (h) {
                const key = matchHeaderKey(String(h));
                if (key)
                    headerMap[idx] = key;
            }
        });
        const rawRows: Record<string, any>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
            const cells = jsonData[i];
            if (!cells || cells.length === 0)
                continue;
            const rowObj: Record<string, any> = {};
            cells.forEach((cell: any, idx: number) => {
                const fieldKey = headerMap[idx];
                if (fieldKey && cell !== undefined && cell !== null) {
                    rowObj[fieldKey] = String(cell);
                }
            });
            if (Object.keys(rowObj).length > 0) {
                rawRows.push(rowObj);
            }
        }
        return validateProductRows(rawRows, existingProducts);
    }
    // Otherwise read as text (CSV)
    const text = await file.text();
    return parseProductCsvText(text, existingProducts);
};
