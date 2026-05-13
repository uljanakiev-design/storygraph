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

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseAvailable = true;
  console.log("Firebase pripojený");
} catch (e) {
  console.warn("Firebase nie je dostupný:", e);
  firebaseAvailable = false;
}

const defaultLines = {
  A: {
    id: "A",
    name: "Línia A – Cestovateľ",
    persona: "Cestovateľ",
    description: "Postava A sa skoro ráno vydala na neznáme miesto.",
    entries: [
      "Postava A vyšla z domu skôr než zvyčajne, aj keď sama poriadne netušila, kam ju tento deň zavedie."
    ],
    sublines: []
  },

  B: {
    id: "B",
    name: "Línia B – Pozorovateľ",
    persona: "Pozorovateľ",
    description: "Postava B zostáva doma a venuje sa bežným veciam.",
    entries: [
      "Postava B si zapla obrazovku a rozhodla sa, že dnes konečne pozrie to, čo už mesiac odkladá."
    ],
    sublines: []
  },

  C: {
    id: "C",
    name: "Línia C – Voda",
    persona: "Snílek",
    description: "Postava C je pri vode a v kontakte s prírodou.",
    entries: [
      "Postava C opatrne vošla do vody – bola chladná a prekvapivo pokojná."
    ],
    sublines: []
  },

  D: {
    id: "D",
    name: "Línia D – Mesto",
    persona: "Prieskumník",
    description: "Postava D sa túla mestom a všíma si zvláštne detaily.",
    entries: [
      "Postava D si uvedomila, že si nikdy predtým nevšímala nápisy na starých domoch."
    ],
    sublines: []
  },

  E: {
    id: "E",
    name: "Línia E – Minulosť",
    persona: "Strážca",
    description: "Línia z minulosti, ktorá postupne vysvetľuje súčasné udalosti.",
    entries: [
      "Pred mnohými rokmi urobil niekto rozhodnutie, ktoré dnes doznieva v životoch úplne cudzích ľudí."
    ],
    sublines: []
  },

  F: {
    id: "F",
    name: "Línia F – Nečakaná správa",
    persona: "Skeptik",
    description: "Postava F dostane zvláštnu správu a nemyslí si, že je vážna.",
    entries: [
      "Správa vyzerala ako žart, ale dátum a čas v nej sa presne zhodovali s dneškom."
    ],
    sublines: []
  }
};

let storyLines = {};
let currentLineId = null;

const STORAGE_KEY = "story_lines_with_sublines_v4";

const getLineBtn = document.getElementById("get-line-btn");
const changeLineBtn = document.getElementById("change-line-btn");
const addEntryBtn = document.getElementById("add-entry-btn");
const downloadBtn = document.getElementById("download-btn");
const resetBtn = document.getElementById("reset-btn");
const addLineBtn = document.getElementById("add-line-btn");
const createSublineBtn = document.getElementById("create-subline-btn");

const offlineModeBtn = document.getElementById("offline-mode-btn");
const onlineModeBtn = document.getElementById("online-mode-btn");

const lineTitleEl = document.getElementById("line-title");
const lineDescEl = document.getElementById("line-description");
const entriesListEl = document.getElementById("entries-list");
const sublinesListEl = document.getElementById("sublines-list");
const entryInputEl = document.getElementById("entry-input");
const statusMessageEl = document.getElementById("status-message");
const overviewGridEl = document.getElementById("overview-grid");
const onlineIndicatorEl = document.getElementById("online-indicator");

const personaSelectEl = document.getElementById("persona-select");
const personaCustomEl = document.getElementById("persona-custom");
const lineDescInputEl = document.getElementById("line-desc-input");
const newLineStatusEl = document.getElementById("new-line-status");

let firestoreUnsubscribe = null;
let seeded = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLine(line) {
  return {
    id: line.id,
    name: line.name || "Bez názvu",
    persona: line.persona || "",
    description: line.description || "",
    entries: Array.isArray(line.entries) ? line.entries : [],
    sublines: Array.isArray(line.sublines) ? line.sublines : []
  };
}

