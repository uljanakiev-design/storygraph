const firebaseConfig = {
  apiKey: "AIzaSyCRU-BS3OISzAX-6do7VQC8ImcDSBw7pNE",
  authDomain: "stafeta-c9654.firebaseapp.com",
  projectId: "stafeta-c9654"
};

let db = null;
let firebaseAvailable = false;
let syncOnline = false;

try {
  firebase.initializeApp(firebaseConfig);

  db = firebase.firestore();

  firebaseAvailable = true;
} catch (e) {
  console.warn("Firebase disabled");
}

const defaultLines = {
  A: {
    id: "A",
    name: "Línia A – Cestovateľ",
    persona: "Cestovateľ",
    description: "Tajomná cesta do neznáma.",
    entries: [],
    sublines: []
  },

  B: {
    id: "B",
    name: "Línia B – Vedec",
    persona: "Vedec",
    description: "Experiment sa pokazil.",
    entries: [],
    sublines: []
  }
};

let storyLines = {};
let currentLineId = null;

const STORAGE_KEY =
  "story_lines_clean_ui";

// DOM

const getLineBtn =
  document.getElementById("get-line-btn");

const changeLineBtn =
  document.getElementById("change-line-btn");

const addEntryBtn =
  document.getElementById("add-entry-btn");

const createLineBtn =
  document.getElementById("create-line-btn");

const createSublineBtn =
  document.getElementById("create-subline-btn");

const offlineModeBtn =
  document.getElementById("offline-mode-btn");

const onlineModeBtn =
  document.getElementById("online-mode-btn");

const resetBtn =
  document.getElementById("reset-btn");

const downloadBtn =
  document.getElementById("download-btn");

const lineTitleEl =
  document.getElementById("line-title");

const lineDescriptionEl =
  document.getElementById("line-description");

const entriesListEl =
  document.getElementById("entries-list");

const sublinesListEl =
  document.getElementById("sublines-list");

const overviewGridEl =
  document.getElementById("overview-grid");

const onlineIndicatorEl =
  document.getElementById("online-indicator");

const entryInputEl =
  document.getElementById("entry-input");

const statusMessageEl =
  document.getElementById("status-message");

const personaInputEl =
  document.getElementById("persona-input");

const lineDescriptionInputEl =
  document.getElementById("line-description-input");

const sublineTitleInputEl =
  document.getElementById("subline-title-input");

const sublineDescriptionInputEl =
  document.getElementById("subline-description-input");

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

    storyLines =
      JSON.parse(saved);

  } else {

    storyLines =
      JSON.parse(
        JSON.stringify(defaultLines)
      );

    saveOffline();
  }
}

// MODE

function updateModeUI() {

  if (syncOnline) {

    onlineModeBtn.classList.add("active-mode");

    offlineModeBtn.classList.remove("active-mode");

    onlineIndicatorEl.textContent =
      "Online režim";

  } else {

    offlineModeBtn.classList.add("active-mode");

    onlineModeBtn.classList.remove("active-mode");

    onlineIndicatorEl.textContent =
      "Lokálny režim";
  }
}

function setOfflineMode() {
  syncOnline = false;
  updateModeUI();
}

function setOnlineMode() {

  if (!firebaseAvailable) {
    alert("Firebase nie je dostupný.");
    return;
  }

  syncOnline = true;

  updateModeUI();
}

// RANDOM LINE

function randomLineId() {

  const ids =
    Object.keys(storyLines);

  if (!ids.length) return null;

  return ids[
    Math.floor(
      Math.random() * ids.length
    )
  ];
}

// RENDER

