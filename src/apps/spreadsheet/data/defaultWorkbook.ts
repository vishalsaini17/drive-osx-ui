import { Sheet } from '../types';

export const DEFAULT_WORKBOOK_SHEETS: Sheet[] = [
  {
    id: 'sheet_sales',
    name: 'Sales & Financials Q3',
    color: '#10b981', // Emerald tab
    colWidths: { 0: 160, 1: 110, 2: 110, 3: 110, 4: 130, 5: 140, 6: 120 },
    mergedCells: [
      { id: 'm1', startCol: 0, startRow: 0, endCol: 6, endRow: 0 },
    ],
    data: {
      A1: {
        value: 'QUARTERLY SALES & REVENUE REPORT - Q3 2026',
        style: { bold: true, fontSize: 14, color: '#065f46', bgColor: '#d1fae5', align: 'center' },
      },
      // Headers
      A3: { value: 'Product Name', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'left' } },
      B3: { value: 'July Rev', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'right' } },
      C3: { value: 'August Rev', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'right' } },
      D3: { value: 'Sept Rev', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'right' } },
      E3: { value: 'Q3 Total', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'right' } },
      F3: { value: 'Q3 Average', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'right' } },
      G3: { value: 'Performance', style: { bold: true, bgColor: '#312e81', color: '#ffffff', align: 'center' } },

      // Row 4: Cloud Enterprise Suite
      A4: { value: 'Cloud Enterprise Suite', style: { bold: true } },
      B4: { value: '45000', style: { format: 'currency', align: 'right' } },
      C4: { value: '52000', style: { format: 'currency', align: 'right' } },
      D4: { value: '61000', style: { format: 'currency', align: 'right' } },
      E4: { value: '=SUM(B4:D4)', style: { format: 'currency', bold: true, align: 'right' } },
      F4: { value: '=AVERAGE(B4:D4)', style: { format: 'currency', align: 'right' } },
      G4: { value: '=IF(E4>150000, "High Performer", "Standard")', style: { bold: true, color: '#047857', align: 'center' } },

      // Row 5: Studio Pro
      A5: { value: 'Studio Pro', style: { bold: true } },
      B5: { value: '28000', style: { format: 'currency', align: 'right' } },
      C5: { value: '34500', style: { format: 'currency', align: 'right' } },
      D5: { value: '41000', style: { format: 'currency', align: 'right' } },
      E5: { value: '=SUM(B5:D5)', style: { format: 'currency', bold: true, align: 'right' } },
      F5: { value: '=AVERAGE(B5:D5)', style: { format: 'currency', align: 'right' } },
      G5: { value: '=IF(E5>100000, "High Performer", "Standard")', style: { bold: true, color: '#047857', align: 'center' } },

      // Row 6: Security & Shield
      A6: { value: 'Security & Shield Hub', style: { bold: true } },
      B6: { value: '18500', style: { format: 'currency', align: 'right' } },
      C6: { value: '19200', style: { format: 'currency', align: 'right' } },
      D6: { value: '22000', style: { format: 'currency', align: 'right' } },
      E6: { value: '=SUM(B6:D6)', style: { format: 'currency', bold: true, align: 'right' } },
      F6: { value: '=AVERAGE(B6:D6)', style: { format: 'currency', align: 'right' } },
      G6: { value: '=IF(E6>100000, "High Performer", "Standard")', style: { align: 'center' } },

      // Row 7: Workspace Add-ons
      A7: { value: 'Workspace Add-ons', style: { bold: true } },
      B7: { value: '9400', style: { format: 'currency', align: 'right' } },
      C7: { value: '11200', style: { format: 'currency', align: 'right' } },
      D7: { value: '14800', style: { format: 'currency', align: 'right' } },
      E7: { value: '=SUM(B7:D7)', style: { format: 'currency', bold: true, align: 'right' } },
      F7: { value: '=AVERAGE(B7:D7)', style: { format: 'currency', align: 'right' } },
      G7: { value: '=IF(E7>100000, "High Performer", "Standard")', style: { align: 'center' } },

      // Row 8: Totals
      A8: { value: 'TOTAL REVENUE', style: { bold: true, bgColor: '#e0e7ff', color: '#1e1b4b' } },
      B8: { value: '=SUM(B4:B7)', style: { format: 'currency', bold: true, bgColor: '#e0e7ff', align: 'right' } },
      C8: { value: '=SUM(C4:C7)', style: { format: 'currency', bold: true, bgColor: '#e0e7ff', align: 'right' } },
      D8: { value: '=SUM(D4:D7)', style: { format: 'currency', bold: true, bgColor: '#e0e7ff', align: 'right' } },
      E8: { value: '=SUM(E4:E7)', style: { format: 'currency', bold: true, bgColor: '#c7d2fe', color: '#1e1b4b', align: 'right' } },
      F8: { value: '=AVERAGE(F4:F7)', style: { format: 'currency', bold: true, bgColor: '#e0e7ff', align: 'right' } },
      G8: { value: 'Summary', style: { bold: true, bgColor: '#e0e7ff', align: 'center' } },

      // VLOOKUP Demo Area
      A11: { value: 'VLOOKUP Product Query Tool', style: { bold: true, color: '#4338ca', fontSize: 12 } },
      A12: { value: 'Search Product Name:' },
      B12: { value: 'Studio Pro', style: { bold: true, bgColor: '#fef08a' } },
      A13: { value: 'Queried Q3 Revenue:' },
      B13: { value: '=VLOOKUP(B12, A4:E7, 5, FALSE)', style: { format: 'currency', bold: true, color: '#15803d' } },
    },
  },

  {
    id: 'sheet_inventory',
    name: 'Inventory Tracker',
    color: '#3b82f6', // Blue tab
    colWidths: { 0: 120, 1: 180, 2: 100, 3: 110, 4: 120, 5: 120 },
    data: {
      A1: { value: 'INVENTORY & ASSET LOG', style: { bold: true, fontSize: 13, color: '#1e3a8a' } },
      A3: { value: 'SKU Code', style: { bold: true, bgColor: '#1e293b', color: '#ffffff' } },
      B3: { value: 'Item Description', style: { bold: true, bgColor: '#1e293b', color: '#ffffff' } },
      C3: { value: 'Stock Qty', style: { bold: true, bgColor: '#1e293b', color: '#ffffff', align: 'right' } },
      D3: { value: 'Unit Cost', style: { bold: true, bgColor: '#1e293b', color: '#ffffff', align: 'right' } },
      E3: { value: 'Total Value', style: { bold: true, bgColor: '#1e293b', color: '#ffffff', align: 'right' } },
      F3: { value: 'Stock Status', style: { bold: true, bgColor: '#1e293b', color: '#ffffff', align: 'center' } },

      A4: { value: 'SKU-1001' },
      B4: { value: 'Server Rack Enclosure 42U' },
      C4: { value: '24', style: { align: 'right' } },
      D4: { value: '850', style: { format: 'currency', align: 'right' } },
      E4: { value: '=C4*D4', style: { format: 'currency', bold: true, align: 'right' } },
      F4: { value: '=IF(C4>10, "In Stock", "Low Stock")', style: { color: '#166534', align: 'center' } },

      A5: { value: 'SKU-1002' },
      B5: { value: '4K UltraWide Monitor 38"' },
      C5: { value: '8', style: { align: 'right' } },
      D5: { value: '920', style: { format: 'currency', align: 'right' } },
      E5: { value: '=C5*D5', style: { format: 'currency', bold: true, align: 'right' } },
      F5: { value: '=IF(C5>10, "In Stock", "Low Stock")', style: { color: '#9a3412', align: 'center' } },

      A6: { value: 'SKU-1003' },
      B6: { value: 'Mechanical Ergonomic Keyboard' },
      C6: { value: '142', style: { align: 'right' } },
      D6: { value: '135', style: { format: 'currency', align: 'right' } },
      E6: { value: '=C6*D6', style: { format: 'currency', bold: true, align: 'right' } },
      F6: { value: '=IF(C6>10, "In Stock", "Low Stock")', style: { color: '#166534', align: 'center' } },

      A8: { value: 'Total Items Count:', style: { bold: true } },
      B8: { value: '=COUNT(C4:C6)', style: { bold: true } },
      D8: { value: 'Inventory Valuation:', style: { bold: true } },
      E8: { value: '=SUM(E4:E6)', style: { format: 'currency', bold: true, bgColor: '#bfdbfe' } },
    },
  },

  {
    id: 'sheet_budget',
    name: 'Budget Breakdown',
    color: '#8b5cf6', // Purple tab
    colWidths: { 0: 160, 1: 120, 2: 120, 3: 130 },
    data: {
      A1: { value: 'DEPARTMENT BUDGET PLANNER', style: { bold: true, fontSize: 13, color: '#5b21b6' } },
      A3: { value: 'Expense Category', style: { bold: true, bgColor: '#4c1d95', color: '#ffffff' } },
      B3: { value: 'Allocated Budget', style: { bold: true, bgColor: '#4c1d95', color: '#ffffff', align: 'right' } },
      C3: { value: 'Actual Spent', style: { bold: true, bgColor: '#4c1d95', color: '#ffffff', align: 'right' } },
      D3: { value: 'Variance', style: { bold: true, bgColor: '#4c1d95', color: '#ffffff', align: 'right' } },

      A4: { value: 'R&D Engineering' },
      B4: { value: '120000', style: { format: 'currency', align: 'right' } },
      C4: { value: '114500', style: { format: 'currency', align: 'right' } },
      D4: { value: '=B4-C4', style: { format: 'currency', bold: true, color: '#15803d', align: 'right' } },

      A5: { value: 'Marketing & Ad Spend' },
      B5: { value: '45000', style: { format: 'currency', align: 'right' } },
      C5: { value: '48200', style: { format: 'currency', align: 'right' } },
      D5: { value: '=B5-C5', style: { format: 'currency', bold: true, color: '#b91c1c', align: 'right' } },

      A6: { value: 'Cloud Infrastructure' },
      B6: { value: '35000', style: { format: 'currency', align: 'right' } },
      C6: { value: '31800', style: { format: 'currency', align: 'right' } },
      D6: { value: '=B6-C6', style: { format: 'currency', bold: true, color: '#15803d', align: 'right' } },

      A8: { value: 'TOTAL BUDGET', style: { bold: true, bgColor: '#f3e8ff' } },
      B8: { value: '=SUM(B4:B6)', style: { format: 'currency', bold: true, bgColor: '#f3e8ff', align: 'right' } },
      C8: { value: '=SUM(C4:C6)', style: { format: 'currency', bold: true, bgColor: '#f3e8ff', align: 'right' } },
      D8: { value: '=SUM(D4:D6)', style: { format: 'currency', bold: true, bgColor: '#e9d5ff', align: 'right' } },
    },
  },
];
