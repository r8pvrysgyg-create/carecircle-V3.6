export const APP_VERSION = "3.9";

export const appState = {
  appointments: [],
  tasks: [],
  notes: [],
  medications: [],
  directoryContacts: [],
  currentUser: null,
  currentProfile: null,
  users: []
};

export const APP_TIME_ZONE = "America/Los_Angeles";

export function formatDate(dateString) {
  if (!dateString) return "No date";
  const [year, month, day] = dateString.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

export function todayString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;

  return `${year}-${month}-${day}`;
}

export function formatTime(timeString) {
  if (!timeString) return "";
  const [hourText, minuteText = "00"] = String(timeString).split(":");
  let hour = Number(hourText);
  const minute = String(minuteText).padStart(2, "0");

  if (Number.isNaN(hour)) return timeString;

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${suffix}`;
}

export function formatDateTimeSeattle(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

export function isAdmin() {
  return appState.currentProfile?.role === "admin";
}


export function addMinutesToTime(timeString, minutesToAdd = 30) {
  if (!timeString) return "";
  const [hourText, minuteText = "00"] = String(timeString).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";

  const date = new Date();
  date.setHours(hour, minute + Number(minutesToAdd || 0), 0, 0);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
