(() => {
  const { BINYANIM, VERBS, DRILL_CARDS, PHRASES, COLUMNS, PATH } = window.SHORESH;

  const store = {
    get progress() {
      try { return JSON.parse(localStorage.getItem("shoresh-progress") || "{}"); }
      catch { return {}; }
    },
    set progress(v) { localStorage.setItem("shoresh-progress", JSON.stringify(v)); },
    complete(stepId) {
      const p = this.progress;
      p[stepId] = true;
      this.progress = p;
    },
    doneCount() {
      return PATH.filter((s) => this.progress[s.id]).length;
    },
  };

  const state = {
    route: "home",
    binyanId: "paal",
    formulaVerbId: "shamar",
    columnKey: "shamar",
    columnSpeed: 1,
    columnIdx: 0,
    columnTimer: null,
    drillIdx: 0,
    drillFocus: "form",
    phraseIdx: 0,
    phrasePicked: [],
    tableVerbId: "shamar",
  };

  const view = document.getElementById("view");
  const navEls = () => document.querySelectorAll("[data-nav]");

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "he-IL";
    u.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const he = voices.find((v) => v.lang.startsWith("he"));
    if (he) u.voice = he;
    window.speechSynthesis.speak(u);
  }

  function normalize(s) {
    return String(s || "")
      .replace(/[\u0591-\u05C7]/g, "")
      .replace(/[׳'ʼ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function verbById(id) {
    return VERBS.find((v) => v.id === id);
  }

  function setRoute(route) {
    if (state.columnTimer) {
      clearInterval(state.columnTimer);
      state.columnTimer = null;
    }
    state.route = route;
    navEls().forEach((el) => {
      el.classList.toggle("active", el.dataset.nav === route);
    });
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    const map = {
      home: renderHome,
      formula: renderFormula,
      columns: renderColumns,
      drill: renderDrill,
      sentences: renderSentences,
      tables: renderTables,
      path: renderPath,
    };
    (map[state.route] || renderHome)();
  }

  function renderHome() {
    const done = store.doneCount();
    view.innerHTML = `
      <section class="hero">
        <div class="card hero-main">
          <div class="hero-he">שורש</div>
          <h1>Тренажёр глаголов иврита по технологии формул</h1>
          <p>
            Корень встаёт в формулу биньяна — форма читается сама.
            Диктант со <strong>связками предлогов</strong>, колонка, три слова и путь из 26 шагов.
          </p>
          <div class="actions">
            <button class="btn btn-primary" data-go="formula">Открыть формулу</button>
            <button class="btn btn-ghost" data-go="drill">Диктант + связка</button>
            <button class="btn btn-soft" data-go="path">Путь (${done}/26)</button>
          </div>
        </div>
        <div class="card">
          <div class="stat-grid">
            <div class="stat"><b>${VERBS.length}</b><span>глаголов</span></div>
            <div class="stat"><b>7</b><span>биньянов</span></div>
            <div class="stat"><b>${PHRASES.length}</b><span>фраз со связкой</span></div>
            <div class="stat"><b>${done}</b><span>шагов пройдено</span></div>
          </div>
          <p class="hint" style="margin-top:14px">
            Метод: формула → колонка → форма → управление (על / ל / מ / עם / ב).
          </p>
        </div>
      </section>

      <div class="section-title" style="margin-top:22px">
        <div>
          <h2>Режимы</h2>
          <p>От формы к живой конструкции</p>
        </div>
      </div>
      <div class="grid-cards">
        <button class="tile" data-go="formula">
          <div class="kicker">01</div>
          <h3>Формула</h3>
          <p>Три буквы корня в квадраты биньяна</p>
        </button>
        <button class="tile" data-go="columns">
          <div class="kicker">02</div>
          <h3>Колонка + связки</h3>
          <p>Линейное чтение с предлогами</p>
        </button>
        <button class="tile" data-go="drill">
          <div class="kicker">03</div>
          <h3>Диктант</h3>
          <p>Слот формы и слот связки</p>
        </button>
        <button class="tile" data-go="sentences">
          <div class="kicker">04</div>
          <h3>Три слова</h3>
          <p>${PHRASES.length} фраз с обязательным предлогом</p>
        </button>
        <button class="tile" data-go="tables">
          <div class="kicker">05</div>
          <h3>Таблицы</h3>
          <p>Настоящее, прошедшее, будущее</p>
        </button>
        <button class="tile" data-go="path">
          <div class="kicker">06</div>
          <h3>Путь</h3>
          <p>20 ядро + 6 шагов управлений</p>
        </button>
      </div>
    `;
    bindGo();
  }

  function renderFormula() {
    const b = BINYANIM.find((x) => x.id === state.binyanId) || BINYANIM[0];
    const v = verbById(state.formulaVerbId) || VERBS[0];
    const letters = b.formulaPresent.map((cell, i) => {
      if (b.slots.includes(i)) {
        const rootIdx = b.slots.indexOf(i);
        return { type: "root", text: v.root[rootIdx] || "○" };
      }
      return { type: "affix", text: cell };
    });

    view.innerHTML = `
      <div class="section-title">
        <div>
          <h2>Формула</h2>
          <p>Подставьте корень — прочитайте форму</p>
        </div>
        <span class="badge">${v.primary}</span>
      </div>
      <div class="toolbar" id="binyan-bar">
        ${BINYANIM.map((x) => `
          <button class="chip ${x.id === b.id ? "active" : ""}" data-binyan="${x.id}">
            ${x.nameRu}
          </button>
        `).join("")}
      </div>
      <div class="formula-board">
        <div class="formula-stage">
          <div style="color:var(--ink-soft);font-weight:600">${b.nameRu} · ${b.name} · ${b.meaning}</div>
          <div class="slots">
            ${letters.map((s) => `<div class="slot ${s.type}">${s.text}</div>`).join("")}
          </div>
          <div class="result-form">${v.present.הוא}</div>
          <div class="hint" style="margin-top:8px">${v.rootStr} · ${v.gloss} · ${v.note}</div>
          <div class="actions" style="justify-content:center;margin-top:14px">
            <button class="btn btn-soft" id="say-form">Озвучить</button>
          </div>
        </div>
        <div class="card">
          <div class="hint" style="margin-bottom:10px">Корень для подстановки</div>
          <div class="root-pick">
            ${VERBS.map((x) => `
              <button class="root-btn ${x.id === v.id ? "active" : ""}" data-verb="${x.id}">
                ${x.root.join("·")} · ${x.gloss}
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    document.getElementById("binyan-bar").onclick = (e) => {
      const btn = e.target.closest("[data-binyan]");
      if (!btn) return;
      state.binyanId = btn.dataset.binyan;
      renderFormula();
    };
    view.querySelectorAll("[data-verb]").forEach((btn) => {
      btn.onclick = () => {
        state.formulaVerbId = btn.dataset.verb;
        const nv = verbById(state.formulaVerbId);
        if (nv) state.binyanId = nv.binyan;
        renderFormula();
      };
    });
    document.getElementById("say-form").onclick = () => speak(v.present.הוא);
  }

  function renderColumns() {
    const keys = Object.keys(COLUMNS);
    if (!keys.includes(state.columnKey)) state.columnKey = keys[0];
    const rows = COLUMNS[state.columnKey];
    const v = verbById(state.columnKey);

    view.innerHTML = `
      <div class="section-title">
        <div>
          <h2>Колонка со связками</h2>
          <p>Читайте сверху вниз — язык цепляет блок целиком</p>
        </div>
      </div>
      <div class="toolbar" id="col-bar">
        ${keys.map((k) => {
          const vv = verbById(k);
          return `<button class="chip ${k === state.columnKey ? "active" : ""}" data-col="${k}">
            ${vv ? vv.present.הוא : k}<span class="prep">${vv ? vv.primary : ""}</span>
          </button>`;
        }).join("")}
      </div>
      <div class="column-wrap">
        <div class="column-list" id="col-list">
          ${rows.map((r, i) => `<div class="column-row ${i === state.columnIdx ? "active" : ""}" data-i="${i}">${r}</div>`).join("")}
        </div>
        <div class="card side-panel">
          <label>Скорость: <span id="spd-label">${state.columnSpeed.toFixed(1)}×</span></label>
          <input type="range" id="spd" min="0.6" max="1.8" step="0.1" value="${state.columnSpeed}" />
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary" id="col-play">Старт</button>
            <button class="btn btn-ghost" id="col-stop">Стоп</button>
            <button class="btn btn-soft" id="col-say">Строка</button>
          </div>
          <p class="hint" style="margin-top:14px">
            ${v ? `${v.gloss}. Управление: <strong>${v.note}</strong>` : ""}
          </p>
        </div>
      </div>
    `;

    document.getElementById("col-bar").onclick = (e) => {
      const btn = e.target.closest("[data-col]");
      if (!btn) return;
      state.columnKey = btn.dataset.col;
      state.columnIdx = 0;
      if (state.columnTimer) { clearInterval(state.columnTimer); state.columnTimer = null; }
      renderColumns();
    };
    document.getElementById("spd").oninput = (e) => {
      state.columnSpeed = Number(e.target.value);
      document.getElementById("spd-label").textContent = state.columnSpeed.toFixed(1) + "×";
    };
    document.getElementById("col-play").onclick = () => {
      if (state.columnTimer) clearInterval(state.columnTimer);
      const tick = () => {
        state.columnIdx = (state.columnIdx + 1) % rows.length;
        document.querySelectorAll(".column-row").forEach((el) => {
          el.classList.toggle("active", Number(el.dataset.i) === state.columnIdx);
        });
        const active = document.querySelector(".column-row.active");
        if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      state.columnTimer = setInterval(tick, Math.round(900 / state.columnSpeed));
    };
    document.getElementById("col-stop").onclick = () => {
      if (state.columnTimer) { clearInterval(state.columnTimer); state.columnTimer = null; }
    };
    document.getElementById("col-say").onclick = () => speak(rows[state.columnIdx]);
    document.getElementById("col-list").onclick = (e) => {
      const row = e.target.closest("[data-i]");
      if (!row) return;
      state.columnIdx = Number(row.dataset.i);
      document.querySelectorAll(".column-row").forEach((el) => {
        el.classList.toggle("active", Number(el.dataset.i) === state.columnIdx);
      });
      speak(rows[state.columnIdx]);
    };
  }

  function renderDrill() {
    const card = DRILL_CARDS[state.drillIdx % DRILL_CARDS.length];
    const v = verbById(card.verbId);

    view.innerHTML = `
      <div class="section-title">
        <div>
          <h2>Диктант: форма + связка</h2>
          <p>Два слота — форма глагола и предложная связка</p>
        </div>
        <span class="badge">${v ? v.primary : ""}</span>
      </div>
      <div class="drill-card">
        <div class="prompt-ru">${card.ru}</div>
        <div class="meta-line">
          ${card.person} · ${v ? v.rootStr : ""} · ${v ? v.gloss : ""} · ${state.drillIdx + 1}/${DRILL_CARDS.length}
        </div>
        <div class="slots-input">
          <div class="field">
            <label>1. Форма</label>
            <input id="in-form" autocomplete="off" autocapitalize="off" spellcheck="false" dir="rtl" placeholder="שומר" />
          </div>
          <div class="field">
            <label>2. Связка</label>
            <input id="in-prep" autocomplete="off" autocapitalize="off" spellcheck="false" dir="rtl" placeholder="עליה" />
          </div>
        </div>
        <div class="kb" id="kb"></div>
        <div class="actions" style="margin-top:16px">
          <button class="btn btn-primary" id="check">Проверить</button>
          <button class="btn btn-ghost" id="next">Следующая</button>
          <button class="btn btn-soft" id="hint">Подсказка</button>
          <button class="btn btn-soft" id="say-drill">Слушать</button>
        </div>
        <div class="feedback" id="fb"></div>
      </div>
    `;

    const letters = "אבגדהוזחטיכלמנסעפצקרשתםןףץך".split("");
    const kb = document.getElementById("kb");
    kb.innerHTML = letters.map((l) => `<button type="button" data-l="${l}">${l}</button>`).join("")
      + `<button type="button" class="wide" data-l=" ">˽</button>`
      + `<button type="button" class="wide" data-l="⌫">⌫</button>`;

    let focus = "form";
    const inForm = document.getElementById("in-form");
    const inPrep = document.getElementById("in-prep");
    inForm.onfocus = () => { focus = "form"; };
    inPrep.onfocus = () => { focus = "prep"; };
    inForm.focus();

    kb.onclick = (e) => {
      const btn = e.target.closest("[data-l]");
      if (!btn) return;
      const target = focus === "form" ? inForm : inPrep;
      const key = btn.dataset.l;
      if (key === "⌫") target.value = target.value.slice(0, -1);
      else if (key === " ") target.value += " ";
      else target.value += key;
      target.focus();
    };

    const showFb = (ok, text) => {
      const fb = document.getElementById("fb");
      fb.className = "feedback show " + (ok ? "ok" : "bad");
      fb.textContent = text;
    };

    document.getElementById("check").onclick = () => {
      const f = normalize(inForm.value);
      const p = normalize(inPrep.value);
      const okF = f === normalize(card.form);
      const okP = p === normalize(card.prep);
      if (okF && okP) {
        showFb(true, `Верно: ${card.person} ${card.form} ${card.prep}`);
        speak(`${card.form} ${card.prep}`);
      } else if (!okF && !okP) {
        showFb(false, `Форма: ${card.form} · Связка: ${card.prep}`);
      } else if (!okF) {
        showFb(false, `Форма должна быть: ${card.form}`);
      } else {
        showFb(false, `Связка: ${card.prep} (${v ? v.note : ""})`);
      }
    };
    document.getElementById("next").onclick = () => {
      state.drillIdx = (state.drillIdx + 1) % DRILL_CARDS.length;
      renderDrill();
    };
    document.getElementById("hint").onclick = () => {
      showFb(true, `${card.form} + ${card.prep}`);
    };
    document.getElementById("say-drill").onclick = () => speak(`${card.form} ${card.prep}`);
    [inForm, inPrep].forEach((el) => {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("check").click();
      });
    });
  }

  function renderSentences() {
    const phrase = PHRASES[state.phraseIdx % PHRASES.length];
    if (!state.phrasePicked.length) state.phrasePicked = [null, null, null];
    const pool = [...phrase.slots].sort(() => Math.random() - 0.5);

    view.innerHTML = `
      <div class="section-title">
        <div>
          <h2>Три слова</h2>
          <p>Соберите фразу — связка обязательна</p>
        </div>
      </div>
      <div class="sentence-card">
        <div class="prompt-ru">${phrase.ru}</div>
        <div class="meta-line">${state.phraseIdx + 1}/${PHRASES.length}</div>
        <div class="phrase-build" id="build">
          ${[0,1,2].map((i) => `
            <button class="phrase-slot ${state.phrasePicked[i] ? "filled" : ""}" data-slot="${i}">
              ${state.phrasePicked[i] || "—"}
            </button>
          `).join("")}
        </div>
        <div class="choice-row" id="choices">
          ${pool.map((c) => `<button class="choice" data-c="${c}">${c}</button>`).join("")}
        </div>
        <div class="actions" style="margin-top:16px">
          <button class="btn btn-primary" id="check-ph">Проверить</button>
          <button class="btn btn-ghost" id="clear-ph">Сбросить</button>
          <button class="btn btn-soft" id="next-ph">Другая</button>
          <button class="btn btn-soft" id="say-ph">Слушать</button>
        </div>
        <div class="feedback" id="fb"></div>
      </div>
    `;

    const showFb = (ok, text) => {
      const fb = document.getElementById("fb");
      fb.className = "feedback show " + (ok ? "ok" : "bad");
      fb.textContent = text;
    };

    document.getElementById("choices").onclick = (e) => {
      const btn = e.target.closest("[data-c]");
      if (!btn) return;
      const empty = state.phrasePicked.findIndex((x) => !x);
      if (empty === -1) return;
      state.phrasePicked[empty] = btn.dataset.c;
      renderSentences();
    };
    document.getElementById("build").onclick = (e) => {
      const slot = e.target.closest("[data-slot]");
      if (!slot) return;
      state.phrasePicked[Number(slot.dataset.slot)] = null;
      renderSentences();
    };
    document.getElementById("clear-ph").onclick = () => {
      state.phrasePicked = [null, null, null];
      renderSentences();
    };
    document.getElementById("next-ph").onclick = () => {
      state.phraseIdx = (state.phraseIdx + 1) % PHRASES.length;
      state.phrasePicked = [null, null, null];
      renderSentences();
    };
    document.getElementById("check-ph").onclick = () => {
      const got = state.phrasePicked.map(normalize).join(" ");
      const need = phrase.slots.map(normalize).join(" ");
      if (got === need) {
        showFb(true, "Верно: " + phrase.he);
        speak(phrase.he);
      } else {
        showFb(false, "Нужно: " + phrase.he);
      }
    };
    document.getElementById("say-ph").onclick = () => speak(phrase.he);
  }

  function renderTables() {
    const v = verbById(state.tableVerbId) || VERBS[0];
    const persons = ["אני", "אתה", "את", "הוא", "היא", "אנחנו", "אתם", "הם"];
    const row = (tense) => persons.map((p) => `<td class="he-cell">${v[tense][p] || "—"}</td>`).join("");

    view.innerHTML = `
      <div class="section-title">
        <div>
          <h2>Таблицы форм</h2>
          <p>${v.rootStr} · ${v.gloss} · <span class="badge">${v.primary}</span> ${v.note}</p>
        </div>
      </div>
      <div class="toolbar" id="tv">
        ${VERBS.map((x) => `
          <button class="chip ${x.id === v.id ? "active" : ""}" data-tv="${x.id}">
            ${x.present.הוא}<span class="prep">${x.primary}</span>
          </button>
        `).join("")}
      </div>
      <div class="table-wrap">
        <table class="conj">
          <thead>
            <tr>
              <th></th>
              ${persons.map((p) => `<th class="he">${p}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr><th>Настоящее</th>${row("present")}</tr>
            <tr><th>Прошедшее</th>${row("past")}</tr>
            <tr><th>Будущее</th>${row("future")}</tr>
          </tbody>
        </table>
      </div>
    `;
    document.getElementById("tv").onclick = (e) => {
      const btn = e.target.closest("[data-tv]");
      if (!btn) return;
      state.tableVerbId = btn.dataset.tv;
      renderTables();
    };
  }

  function renderPath() {
    const progress = store.progress;
    view.innerHTML = `
      <div class="section-title">
        <div>
          <h2>Путь · 26 шагов</h2>
          <p>Ядро (1–20) и управления (21–26)</p>
        </div>
        <div class="hint">${store.doneCount()}/26</div>
      </div>
      <div class="path-list">
        ${PATH.map((s) => {
          const done = !!progress[s.id];
          return `
            <button class="path-item ${done ? "done" : ""}" data-step="${s.id}" data-focus="${s.focus}">
              <div class="path-num">${done ? "✓" : s.id}</div>
              <div>
                <h3>${s.title} ${s.badge ? `<span class="badge">${s.badge}</span>` : ""}</h3>
                <p>${s.blurb}</p>
              </div>
              <span class="hint">${s.focus}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
    view.querySelectorAll("[data-step]").forEach((btn) => {
      btn.onclick = () => {
        store.complete(Number(btn.dataset.step));
        setRoute(btn.dataset.focus);
      };
    });
  }

  function bindGo() {
    view.querySelectorAll("[data-go]").forEach((btn) => {
      btn.onclick = () => setRoute(btn.dataset.go);
    });
  }

  document.getElementById("app").addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      setRoute(nav.dataset.nav);
    }
  });

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }

  setRoute("home");
})();
