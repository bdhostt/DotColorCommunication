import * as XLSX from 'xlsx';
import { CompanyProfile } from '../types';
export interface ExportHeaderInfo {
    reportTitle: string;
    reportTitleBn?: string;
    periodText: string;
    companyProfile: CompanyProfile;
}
/**
 * Standard utility to build an Excel workbook with proper company header and summary
 */
export function exportTableToExcel(filename: string, sheetName: string, headerInfo: ExportHeaderInfo, columns: string[], rows: (string | number)[][], summaryRows?: (string | number)[][]) {
    const wb = XLSX.utils.book_new();
    const { companyProfile, reportTitle, periodText } = headerInfo;
    const companyAddress = companyProfile.officeAddress || companyProfile.factoryAddress || 'Chattogram, Bangladesh';
    const companyPhone = companyProfile.phone || '';
    const companyEmail = companyProfile.emails?.join(', ') || '';
    const wsData: (string | number)[][] = [
        [companyProfile.name],
        [companyProfile.tagline || 'Printing, Packaging & Commercial Branding ERP'],
        [`Address: ${companyAddress} | Phone: ${companyPhone} | Email: ${companyEmail}`],
        [companyProfile.vatTaxNumber ? `BIN / VAT Reg: ${companyProfile.vatTaxNumber}` : ''],
        [],
        [reportTitle.toUpperCase()],
        [`Date / Period: ${periodText}`],
        [`Generated On: ${new Date().toLocaleString()} | Currency: ${companyProfile.currencySymbol || "BDTTk"}`],
        [],
        columns,
        ...rows,
    ];
    if (summaryRows && summaryRows.length > 0) {
        wsData.push([]);
        wsData.push(...summaryRows);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Set column widths based on longest text
    const colWidths = columns.map((col, cIdx) => {
        let maxLen = col.length;
        rows.forEach((row) => {
            const cellVal = row[cIdx]?.toString() || '';
            if (cellVal.length > maxLen)
                maxLen = cellVal.length;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    });
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
