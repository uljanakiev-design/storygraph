// ====== Firebase konfigurácia (tvoj projekt) ======
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
let firebaseAvailable = false;   // či je Firebase dostupný
let syncOnline = false;          // či je zapnutá online synchronizácia (prepínač)

// Inicializácia Firebase
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseAvailable = true;
  console.log("Firebase pripojený");
} catch (e) {
  console.warn("Nepodarilo sa inicializovať Firebase, bežíme len lokálne:", e);
  firebaseAvailable = false;
}

// ====== Štartovacie línie ======
const defaultLines = {
  A: {
    id: "A",
    name: "Línia A – Cestovateľ",
    persona: "Cestovateľ",
    description: "Postava A sa skoro ráno vydala na neznáme miesto.",
    entries: [
      "Postava A vyšla z domu skôr než zvyčajne, aj keď sama poriadne netušila, kam ju tento deň zavedie."
    ]
  },
  B: {
    id: "B",
    name: "Línia B – Pozorovateľ",
    persona: "Pozorovateľ",
    description: "Postava B zostáva doma a venuje sa bežným veciam.",
    entries: [
      "Postava B si zapla obrazovku a rozhodla sa, že dnes konečne pozrie to, čo už mesiac odkladá."
    ]
  },
  C: {
    id: "C",
    name: "Línia C – Voda",
    persona: "Snílek",
    description: "Postava C je pri vode a v kontakte s prírodou.",
    entries: [
      "Postava C opatrne vošla do vody – bola chladná a prekvapivo pokojná."
    ]
  },
  D: {
    id: "D",
    name: "Línia D – Mesto",
    persona: "Prieskumník",
    description: "Postava D sa túla mestom a všíma si zvláštne detaily.",
    entries: [
      "Postava D si uvedomila, že si nikdy predtým nevšímala nápisy na starých domoch."
    ]
  },
  E: {
    id: "E",
    name: "Línia E – Minulosť",
    persona: "Strážca",
    description: "Línia z minulosti, ktorá postupne vysvetľuje súčasné udalosti.",
    entries: [
      "Pred mnohými rokmi urobil niekto rozhodnutie, ktoré dnes doznieva v životoch úplne cudzích ľudí."
    ]
  },
  F: {
    id: "F",
    name: "Línia F – Nečakaná správa",
    persona: "Skeptik",
    description: "Postava F dostane zvláštnu správu a nemyslí si, že je vážna.",
    entries: [
      "Správa vyzerala ako žart, ale dátum a čas v nej sa presne zhodovali s dneškom."
    ]
  }
};

let storyLines = {};
let currentLineId = null;

// ====== DOM ======
const getLineBtn = document.getElementById("get-line-btn");
const changeLineBtn = document.getElementById("change-line-btn");
const addEntryBtn = document.getElementById("add-entry-btn");
const downloadBtn = document.getElementById("download-btn");
const addLineBtn = document.getElementById("add-line-btn");
const resetBtn = document.getElementById("reset-btn");

const lineTitleEl = document.getElementById("line-title");
const lineDescEl = document.getElementById("line-description");
const entriesListEl = document.getElementById("entries-list");
const entryInputEl = document.getElementById("entry-input");
const statusMessageEl = document.getElementById("status-message");
const overviewGridEl = document.getElementById("overview-grid");
const onlineIndicatorEl = document.getElementById("online-indicator");
const onlineToggleEl = document.getElementById("online-toggle");

const personaSelectEl = document.getElementById("persona-select");
const personaCustomEl = document.getElementById("persona-custom");
const lineDescInputEl = document.getElementById("line-desc-input");
const newLineStatusEl = document.getElementById("new-line-status");

// ====== Lokálne ukladanie ======
const STORAGE_KEY = "story_lines_sk_with_toggle_v2";

function loadOffline() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    storyLines = JSON.parse(saved);
  } else {
    storyLines = {};
    Object.values(defaultLines).forEach(line => {
      storyLines[line.id] = {
        id: line.id,
        name: line.name,
        persona: line.persona,
        description: line.description,
        entries: []
      };
    });
    saveOffline();
  }
}

function saveOffline() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storyLines));
}

// ====== Firestore (online) ======
let firestoreUnsubscribe = null;
let seeded = false;

