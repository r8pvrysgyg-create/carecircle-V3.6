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

export function formatDate(dateString) {
  if (!dateString) return "No date";
  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

export function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function isAdmin() {
  return appState.currentProfile?.role === "admin";
}
