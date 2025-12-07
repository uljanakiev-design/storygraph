// ====== Firebase конфигурация (ТВОЙ проект) ======
const firebaseConfig = {
  apiKey: "AIzaSyCRU-BS3OISzAX-6do7VQC8ImcDSBw7pNE",
  authDomain: "stafeta-c9654.firebaseapp.com",
  projectId: "stafeta-c9654",
  storageBucket: "stafeta-c9654.firebasestorage.app",
  messagingSenderId: "925671597292",
  appId: "1:925671597292:web:8d0ef6cdcc1b20f5dbb1c9",
  measurementId: "G-ENYX6SR4RZ"
};

// Попытка инициализации Firebase
let db = null;
let onlineMode = false;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  onlineMode = true;
  console.log("Firebase подключён");
} catch (e) {
  console.warn("Ошибка инициализации Firebase, работаем офлайн:", e);
  onlineMode = false;
}

// ====== Стартовые линии (если Firestore пустой или офлайн) ======
const defaultLines = {
  A: {
    id: "A",
    name: "Линия A — Путешественник",
    persona: "Путешественник",
    description: "Персонаж А отправился утром в незнакомое место.",
    entries: [
      "Персонаж А вышел из дома раньше обычного, хотя не понимал, куда его приведёт день."
    ]
  },
  B: {
    id: "B",
    name: "Линия B — Наблюдатель",
    persona: "Наблюдатель",
    description: "Персонаж B остался дома и занимается привычным делом.",
    entries: [
      "Персонаж B включил экран и решил наконец-то посмотреть то, что откладывал уже месяц."
    ]
  },
  C: {
    id: "C",
    name: "Линия C — Вода",
    persona: "Мечтатель",
    description: "Персонаж C взаимодействует с водой и природой.",
    entries: [
      "Персонаж C осторожно вошёл в воду — она была прохладной и неожиданно тихой."
    ]
  },
  D: {
    id: "D",
    name: "Линия D — Город",
    persona: "Исследователь",
    description: "Персонаж D блуждает по городу, замечая странные детали.",
    entries: [
      "Персонаж D понял, что никогда раньше не обращал внимания на надписи на старых домах."
    ]
  },
  E: {
    id: "E",
    name: "Линия E — Прошлое",
    persona: "Хранитель",
    description: "Линия из прошлого, которая постепенно объясняет происходящее.",
    entries: [
      "Много лет назад кто-то принял решение, которое теперь отзывается в жизни незнакомых людей."
    ]
  },
  F: {
    id: "F",
    name: "Линия F — Неожиданное сообщение",
    persona: "Скептик",
    description: "Персонаж F получает странное сообщение и не верит в его серьёзность.",
    entries: [
      "Сообщение выглядело как шутка, но дата и время в нём совпадали с сегодняшним днём."
    ]
  }
};

let storyLines = {};
let currentLineId = null;

// DOM элементы
const getLineBtn = document.getElementById("get-line-btn");
const changeLineBtn = document.getElementById("change-line-btn");
const addEntryBtn = document.getElementById("add-entry-btn");
const downloadBtn = document.getElementById("download-btn");
const addLineBtn = document.getElementById("add-line-btn");

const lineTitleEl = document.getElementById("line-title");
const lineDescEl = document.getElementById("line-description");
const entriesListEl = document.getElementById("entries-list");
const entryInputEl = document.getElementById("entry-input");
const statusMessageEl = document.getElementById("status-message");
const overviewGridEl = document.getElementById("overview-grid");
const onlineIndicatorEl = document.getElementById("online-indicator");

const personaSelectEl = document.getElementById("persona-select");
const personaCustomEl = document.getElementById("persona-custom");
const lineDescInputEl = document.getElementById("line-desc-input");
const newLineStatusEl = document.getElementById("new-line-status");

// ====== OFFLINE fallback (localStorage) ======
const STORAGE_KEY = "story_lines_offline_v1";

function loadOffline() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    storyLines = JSON.parse(saved);
  } else {
    storyLines = { ...defaultLines };
    saveOffline();
  }
}

function saveOffline() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storyLines));
}

// ====== ONLINE Firestore ======
let firestoreUnsubscribe = null;
let seeded = false;

