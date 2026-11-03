import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Download,
  FolderOpen,
  KeyRound,
  PanelRight,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { keelStatus, sendChat } from "@/lib/chat.functions";
import { useDesk, type ChatMessage } from "@/lib/desk-store";
import { PERSONALITIES, personalityText, providerById, PROVIDERS } from "@/lib/providers";
import { withPreviewPrefix } from "@/lib/preview-api";

type DrawerTab = "model" | "voice" | "key" | "files";

const KIT = [
  ["Keel.exe", "The Windows program. Compiled machine code. Double-click it."],
  ["icon.ico", "Window icon. Replace this file, then open Keel again."],
  ["interface/theme.css", "Colors and type. This is the skin."],
  ["interface/index.html", "The layout of the desk."],
  ["interface/app.js", "How chat, keys, and offline download behave."],
  ["api/providers.json", "Endpoints and model lists. Add your own."],
  ["settings/settings.json", "Temperature, model, window title."],
  ["settings/keys.json", "API keys on that PC. Don’t share this file."],
  ["personality/active.txt", "The voice the model uses."],
  ["models/catalog.json", "Which offline models can be downloaded."],
] as const;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}`;
}

function RichText({ text }: { text: string }) {
  const parts = text.split("```");
  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const newline = part.indexOf("\n");
          const body = newline === -1 ? part : part.slice(newline + 1);
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md bg-ink px-3 py-3 text-left font-mono text-sm text-bone-dim"
            >
              {body.replace(/\n$/, "")}
            </pre>
          );
        }
        if (!part.trim()) return null;
        return (
          <p key={index} className="whitespace-pre-wrap text-pretty">
            {part}
          </p>
        );
      })}
    </div>
  );
}

