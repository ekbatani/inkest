import { formatDistanceToNow, format } from "date-fns";

export function formatRelativeDate(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diffMs < oneDay && now.getDate() === d.getDate()) {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  if (diffMs < 7 * oneDay) {
    return format(d, "EEEE");
  }
  return format(d, "MMM d, yyyy");
}

export function formatDate(date: Date | string | number): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatDateShort(date: Date | string | number): string {
  return format(new Date(date), "MMM d, yyyy");
}
