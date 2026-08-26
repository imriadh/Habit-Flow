export const pad = (n: number) => String(n).padStart(2, "0");

export const dkey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isToday = (d: Date) => dkey(d) === dkey(today());

export const logKey = (habitId: string, k: string) => `${habitId}|${k}`;

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const fmtLong = (d: Date) =>
  `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const fmtShort = (d: Date) =>
  `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

export const fmtMedium = (d: Date) =>
  `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

export const relDay = (d: Date) => {
  const t = today();
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return fmtShort(d);
};

export const startOfWeek = (d: Date, weekStart: 0 | 1) => {
  const diff = (d.getDay() - weekStart + 7) % 7;
  return addDays(d, -diff);
};

export const nowHM = () => {
  const n = new Date();
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

export const fmtSchedule = (weekdays: number[]) => {
  if (weekdays.length === 7) return "Every day";
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .filter((d) => weekdays.includes(d))
    .map((d) => WEEKDAYS_SHORT[d])
    .join(" · ");
};
