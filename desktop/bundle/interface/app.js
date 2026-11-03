const state = {
  settings: null,
  keys: {},
  providers: [],
  presets: [],
  personality: "",
  history: [],
  active: 0,
  tab: "model",
  catalog: { models: [] },
  offline: {},
  sending: false,
};

const $ = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "The desk refused that.");
  return data;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function activeThread() {
  if (!state.history.length) {
    state.history = [{ id: uid(), title: "New thread", messages: [] }];
    state.active = 0;
  }
  return state.history[state.active] || state.history[0];
}

function provider() {
  return state.providers.find((item) => item.id === state.settings.providerId) || state.providers[0] || {
    id: "openai",
    label: "OpenAI",
    models: [],
    blurb: "",
    keyHint: "",
    local: false,
  };
}

async function boot() {
  const data = await api("/api/bootstrap");
  state.settings = data.settings;
  state.keys = data.keys || {};
  state.providers = data.providers || [];
  state.presets = data.presets || [];
  state.personality = data.personality || "";
  state.history = Array.isArray(data.history) ? data.history : [];
  state.catalog = data.catalog || { models: [] };
  state.offline = data.offline || {};
  document.title = state.settings.windowTitle || "Keel";
  activeThread();
  render();
}

let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), 250);
}

async function save() {
  await api("/api/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      settings: state.settings,
      keys: state.keys,
      personality: state.personality,
      history: state.history,
    }),
  });
}

function renderText(node, text) {
  node.replaceChildren();
  text.split("```").forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 1) {
      const pre = document.createElement("pre");
      const cut = part.indexOf("\n");
      pre.textContent = cut === -1 ? part : part.slice(cut + 1);
      node.append(pre);
    } else {
      const p = document.createElement("p");
      p.textContent = part;
      node.append(p);
    }
  });
}

function renderThreads() {
  const root = $("threads");
  root.replaceChildren();
  state.history.forEach((thread, index) => {
    const row = document.createElement("div");
    row.className = "thread" + (index === state.active ? " active" : "");
    const pick = document.createElement("button");
    pick.className = "pick";
    pick.type = "button";
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.textContent = thread.title || "Untitled";
    pick.append(num, name);
    pick.onclick = () => {
      state.active = index;
      $("rail").classList.add("shut");
      render();
    };
    const del = document.createElement("button");
    del.className = "icon-btn";
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", "Delete thread");
    del.onclick = () => {
      state.history.splice(index, 1);
      if (!state.history.length) activeThread();
      state.active = Math.max(0, Math.min(state.active, state.history.length - 1));
      scheduleSave();
      render();
    };
    row.append(pick, del);
    root.append(row);
  });
}

function renderPage() {
  const thread = activeThread();
  $("title").value = thread.title || "";
  const page = $("page");
  page.replaceChildren();
  if (!thread.messages.length) {
    const hero = document.createElement("div");
    hero.className = "hero";
    const h = document.createElement("h1");
    h.textContent = "Any model. Your key. This PC.";
    const p = document.createElement("p");
    p.textContent = "Paste a key, or download a small model and run it offline. Nothing is sent until you press the arrow.";
    const card = document.createElement("div");
    card.className = "card";
    const cp = document.createElement("p");
    cp.textContent = "The folders next to Keel.exe are the app. Edit theme.css, personality/active.txt, api/providers.json, or icon.ico, then restart.";
    card.append(cp);
    const prompts = document.createElement("div");
    prompts.className = "prompts";
    [
      "Explain Keel in three sentences.",
      "Rewrite this so it sounds calm: we should talk soon.",
      "Give me a short plan to learn one tool this week.",
    ].forEach((prompt) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "prompt";
      button.textContent = prompt;
      button.onclick = () => {
        $("draft").value = prompt;
        $("draft").focus();
      };
      prompts.append(button);
    });
    hero.append(h, p, card, prompts);
    page.append(hero);
    return;
  }
  thread.messages.forEach((message) => {
    const row = document.createElement("article");
    row.className = "msg" + (message.role === "user" ? " user" : "");
    if (message.role === "user") {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      renderText(bubble, message.content);
      row.append(bubble);
    } else {
      const who = document.createElement("p");
      who.className = "who";
      who.textContent = message.error ? "Desk" : "Keel";
      const body = document.createElement("div");
      if (message.error) body.className = "error";
      renderText(body, message.content || (state.sending ? "Writing…" : ""));
      row.append(who, body);
    }
    page.append(row);
  });
  page.scrollTop = page.scrollHeight;
}

function field(label, node) {
  const wrap = document.createElement("label");
  wrap.textContent = label;
  wrap.append(node);
  return wrap;
}

