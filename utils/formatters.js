/**
 * Formats a number with thousand separators and 2 decimal places
 * @param {number} value - The number to format
 * @returns {string} - The formatted number with thousand separators
 */
export const formatCurrency = (value) => {
  // Convert to number if it's a string
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle invalid input
  if (isNaN(number)) return '0.00';
  
  // Format with thousand separators and 2 decimal places
  return number.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}; 