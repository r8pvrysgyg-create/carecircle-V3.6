import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { appState, isAdmin } from "./state.js";
import { escapeHtml } from "./ui.js";

export async function addDirectoryContact() {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to add directory contacts.");

  const name = document.getElementById("directoryName").value.trim();
  const category = document.getElementById("directoryCategory").value.trim();
  const phone = document.getElementById("directoryPhone").value.trim();
  const alternatePhone = document.getElementById("directoryAltPhone").value.trim();
  const address = document.getElementById("directoryAddress").value.trim();
  const website = document.getElementById("directoryWebsite").value.trim();
  const defaultAppointmentType = document.getElementById("directoryDefaultType").value.trim();
  const defaultLocation = document.getElementById("directoryDefaultLocation").value.trim();
  const notes = document.getElementById("directoryNotes").value.trim();

  if (!name) return alert("Please enter a name for this directory contact.");

  await addDoc(collection(db, "directory"), {
    name,
    category,
    phone,
    alternatePhone,
    address,
    website,
    defaultAppointmentType,
    defaultLocation,
    notes,
    active: true,
    createdBy: user.email,
    createdAt: serverTimestamp()
  });

  clearDirectoryForm();
  await loadDirectoryContacts();
}

export async function loadDirectoryContacts() {
  const snapshot = await getDocs(collection(db, "directory"));
  appState.directoryContacts = [];

  snapshot.forEach(docSnap => {
    appState.directoryContacts.push({ id: docSnap.id, ...docSnap.data() });
  });

  appState.directoryContacts.sort((a, b) => {
    return `${a.category || "zzz"} ${a.name || ""}`.localeCompare(`${b.category || "zzz"} ${b.name || ""}`);
  });

  renderDirectoryContacts();
  populateAppointmentDirectorySelect();
}

export function renderDirectoryContacts() {
  const div = document.getElementById("directoryContacts");
  if (!div) return;

  div.innerHTML = appState.directoryContacts.length
    ? appState.directoryContacts.map(renderDirectoryCard).join("")
    : "<p>No directory contacts added yet.</p>";

  setupDirectoryButtons();
}

function renderDirectoryCard(contact) {
  const phoneLink = contact.phone ? contact.phone.replace(/[^0-9+]/g, "") : "";
  const altPhoneLink = contact.alternatePhone ? contact.alternatePhone.replace(/[^0-9+]/g, "") : "";
  const mapsUrl = contact.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}` : "";
  const website = normalizeWebsite(contact.website);

  return `
    <div class="item directory-item">
      <div class="item-topline">
        <strong>${escapeHtml(contact.name)}</strong>
        ${contact.category ? `<span class="pill">${escapeHtml(contact.category)}</span>` : ""}
      </div>
      ${contact.phone ? `<p>☎️ <a href="tel:${escapeHtml(phoneLink)}">${escapeHtml(contact.phone)}</a></p>` : ""}
      ${contact.alternatePhone ? `<p>☎️ Alternate: <a href="tel:${escapeHtml(altPhoneLink)}">${escapeHtml(contact.alternatePhone)}</a></p>` : ""}
      ${contact.address ? `<p>📍 ${escapeHtml(contact.address)} ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Open map</a>` : ""}</p>` : ""}
      ${website ? `<p>🌐 <a href="${escapeHtml(website)}" target="_blank" rel="noopener">Website</a></p>` : ""}
      ${contact.defaultAppointmentType ? `<p>📅 Default appointment type: ${escapeHtml(contact.defaultAppointmentType)}</p>` : ""}
      ${contact.defaultLocation ? `<p>🏥 Default location: ${escapeHtml(contact.defaultLocation)}</p>` : ""}
      ${contact.notes ? `<p>📝 ${escapeHtml(contact.notes)}</p>` : ""}
      <small>Added by ${escapeHtml(contact.createdBy || "unknown")}</small>
      ${isAdmin() ? `
        <div class="action-row">
          <button class="danger" data-directory-delete="${contact.id}">Delete</button>
        </div>
      ` : ""}
    </div>
  `;
}

function setupDirectoryButtons() {
  document.querySelectorAll("[data-directory-delete]").forEach(button => {
    button.onclick = async () => {
      if (!isAdmin()) return alert("Only admins can delete directory contacts.");
      if (!confirm("Delete this directory contact?")) return;

      await deleteDoc(doc(db, "directory", button.getAttribute("data-directory-delete")));
      await loadDirectoryContacts();
    };
  });
}

export function populateAppointmentDirectorySelect() {
  const select = document.getElementById("apptDirectoryContact");
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = `<option value="">Directory contact / location (optional)</option>`;

  appState.directoryContacts.forEach(contact => {
    const option = document.createElement("option");
    option.value = contact.id;
    option.textContent = `${contact.name}${contact.category ? ` - ${contact.category}` : ""}`;
    select.appendChild(option);
  });

  if (currentValue && appState.directoryContacts.some(contact => contact.id === currentValue)) {
    select.value = currentValue;
  }
}

export function getDirectoryContactById(id) {
  return appState.directoryContacts.find(contact => contact.id === id) || null;
}

export function applyDirectoryContactToAppointment(contactId) {
  const contact = getDirectoryContactById(contactId);
  if (!contact) return;

  const typeInput = document.getElementById("apptType");
  const doctorInput = document.getElementById("apptDoctor");
  const locationInput = document.getElementById("apptLocation");
  const notesInput = document.getElementById("apptNotes");

  if (typeInput && contact.defaultAppointmentType) typeInput.value = contact.defaultAppointmentType;
  if (doctorInput && contact.name) doctorInput.value = contact.name;

  const location = contact.defaultLocation || contact.address || "";
  if (locationInput && location) locationInput.value = location;

  const noteParts = [];
  if (contact.phone) noteParts.push(`Phone: ${contact.phone}`);
  if (contact.alternatePhone) noteParts.push(`Alternate phone: ${contact.alternatePhone}`);
  if (contact.notes) noteParts.push(`Directory notes: ${contact.notes}`);

  if (notesInput && noteParts.length) {
    const existing = notesInput.value.trim();
    const addition = noteParts.join("\n");
    notesInput.value = existing ? `${existing}\n${addition}` : addition;
  }
}

function clearDirectoryForm() {
  [
    "directoryName",
    "directoryCategory",
    "directoryPhone",
    "directoryAltPhone",
    "directoryAddress",
    "directoryWebsite",
    "directoryDefaultType",
    "directoryDefaultLocation",
    "directoryNotes"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function normalizeWebsite(value) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}
