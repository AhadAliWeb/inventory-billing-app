/**
 * Formats a number as UAE Dirham (AED)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, decimals = 2) => {
  return `AED ${Number(amount).toFixed(decimals)}`;
};

export default formatCurrency;