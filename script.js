const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};

let db = null;
let firebaseAvailable = false;
let syncOnline = false;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseAvailable = true;
} catch (e) {
  console.warn(e);
}

const defaultLines = {
  A: {
    id: "A",
    name: "Línia A",
    persona: "Cestovateľ",
    description: "Príbeh cestovateľa",
    entries: [],
    sublines: []
  },

  B: {
    id: "B",
    name: "Línia B",
    persona: "Vedec",
    description: "Príbeh vedca",
    entries: [],
    sublines: []
  }
};

let storyLines = {};
let currentLineId = null;

const STORAGE_KEY = "story_lines_with_sublines";

const getLineBtn = document.getElementById("get-line-btn");
const changeLineBtn = document.getElementById("change-line-btn");
const addEntryBtn = document.getElementById("add-entry-btn");
const createSublineBtn = document.getElementById("create-subline-btn");

const lineTitleEl = document.getElementById("line-title");
const lineDescEl = document.getElementById("line-description");
const entriesListEl = document.getElementById("entries-list");
const sublinesListEl = document.getElementById("sublines-list");

const entryInputEl = document.getElementById("entry-input");
const statusMessageEl = document.getElementById("status-message");

const overviewGridEl = document.getElementById("overview-grid");

const personaCustomEl = document.getElementById("persona-custom");
const lineDescInputEl = document.getElementById("line-desc-input");

const addLineBtn = document.getElementById("add-line-btn");

function saveOffline() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(storyLines)
  );
}

function loadOffline() {

  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    storyLines = JSON.parse(saved);
  } else {
    storyLines = defaultLines;
    saveOffline();
  }
}

function randomLineId() {

  const ids = Object.keys(storyLines);

  return ids[
    Math.floor(Math.random() * ids.length)
  ];
}

function renderCurrentLine() {

  if (!currentLineId) return;

  const line = storyLines[currentLineId];

  lineTitleEl.textContent = line.name;
  lineDescEl.textContent = line.description;

  entriesListEl.innerHTML = "";

  if (!line.entries.length) {

    entriesListEl.innerHTML =
      "<p>Zatiaľ bez úryvkov</p>";

  } else {

    line.entries.forEach(text => {

      const div = document.createElement("div");

      div.className = "entry";
      div.textContent = text;

      entriesListEl.appendChild(div);
    });
  }

  renderSublines();

  addEntryBtn.disabled = false;
  changeLineBtn.disabled = false;
  createSublineBtn.disabled = false;
}

function renderSublines() {

  const line = storyLines[currentLineId];

  sublinesListEl.innerHTML = "";

  if (!line.sublines.length) {

    sublinesListEl.classList.add("empty");

    sublinesListEl.innerHTML =
      "<p>Žiadne podlínie</p>";

    return;
  }

  sublinesListEl.classList.remove("empty");

  line.sublines.forEach(sub => {

    const card = document.createElement("div");

    card.className = "subline-card";

    card.innerHTML = `
      <h4>${sub.title}</h4>
      <p>${sub.description}</p>
    `;

    sublinesListEl.appendChild(card);
  });
}

function renderOverview() {

  overviewGridEl.innerHTML = "";

  Object.values(storyLines).forEach(line => {

    const card = document.createElement("div");

    card.className = "overview-card";

    card.innerHTML = `
      <h3>${line.name}</h3>

      <p>Podlínie:
      ${line.sublines.length}</p>

      <p>Úryvky:
      ${line.entries.length}</p>
    `;

    overviewGridEl.appendChild(card);
  });
}

getLineBtn.addEventListener("click", () => {

  currentLineId = randomLineId();

  renderCurrentLine();
});

changeLineBtn.addEventListener("click", () => {

  currentLineId = randomLineId();

  renderCurrentLine();
});

addEntryBtn.addEventListener("click", () => {

  const text = entryInputEl.value.trim();

  if (!text) return;

  storyLines[currentLineId]
    .entries
    .push(text);

  saveOffline();

  entryInputEl.value = "";

  renderCurrentLine();
  renderOverview();
});

createSublineBtn.addEventListener("click", () => {

  const title = prompt("Názov podlínie");

  if (!title) return;

  const description =
    prompt("Opis podlínie") || "";

  storyLines[currentLineId]
    .sublines
    .push({
      id: "S" + Date.now(),
      title,
      description
    });

  saveOffline();

  renderCurrentLine();
  renderOverview();
});

addLineBtn.addEventListener("click", () => {

  const persona =
    personaCustomEl.value.trim();

  const description =
    lineDescInputEl.value.trim();

  if (!persona || !description) return;

  const id = "L" + Date.now();

  storyLines[id] = {
    id,
    name: `Línia – ${persona}`,
    persona,
    description,
    entries: [],
    sublines: []
  };

  saveOffline();

  personaCustomEl.value = "";
  lineDescInputEl.value = "";

  renderOverview();
});

function init() {

  loadOffline();

  renderOverview();
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