function seedFirestoreDefaults() {
  const batch = db.batch();
  Object.values(defaultLines).forEach(line => {
    const docRef = db.collection("lines").doc(line.id);
    batch.set(docRef, {
      name: line.name,
      persona: line.persona || "",
      description: line.description,
      entries: line.entries,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  return batch.commit();
}

function subscribeFirestore() {
  firestoreUnsubscribe = db
    .collection("lines")
    .orderBy("createdAt", "asc")
    .onSnapshot(async snapshot => {
      if (snapshot.empty && !seeded) {
        seeded = true;
        await seedFirestoreDefaults();
        return;
      }

      const result = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        result[doc.id] = {
          id: doc.id,
          name: data.name || "Без названия",
          persona: data.persona || "",
          description: data.description || "",
          entries: data.entries || []
        };
      });
      storyLines = result;
      renderOverview();
      renderCurrentLine();
    }, error => {
      console.error("Ошибка Firestore:", error);
      onlineMode = false;
      onlineIndicatorEl.textContent = "Ошибка подключения. Режим: офлайн.";
      loadOffline();
      renderOverview();
      renderCurrentLine();
    });
}

function addEntryOnline(lineId, text) {
  const ref = db.collection("lines").doc(lineId);
  return ref.update({
    entries: firebase.firestore.FieldValue.arrayUnion(text)
  });
}

function addLineOnline(line) {
  return db.collection("lines").add({
    name: line.name,
    persona: line.persona || "",
    description: line.description || "",
    entries: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ====== ОБЩАЯ ЛОГИКА ======

function randomLineId() {
  const ids = Object.keys(storyLines);
  if (!ids.length) return null;
  const idx = Math.floor(Math.random() * ids.length);
  return ids[idx];
}

function renderCurrentLine() {
  if (!currentLineId || !storyLines[currentLineId]) {
    lineTitleEl.textContent = "Линия не выбрана";
    lineDescEl.textContent = "Нажми «Получить линию», чтобы начать.";
    entriesListEl.innerHTML = "<p>Пока нет данных.</p>";
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
    entriesListEl.innerHTML = "<p>Пока никто не писал. Начни первым!</p>";
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
    const last = count ? line.entries[count - 1] : "Ещё нет ни одного фрагмента.";

    card.innerHTML = `
      <h3>${line.name}</h3>
      <p class="muted">Персонаж: ${line.persona || "—"}</p>
      <p class="muted">Фрагментов: ${count}</p>
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
    if (line.persona) content += `Персонаж: ${line.persona}\n`;
    if (line.description) content += `Описание: ${line.description}\n`;
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
  a.download = "story_lines.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====== ОБРАБОТЧИКИ КНОПОК ======

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
    statusMessageEl.textContent = "Поле пустое.";
    return;
  }

  try {
    if (onlineMode && db) {
      await addEntryOnline(currentLineId, text);
    } else {
      const line = storyLines[currentLineId];
      line.entries = line.entries || [];
      line.entries.push(text);
      saveOffline();
    }
    entryInputEl.value = "";
    statusMessageEl.textContent = "Фрагмент добавлен!";
    setTimeout(() => (statusMessageEl.textContent = ""), 1500);
    renderCurrentLine();
    renderOverview();
  } catch (e) {
    console.error(e);
    statusMessageEl.textContent = "Ошибка при сохранении.";
  }
});

downloadBtn.addEventListener("click", downloadAllStories);

addLineBtn.addEventListener("click", async () => {
  const personaFromList = personaSelectEl.value.trim();
  const personaCustom = personaCustomEl.value.trim();
  const persona = personaCustom || personaFromList;
  const desc = lineDescInputEl.value.trim();

  if (!persona) {
    newLineStatusEl.textContent = "Укажи персонажа (из списка или своего).";
    return;
  }
  if (!desc) {
    newLineStatusEl.textContent = "Добавь краткое описание линии.";
    return;
  }

  const name = `Линия — ${persona}`;
  newLineStatusEl.textContent = "";

  try {
    if (onlineMode && db) {
      await addLineOnline({ name, persona, description: desc });
    } else {
      const id = "L" + Date.now();
      storyLines[id] = {
        id,
        name,
        persona,
        description: desc,
        entries: []
      };
      saveOffline();
      renderOverview();
    }
    personaCustomEl.value = "";
    lineDescInputEl.value = "";
    newLineStatusEl.textContent = "Линия создана!";
    setTimeout(() => (newLineStatusEl.textContent = ""), 1500);
  } catch (e) {
    console.error(e);
    newLineStatusEl.textContent = "Ошибка при создании линии.";
  }
});

// ====== ИНИЦИАЛИЗАЦИЯ ======

function init() {
  if (onlineMode && db) {
    onlineIndicatorEl.textContent =
      "Режим: онлайн (несколько людей могут писать по одной ссылке)";
    subscribeFirestore();
  } else {
    onlineIndicatorEl.textContent =
      "Режим: офлайн (данные сохраняются только в этом браузере)";
    loadOffline();
    renderOverview();
    renderCurrentLine();
  }
}

document.addEventListener("DOMContentLoaded", init);
