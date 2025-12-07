const state = {
  storylines: [],
  nodes: [],
  nextLineId: 1,
  nextNodeId: 1,
  activeNodeId: null,

  timerEnabled: true,
  timerDuration: 60,
  timerRemaining: 60,
  timerId: null
};

function $(id) { return document.getElementById(id); }

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ========= STORYLINES ========= */

function renderStorylines() {
  const chips = $("storylineChips");
  const lineSelect = $("lineSelect");

  chips.innerHTML = "";
  lineSelect.innerHTML = `<option value="">Сначала создайте линию</option>`;

  state.storylines.forEach(line => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = line.name;
    chips.appendChild(chip);

    const o = document.createElement("option");
    o.value = line.id;
    o.textContent = line.name;
    lineSelect.appendChild(o);
  });

  updateParentSelect();
}

function updateParentSelect() {
  const parentSelect = $("parentSelect");
  parentSelect.innerHTML = `<option value="">Новая ветка</option>`;

  const lineId = Number($("lineSelect").value);

  state.nodes
    .filter(n => n.lineId === lineId)
    .forEach(n => {
      const o = document.createElement("option");
      o.value = n.id;
      o.textContent = `Фрагмент #${n.id}`;
      parentSelect.appendChild(o);
    });
}

/* ========= GRAPH RENDER ========= */

function renderGraph() {
  const cont = $("graphContainer");
  const empty = $("graphEmpty");

  cont.innerHTML = "";
  if (state.nodes.length === 0) {
    cont.appendChild(empty);
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  state.nodes.forEach(n => {
    const div = document.createElement("div");
    div.className = "story-node";
    if (state.activeNodeId === n.id) div.classList.add("active");

    div.innerHTML = `
      <div><b>#${n.id}</b> (${formatTime()})</div>
      <div>${n.text.slice(0, 60)}</div>
    `;

    div.onclick = () => {
      state.activeNodeId = n.id;
      $("parentSelect").value = n.id;
      renderGraph();
    };

    cont.appendChild(div);
  });
}

/* ========= VERSIONS ========= */

function collectVersions() {
  const out = $("versionsList");
  out.innerHTML = "";

  if (!state.nodes.length) {
    out.innerHTML = `<div class="empty-state">Нет данных</div>`;
    return;
  }

  const roots = state.nodes.filter(n => n.parentId === null);

  roots.forEach(root => {
    const version = walk(root);
    const card = document.createElement("div");
    card.className = "version-card";
    card.textContent = version.join("\n\n");
    out.appendChild(card);
  });

  function walk(node) {
    const path = [node.text];
    let cur = node;

    while (true) {
      const children = state.nodes.filter(n => n.parentId === cur.id);
      if (!children.length) break;
      cur = children[0];
      path.push(cur.text);
    }
    return path;
  }
}

/* ========= TIMER ========= */

function resetTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerRemaining = state.timerDuration;
  $("timerStatus").textContent = "Ожидает";
}

function startTimer() {
  resetTimer();
  state.timerId = setInterval(() => {
    state.timerRemaining -= 1;

    $("timerStatus").textContent = state.timerRemaining + " сек";

    if (state.timerRemaining <= 0) {
      clearInterval(state.timerId);
      $("timerStatus").textContent = "Время вышло";
    }

  }, 1000);
}

/* ========= EVENTS ========= */

$("createLineBtn").onclick = () => {
  const name = $("storylineName").value.trim();
  if (!name) return;
  state.storylines.push({ id: state.nextLineId++, name });
  $("storylineName").value = "";
  renderStorylines();
};

$("addFragmentBtn").onclick = () => {
  const lineId = Number($("lineSelect").value);
  if (!lineId) return alert("Выберите линию");

  const parentId = $("parentSelect").value ? Number($("parentSelect").value) : null;
  const text = $("textInput").value.trim();
  const author = $("authorInput").value.trim();

  const node = {
    id: state.nextNodeId++,
    lineId,
    parentId,
    author,
    text,
    createdAt: Date.now()
  };

  state.nodes.push(node);
  state.activeNodeId = node.id;

  $("textInput").value = "";
  $("authorInput").value = "";

  updateParentSelect();
  renderGraph();
};

$("collectBtn").onclick = collectVersions;

$("timerToggle").onchange = e => {
  state.timerEnabled = e.target.checked;
  resetTimer();
};

$("timerRange").oninput = e => {
  state.timerDuration = Number(e.target.value);
  resetTimer();
};

$("timerStartBtn").onclick = () => {
  if (!state.timerEnabled) {
    return alert("Таймер выключен");
  }
  startTimer();
};

/* INIT */
renderStorylines();
renderGraph();
resetTimer();
