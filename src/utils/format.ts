export const formatDecimal = (num: number): string => {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

export const formatCurrency = (num: number, currency = 'EUR'): string => {
    const formatted = formatDecimal(num);
    const symbol = currency === 'EUR' ? '€' : currency;
    return `${formatted} ${symbol}`;
};
