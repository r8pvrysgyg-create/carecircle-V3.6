import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { appState, formatDate, todayString, isAdmin } from "./state.js";
import { escapeHtml } from "./ui.js";
import { renderDashboard } from "./dashboard.js";
import { renderFamily } from "./family.js";
import { applyDirectoryContactToAppointment } from "./directory.js";

export function setupAppointmentForm() {
  const driverSelect = document.getElementById("apptDriverSelect");
  const otherWrap = document.getElementById("apptDriverOtherWrap");
  const directorySelect = document.getElementById("apptDirectoryContact");

  if (!driverSelect || !otherWrap) return;

  if (directorySelect) {
    directorySelect.onchange = () => {
      if (directorySelect.value) applyDirectoryContactToAppointment(directorySelect.value);
    };
  }

  driverSelect.onchange = () => {
    const isOther = driverSelect.value === "Other";
    otherWrap.classList.toggle("hidden", !isOther);

    if (!isOther) {
      const otherInput = document.getElementById("apptDriverOther");
      if (otherInput) otherInput.value = "";
    }
  };
}

export async function addAppointment() {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to add appointments.");

  const person = document.getElementById("apptPerson").value.trim();
  const appointmentType = document.getElementById("apptType").value.trim();
  const directoryContactId = document.getElementById("apptDirectoryContact").value.trim();
  const doctor = document.getElementById("apptDoctor").value.trim();
  const location = document.getElementById("apptLocation").value.trim();
  const driverChoice = document.getElementById("apptDriverSelect").value.trim();
  const driverOther = document.getElementById("apptDriverOther").value.trim();
  const driver = driverChoice === "Other" ? driverOther : driverChoice;
  const date = document.getElementById("apptDate").value;
  const time = document.getElementById("apptTime").value;
  const appointmentEndTime = document.getElementById("apptEndTime").value;
  const maplePickupStart = document.getElementById("apptMaplePickupStart").value;
  const maplePickupEnd = document.getElementById("apptMaplePickupEnd").value;
  const returnPickupStart = document.getElementById("apptReturnPickupStart").value;
  const returnPickupEnd = document.getElementById("apptReturnPickupEnd").value;
  const notes = document.getElementById("apptNotes").value.trim();

  if (!person || !doctor || !date) return alert("Please enter person, doctor/visit details, and date.");
  if (driverChoice === "Other" && !driverOther) return alert("Please enter the other driver or transportation name.");

  await addDoc(collection(db, "appointments"), {
    person,
    appointmentType,
    directoryContactId,
    doctor,
    location,
    driver,
    driverType: driverChoice || "",
    date,
    time,
    appointmentEndTime,
    maplePickupStart,
    maplePickupEnd,
    returnPickupStart,
    returnPickupEnd,
    notes,
    status: "Scheduled",
    createdBy: user.email,
    createdAt: serverTimestamp()
  });

  clearAppointmentForm();
  await loadAppointments();
}

export async function loadAppointments() {
  const snapshot = await getDocs(collection(db, "appointments"));
  appState.appointments = [];

  snapshot.forEach(docSnap => {
    appState.appointments.push({ id: docSnap.id, ...docSnap.data() });
  });

  appState.appointments.sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));

  renderAppointments();
  renderDashboard();
  renderFamily();
}

export function renderAppointments() {
  const div = document.getElementById("appointments");
  if (!div) return;

  div.innerHTML = appState.appointments.length
    ? appState.appointments.map(a => renderAppointmentCard(a)).join("")
    : "<p>No appointments added yet.</p>";

  setupAppointmentButtons();
}