function loadOffline() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    const parsed = JSON.parse(saved);
    storyLines = {};

    Object.values(parsed).forEach(line => {
      storyLines[line.id] = normalizeLine(line);
    });

    return;
  }

  storyLines = {};
  Object.values(defaultLines).forEach(line => {
    storyLines[line.id] = normalizeLine(clone(line));
  });

  saveOffline();
}

function saveOffline() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storyLines));
}

function setModeButtons() {
  if (syncOnline) {
    onlineModeBtn.classList.add("active-mode");
    offlineModeBtn.classList.remove("active-mode");
  } else {
    offlineModeBtn.classList.add("active-mode");
    onlineModeBtn.classList.remove("active-mode");
  }
}

function setOfflineMode() {
  syncOnline = false;

  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }

  onlineIndicatorEl.textContent =
    "Režim: lokálny (údaje sú len v tomto zariadení)";

  setModeButtons();
}

function setOnlineMode() {
  if (!firebaseAvailable || !db) {
    syncOnline = false;

    onlineIndicatorEl.textContent =
      "Online režim nie je dostupný. Firebase nie je pripojený.";

    setModeButtons();
    return;
  }

  syncOnline = true;

  onlineIndicatorEl.textContent =
    "Režim: online + lokálny (viac ľudí môže písať na jednom odkaze)";

  setModeButtons();
  subscribeFirestore();
}

