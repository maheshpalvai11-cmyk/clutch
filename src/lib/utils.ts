import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numbers as Indian Rupee (₹) currency
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date/time cleanly for college event dashboards
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Badge styling for the six order statuses
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Preparing':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Ready':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Delivered / Picked up':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
