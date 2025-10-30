/**
 * Utility helpers for class name composition and time formatting.
 *
 * The `cn` function joins multiple class names, ignoring falsey values.
 *
 * The `days` array contains short weekday names starting with Sunday.
 *
 * The `fmtDuration` function formats a duration in milliseconds as
 * HH:MM:SS.
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
export const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export function fmtDuration(ms: number) {
  const sec = Math.floor(ms/1000);
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':');
}