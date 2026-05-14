const firebaseConfig = {
  apiKey: "AIzaSyCRU-BS3OISzAX-6do7VQC8ImcDSBw7pNE",
  authDomain: "stafeta-c9654.firebaseapp.com",
  projectId: "stafeta-c9654",
  storageBucket: "stafeta-c9654.firebasestorage.app",
  messagingSenderId: "925671597292",
  appId: "1:925671597292:web:8d0ef6cdcc1b20f5dbb1c9",
  measurementId: "G-ENYX6SR4RZ"
};

let db = null;
let firebaseAvailable = false;
let syncOnline = false;
let firestoreUnsubscribe = null;
let seeded = false;
let currentUserName = "";

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseAvailable = true;
} catch (e) {
  console.warn("Firebase disabled:", e);
}

const defaultLines = {
  A: {
    id: "A",
    name: "Línia A – Cestovateľ",
    persona: "Cestovateľ",
    description: "Postava sa vydáva na neznáme miesto.",
    entries: [],
    sublines: []
  },

  B: {
    id: "B",
    name: "Línia B – Pozorovateľ",
    persona: "Pozorovateľ",
    description: "Postava sleduje zvláštne udalosti.",
    entries: [],
    sublines: []
  },

  C: {
    id: "C",
    name: "Línia C – Mesto",
    persona: "Prieskumník",
    description: "Skryté detaily mesta.",
    entries: [],
    sublines: []
  }
};

let storyLines = {};
let currentLineId = null;

const STORAGE_KEY = "story_lines_final";
const USER_NAME_KEY = "story_user_name";

// DOM

const getLineBtn = document.getElementById("get-line-btn");
const changeLineBtn = document.getElementById("change-line-btn");
const addEntryBtn = document.getElementById("add-entry-btn");
const createLineBtn = document.getElementById("create-line-btn");
const createSublineBtn = document.getElementById("create-subline-btn");
const offlineModeBtn = document.getElementById("offline-mode-btn");
const onlineModeBtn = document.getElementById("online-mode-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadBtn = document.getElementById("download-btn");

const lineTitleEl = document.getElementById("line-title");
const lineDescriptionEl = document.getElementById("line-description");
const entriesListEl = document.getElementById("entries-list");
const sublinesListEl = document.getElementById("sublines-list");
const overviewGridEl = document.getElementById("overview-grid");
const onlineIndicatorEl = document.getElementById("online-indicator");
const entryInputEl = document.getElementById("entry-input");
const statusMessageEl = document.getElementById("status-message");

const personaInputEl = document.getElementById("persona-input");
const lineDescriptionInputEl = document.getElementById("line-description-input");

const sublineTitleInputEl = document.getElementById("subline-title-input");
const sublineDescriptionInputEl = document.getElementById("subline-description-input");

const userNameInputEl = document.getElementById("user-name-input");

// HELPERS

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEntry(entry) {

  if (typeof entry === "string") {

    return {
      id: "old-" + Math.random(),
      text: entry,
      author: "",
      createdAt: 0
    };
  }

  return {
    id: entry.id || "E" + Date.now(),
    text: entry.text || "",
    author: entry.author || "",
    createdAt: entry.createdAt || 0
  };
}

function normalizeLine(line) {

  return {
    id: line.id,
    name: line.name || "Bez názvu",
    persona: line.persona || "",
    description: line.description || "",
    entries: Array.isArray(line.entries)
      ? line.entries.map(normalizeEntry)
      : [],
    sublines: Array.isArray(line.sublines)
      ? line.sublines
      : [],
    createdAt: line.createdAt || null
  };
}

// STORAGE

function saveOffline() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(storyLines)
  );
}

function loadOffline() {

  const saved =
    localStorage.getItem(STORAGE_KEY);

  if (saved) {

    const parsed =
      JSON.parse(saved);

    storyLines = {};

    Object.values(parsed)
      .forEach(line => {

        storyLines[line.id] =
          normalizeLine(line);
      });

    return;
  }

  storyLines = {};

  Object.values(defaultLines)
    .forEach(line => {

      storyLines[line.id] =
        normalizeLine(clone(line));
    });

  saveOffline();
}

// USER

