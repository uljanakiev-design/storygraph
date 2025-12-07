(function () {
  const state = {
    storylines: [],       // { id, name }
    nodes: [],            // { id, parentId, lineId, text, author, createdAt }
    nextLineId: 1,
    nextNodeId: 1,
    activeNodeId: null,
    timerEnabled: true,
    timerDuration: 60,
    timerId: null,
    timerRemaining: 60
  };

  // ---------- Утилиты ----------
  function $(id) {
    return document.getElementById(id);
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getLineById(id) {
    return state.storylines.find(l => l.id === id) || null;
  }

  function buildNodeIndex() {
    const index = {};
    state.nodes.forEach(n => { index[n.id] = n; });
    return index;
  }

  function getDepth(node, index) {
    let depth = 0;
    let current = node;
    while (current && current.parentId != null) {
      depth++;
      current = index[current.parentId];
      if (!current) break;
    }
    return depth;
  }

  // ---------- Рендер линий ----------

  function renderStorylines() {
    const chips = $('storylineChips');
    const lineSelect = $('lineSelect');

    chips.innerHTML = '';
    lineSelect.innerHTML = '';

    if (state.storylines.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Сначала создайте линию сюжета';
      lineSelect.appendChild(opt);
      return;
    }

    state.storylines.forEach((line, idx) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `
        <span class="chip-dot"></span>
        <span class="chip-index">Линия ${idx + 1}</span>
        <span>${line.name}</span>
      `;
      chips.appendChild(chip);

      const opt = document.createElement('option');
      opt.value = String(line.id);
      opt.textContent = `Линия ${idx + 1}: ${line.name}`;
      lineSelect.appendChild(opt);
    });

    updateParentSelect();
    $('createLineBtn').disabled = state.storylines.length >= 4;
  }

  function updateParentSelect() {
    const parentSelect = $('parentSelect');
    parentSelect.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Начать новую ветку внутри выбранной линии';
    parentSelect.appendChild(defaultOpt);

    const selectedLineId = Number($('lineSelect').value || 0);
    if (!selectedLineId) return;

    const index = buildNodeIndex();
    const nodesForLine = state.nodes.filter(n => n.lineId === selectedLineId);

    nodesForLine.forEach(n => {
      const depth = getDepth(n, index);
      const opt = document.createElement('option');
      opt.value = String(n.id);

      const snippet = n.text.length > 60 ? n.text.slice(0, 57) + '…' : n.text;
      opt.textContent = `${'—'.repeat(depth)} Фрагмент #${n.id}: ${snippet}`;
      parentSelect.appendChild(opt);
    });

    if (state.activeNodeId) {
      const activeOption = Array.from(parentSelect.options)
        .find(o => Number(o.value) === state.activeNodeId);
      if (activeOption) {
        parentSelect.value = String(state.activeNodeId);
      }
    }
  }

  // ---------- Рендер графа ----------

  function renderGraph() {
    const container = $('graphContainer');
    const empty = $('graphEmpty');
    container.innerHTML = '';
    container.appendChild(empty);

    if (state.nodes.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    const index = buildNodeIndex();
    const nodesSorted = [...state.nodes].sort((a, b) => a.createdAt - b.createdAt);

    nodesSorted.forEach(node => {
      const depth = getDepth(node, index);
      const line = getLineById(node.lineId);

      const row = document.createElement('div');
      row.className = 'node-row';
      row.style.marginLeft = (depth * 24) + 'px';

      const lineDiv = document.createElement('div');
      lineDiv.className = 'node-line';
      row.appendChild(lineDiv);

      const nodeDiv = document.createElement('div');
      nodeDiv.className = 'story-node';
      if (state.activeNodeId === node.id) {
        nodeDiv.classList.add('active');
      }

      const txtSnippet = node.text.length > 80 ? node.text.slice(0, 77) + '…' : node.text;
      const author = node.author ? node.author : 'Автор не указан';
      const lineName = line ? line.name : 'Без линии';

      nodeDiv.innerHTML = `
        <div class="story-node-header">
          <span class="story-node-chip">${lineName}</span>
          <span class="story-node-author">#${node.id} · ${author}</span>
        </div>
        <div class="story-node-text">${txtSnippet || '<пустой фрагмент>'}</div>
        <div class="story-node-meta">
          ${node.parentId == null ? 'Корень линии' : 'Ответ на #' + node.parentId}
          · ${formatTime(new Date(node.createdAt))}
        </div>
      `;

      nodeDiv.addEventListener('click', () => {
        state.activeNodeId = node.id;
        $('parentSelect').value = String(node.id);
        renderGraph();
      });

      row.appendChild(nodeDiv);
      container.appendChild(row);
    });
  }

  // ---------- Сбор версий истории ----------

  function collectVersions() {
    const versionsList = $('versionsList');
    versionsList.innerHTML = '';

    if (state.storylines.length === 0 || state.nodes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Нет данных для сборки. Добавьте линии и хотя бы по одному фрагменту.';
      versionsList.appendChild(empty);
      return;
    }

    const index = buildNodeIndex();
    const children = {};
    state.nodes.forEach(n => {
      if (!children[n.parentId || 0]) {
        children[n.parentId || 0] = [];
      }
      children[n.parentId || 0].push(n);
    });

    Object.keys(children).forEach(key => {
      children[key].sort((a, b) => a.id - b.id);
    });

    let versionCount = 0;

    state.storylines.forEach((line, lineIndex) => {
      const roots = state.nodes.filter(n => n.lineId === line.id && n.parentId == null);
      if (roots.length === 0) return;

      roots.sort((a, b) => a.id - b.id);

      roots.forEach(root => {
        const paths = [];

        function dfs(node, path) {
          const pathNext = [...path, node];
          const childList = children[node.id] || [];
          if (childList.length === 0) {
            paths.push(pathNext);
            return;
          }
          childList.forEach(child => dfs(child, pathNext));
        }

        dfs(root, []);

        paths.forEach((path, pathIndex) => {
          versionCount++;

          const card = document.createElement('div');
          card.className = 'version-card';

          const header = document.createElement('div');
          header.className = 'version-header';

          const title = document.createElement('div');
          title.className = 'version-title';
          title.textContent = `Линия ${lineIndex + 1}: ${line.name}`;

          const idx = document.createElement('div');
          idx.className = 'version-index';
          idx.textContent = `Вариант ${pathIndex + 1} (${path.length} ходов)`;

          const body = document.createElement('div');
          body.className = 'version-body';
          const text = path.map(n => (n.text || '').trim()).filter(Boolean).join('\n\n');
          body.textContent = text || '[Пустая версия — нет текста]';

          header.appendChild(title);
          header.appendChild(idx);
          card.appendChild(header);
          card.appendChild(body);
          versionsList.appendChild(card);
        });
      });
    });

    if (versionCount === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Не удалось собрать версии — возможно, нет корневых фрагментов.';
      versionsList.appendChild(empty);
    }
  }

  // ---------- Таймер ----------

  function updateTimerLabels() {
    $('timerSecondsLabel').textContent = state.timerDuration;
  }

  function setTimerStatus(text, accent) {
    const el = $('timerStatus');
    if (accent === 'danger') {
      el.innerHTML = `<span class="badge-danger">${text}</span>`;
    } else {
      el.textContent = text;
    }
  }

  function stopTimer() {
    if (state.timerId != null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.timerRemaining = state.timerDuration;
    if (state.timerEnabled) {
      setTimerStatus('ожидает старта');
    } else {
      setTimerStatus('таймер выключен');
    }
  }

  function startTimer() {
    if (!state.timerEnabled) {
      setTimerStatus('таймер выключен');
      return;
    }
    stopTimer();
    state.timerRemaining = state.timerDuration;
    setTimerStatus(`идёт: ${state.timerRemaining} c`);

    state.timerId = setInterval(() => {
      state.timerRemaining -= 1;
      if (state.timerRemaining <= 0) {
        clearInterval(state.timerId);
        state.timerId = null;
        state.timerRemaining = 0;
        setTimerStatus('время вышло', 'danger');
      } else {
        setTimerStatus(`идёт: ${state.timerRemaining} c`);
      }
    }, 1000);
  }

  // ---------- Обработчики UI ----------

  $('createLineBtn').addEventListener('click', () => {
    const input = $('storylineName');
    const name = input.value.trim() || `Линия ${state.storylines.length + 1}`;

    if (state.storylines.length >= 4) {
      alert('По ТЗ максимум 3–4 линии сюжета. Лимит — 4 линии.');
      return;
    }

    state.storylines.push({
      id: state.nextLineId++,
      name
    });
    input.value = '';
    renderStorylines();
  });

  $('lineSelect').addEventListener('change', () => {
    updateParentSelect();
  });

  $('addFragmentBtn').addEventListener('click', () => {
    const lineId = Number($('lineSelect').value || 0);
    if (!lineId) {
      alert('Выберите линию сюжета.');
      return;
    }

    const parentIdValue = $('parentSelect').value;
    const parentId = parentIdValue ? Number(parentIdValue) : null;
    const author = $('authorInput').value.trim();
    const text = $('textInput').value.trim();

    if (!text) {
      if (!confirm('Текст пустой. Всё равно сохранить фрагмент?')) return;
    }

    const node = {
      id: state.nextNodeId++,
      parentId,
      lineId,
      author,
      text,
      createdAt: Date.now()
    };

    state.nodes.push(node);
    state.activeNodeId = node.id;

    $('textInput').value = '';
    $('authorInput').value = '';

    updateParentSelect();
    renderGraph();
  });

  $('collectBtn').addEventListener('click', () => {
    collectVersions();
  });

  $('timerToggle').addEventListener('change', (e) => {
    state.timerEnabled = e.target.checked;
    stopTimer();
  });

  $('timerRange').addEventListener('input', (e) => {
    state.timerDuration = Number(e.target.value);
    updateTimerLabels();
    stopTimer();
  });

  $('timerStartBtn').addEventListener('click', () => {
    if (!state.timerEnabled) {
      alert('Таймер отключён. Включите его переключателем слева.');
      return;
    }
    startTimer();
  });

  // Инициализация
  updateTimerLabels();
  renderStorylines();
  renderGraph();
  stopTimer();
})();