function renderSheet() {
  const sheet = $("sheet");
  sheet.replaceChildren();
  document.querySelectorAll("#tabs button").forEach((button) => {
    button.classList.toggle("on", button.dataset.tab === state.tab);
  });
  const current = provider();
  $("chip").textContent = current ? `${current.label} · ${state.settings.model}` : "No model";

  if (state.tab === "model") {
    const select = document.createElement("select");
    state.providers.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      select.append(option);
    });
    select.value = state.settings.providerId;
    select.onchange = () => {
      state.settings.providerId = select.value;
      const next = provider();
      if (next && next.models && next.models.length) state.settings.model = next.models[0];
      scheduleSave();
      render();
    };
    const model = document.createElement("input");
    model.type = "text";
    model.value = state.settings.model || "";
    model.oninput = () => {
      state.settings.model = model.value.slice(0, 120);
      scheduleSave();
      $("chip").textContent = `${provider().label} · ${state.settings.model}`;
    };
    const pills = document.createElement("div");
    pills.className = "row";
    (current.models || []).forEach((item) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "pill" + (item === state.settings.model ? " on" : "");
      pill.textContent = item;
      pill.onclick = () => {
        state.settings.model = item;
        scheduleSave();
        render();
      };
      pills.append(pill);
    });
    const note = document.createElement("p");
    note.className = "quiet";
    note.style.textTransform = "none";
    note.style.letterSpacing = "0";
    note.textContent = current.blurb || "Edit api/providers.json to add an endpoint.";
    sheet.append(field("Provider", select), note, field("Model id", model), pills);
    if (current.id === "custom") {
      const base = document.createElement("input");
      base.type = "text";
      base.placeholder = "https://example.com/v1";
      base.value = state.settings.customBaseUrl || "";
      base.oninput = () => {
        state.settings.customBaseUrl = base.value;
        scheduleSave();
      };
      sheet.append(field("Base URL", base));
    }
    const temp = document.createElement("input");
    temp.type = "range";
    temp.min = "0";
    temp.max = "1.5";
    temp.step = "0.1";
    temp.value = String(state.settings.temperature ?? 0.7);
    temp.oninput = () => {
      state.settings.temperature = Number(temp.value);
      scheduleSave();
    };
    const tokens = document.createElement("input");
    tokens.type = "number";
    tokens.min = "16";
    tokens.max = "4096";
    tokens.value = String(state.settings.maxTokens ?? 1200);
    tokens.oninput = () => {
      state.settings.maxTokens = Number(tokens.value) || 1200;
      scheduleSave();
    };
    const title = document.createElement("input");
    title.type = "text";
    title.value = state.settings.windowTitle || "Keel";
    title.oninput = () => {
      state.settings.windowTitle = title.value.slice(0, 40) || "Keel";
      document.title = state.settings.windowTitle;
      scheduleSave();
    };
    sheet.append(field("Temperature", temp), field("Max tokens", tokens), field("Window title", title));
  }

  if (state.tab === "voice") {
    const pills = document.createElement("div");
    pills.className = "row";
    state.presets.forEach((preset) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "pill" + (state.settings.activePreset === preset.id ? " on" : "");
      pill.textContent = preset.name;
      pill.onclick = () => {
        state.settings.activePreset = preset.id;
        state.personality = preset.text;
        scheduleSave();
        render();
      };
      pills.append(pill);
    });
    const area = document.createElement("textarea");
    area.rows = 10;
    area.value = state.personality;
    area.oninput = () => {
      state.personality = area.value;
      state.settings.activePreset = "custom";
      scheduleSave();
    };
    const note = document.createElement("p");
    note.className = "quiet";
    note.style.textTransform = "none";
    note.style.letterSpacing = "0";
    note.textContent = "Saved to personality/active.txt. Presets live in personality/presets.";
    sheet.append(pills, field("Personality", area), note);
  }

  if (state.tab === "key") {
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "off";
    input.placeholder = current.keyHint || "Paste key";
    input.value = state.keys[current.id] || "";
    input.oninput = () => {
      state.keys[current.id] = input.value;
      scheduleSave();
    };
    const note = document.createElement("p");
    note.className = "quiet";
    note.style.textTransform = "none";
    note.style.letterSpacing = "0";
    note.textContent = current.local
      ? "Offline models don’t need a key."
      : "Stored in settings/keys.json. Don’t share that file.";
    sheet.append(field(`${current.label} API key`, input), note);
  }

  if (state.tab === "files") {
    const files = [
      ["icon.ico", "Window icon. Replace it, then reopen Keel."],
      ["interface/theme.css", "Colors and type. The skin of the desk."],
      ["interface/index.html", "Layout. Restart after editing."],
      ["interface/app.js", "Behavior of chat, keys, and downloads."],
      ["api/providers.json", "Endpoints and model names."],
      ["settings/settings.json", "Temperature, model, window title."],
      ["settings/keys.json", "Your keys. Keep this private."],
      ["personality/active.txt", "The voice used on every reply."],
      ["models/catalog.json", "Offline models Keel is allowed to download."],
    ];
    files.forEach(([name, about]) => {
      const block = document.createElement("div");
      block.className = "file";
      const code = document.createElement("code");
      code.textContent = name;
      const p = document.createElement("p");
      p.textContent = about;
      block.append(code, p);
      sheet.append(block);
    });
    const open = document.createElement("button");
    open.type = "button";
    open.className = "primary";
    open.textContent = "Show folder";
    open.onclick = () => void api("/api/reveal", { method: "POST" });
    sheet.append(open);
  }

  if (state.tab === "offline") {
    const status = document.createElement("p");
    status.className = "quiet";
    status.style.textTransform = "none";
    status.style.letterSpacing = "0";
    const off = state.offline || {};
    status.textContent = `Runner ${off.runtime ? "installed" : "missing"}. Model ${off.modelFile || "missing"}. ${off.running ? "Running." : "Stopped."}`;
    const bar = document.createElement("div");
    bar.className = "bar";
    const span = document.createElement("span");
    bar.append(span);
    const log = document.createElement("p");
    log.className = "quiet";
    log.style.textTransform = "none";
    log.style.letterSpacing = "0";
    const runtime = document.createElement("button");
    runtime.type = "button";
    runtime.className = "primary";
    runtime.textContent = "Download offline runner";
    runtime.onclick = () => void runDownload("/api/offline/runtime", {}, span, log);
    const models = document.createElement("div");
    models.className = "row";
    (state.catalog.models || []).forEach((model) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pill";
      button.textContent = model.label;
      button.onclick = () => void runDownload("/api/offline/model", { id: model.id }, span, log);
      models.append(button);
    });
    const start = document.createElement("button");
    start.type = "button";
    start.className = "primary";
    start.textContent = "Start offline model";
    start.onclick = async () => {
      try {
        state.offline = await api("/api/offline/start", { method: "POST" });
        state.settings.providerId = "offline";
        state.settings.model = "local";
        await save();
        render();
      } catch (error) {
        log.textContent = error.message;
      }
    };
    const stop = document.createElement("button");
    stop.type = "button";
    stop.className = "text-btn";
    stop.textContent = "Stop";
    stop.onclick = async () => {
      state.offline = await api("/api/offline/stop", { method: "POST" });
      render();
    };
    const note = document.createElement("p");
    note.className = "quiet";
    note.style.textTransform = "none";
    note.style.letterSpacing = "0";
    note.textContent = "The runner is llama.cpp (~25 MB). The small model is about 100 MB. Both download only when you ask. Add more in models/catalog.json.";
    sheet.append(status, runtime, models, bar, log, start, stop, note);
  }
}

