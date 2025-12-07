const STORAGE_KEY = "story_lines_v1";

const defaultLines = {
  A: {
    id: "A",
    name: "Линия A",
    description: "Персонаж А отправился утром в незнакомое место.",
    entries: ["Персонаж А вышел из дома раньше обычного, хотя не понимал, куда его приведёт день."]
  },
  B: {
    id: "B",
    name: "Линия B",
    description: "Персонаж B остался дома и занимается привычным делом.",
    entries: ["Персонаж B включил экран и устроился поудобнее — день обещал быть спокойным."]
  },
  C: {
    id: "C",
    name: "Линия C",
    description: "Персонаж C взаимодействует с природой.",
    entries: ["Персонаж C осторожно вошёл в воду — она была прохладной и спокойной."]
  }
};

let storyLines = {};
let currentLineId = null;

/* ---------- LocalStorage ---------- */

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  storyLines = saved ? JSON.parse(saved) : defaultLines;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storyLines));
}

/* ---------- Rendering ---------- */

function renderCurrentLine() {
  const title = document.getElementById("line-title");
  const desc = document.getElementById("line-description");
  const list = document.getElementById("entries-list");

  const addBtn = document.getElementById("add-entry-btn");
  const changeBtn = document.getElementById("change-line-btn");

  if (!currentLineId) {
    title.textContent = "Линия не выбрана";
    desc.textContent = "Нажми «Получить линию», чтобы начать.";
    list.innerHTML = "<p>Пока нет данных.</p>";
    list.classList.add("empty");
    addBtn.disabled = true;
    changeBtn.disabled = true;
    return;
  }

  const line = storyLines[currentLineId];

  title.textContent = line.name;
  desc.textContent = line.description;

  const entries = line.entries;
  list.innerHTML = "";
  list.classList.remove("empty");

  entries.slice(-3).forEach(text => {
    const div = document.createElement("div");
    div.className = "entry";
    div.textContent = text;
    list.appendChild(div);
  });

  addBtn.disabled = false;
  changeBtn.disabled = false;
}

function renderOverview() {
  const grid = document.getElementById("overview-grid");
  grid.innerHTML = "";

  Object.values(storyLines).forEach(line => {
    const card = document.createElement("div");
    card.className = "overview-card";

    card.innerHTML = `
      <h3>${line.name}</h3>
      <p><strong>Фрагментов:</strong> ${line.entries.length}</p>
      <p>${line.entries[line.entries.length - 1]}</p>
    `;

    grid.appendChild(card);
  });
}

/* ---------- Actions ---------- */

function randomLine() {
  const keys = Object.keys(storyLines);
  return keys[Math.floor(Math.random() * keys.length)];
}

document.getElementById("get-line-btn").onclick = () => {
  currentLineId = randomLine();
  renderCurrentLine();
};

document.getElementById("change-line-btn").onclick = () => {
  currentLineId = randomLine();
  renderCurrentLine();
};

document.getElementById("add-entry-btn").onclick = () => {
  const input = document.getElementById("entry-input");
  const text = input.value.trim();
  const status = document.getElementById("status-message");

  if (!text) {
    status.textContent = "Поле пустое.";
    return;
  }

  storyLines[currentLineId].entries.push(text);
  save();

  input.value = "";
  status.textContent = "Добавлено!";
  renderCurrentLine();
  renderOverview();

  setTimeout(() => (status.textContent = ""), 1500);
};

/* ---------- INIT ---------- */

load();
renderOverview();
renderCurrentLine();
