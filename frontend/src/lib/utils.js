import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency) {
  let preferredCurrency = currency || 'INR'
  try {
    const storedUser = localStorage.getItem('user')
    preferredCurrency = currency || (storedUser ? JSON.parse(storedUser).preferredCurrency : 'INR') || 'INR'
  } catch {
    preferredCurrency = currency || 'INR'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: preferredCurrency
  }).format(Number(amount || 0))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}
