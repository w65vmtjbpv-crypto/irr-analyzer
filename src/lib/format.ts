export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatSignedPercent(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "N/A";
  }

  const percent = formatPercent(Math.abs(value), fractionDigits);

  if (value === 0) {
    return percent;
  }

  return `${value > 0 ? "+" : "-"}${percent}`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
