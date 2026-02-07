import {
  format,
  getTime,
  formatDistanceToNow,
  parseISO,
  isValid,
  differenceInDays,
  startOfDay,
} from "date-fns";

// ----------------------------------------------------------------------

export function fDate(date, newFormat) {
  const fm = newFormat || "dd MMM yyyy";

  return date ? format(new Date(date), fm) : "";
}

export function fTime(date, newFormat) {
  const fm = newFormat || "HH:mm";

  return date ? format(new Date(date), fm) : "";
}

export function fDateTime(date, newFormat) {
  const fm = newFormat || "dd MMM yyyy HH:mm a";

  return date ? format(new Date(date), fm) : "";
}

export function fYear(date) {
  return date ? format(new Date(date), "yyyy") : "";
}

export function fTimestamp(date) {
  return date ? getTime(new Date(date)) : "";
}

export function fToNow(date) {
  return date
    ? formatDistanceToNow(new Date(date), {
        addSuffix: true,
      })
    : "";
}

export function isBetween(inputDate, startDate, endDate) {
  const date = new Date(inputDate);

  const results =
    new Date(date.toDateString()) >= new Date(startDate.toDateString()) &&
    new Date(date.toDateString()) <= new Date(endDate.toDateString());

  return results;
}

export function isAfter(startDate, endDate) {
  const results =
    startDate && endDate
      ? new Date(startDate).getTime() > new Date(endDate).getTime()
      : false;

  return results;
}

export function dayName(dateString) {
  const daysOfWeek = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const date = new Date(dateString);
  const dayIndex = date.getDay();

  return daysOfWeek[dayIndex];
}

export function dateRemaining(startDate, endDate) {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

  if (!isValid(start) || !isValid(end)) {
    throw new Error(
      "Invalid date input. Use Date object or ISO string (YYYY-MM-DD).",
    );
  }

  // Normalize both dates to the start of their day (00:00)
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);

  // Inclusive calculation (+1 means include both start and end date)
  return differenceInDays(endDay, startDay);
}
