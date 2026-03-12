/**
 * Shared export utilities for micro-gtm-tools
 */

/**
 * Export an array of objects as a CSV file download.
 * Flattens nested objects by joining with dot notation.
 * @param {Array<Object>} data - Array of row objects
 * @param {string} filename - Download filename (should end in .csv)
 */
function exportCSV(data, filename) {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Flatten nested objects
  function flatten(obj, prefix) {
    const result = {};
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? prefix + '.' + key : key;
      const val = obj[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, flatten(val, fullKey));
      } else {
        result[fullKey] = val;
      }
    }
    return result;
  }

  const flatData = data.map(row => flatten(row, ''));
  const headers = Object.keys(flatData[0]);

  const csvRows = [
    headers.join(','),
    ...flatData.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        const str = String(val);
        // Quote fields that contain commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',')
    )
  ];

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