function renderCurrentLine() {

  if (
    !currentLineId ||
    !storyLines[currentLineId]
  ) {

    lineTitleEl.textContent =
      "Línia nie je vybraná";

    lineDescriptionEl.textContent =
      "Vyber alebo vytvor líniu.";

    entriesListEl.innerHTML =
      "<p>Zatiaľ bez úryvkov</p>";

    sublinesListEl.innerHTML =
      "<p>Žiadne podlínie</p>";

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
  changeLineBtn.disabled = false;
  createSublineBtn.disabled = false;
}

function renderEntries(line) {

  entriesListEl.innerHTML = "";

  if (!line.entries.length) {

    entriesListEl.classList.add("empty");

    entriesListEl.innerHTML =
      "<p>Zatiaľ bez úryvkov</p>";

    return;
  }

  entriesListEl.classList.remove("empty");

  line.entries
    .slice(-5)
    .forEach(text => {

      const div =
        document.createElement("div");

      div.className = "entry";

      div.textContent = text;

      entriesListEl.appendChild(div);
    });
}

function renderSublines(line) {

  sublinesListEl.innerHTML = "";

  if (!line.sublines.length) {

    sublinesListEl.classList.add("empty");

    sublinesListEl.innerHTML =
      "<p>Žiadne podlínie</p>";

    return;
  }

  sublinesListEl.classList.remove("empty");

  line.sublines.forEach(sub => {

    const card =
      document.createElement("div");

    card.className =
      "subline-card";

    card.innerHTML = `
      <h4>${sub.title}</h4>
      <p>${sub.description}</p>
    `;

    sublinesListEl.appendChild(card);
  });
}

function renderOverview() {

  overviewGridEl.innerHTML = "";

  Object.values(storyLines)
    .forEach(line => {

      const card =
        document.createElement("div");

      card.className =
        "overview-card";

      card.innerHTML = `
        <h3>${line.name}</h3>

        <p class="muted">
          Postava:
          ${line.persona}
        </p>

        <p class="muted">
          Úryvky:
          ${line.entries.length}
        </p>

        <p class="muted">
          Podlínie:
          ${line.sublines.length}
        </p>
      `;

      overviewGridEl.appendChild(card);
    });
}

// ENTRY

function addEntry() {

  if (!currentLineId) return;

  const text =
    entryInputEl.value.trim();

  if (!text) return;

  storyLines[currentLineId]
    .entries
    .push(text);

  saveOffline();

  entryInputEl.value = "";

  statusMessageEl.textContent =
    "Úryvok pridaný";

  setTimeout(() => {
    statusMessageEl.textContent = "";
  }, 1500);

  renderCurrentLine();
  renderOverview();
}

// CREATE LINE

function createLine() {

  const persona =
    personaInputEl.value.trim();

  const description =
    lineDescriptionInputEl.value.trim();

  if (!persona || !description) {
    return;
  }

  const id =
    "L" + Date.now();

  storyLines[id] = {

    id,

    name:
      `Línia – ${persona}`,

    persona,

    description,

    entries: [],

    sublines: []
  };

  saveOffline();

  personaInputEl.value = "";
  lineDescriptionInputEl.value = "";

  renderOverview();
}

// CREATE SUBLINE

function createSubline() {

  if (!currentLineId) return;

  const title =
    sublineTitleInputEl.value.trim();

  const description =
    sublineDescriptionInputEl.value.trim();

  if (!title) return;

  storyLines[currentLineId]
    .sublines
    .push({

      id: "S" + Date.now(),

      title,

      description
    });

  saveOffline();

  sublineTitleInputEl.value = "";
  sublineDescriptionInputEl.value = "";

  renderCurrentLine();
  renderOverview();
}

// RESET

function resetAll() {

  const sure = confirm(
    "Vymazať všetky údaje?"
  );

  if (!sure) return;

  storyLines =
    JSON.parse(
      JSON.stringify(defaultLines)
    );

  Object.values(storyLines)
    .forEach(line => {

      line.entries = [];
      line.sublines = [];
    });

  saveOffline();

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
        `=== ${line.name} ===\n`;

      content +=
        `Postava: ${line.persona}\n`;

      content +=
        `Opis: ${line.description}\n\n`;

      content +=
        `Úryvky:\n`;

      line.entries.forEach(
        (e, i) => {

          content +=
            `${i + 1}. ${e}\n`;
        }
      );

      content +=
        `\nPodlínie:\n`;

      line.sublines.forEach(
        (s, i) => {

          content +=
            `${i + 1}. ${s.title}\n`;

          content +=
            `${s.description}\n`;
        }
      );

      content +=
        `\n-----------------\n\n`;
    });

  const blob =
    new Blob(
      [content],
      { type: "text/plain" }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "stories.txt";

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// EVENTS

getLineBtn.addEventListener(
  "click",
  () => {

    currentLineId =
      randomLineId();

    renderCurrentLine();
  }
);

changeLineBtn.addEventListener(
  "click",
  () => {

    currentLineId =
      randomLineId();

    renderCurrentLine();
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

  loadOffline();

  renderOverview();

  renderCurrentLine();

  updateModeUI();
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