export function renderAppointmentCard(a, compact = false) {
  const mapleWindow = formatWindow(a.maplePickupStart, a.maplePickupEnd);
  const appointmentWindow = formatWindow(a.time, a.appointmentEndTime);
  const returnWindow = formatWindow(a.returnPickupStart, a.returnPickupEnd);

  return `
    <div class="item ${statusClass(a.status || "Scheduled")}">
      <div class="item-topline">
        <strong>${escapeHtml(a.person)}</strong>
        <span class="pill">${escapeHtml(a.status || "Scheduled")}</span>
      </div>
      <p class="item-title">${escapeHtml(a.appointmentType ? `${a.appointmentType}: ${a.doctor}` : a.doctor)}</p>
      <p>📅 ${formatDate(a.date)}</p>
      ${appointmentWindow ? `<p>⏰ Appointment time: ${escapeHtml(appointmentWindow)}</p>` : ""}
      ${mapleWindow ? `<p>🏠 Maple Ridge pickup: ${escapeHtml(mapleWindow)}</p>` : ""}
      ${returnWindow ? `<p>🚙 Appointment pickup: ${escapeHtml(returnWindow)}</p>` : ""}
      ${a.location ? `<p>📍 ${escapeHtml(a.location)}</p>` : ""}
      ${a.driver ? `<p>🚗 Driver: ${escapeHtml(a.driver)}</p>` : ""}
      ${a.notes && !compact ? `<p>📝 ${escapeHtml(a.notes)}</p>` : ""}
      <small>Added by ${escapeHtml(a.createdBy || "unknown")}</small>
      ${!compact ? `
        <div class="action-row">
          <button data-appt-status="${a.id}" data-current-status="${escapeHtml(a.status || "Scheduled")}">Next Status</button>
          ${isAdmin() ? `<button class="danger" data-appt-delete="${a.id}">Delete</button>` : ""}
        </div>` : ""}
    </div>
  `;
}

function setupAppointmentButtons() {
  document.querySelectorAll("[data-appt-delete]").forEach(button => {
    button.onclick = async () => {
      if (!isAdmin()) return alert("Only admins can delete appointments.");
      if (!confirm("Delete this appointment?")) return;
      await deleteDoc(doc(db, "appointments", button.getAttribute("data-appt-delete")));
      await loadAppointments();
    };
  });

  document.querySelectorAll("[data-appt-status]").forEach(button => {
    button.onclick = async () => {
      const id = button.getAttribute("data-appt-status");
      const current = button.getAttribute("data-current-status");
      const statuses = ["Scheduled", "Picked Up", "At Appointment", "Waiting for Ride", "Returned to Maple Ridge", "Completed", "Cancelled"];
      const currentIndex = statuses.indexOf(current);
      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
      await updateDoc(doc(db, "appointments", id), { status: nextStatus, updatedAt: serverTimestamp() });
      await loadAppointments();
    };
  });
}

function clearAppointmentForm() {
  [
    "apptPerson",
    "apptType",
    "apptDirectoryContact",
    "apptDoctor",
    "apptLocation",
    "apptDriverSelect",
    "apptDriverOther",
    "apptDate",
    "apptTime",
    "apptEndTime",
    "apptMaplePickupStart",
    "apptMaplePickupEnd",
    "apptReturnPickupStart",
    "apptReturnPickupEnd",
    "apptNotes"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const otherWrap = document.getElementById("apptDriverOtherWrap");
  if (otherWrap) otherWrap.classList.add("hidden");
}

function statusClass(status) {
  return "status-" + String(status || "scheduled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatWindow(start, end) {
  if (start && end) return `${start} - ${end}`;
  if (start) return `Starting ${start}`;
  if (end) return `By ${end}`;
  return "";
}

export function getTodaysAppointments() {
  const today = todayString();
  return appState.appointments.filter(a => a.date === today && a.status !== "Cancelled");
}

export function getUpcomingAppointments(limit = 5) {
  const today = todayString();
  return appState.appointments.filter(a => a.date >= today && a.status !== "Cancelled").slice(0, limit);
}


export function getTodaysTransportationItems() {
  return getTodaysAppointments()
    .flatMap(a => {
      const items = [];
      const mapleWindow = formatWindow(a.maplePickupStart, a.maplePickupEnd);
      const returnWindow = formatWindow(a.returnPickupStart, a.returnPickupEnd);

      if (mapleWindow) {
        items.push({
          appointment: a,
          label: "Maple Ridge pickup",
          time: mapleWindow,
          sort: a.maplePickupStart || a.time || "99:99"
        });
      }

      if (returnWindow) {
        items.push({
          appointment: a,
          label: "Appointment pickup",
          time: returnWindow,
          sort: a.returnPickupStart || a.appointmentEndTime || a.time || "99:99"
        });
      }

      return items;
    })
    .sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
}

export function getWaitingForRideAppointments() {
  return appState.appointments.filter(a => a.status === "Waiting for Ride" && a.status !== "Cancelled");
}
