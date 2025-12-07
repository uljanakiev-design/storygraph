// Простое хранилище в localStorage
const STORAGE_KEY = "creativeStoryLines_v1";

const defaultStoryLines = {
  A: {
    id: "A",
    name: "Линия A",
    description:
      "Персонаж А отправился утром в незнакомое место с важной для него целью.",
    entries: [
      "Персонаж А проснулся раньше обычного, собрал необходимые вещи и вышел из дома, хотя сам толком не понимал, куда именно приведёт его этот день."
    ]
  },
  B: {
    id: "B",
    name: "Линия B",
    description:
      "Персонаж B остаётся дома и занят чем-то очень обычным, но в этой обычности скрывается потенциал для неожиданностей.",
    entries: [
      "Персонаж B включил любимый экран, устроился поудобнее и решил, что сегодня наконец-то просто проведёт день дома, никуда не выходя."
    ]
  },
  C: {
    id: "C",
    name: "Линия C",
    description:
      "Персонаж C взаимодействует с природой: вода, лес, воздух, неожиданные явления.",
    entries: [
      "Персонаж C вошёл в воду осторожно, чувствуя, как прохладные волны обнимают ноги и будто приглашают зайти ещё глубже."
    ]
  }
};

let storyLines = {};
let currentLineId = null;

// --- Работа с localStorage ---

function loadStoryLines() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Простая защита: если структура странная, используем дефолт
      if (parsed && typeof parsed === "object") {
        storyLines = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn("Не удалось загрузить данные, используем значения по умолчанию.", e);
  }
  storyLines = defaultStoryLines;
}

function saveStoryLines() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storyLines));
  } catch (e) {
    console.warn("Не удалось сохранить данные.", e);
  }
}

// --- DOM элементы ---

const getLineBtn = document.getElementById("get-line-btn");
const changeLineBtn = document.getElementById("change-line-btn");
const addEntryBtn = document.getElementById("add-entry-btn");

const lineTitleEl = document.getElementById("line-title");
const lineDescriptionEl = document.getElementById("line-description");
const entriesListEl = document.getElementById("entries-list");
const entryInputEl = document.getElementById("entry-input");
const statusMessageEl = document.getElementById("status-message");
const overviewGridEl = document.getElementById("overview-grid");

// --- Логика выбора и отображения линий ---

function getRandomLineId() {
  const ids = Object.keys(storyLines);
  if (ids.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * ids.length);
  return ids[randomIndex];
}

function setCurrentLine(id) {
  currentLineId = id;
  renderCurrentLine();
}

function renderCurrentLine() {
  const line = storyLines[currentLineId];

  if (!line) {
    lineTitleEl.textContent = "Линия не выбрана";
    lineDescriptionEl.textContent =
      "Нажми «Получить линию сюжета», чтобы начать.";
    entriesListEl.classList.add("empty-state");
    entriesListEl.innerHTML =
      "<p>Здесь появятся фрагменты, когда линия будет выбрана.</p>";
    addEntryBtn.disabled = true;
    changeLineBtn.disabled = true;
    return;
  }

  lineTitleEl.textContent = line.name;
  lineDescriptionEl.textContent = line.description;

  const entries = Array.isArray(line.entries) ? line.entries : [];
  if (!entries.length) {
    entriesListEl.classList.add("empty-state");
    entriesListEl.innerHTML = "<p>Пока нет ни одного фрагмента — стань первым.</p>";
  } else {
    entriesListEl.classList.remove("empty-state");
    entriesListEl.innerHTML = "";

    const lastThree = entries.slice(-3); // Берём только последние 3
    lastThree.forEach((text, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "entry-pill";

      const idxSpan = document.createElement("div");
      idxSpan.className = "entry-index";
      const globalIndex = entries.length - lastThree.length + index + 1;
      idxSpan.textContent = `Фрагмент ${globalIndex}`;
      wrapper.appendChild(idxSpan);

      const textP = document.createElement("div");
      textP.textContent = text;
      wrapper.appendChild(textP);

      entriesListEl.appendChild(wrapper);
    });
  }

  addEntryBtn.disabled = false;
  changeLineBtn.disabled = false;
  statusMessageEl.textContent = "";
}

// --- Обзор всех линий ---

function renderOverview() {
  overviewGridEl.innerHTML = "";
  const ids = Object.keys(storyLines);

  ids.forEach((id) => {
    const line = storyLines[id];
    const card = document.createElement("article");
    card.className = "overview-card";

    const title = document.createElement("h3");
    title.textContent = line.name;
    card.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "overview-meta";
    const entriesCount = Array.isArray(line.entries) ? line.entries.length : 0;
    meta.textContent = `Фрагментов: ${entriesCount}`;
    card.appendChild(meta);

    const last = document.createElement("p");
    last.className = "overview-last";
    if (entriesCount === 0) {
      last.textContent = "Ещё нет ни одного фрагмента.";
    } else {
      const lastText = line.entries[line.entries.length - 1];
      last.textContent = lastText.length > 120
        ? lastText.slice(0, 117) + "..."
        : lastText;
    }
    card.appendChild(last);

    overviewGridEl.appendChild(card);
  });
}

// --- Обработка событий ---

function handleGetLineClick() {
  const randomId = getRandomLineId();
  if (!randomId) return;
  setCurrentLine(randomId);
}

function handleChangeLineClick() {
  // Просто выбираем новый случайный id, можно допилить, чтобы не повторял
  const randomId = getRandomLineId();
  if (!randomId) return;
  setCurrentLine(randomId);
}

function handleAddEntryClick() {
  if (!currentLineId) {
    statusMessageEl.textContent = "Сначала выбери линию.";
    return;
  }

  const rawText = entryInputEl.value.trim();
  if (!rawText) {
    statusMessageEl.textContent = "Нельзя добавить пустой фрагмент.";
    return;
  }

  const line = storyLines[currentLineId];
  if (!Array.isArray(line.entries)) {
    line.entries = [];
  }

  line.entries.push(rawText);
  saveStoryLines();
  renderCurrentLine();
  renderOverview();

  entryInputEl.value = "";
  statusMessageEl.textContent = "Фрагмент добавлен!";
  setTimeout(() => {
    statusMessageEl.textContent = "";
  }, 2000);
}

// --- Инициализация ---

function init() {
  loadStoryLines();
  renderOverview();
  renderCurrentLine(); // отрисует состояние "линия не выбрана"

  getLineBtn.addEventListener("click", handleGetLineClick);
  changeLineBtn.addEventListener("click", handleChangeLineClick);
  addEntryBtn.addEventListener("click", handleAddEntryClick);
}

document.addEventListener("DOMContentLoaded", init);