function loadUserName() {

  currentUserName =
    localStorage.getItem(USER_NAME_KEY)
    || "";

  userNameInputEl.value =
    currentUserName;
}

function saveUserName() {

  currentUserName =
    userNameInputEl.value.trim();

  localStorage.setItem(
    USER_NAME_KEY,
    currentUserName
  );
}

// MODE

function updateModeUI() {

  if (syncOnline) {

    onlineModeBtn.classList.add("active-mode");

    offlineModeBtn.classList.remove("active-mode");

    onlineIndicatorEl.textContent =
      `Online režim — píšeš ako ${currentUserName}`;

  } else {

    offlineModeBtn.classList.add("active-mode");

    onlineModeBtn.classList.remove("active-mode");

    onlineIndicatorEl.textContent =
      "Lokálny režim";
  }
}

function setOfflineMode() {

  syncOnline = false;

  if (firestoreUnsubscribe) {

    firestoreUnsubscribe();

    firestoreUnsubscribe = null;
  }

  updateModeUI();
}

function setOnlineMode() {

  saveUserName();

  if (!currentUserName) {

    alert("Najprv vyplň svoje meno.");

    userNameInputEl.focus();

    return;
  }

  if (!firebaseAvailable || !db) {

    alert("Firebase nie je dostupný.");

    return;
  }

  syncOnline = true;

  updateModeUI();

  subscribeFirestore();
}

// FIRESTORE

async function seedFirestoreDefaults() {

  const batch = db.batch();

  Object.values(defaultLines)
    .forEach(line => {

      const ref =
        db.collection("lines")
          .doc(line.id);

      batch.set(ref, {
        name: line.name,
        persona: line.persona,
        description: line.description,
        entries: [],
        sublines: [],
        createdAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });
    });

  await batch.commit();
}

function subscribeFirestore() {

  if (!db) return;

  if (firestoreUnsubscribe) {

    firestoreUnsubscribe();

    firestoreUnsubscribe = null;
  }

  firestoreUnsubscribe =
    db.collection("lines")
      .orderBy("createdAt", "asc")
      .onSnapshot(
        async snapshot => {

          if (snapshot.empty && !seeded) {

            seeded = true;

            await seedFirestoreDefaults();

            return;
          }

          const result = {};

          snapshot.forEach(doc => {

            const data = doc.data();

            result[doc.id] =
              normalizeLine({
                id: doc.id,
                name: data.name,
                persona: data.persona,
                description: data.description,
                entries: data.entries,
                sublines: data.sublines,
                createdAt: data.createdAt
              });
          });

          storyLines = result;

          saveOffline();

          renderOverview();
          renderCurrentLine();
        }
      );
}

// ONLINE SAVE

async function addEntryOnline(lineId, entry) {

  await db.collection("lines")
    .doc(lineId)
    .update({

      entries:
        firebase.firestore.FieldValue.arrayUnion(entry)
    });
}

