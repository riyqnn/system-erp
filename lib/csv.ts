/**
 * @fileoverview Simple CSV export utility without external dependencies
 * Handles escaping, quotes, and proper CSV formatting
 */

/**
 * Escape CSV field values: wrap in quotes if needed and escape internal quotes
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // If field contains comma, quotes, or newlines, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Convert array of objects to CSV string
 * @param data Array of objects to export
 * @param fileName Optional filename for download header
 * @returns CSV string content
 */
export function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object keys
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.map(h => escapeCSVField(h)).join(',');

  // Build rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return escapeCSVField(value);
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Trigger browser download of CSV file
 * @param csvContent CSV string content
 * @param fileName Name of file to download (without extension)
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV (client-side or server-side)
 * Combines conversion and download for convenience
 */
export function exportToCSV(data: Record<string, unknown>[], fileName: string): void {
  const csvContent = convertToCSV(data);
  downloadCSV(csvContent, fileName);
}

/**
 * Flatten nested objects for CSV export (simple approach)
 * Useful for converting complex data structures to flat CSV format
 */
export function flattenForCSV(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenForCSV(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      // Convert arrays to string representation
      result[newKey] = value.join(';');
    } else if (value instanceof Date) {
      result[newKey] = value.toISOString();
    } else {
      result[newKey] = value;
    }
  });

  return result;
}
