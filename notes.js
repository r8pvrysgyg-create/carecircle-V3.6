import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import { appState } from "./state.js";
import { escapeHtml } from "./ui.js";
import { renderDashboard } from "./dashboard.js";
import { renderFamily } from "./family.js";

export async function addNote() {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to add notes.");

  const input = document.getElementById("noteInput");
  const person = document.getElementById("notePerson").value;
  const text = input.value.trim();

  if (!text) return;

  await addDoc(collection(db, "notes"), {
    text,
    person,
    author: user.email,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now()
  });

  input.value = "";
  document.getElementById("notePerson").value = "";
  await loadNotes();
}

export async function loadNotes() {
  const snapshot = await getDocs(collection(db, "notes"));
  appState.notes = [];

  snapshot.forEach(docSnap => appState.notes.push({ id: docSnap.id, ...docSnap.data() }));
  appState.notes.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

  renderNotes();
  renderDashboard();
  renderFamily();
}

export function renderNotes() {
  const div = document.getElementById("notes");
  if (!div) return;
  div.innerHTML = appState.notes.length ? appState.notes.map(n => renderNoteCard(n)).join("") : "<p>No notes yet.</p>";
}

export function renderNoteCard(note, compact = false) {
  return `
    <div class="item note-card">
      <div class="item-topline">
        <strong>${escapeHtml(note.author || "unknown")}</strong>
        ${note.person ? `<span class="pill">${escapeHtml(note.person)}</span>` : ""}
      </div>
      <p>${escapeHtml(note.text)}</p>
    </div>
  `;
}

export function getRecentNotes(limit = 5) {
  return appState.notes.slice(0, limit);
}