function seedFirestoreDefaults(emptyEntries = false) {
  const batch = db.batch();
  Object.values(defaultLines).forEach(line => {
    const docRef = db.collection("lines").doc(line.id);
    batch.set(docRef, {
      name: line.name,
      persona: line.persona || "",
      description: line.description,
      entries: emptyEntries ? [] : (line.entries || []),
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
          await seedFirestoreDefaults(true); // pri prvom spustení – prázdne
          return;
        }

        const result = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          result[doc.id] = {
            id: doc.id,
            name: data.name || "Bez názvu",
            persona: data.persona || "",
            description: data.description || "",
            entries: data.entries || []
          };
        });

        storyLines = result;
        saveOffline(); // záloha lokálne
        renderOverview();
        renderCurrentLine();
      },
      error => {
        console.error("Chyba pri čítaní z Firestore:", error);
        onlineIndicatorEl.textContent =
          "Chyba pripojenia. Režim: lokálny (údaje len v tomto zariadení)";
        syncOnline = false;
        onlineToggleEl.checked = false;
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

function addLineOnline(line) {
  if (!db) return Promise.resolve();
  return db.collection("lines").add({
    name: line.name,
    persona: line.persona || "",
    description: line.description || "",
    entries: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// 🔴 ПОЛНАЯ ОЧИСТКА ОНЛАЙН: все entries становятся []
async function hardResetOnlineData() {
  if (!firebaseAvailable || !db) return;

  try {
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    console.log("Online údaje v kolekcii 'lines' boli vyčistené (entries prázdne).");
  } catch (e) {
    console.error("Chyba pri online resete:", e);
  }
}

// ====== Logika ======

function randomLineId() {
  const ids = Object.keys(storyLines);
  if (!ids.length) return null;
  const idx = Math.floor(Math.random() * ids.length);
  return ids[idx];
}

function renderCurrentLine() {
  if (!currentLineId || !storyLines[currentLineId]) {
    lineTitleEl.textContent = "Línia nie je vybraná";
    lineDescEl.textContent = "Klikni na „Získať líniu“, aby si začal.";
    entriesListEl.innerHTML = "<p>Zatiaľ žiadne údaje.</p>";
    entriesListEl.classList.add("empty");
    addEntryBtn.disabled = true;
    changeLineBtn.disabled = true;
    return;
  }

  const line = storyLines[currentLineId];

  lineTitleEl.textContent = line.name;
  lineDescEl.textContent = line.description;

  const entries = line.entries || [];
  entriesListEl.innerHTML = "";
  if (!entries.length) {
    entriesListEl.classList.add("empty");
    entriesListEl.innerHTML = "<p>Zatiaľ nikto nepísal. Začni ako prvý!</p>";
  } else {
    entriesListEl.classList.remove("empty");
    entries.slice(-3).forEach(text => {
      const div = document.createElement("div");
      div.className = "entry";
      div.textContent = text;
      entriesListEl.appendChild(div);
    });
  }

  addEntryBtn.disabled = false;
  changeLineBtn.disabled = false;
}

function renderOverview() {
  overviewGridEl.innerHTML = "";
  Object.values(storyLines).forEach(line => {
    const card = document.createElement("div");
    card.className = "overview-card";
    const count = (line.entries || []).length;
    const last = count ? line.entries[count - 1] : "Zatiaľ bez úryvkov.";

    card.innerHTML = `
      <h3>${line.name}</h3>
      <p class="muted">Postava: ${line.persona || "—"}</p>
      <p class="muted">Úryvkov: ${count}</p>
      <p>${last}</p>
    `;
    overviewGridEl.appendChild(card);
  });
}

function downloadAllStories() {
  if (!Object.keys(storyLines).length) return;

  let content = "";
  Object.values(storyLines).forEach(line => {
    content += `=== ${line.name} ===\n`;
    if (line.persona) content += `Postava: ${line.persona}\n`;
    if (line.description) content += `Opis: ${line.description}\n`;
    content += "\n";
    (line.entries || []).forEach((txt, i) => {
      content += `${i + 1}) ${txt}\n`;
    });
    content += "\n---------------------------\n\n";
  });

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "liniove_pribehy.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====== Reset (Začať odznova) ======

async function resetAllData() {
  const sure = confirm(
    "Začať odznova?\n\nVšetky lokálne údaje budú vymazané.\nAk je dostupný online režim, vymažú sa aj online údaje (všetky úryvky) pre všetkých používateľov."
  );
  if (!sure) return;

  // 1) Lokálne: všetky línie, prázdne entries
  storyLines = {};
  Object.values(defaultLines).forEach(line => {
    storyLines[line.id] = {
      id: line.id,
      name: line.name,
      persona: line.persona,
      description: line.description,
      entries: []
    };
  });
  saveOffline();

  // 2) Online: všetkým v kolekcii lines nastaviť entries: []
  if (firebaseAvailable && db) {
    await hardResetOnlineData();
  }

  currentLineId = null;
  renderOverview();
  renderCurrentLine();
  statusMessageEl.textContent = "Všetky texty boli vymazané (lokálne aj online).";
  setTimeout(() => (statusMessageEl.textContent = ""), 3000);
}

// ====== Handlery tlačidiel ======

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

  // uložiť lokálne
  const line = storyLines[currentLineId];
  line.entries = line.entries || [];
  line.entries.push(text);
  saveOffline();

  // Firestore
  if (syncOnline && firebaseAvailable && db) {
    try {
      await addEntryOnline(currentLineId, text);
    } catch (e) {
      console.error("Chyba pri ukladaní do Firestore:", e);
    }
  }

  entryInputEl.value = "";
  statusMessageEl.textContent = "Úryvok bol pridaný!";
  setTimeout(() => (statusMessageEl.textContent = ""), 1500);
  renderCurrentLine();
  renderOverview();
});

downloadBtn.addEventListener("click", downloadAllStories);

resetBtn.addEventListener("click", () => {
  resetAllData();
});

addLineBtn.addEventListener("click", async () => {
  const personaFromList = personaSelectEl.value.trim();
  const personaCustom = personaCustomEl.value.trim();
  const persona = personaCustom || personaFromList;
  const desc = lineDescInputEl.value.trim();

  if (!persona) {
    newLineStatusEl.textContent = "Uveď postavu (zo zoznamu alebo vlastnú).";
    return;
  }
  if (!desc) {
    newLineStatusEl.textContent = "Pridaj krátky opis línie.";
    return;
  }

  const name = `Línia – ${persona}`;
  newLineStatusEl.textContent = "";

  const id = "L" + Date.now();
  storyLines[id] = {
    id,
    name,
    persona,
    description: desc,
    entries: []
  };
  saveOffline();

  if (syncOnline && firebaseAvailable && db) {
    try {
      await addLineOnline({ name, persona, description: desc });
    } catch (e) {
      console.error("Chyba pri vytváraní línie vo Firestore:", e);
    }
  }

  personaCustomEl.value = "";
  lineDescInputEl.value = "";
  newLineStatusEl.textContent = "Línia bola vytvorená!";
  setTimeout(() => (newLineStatusEl.textContent = ""), 1500);

  renderOverview();
});

// Prepínač online / lokálny
onlineToggleEl.addEventListener("change", () => {
  if (!firebaseAvailable) {
    onlineToggleEl.checked = false;
    onlineIndicatorEl.textContent =
      "Online režim nie je dostupný (Firebase nie je pripojený). Režim: lokálny.";
    return;
  }

  syncOnline = onlineToggleEl.checked;

  if (syncOnline) {
    onlineIndicatorEl.textContent =
      "Režim: online + lokálny (viac ľudí môže písať na jednom odkaze)";
    subscribeFirestore();
  } else {
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
    onlineIndicatorEl.textContent =
      "Režim: lokálny (údaje sú len v tomto zariadení)";
  }
});

// ====== Inicializácia ======

function init() {
  loadOffline();
  renderOverview();
  renderCurrentLine();

  syncOnline = false;
  onlineToggleEl.checked = false;

  if (!firebaseAvailable) {
    onlineIndicatorEl.textContent =
      "Online režim nie je dostupný (Firebase nie je pripojený). Režim: lokálny.";
  } else {
    onlineIndicatorEl.textContent =
      "Režim: lokálny (môžeš zapnúť online synchronizáciu prepínačom).";
  }
}

document.addEventListener("DOMContentLoaded", init);