async function runDownload(path, body, span, log) {
  log.textContent = "Downloading…";
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach((line) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.error) log.textContent = event.error;
      if (event.done) log.textContent = "Download finished.";
      if (event.total) span.style.width = Math.min(100, Math.round((event.received / event.total) * 100)) + "%";
      else if (event.received) log.textContent = `Downloaded ${Math.round(event.received / 1e6)} MB`;
    });
  }
  state.offline = await api("/api/offline");
  const fresh = await api("/api/bootstrap");
  state.settings = fresh.settings;
  render();
}

function render() {
  renderThreads();
  renderPage();
  renderSheet();
}

$("new-thread").onclick = () => {
  state.history.unshift({ id: uid(), title: "New thread", messages: [] });
  state.active = 0;
  scheduleSave();
  render();
};

$("title").oninput = () => {
  activeThread().title = $("title").value.slice(0, 80);
  scheduleSave();
  renderThreads();
};

$("open-rail").onclick = () => $("rail").classList.toggle("shut");
$("open-drawer").onclick = () => $("drawer").classList.toggle("shut");
document.querySelectorAll("#tabs button").forEach((button) => {
  button.onclick = () => {
    state.tab = button.dataset.tab;
    $("drawer").classList.remove("shut");
    renderSheet();
  };
});

$("form").onsubmit = async (event) => {
  event.preventDefault();
  const text = $("draft").value.trim();
  if (!text || state.sending) return;
  const thread = activeThread();
  if (thread.title === "New thread") thread.title = text.replace(/\s+/g, " ").slice(0, 48);
  thread.messages.push({ role: "user", content: text });
  const reply = { role: "assistant", content: "" };
  thread.messages.push(reply);
  $("draft").value = "";
  state.sending = true;
  render();
  try {
    await save();
    const history = thread.messages
      .filter((message) => message.content.trim() && message !== reply)
      .slice(-24)
      .map((message) => ({ role: message.role, content: message.content }));
    const result = await api("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    reply.content = result.text;
  } catch (error) {
    reply.content = error.message;
    reply.error = true;
  } finally {
    state.sending = false;
    scheduleSave();
    render();
  }
};

$("draft").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("form").requestSubmit();
  }
});

void boot().catch((error) => {
  $("page").textContent = error.message;
});
