import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getPeriod(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  return `${months[parseInt(month) - 1]} ${year}`
}