export function DeskApp() {
  const [ready, setReady] = useState(false);
  const [builtin, setBuiltin] = useState<boolean | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>("model");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [waited, setWaited] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const threads = useDesk((state) => state.threads);
  const activeId = useDesk((state) => state.activeId);
  const providerId = useDesk((state) => state.providerId);
  const model = useDesk((state) => state.model);
  const customBaseUrl = useDesk((state) => state.customBaseUrl);
  const temperature = useDesk((state) => state.temperature);
  const maxTokens = useDesk((state) => state.maxTokens);
  const personalityId = useDesk((state) => state.personalityId);
  const customPersonality = useDesk((state) => state.customPersonality);
  const keys = useDesk((state) => state.keys);

  const active = threads.find((thread) => thread.id === activeId) ?? threads[0];
  const provider = providerById(providerId);
  const downloadHref = withPreviewPrefix("/downloads/Keel-Windows.zip");

  useEffect(() => {
    void Promise.resolve(useDesk.persist.rehydrate())
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    void keelStatus()
      .then((status) => {
        setBuiltin(status.builtin);
        if (!status.builtin && useDesk.getState().providerId === "builtin") {
          useDesk.getState().setProvider("xai");
        }
      })
      .catch(() => setBuiltin(false));
  }, [ready]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [active?.messages, sending, ready]);

  useEffect(() => {
    if (!sending) {
      setWaited(0);
      return;
    }
    const timer = window.setInterval(() => setWaited((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [sending]);

  const providers = useMemo(
    () => PROVIDERS.filter((item) => item.id !== "builtin" || builtin || providerId === "builtin"),
    [builtin, providerId],
  );

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending || !active) return;
    const threadId = active.id;
    const state = useDesk.getState();
    const chosen = providerById(state.providerId);
    const user: ChatMessage = { id: uid(), role: "user", content };
    const assistantId = uid();
    state.appendMessage(threadId, user);
    state.appendMessage(threadId, { id: assistantId, role: "assistant", content: "" });
    setDraft("");
    setSending(true);
    const history = [...(active.messages ?? []), user]
      .filter((message) => message.content.trim() && !message.error)
      .slice(-24)
      .map((message) => ({ role: message.role, content: message.content }));
    try {
      const result = await sendChat({
        data: {
          kind: chosen.kind,
          baseUrl: chosen.id === "custom" ? state.customBaseUrl : chosen.baseUrl,
          model: state.model,
          temperature: state.temperature,
          maxTokens: state.maxTokens,
          system: personalityText(state.personalityId, state.customPersonality),
          apiKey: chosen.kind === "builtin" ? undefined : state.keys[chosen.id] ?? "",
          messages: history,
        },
      });
      if (!result.ok) {
        useDesk.getState().updateMessage(threadId, assistantId, { content: result.error, error: true });
        return;
      }
      useDesk.getState().updateMessage(threadId, assistantId, { content: result.text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The desk couldn’t reach the model.";
      useDesk.getState().updateMessage(threadId, assistantId, { content: message, error: true });
    } finally {
      setSending(false);
      box.current?.focus();
    }
  }

  if (!ready || !active) {
    return (
      <main className="flex h-dvh flex-col justify-between bg-ink px-6 py-8 text-bone">
        <p className="font-display text-4xl italic">Keel</p>
        <p className="max-w-sm text-mute">Opening the desk…</p>
      </main>
    );
  }

  const keyValue = keys[provider.id] ?? "";
  const needsKey = provider.kind !== "builtin";

  return (
    <div className="flex h-dvh flex-col bg-ink text-bone">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 md:px-4">
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-bone md:hidden"
          onClick={() => setRailOpen(true)}
          aria-label="Open threads"
        >
          <span className="font-display text-xl italic">Keel</span>
        </button>
        <p className="hidden font-display text-xl italic md:block">Keel</p>
        <p className="hidden text-sm text-mute sm:block">Model desk</p>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden max-w-48 truncate rounded-full border border-line px-3 py-1 text-sm text-bone-dim sm:inline">
            {provider.label}
            <span className="text-mute"> · {model}</span>
          </span>
          <a
            href={downloadHref}
            download
            className="inline-flex h-11 items-center gap-2 rounded-md bg-brass px-3 text-sm font-medium text-ink"
          >
            <Download className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Windows</span>
            <span className="sm:hidden">Get app</span>
          </a>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-bone xl:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open settings"
          >
            <PanelRight className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_22rem]">
        <aside
          className={`${railOpen ? "fixed inset-y-0 left-0 z-30 flex w-72" : "hidden"} flex-col border-r border-line bg-ink-2 md:static md:flex md:w-auto`}
        >
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-xs tracking-widest text-mute uppercase">Threads</p>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-brass"
              onClick={() => {
                useDesk.getState().newThread();
                setRailOpen(false);
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              New
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {threads.map((thread, index) => {
              const selected = thread.id === active.id;
              return (
                <div key={thread.id} className="group flex items-stretch">
                  <button
                    type="button"
                    onClick={() => {
                      useDesk.getState().selectThread(thread.id);
                      setRailOpen(false);
                    }}
                    className={`flex min-h-11 min-w-0 flex-1 items-baseline gap-3 rounded-md px-2 text-left ${selected ? "bg-panel text-bone" : "text-bone-dim"}`}
                  >
                    <span className="w-6 shrink-0 text-xs text-mute tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-sm">{thread.title}</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center text-mute opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    aria-label={`Delete ${thread.title}`}
                    onClick={() => useDesk.getState().deleteThread(thread.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <input
              aria-label="Thread title"
              value={active.title}
              onChange={(event) => useDesk.getState().renameThread(active.id, event.target.value)}
              className="w-full bg-transparent font-display text-2xl text-bone outline-none"
            />
          </div>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {active.messages.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col gap-6 pt-6">
                <p className="font-display text-4xl text-balance italic">Any model. Your key. Your desk.</p>
                <p className="max-w-md text-pretty text-bone-dim">
                  {builtin
                    ? "Built-in Grok is ready if you want to try a short reply. Or paste a key for OpenAI, Claude, Gemini, and the rest."
                    : "Paste an API key for the model you want. Nothing is sent until you press Send."}
                </p>
                <div className="rounded-lg border border-line bg-ink-2 p-4">
                  <div className="flex items-start gap-3">
                    <FolderOpen className="mt-1 size-4 shrink-0 text-brass" aria-hidden="true" />
                    <div className="space-y-2">
                      <p className="text-sm text-bone">The Windows program is a real Keel.exe, not a browser tab.</p>
                      <p className="text-sm text-mute">
                        Unzip it, double-click the program, then edit the folders beside it — icon, theme, personality,
                        providers. Offline chat downloads a small model onto that PC.
                      </p>
                      <a href={downloadHref} download className="inline-flex h-11 items-center text-sm text-brass">
                        Download Keel for Windows
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    "Explain Keel in three sentences, as if to a friend.",
                    "Rewrite this so it sounds calm and specific: we should talk soon.",
                    "Give me a short plan to learn one new tool this week.",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="min-h-11 rounded-md border border-line px-3 text-left text-sm text-bone-dim"
                      onClick={() => {
                        setDraft(prompt);
                        box.current?.focus();
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="mx-auto flex max-w-2xl flex-col gap-6">
                {active.messages.map((message) => (
                  <li key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
                    {message.role === "user" ? (
                      <div className="max-w-[85%] rounded-lg bg-panel px-4 py-3 text-bone">
                        <RichText text={message.content} />
                      </div>
                    ) : (
                      <div className="max-w-full">
                        <p className="mb-2 text-xs tracking-widest text-brass uppercase">
                          {message.error ? "Desk" : "Keel"}
                        </p>
                        {message.content ? (
                          <div className={message.error ? "text-bone-dim" : "text-bone"}>
                            <RichText text={message.content} />
                          </div>
                        ) : (
                          <p className="text-mute tabular-nums">Writing… {waited}s</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <form
            className="border-t border-line px-3 py-3 pb-16 md:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-lg border border-line bg-ink-2 p-2">
              <textarea
                ref={box}
                value={draft}
                aria-label="Message"
                rows={1}
                placeholder={needsKey && !keyValue ? `Key for ${provider.label}, then a message` : "Write to the desk"}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
                className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-bone outline-none placeholder:text-mute"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brass text-ink disabled:opacity-40"
                aria-label={sending ? "Writing" : "Send"}
              >
                {sending ? <Square className="size-4" /> : <ArrowUp className="size-4" />}
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-2xl text-xs text-mute">
              {provider.kind === "builtin"
                ? "Built-in replies use this app’s Grok connection and stay short."
                : "Your key stays in this browser and is sent only when you press Send."}
            </p>
          </form>
        </section>

        <aside
          className={`${drawerOpen ? "fixed inset-y-0 right-0 z-30 flex w-[min(100%,22rem)]" : "hidden"} flex-col border-l border-line bg-ink-2 xl:static xl:flex`}
        >
          <div className="flex gap-1 border-b border-line p-2">
            {(
              [
                ["model", "Model"],
                ["voice", "Voice"],
                ["key", "Key"],
                ["files", "Files"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`h-11 flex-1 rounded-md text-sm ${tab === id ? "bg-panel text-bone" : "text-mute"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {tab === "model" ? (
              <>
                <label className="block space-y-2">
                  <span className="text-xs tracking-widest text-mute uppercase">Provider</span>
                  <select
                    value={provider.id}
                    onChange={(event) => useDesk.getState().setProvider(event.target.value)}
                    className="h-11 w-full rounded-md border border-line bg-ink px-3 text-bone"
                  >
                    {providers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-sm text-mute">{provider.blurb}</p>
                <label className="block space-y-2">
                  <span className="text-xs tracking-widest text-mute uppercase">Model id</span>
                  <input
                    value={model}
                    onChange={(event) => useDesk.getState().setModel(event.target.value)}
                    className="h-11 w-full rounded-md border border-line bg-ink px-3 text-bone"
                    list="keel-models"
                  />
                  <datalist id="keel-models">
                    {provider.models.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <div className="flex flex-wrap gap-2">
                  {provider.models.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => useDesk.getState().setModel(item)}
                      className={`min-h-11 rounded-full border px-3 text-sm ${item === model ? "border-brass text-brass" : "border-line text-bone-dim"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {provider.id === "custom" ? (
                  <label className="block space-y-2">
                    <span className="text-xs tracking-widest text-mute uppercase">Base URL</span>
                    <input
                      value={customBaseUrl}
                      placeholder="https://example.com/v1"
                      onChange={(event) => useDesk.getState().setCustomBaseUrl(event.target.value)}
                      className="h-11 w-full rounded-md border border-line bg-ink px-3 text-bone"
                    />
                  </label>
                ) : null}
                <label className="block space-y-2">
                  <span className="flex justify-between text-xs tracking-widest text-mute uppercase">
                    Temperature
                    <span className="tabular-nums text-bone-dim">{temperature.toFixed(1)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.1}
                    value={temperature}
                    aria-label="Temperature"
                    onChange={(event) => useDesk.getState().setTemperature(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs tracking-widest text-mute uppercase">Max tokens</span>
                  <input
                    type="number"
                    min={16}
                    max={4096}
                    value={maxTokens}
                    onChange={(event) => useDesk.getState().setMaxTokens(Number(event.target.value) || 800)}
                    className="h-11 w-full rounded-md border border-line bg-ink px-3 text-bone tabular-nums"
                  />
                </label>
              </>
            ) : null}

            {tab === "voice" ? (
              <>
                <p className="text-sm text-mute">
                  This is the personality. On Windows the same words live in personality/active.txt.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => useDesk.getState().setPersonality(item.id)}
                      className={`min-h-11 rounded-full border px-3 text-sm ${item.id === personalityId ? "border-brass text-brass" : "border-line text-bone-dim"}`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <label className="block space-y-2">
                  <span className="text-xs tracking-widest text-mute uppercase">
                    {personalityId === "custom" ? "Custom personality" : "What this voice says"}
                  </span>
                  <textarea
                    value={personalityId === "custom" ? customPersonality : personalityText(personalityId, "")}
                    readOnly={personalityId !== "custom"}
                    onChange={(event) => useDesk.getState().setCustomPersonality(event.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-line bg-ink px-3 py-3 text-sm text-bone outline-none read-only:text-bone-dim"
                  />
                </label>
              </>
            ) : null}

            {tab === "key" ? (
              <>
                <div className="flex items-center gap-2 text-brass">
                  <KeyRound className="size-4" aria-hidden="true" />
                  <p className="text-sm">{provider.label}</p>
                </div>
                {provider.kind === "builtin" ? (
                  <p className="text-sm text-mute">
                    Built-in Grok doesn’t ask for a key here. On the Windows program, add your own xAI key in
                    settings/keys.json.
                  </p>
                ) : (
                  <label className="block space-y-2">
                    <span className="text-xs tracking-widest text-mute uppercase">API key</span>
                    <input
                      type="password"
                      autoComplete="off"
                      value={keyValue}
                      placeholder={provider.keyHint || "Paste key"}
                      onChange={(event) => useDesk.getState().setKey(provider.id, event.target.value)}
                      className="h-11 w-full rounded-md border border-line bg-ink px-3 text-bone"
                    />
                    <span className="block text-sm text-mute">
                      Stored only in this browser. Cleared if you empty the field.
                    </span>
                  </label>
                )}
              </>
            ) : null}

            {tab === "files" ? (
              <>
                <p className="text-sm text-bone-dim">
                  Download the folder, unzip it, and double-click Keel.exe. Windows may say the publisher is unknown —
                  that’s because it isn’t signed. Choose More info, then Run anyway.
                </p>
                <a
                  href={downloadHref}
                  download
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-brass px-3 text-sm font-medium text-ink"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Keel for Windows
                </a>
                <ul className="space-y-3">
                  {KIT.map(([file, note]) => (
                    <li key={file}>
                      <p className="font-mono text-sm text-brass">{file}</p>
                      <p className="text-sm text-mute">{note}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-mute">
                  Offline, inside the Windows app: download the local runner, then SmolLM2. After that, pick Offline
                  model and chat with no key.
                </p>
              </>
            ) : null}
          </div>
        </aside>
      </div>

      {railOpen ? (
        <button
          type="button"
          aria-label="Close threads"
          className="fixed inset-0 z-20 bg-ink/70 md:hidden"
          onClick={() => setRailOpen(false)}
        />
      ) : null}
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close settings"
          className="fixed inset-0 z-20 bg-ink/70 xl:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}
