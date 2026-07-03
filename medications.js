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
import { appState, formatDate, isAdmin } from "./state.js";
import { escapeHtml } from "./ui.js";
import { renderDashboard } from "./dashboard.js";
import { renderFamily } from "./family.js";

export async function addMedication() {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to add medications.");

  const person = document.getElementById("medPerson").value;
  const name = document.getElementById("medName").value.trim();
  const dosage = document.getElementById("medDosage").value.trim();
  const schedule = document.getElementById("medSchedule").value;
  const doctor = document.getElementById("medDoctor").value.trim();
  const pharmacy = document.getElementById("medPharmacy").value.trim();
  const refillDate = document.getElementById("medRefillDate").value;
  const instructions = document.getElementById("medInstructions").value.trim();

  if (!person || !name) return alert("Please enter who the medication is for and the medication name.");

  await addDoc(collection(db, "medications"), {
    person,
    name,
    dosage,
    schedule,
    doctor,
    pharmacy,
    refillDate,
    instructions,
    active: true,
    createdBy: user.email,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now()
  });

  clearMedicationForm();
  await loadMedications();
}

export async function loadMedications() {
  const snapshot = await getDocs(collection(db, "medications"));
  appState.medications = [];

  snapshot.forEach(docSnap => appState.medications.push({ id: docSnap.id, ...docSnap.data() }));

  appState.medications.sort((a, b) => {
    if ((a.active ?? true) !== (b.active ?? true)) return (a.active ?? true) ? -1 : 1;
    return `${a.person || ""} ${a.schedule || ""} ${a.name || ""}`.localeCompare(`${b.person || ""} ${b.schedule || ""} ${b.name || ""}`);
  });

  renderMedications();
  renderDashboard();
  renderFamily();
}

export function renderMedications() {
  const activeDiv = document.getElementById("medications");
  const inactiveDiv = document.getElementById("inactiveMedications");
  const refillDiv = document.getElementById("refillWatch");

  if (activeDiv) {
    const activeMeds = getActiveMedications();
    activeDiv.innerHTML = activeMeds.length
      ? activeMeds.map(m => renderMedicationCard(m)).join("")
      : "<p>No active medications yet.</p>";
  }

  if (inactiveDiv) {
    const inactiveMeds = appState.medications.filter(m => m.active === false);
    inactiveDiv.innerHTML = inactiveMeds.length
      ? inactiveMeds.map(m => renderMedicationCard(m)).join("")
      : "<p>No archived medications.</p>";
  }

  if (refillDiv) {
    const refillMeds = getRefillWatch(8);
    refillDiv.innerHTML = refillMeds.length
      ? refillMeds.map(m => renderMedicationCard(m, true)).join("")
      : "<p>No refills due soon.</p>";
  }

  setupMedicationButtons();
}

export function renderMedicationCard(med, compact = false) {
  const active = med.active !== false;
  const refillClass = getRefillClass(med.refillDate);
  const refillLabel = getRefillLabel(med.refillDate);

  return `
    <div class="item med-item ${active ? "" : "inactive-med"} ${refillClass}">
      <div class="item-topline">
        <strong>${escapeHtml(med.person || "Medication")}</strong>
        <span class="pill">${active ? "Active" : "Inactive"}</span>
      </div>
      <p class="item-title">💊 ${escapeHtml(med.name)}</p>
      ${med.dosage ? `<p>Dosage: ${escapeHtml(med.dosage)}</p>` : ""}
      ${med.schedule ? `<p>⏰ ${escapeHtml(med.schedule)}</p>` : ""}
      ${med.refillDate ? `<p>🔁 Refill: ${formatDate(med.refillDate)}${refillLabel ? ` • ${escapeHtml(refillLabel)}` : ""}</p>` : ""}
      ${med.doctor && !compact ? `<p>🩺 Doctor: ${escapeHtml(med.doctor)}</p>` : ""}
      ${med.pharmacy && !compact ? `<p>🏥 Pharmacy: ${escapeHtml(med.pharmacy)}</p>` : ""}
      ${med.instructions && !compact ? `<p>📝 ${escapeHtml(med.instructions)}</p>` : ""}
      <small>Added by ${escapeHtml(med.createdBy || "unknown")}</small>
      ${!compact ? `
        <div class="action-row">
          <button data-med-toggle="${med.id}" data-active="${active}">${active ? "Mark Inactive" : "Reactivate"}</button>
          ${isAdmin() ? `<button class="danger" data-med-delete="${med.id}">Delete</button>` : ""}
        </div>` : ""}
    </div>
  `;
}

function setupMedicationButtons() {
  document.querySelectorAll("[data-med-toggle]").forEach(button => {
    button.onclick = async () => {
      const id = button.getAttribute("data-med-toggle");
      const active = button.getAttribute("data-active") === "true";
      await updateDoc(doc(db, "medications", id), {
        active: !active,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.email
      });
      await loadMedications();
    };
  });

  document.querySelectorAll("[data-med-delete]").forEach(button => {
    button.onclick = async () => {
      if (!isAdmin()) return alert("Only admins can delete medications.");
      if (!confirm("Delete this medication? Consider marking it inactive instead if you want to keep history.")) return;
      await deleteDoc(doc(db, "medications", button.getAttribute("data-med-delete")));
      await loadMedications();
    };
  });
}

function clearMedicationForm() {
  ["medPerson", "medName", "medDosage", "medSchedule", "medDoctor", "medPharmacy", "medRefillDate", "medInstructions"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

export function getActiveMedications(limit = null) {
  const meds = appState.medications.filter(m => m.active !== false);
  return limit ? meds.slice(0, limit) : meds;
}

export function getMedicationsForPerson(person, limit = 5) {
  return appState.medications
    .filter(m => (m.active !== false) && (m.person === person || m.person === "Both"))
    .slice(0, limit);
}

export function getRefillWatch(limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 14);

  return appState.medications
    .filter(m => m.active !== false && m.refillDate)
    .filter(m => {
      const d = parseDate(m.refillDate);
      return d && d <= soon;
    })
    .sort((a, b) => (a.refillDate || "9999-99-99").localeCompare(b.refillDate || "9999-99-99"))
    .slice(0, limit);
}

function getRefillClass(dateString) {
  if (!dateString) return "";
  const days = daysUntil(dateString);
  if (days === null) return "";
  if (days < 0) return "refill-overdue";
  if (days <= 7) return "refill-soon";
  return "";
}

function getRefillLabel(dateString) {
  if (!dateString) return "";
  const days = daysUntil(dateString);
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  if (days <= 14) return `due in ${days} day${days === 1 ? "" : "s"}`;
  return "";
}

function daysUntil(dateString) {
  const target = parseDate(dateString);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function parseDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
