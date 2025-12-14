export const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(parseFloat(value))) return 'R$ 0,00';
  return parseFloat(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatNumber = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(parseFloat(value))) return '0';
  return parseFloat(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatHours = (value) => {
  if (value === undefined || value === null || isNaN(parseFloat(value))) return '0,00h';
  return parseFloat(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + 'h';
};

// 👇 NOVA FUNÇÃO PARA O DASHBOARD (Inteiro)
export const formatHoursInt = (value) => {
  if (value === undefined || value === null || isNaN(parseFloat(value))) return '0h';
  return Math.round(parseFloat(value)) + 'h';
};