function seedFirestoreDefaults(emptyEntries = false) {
  const batch = db.batch();

  Object.values(defaultLines).forEach(line => {
    const docRef = db.collection("lines").doc(line.id);

    batch.set(docRef, {
      name: line.name,
      persona: line.persona || "",
      description: line.description || "",
      entries: emptyEntries ? [] : (line.entries || []),
      sublines: line.sublines || [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  return batch.commit();
}

function subscribeFirestore() {
  if (!db) return;

  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }

  firestoreUnsubscribe = db
    .collection("lines")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      async snapshot => {
        if (snapshot.empty && !seeded) {
          seeded = true;
          await seedFirestoreDefaults(true);
          return;
        }

        const result = {};

        snapshot.forEach(doc => {
          const data = doc.data();

          result[doc.id] = normalizeLine({
            id: doc.id,
            name: data.name,
            persona: data.persona,
            description: data.description,
            entries: data.entries,
            sublines: data.sublines
          });
        });

        storyLines = result;
        saveOffline();

        renderOverview();
        renderCurrentLine();
      },

      error => {
        console.error("Firestore chyba:", error);

        syncOnline = false;

        onlineIndicatorEl.textContent =
          "Chyba pripojenia. Režim: lokálny.";

        setModeButtons();
      }
    );
}

function addEntryOnline(lineId, text) {
  if (!db) return Promise.resolve();

  const ref = db.collection("lines").doc(lineId);

  return ref.update({
    entries: firebase.firestore.FieldValue.arrayUnion(text)
  });
}

function addSublineOnline(lineId, subline) {
  if (!db) return Promise.resolve();

  const ref = db.collection("lines").doc(lineId);

  return ref.update({
    sublines: firebase.firestore.FieldValue.arrayUnion(subline)
  });
}

function addLineOnline(line, id) {
  if (!db) return Promise.resolve();

  return db.collection("lines").doc(id).set({
    name: line.name,
    persona: line.persona || "",
    description: line.description || "",
    entries: [],
    sublines: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function hardResetOnlineData() {
  if (!firebaseAvailable || !db) return;

  const snapshot = await db.collection("lines").get();
  const batch = db.batch();

  snapshot.forEach(doc => {
    const data = doc.data();
    const template = defaultLines[doc.id];

    batch.set(doc.ref, {
      name: template ? template.name : (data.name || "Bez názvu"),
      persona: template ? template.persona : (data.persona || ""),
      description: template ? template.description : (data.description || ""),
      entries: [],
      sublines: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
}

function randomLineId() {
  const ids = Object.keys(storyLines);

  if (!ids.length) return null;

  const index = Math.floor(Math.random() * ids.length);

  return ids[index];
}

function renderCurrentLine() {
  if (!currentLineId || !storyLines[currentLineId]) {
    lineTitleEl.textContent = "Línia nie je vybraná";
    lineDescEl.textContent = "Klikni na „Získať líniu“, aby si začal.";

    entriesListEl.classList.add("empty");
    entriesListEl.innerHTML = "<p>Zatiaľ žiadne údaje.</p>";

    sublinesListEl.classList.add("empty");
    sublinesListEl.innerHTML = "<p>Žiadne podlínie.</p>";

    addEntryBtn.disabled = true;
    changeLineBtn.disabled = true;
    createSublineBtn.disabled = true;

    return;
  }

  const line = storyLines[currentLineId];

  lineTitleEl.textContent = line.name;
  lineDescEl.textContent = line.description;

  renderEntries(line);
  renderSublines(line);

  addEntryBtn.disabled = false;
  changeLineBtn.disabled = false;
  createSublineBtn.disabled = false;
}

function renderEntries(line) {
  const entries = line.entries || [];

  entriesListEl.innerHTML = "";

  if (!entries.length) {
    entriesListEl.classList.add("empty");
    entriesListEl.innerHTML = "<p>Zatiaľ nikto nepísal. Začni ako prvý!</p>";
    return;
  }

  entriesListEl.classList.remove("empty");

  entries.slice(-3).forEach(text => {
    const div = document.createElement("div");

    div.className = "entry";
    div.textContent = text;

    entriesListEl.appendChild(div);
  });
}

function renderSublines(line) {
  const sublines = line.sublines || [];

  sublinesListEl.innerHTML = "";

  if (!sublines.length) {
    sublinesListEl.classList.add("empty");
    sublinesListEl.innerHTML = "<p>Žiadne podlínie.</p>";
    return;
  }

  sublinesListEl.classList.remove("empty");

  sublines.forEach(subline => {
    const card = document.createElement("div");

    card.className = "subline-card";

    card.innerHTML = `
      <h4>${escapeHtml(subline.title)}</h4>
      <p>${escapeHtml(subline.description || "")}</p>
    `;

    sublinesListEl.appendChild(card);
  });
}

function renderOverview() {
  overviewGridEl.innerHTML = "";

  Object.values(storyLines).forEach(line => {
    const card = document.createElement("div");
    const count = (line.entries || []).length;
    const sublineCount = (line.sublines || []).length;
    const last = count ? line.entries[count - 1] : "Zatiaľ bez úryvkov.";

    card.className = "overview-card";

    card.innerHTML = `
      <h3>${escapeHtml(line.name)}</h3>
      <p class="muted">Postava: ${escapeHtml(line.persona || "—")}</p>
      <p class="muted">Úryvkov: ${count}</p>
      <p class="muted">Podlínií: ${sublineCount}</p>
      <p>${escapeHtml(last)}</p>
    `;

    overviewGridEl.appendChild(card);
  });
}

function downloadAllStories() {
  if (!Object.keys(storyLines).length) return;

  let content = "";

  Object.values(storyLines).forEach(line => {
    content += `=== ${line.name} ===\n`;

    if (line.persona) {
      content += `Postava: ${line.persona}\n`;
    }

    if (line.description) {
      content += `Opis: ${line.description}\n`;
    }

    content += "\nÚryvky:\n";

    if ((line.entries || []).length) {
      line.entries.forEach((txt, i) => {
        content += `${i + 1}) ${txt}\n`;
      });
    } else {
      content += "Bez úryvkov.\n";
    }

    content += "\nPodlínie:\n";

    if ((line.sublines || []).length) {
      line.sublines.forEach((subline, i) => {
        content += `${i + 1}) ${subline.title}\n`;
        content += `   ${subline.description || ""}\n`;
      });
    } else {
      content += "Bez podlínií.\n";
    }

    content += "\n---------------------------\n\n";
  });

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "liniove_pribehy.txt";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

async function resetAllData() {
  const sure = confirm(
    "Začať odznova?\n\nVšetky lokálne údaje budú vymazané. Ak je zapnutý online režim, vymažú sa aj online údaje."
  );

  if (!sure) return;

  storyLines = {};

  Object.values(defaultLines).forEach(line => {
    const cleanLine = normalizeLine(clone(line));
    cleanLine.entries = [];
    cleanLine.sublines = [];
    storyLines[cleanLine.id] = cleanLine;
  });

  saveOffline();

  if (syncOnline && firebaseAvailable && db) {
    try {
      await hardResetOnlineData();
    } catch (e) {
      console.error("Online reset chyba:", e);
    }
  }

  currentLineId = null;

  renderOverview();
  renderCurrentLine();

  statusMessageEl.textContent = "Všetky texty boli vymazané.";

  setTimeout(() => {
    statusMessageEl.textContent = "";
  }, 2500);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

getLineBtn.addEventListener("click", () => {
  currentLineId = randomLineId();
  renderCurrentLine();
});

changeLineBtn.addEventListener("click", () => {
  currentLineId = randomLineId();
  renderCurrentLine();
});

addEntryBtn.addEventListener("click", async () => {
  if (!currentLineId || !storyLines[currentLineId]) return;

  const text = entryInputEl.value.trim();

  if (!text) {
    statusMessageEl.textContent = "Pole je prázdne.";
    return;
  }

  const line = storyLines[currentLineId];

  line.entries = line.entries || [];
  line.entries.push(text);

  saveOffline();

  if (syncOnline && firebaseAvailable && db) {
    try {
      await addEntryOnline(currentLineId, text);
    } catch (e) {
      console.error("Chyba pri ukladaní úryvku online:", e);
    }
  }

  entryInputEl.value = "";

  statusMessageEl.textContent = "Úryvok bol pridaný!";

  setTimeout(() => {
    statusMessageEl.textContent = "";
  }, 1500);

  renderCurrentLine();
  renderOverview();
});

createSublineBtn.addEventListener("click", async () => {
  if (!currentLineId || !storyLines[currentLineId]) return;

  const title = prompt("Názov podlínie:");

  if (!title || !title.trim()) return;

  const description = prompt("Krátky opis podlínie:") || "";

  const subline = {
    id: "S" + Date.now(),
    title: title.trim(),
    description: description.trim()
  };

  const line = storyLines[currentLineId];

  line.sublines = line.sublines || [];
  line.sublines.push(subline);

  saveOffline();

  if (syncOnline && firebaseAvailable && db) {
    try {
      await addSublineOnline(currentLineId, subline);
    } catch (e) {
      console.error("Chyba pri ukladaní podlínie online:", e);
    }
  }

  renderCurrentLine();
  renderOverview();
});

addLineBtn.addEventListener("click", async () => {
  const personaFromList = personaSelectEl.value.trim();
  const personaCustom = personaCustomEl.value.trim();
  const persona = personaCustom || personaFromList;
  const description = lineDescInputEl.value.trim();

  if (!persona) {
    newLineStatusEl.textContent = "Uveď postavu.";
    return;
  }

  if (!description) {
    newLineStatusEl.textContent = "Pridaj krátky opis línie.";
    return;
  }

  const id = "L" + Date.now();

  const newLine = {
    id,
    name: `Línia – ${persona}`,
    persona,
    description,
    entries: [],
    sublines: []
  };

  storyLines[id] = newLine;
  saveOffline();

  if (syncOnline && firebaseAvailable && db) {
    try {
      await addLineOnline(newLine, id);
    } catch (e) {
      console.error("Chyba pri vytváraní línie online:", e);
    }
  }

  personaCustomEl.value = "";
  lineDescInputEl.value = "";

  newLineStatusEl.textContent = "Línia bola vytvorená!";

  setTimeout(() => {
    newLineStatusEl.textContent = "";
  }, 1500);

  renderOverview();
});

offlineModeBtn.addEventListener("click", setOfflineMode);
onlineModeBtn.addEventListener("click", setOnlineMode);

downloadBtn.addEventListener("click", downloadAllStories);
resetBtn.addEventListener("click", resetAllData);

function init() {
  loadOffline();
  renderOverview();
  renderCurrentLine();
  setOfflineMode();
}

document.addEventListener("DOMContentLoaded", init);