async function addLineOnline(line) {

  await db.collection("lines")
    .doc(line.id)
    .set({

      name: line.name,
      persona: line.persona,
      description: line.description,
      entries: [],
      sublines: [],
      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function addSublineOnline(lineId, subline) {

  await db.collection("lines")
    .doc(lineId)
    .update({

      sublines:
        firebase.firestore.FieldValue.arrayUnion(subline)
    });
}

// RESET

async function resetOnlineForEveryone() {

  const snapshot =
    await db.collection("lines").get();

  const deleteBatch =
    db.batch();

  snapshot.forEach(doc => {

    deleteBatch.delete(doc.ref);
  });

  await deleteBatch.commit();

  const createBatch =
    db.batch();

  Object.values(defaultLines)
    .forEach(line => {

      const ref =
        db.collection("lines")
          .doc(line.id);

      createBatch.set(ref, {
        name: line.name,
        persona: line.persona,
        description: line.description,
        entries: [],
        sublines: [],
        createdAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });
    });

  await createBatch.commit();
}

// RENDER

function randomLineId() {

  const ids =
    Object.keys(storyLines);

  if (!ids.length) return null;

  return ids[
    Math.floor(Math.random() * ids.length)
  ];
}

function renderCurrentLine() {

  if (
    !currentLineId ||
    !storyLines[currentLineId]
  ) {

    lineTitleEl.textContent =
      "Línia nie je vybraná";

    lineDescriptionEl.textContent =
      "Vyber alebo vytvor líniu.";

    entriesListEl.classList.add("empty");

    entriesListEl.innerHTML =
      "<p>Zatiaľ bez textu.</p>";

    sublinesListEl.classList.add("empty");

    sublinesListEl.innerHTML =
      "<p>Žiadne podlínie.</p>";

    addEntryBtn.disabled = true;
    createSublineBtn.disabled = true;
    changeLineBtn.disabled = true;

    return;
  }

  const line =
    storyLines[currentLineId];

  lineTitleEl.textContent =
    line.name;

  lineDescriptionEl.textContent =
    line.description;

  renderEntries(line);
  renderSublines(line);

  addEntryBtn.disabled = false;
  createSublineBtn.disabled = false;
  changeLineBtn.disabled = false;
}

function renderEntries(line) {

  entriesListEl.innerHTML = "";

  if (!line.entries.length) {

    entriesListEl.classList.add("empty");

    entriesListEl.innerHTML =
      "<p>Zatiaľ bez textu.</p>";

    return;
  }

  entriesListEl.classList.remove("empty");

  line.entries.forEach((entry, index) => {

    const block =
      document.createElement("div");

    block.className =
      "story-block";

    const paragraph =
      document.createElement("p");

    paragraph.className =
      "story-paragraph";

    paragraph.textContent =
      entry.text;

    if (index === 0) {
      paragraph.classList.add("first");
    }

    const meta =
      document.createElement("p");

    meta.className =
      "author-line";

    meta.textContent =
      entry.author
        ? `Autor: ${entry.author}`
        : "Autor: neznámy";

    block.appendChild(paragraph);
    block.appendChild(meta);

    entriesListEl.appendChild(block);
  });
}

function renderSublines(line) {

  sublinesListEl.innerHTML = "";

  if (!line.sublines.length) {

    sublinesListEl.classList.add("empty");

    sublinesListEl.innerHTML =
      "<p>Žiadne podlínie. Zatiaľ sa príbeh nerozvetvil.</p>";

    return;
  }

  sublinesListEl.classList.remove("empty");

  const intro =
    document.createElement("p");

  intro.className =
    "subline-intro";

  intro.textContent =
    "Príbeh sa môže ďalej rozvíjať týmito smermi:";

  sublinesListEl.appendChild(intro);

  line.sublines.forEach((sub, index) => {

    const branch =
      document.createElement("div");

    branch.className =
      "story-branch";

    const number =
      document.createElement("div");

    number.className =
      "branch-number";

    number.textContent =
      (index + 1) + ".";

    const content =
      document.createElement("div");

    content.className =
      "branch-content";

    const title =
      document.createElement("h4");

    title.className =
      "branch-title";

    title.textContent =
      sub.title;

    const description =
      document.createElement("p");

    description.className =
      "branch-description";

    description.textContent =
      sub.description || "";

    content.appendChild(title);
    content.appendChild(description);

    if (sub.author) {

      const author =
        document.createElement("p");

      author.className =
        "branch-author";

      author.textContent =
        "Vetvu vytvoril: " + sub.author;

      content.appendChild(author);
    }

    branch.appendChild(number);
    branch.appendChild(content);

    sublinesListEl.appendChild(branch);
  });
}

function renderOverview() {

  overviewGridEl.innerHTML = "";

  Object.values(storyLines)
    .forEach(line => {

      const card =
        document.createElement("button");

      card.className =
        "overview-card";

      card.type = "button";

      if (line.id === currentLineId) {
        card.classList.add("selected");
      }

      card.addEventListener("click", () => {

        currentLineId =
          line.id;

        renderCurrentLine();
        renderOverview();

        document.querySelector(".story-card")
          .scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      });

      card.innerHTML = `
        <h3>${line.name}</h3>

        <p class="muted">
          ${line.entries.length} častí ·
          ${line.sublines.length} podlínií
        </p>

        <p>${line.description}</p>
      `;

      overviewGridEl.appendChild(card);
    });
}

// ACTIONS

async function addEntry() {

  if (!currentLineId) return;

  const text =
    entryInputEl.value.trim();

  if (!text) {

    alert("Napíš text pokračovania.");

    return;
  }

  saveUserName();

  const entry = {
    id: "E" + Date.now(),
    text,
    author: currentUserName || "",
    createdAt: Date.now()
  };

  if (syncOnline) {

    if (!currentUserName) {

      alert("Vyplň meno.");

      return;
    }

    await addEntryOnline(
      currentLineId,
      entry
    );

  } else {

    storyLines[currentLineId]
      .entries
      .push(entry);

    saveOffline();

    renderCurrentLine();
    renderOverview();
  }

  entryInputEl.value = "";

  statusMessageEl.textContent =
    "Text bol pridaný.";

  setTimeout(() => {

    statusMessageEl.textContent = "";

  }, 1500);
}

async function createLine() {

  const persona =
    personaInputEl.value.trim();

  const description =
    lineDescriptionInputEl.value.trim();

  if (!persona || !description) {

    alert("Vyplň všetky polia.");

    return;
  }

  const id =
    "L" + Date.now();

  const line = {
    id,
    name: `Línia – ${persona}`,
    persona,
    description,
    entries: [],
    sublines: []
  };

  if (syncOnline) {

    await addLineOnline(line);

  } else {

    storyLines[id] = line;

    saveOffline();
  }

  currentLineId = id;

  personaInputEl.value = "";
  lineDescriptionInputEl.value = "";

  renderCurrentLine();
  renderOverview();
}

async function createSubline() {

  if (!currentLineId) return;

  const title =
    sublineTitleInputEl.value.trim();

  const description =
    sublineDescriptionInputEl.value.trim();

  if (!title) {

    alert("Zadaj názov.");

    return;
  }

  const subline = {
    id: "S" + Date.now(),
    title,
    description,
    author: currentUserName || ""
  };

  if (syncOnline) {

    await addSublineOnline(
      currentLineId,
      subline
    );

  } else {

    storyLines[currentLineId]
      .sublines
      .push(subline);

    saveOffline();

    renderCurrentLine();
    renderOverview();
  }

  sublineTitleInputEl.value = "";
  sublineDescriptionInputEl.value = "";
}

async function resetAll() {

  const sure = confirm(
    "Vymazať všetko?"
  );

  if (!sure) return;

  storyLines =
    clone(defaultLines);

  Object.values(storyLines)
    .forEach(line => {

      line.entries = [];
      line.sublines = [];
    });

  saveOffline();

  if (syncOnline && db) {

    await resetOnlineForEveryone();
  }

  currentLineId = null;

  renderCurrentLine();
  renderOverview();
}

// EXPORT

function exportStories() {

  let content = "";

  Object.values(storyLines)
    .forEach(line => {

      content +=
        `=== ${line.name} ===\n\n`;

      line.entries.forEach(entry => {

        content +=
          `${entry.text}\n`;

        content +=
          `(${entry.author})\n\n`;
      });

      line.sublines.forEach(sub => {

        content +=
          `→ ${sub.title}\n`;

        content +=
          `${sub.description}\n\n`;
      });

      content +=
        "-------------------\n\n";
    });

  const blob =
    new Blob([content], {
      type: "text/plain"
    });

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;
  a.download = "story.txt";

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// EVENTS

userNameInputEl.addEventListener(
  "input",
  () => {

    saveUserName();
    updateModeUI();
  }
);

getLineBtn.addEventListener(
  "click",
  () => {

    currentLineId =
      randomLineId();

    renderCurrentLine();
    renderOverview();
  }
);

changeLineBtn.addEventListener(
  "click",
  () => {

    currentLineId =
      randomLineId();

    renderCurrentLine();
    renderOverview();
  }
);

addEntryBtn.addEventListener(
  "click",
  addEntry
);

createLineBtn.addEventListener(
  "click",
  createLine
);

createSublineBtn.addEventListener(
  "click",
  createSubline
);

offlineModeBtn.addEventListener(
  "click",
  setOfflineMode
);

onlineModeBtn.addEventListener(
  "click",
  setOnlineMode
);

resetBtn.addEventListener(
  "click",
  resetAll
);

downloadBtn.addEventListener(
  "click",
  exportStories
);

// INIT

function init() {

  loadUserName();
  loadOffline();

  renderOverview();
  renderCurrentLine();

  setOfflineMode();
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
