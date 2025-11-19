import { format, parseISO } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM dd, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
};

export const formatTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'h:mm a');
  } catch {
    return 'Invalid time';
  }
};

export const toISODateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};
