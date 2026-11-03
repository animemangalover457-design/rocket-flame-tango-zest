import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as object, i as number, n as array, o as string, t as _enum } from "../_libs/zod.mjs";
import { a as PanelRight, c as Download, i as Plus, l as ArrowUp, n as Trash2, o as KeyRound, r as Square, s as FolderOpen } from "../_libs/lucide-react.mjs";
import { n as previewPathPrefix } from "./router-BKj-Y9fs.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BaR_4b3V.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var messageSchema = object({
	role: _enum(["user", "assistant"]),
	content: string().max(16e3)
});
var chatSchema = object({
	kind: _enum([
		"openai",
		"anthropic",
		"gemini",
		"builtin"
	]),
	baseUrl: string().max(300).optional(),
	model: string().min(1).max(120),
	temperature: number().min(0).max(2).optional(),
	maxTokens: number().int().min(16).max(4096).optional(),
	system: string().max(8e3).optional(),
	apiKey: string().max(500).optional(),
	messages: array(messageSchema).min(1).max(30)
});
var keelStatus = createServerFn({ method: "GET" }).handler(createSsrRpc("a312684123fbfbcdcef3303a0720578538ef805cc104056b98182fa9af7f9539"));
var sendChat = createServerFn({ method: "POST" }).validator((data) => {
	const parsed = chatSchema.safeParse(data);
	if (!parsed.success) throw new Error("The desk couldn’t read that message.");
	return parsed.data;
}).handler(createSsrRpc("1f52bca271952cad5ff37d96814219878833f65591cf5b6efeb8abd49a80b0d9"));
var PROVIDERS = [
	{
		id: "builtin",
		label: "Grok · built in",
		kind: "builtin",
		baseUrl: "https://api.x.ai/v1",
		models: ["grok-4.5"],
		keyHint: "",
		blurb: "Uses this app’s Grok connection. No key to paste. Kept short so it doesn’t burn the quota."
	},
	{
		id: "xai",
		label: "xAI",
		kind: "openai",
		baseUrl: "https://api.x.ai/v1",
		models: [
			"grok-4.5",
			"grok-4",
			"grok-3"
		],
		keyHint: "xai-…",
		blurb: "Your own xAI key. Any Grok model id works."
	},
	{
		id: "openai",
		label: "OpenAI",
		kind: "openai",
		baseUrl: "https://api.openai.com/v1",
		models: [
			"gpt-4o-mini",
			"gpt-4o",
			"gpt-4.1-mini"
		],
		keyHint: "sk-…",
		blurb: "Chat Completions. Type any model id if yours isn’t listed."
	},
	{
		id: "anthropic",
		label: "Anthropic",
		kind: "anthropic",
		baseUrl: "https://api.anthropic.com",
		models: ["claude-sonnet-4-5", "claude-3-5-haiku-latest"],
		keyHint: "sk-ant-…",
		blurb: "Messages API. The key stays in this browser."
	},
	{
		id: "gemini",
		label: "Google Gemini",
		kind: "gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta",
		models: ["gemini-2.5-flash", "gemini-2.5-pro"],
		keyHint: "AIza…",
		blurb: "Gemini generateContent. Paste a Google AI Studio key."
	},
	{
		id: "groq",
		label: "Groq",
		kind: "openai",
		baseUrl: "https://api.groq.com/openai/v1",
		models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
		keyHint: "gsk_…",
		blurb: "Fast OpenAI-compatible endpoint."
	},
	{
		id: "openrouter",
		label: "OpenRouter",
		kind: "openai",
		baseUrl: "https://openrouter.ai/api/v1",
		models: ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5"],
		keyHint: "sk-or-…",
		blurb: "One key, many models. Use the provider/model id."
	},
	{
		id: "mistral",
		label: "Mistral",
		kind: "openai",
		baseUrl: "https://api.mistral.ai/v1",
		models: ["mistral-small-latest", "open-mistral-nemo"],
		keyHint: "",
		blurb: "Mistral’s OpenAI-compatible API."
	},
	{
		id: "deepseek",
		label: "DeepSeek",
		kind: "openai",
		baseUrl: "https://api.deepseek.com/v1",
		models: ["deepseek-chat", "deepseek-reasoner"],
		keyHint: "sk-…",
		blurb: "DeepSeek chat. Reasoner models may answer slowly."
	},
	{
		id: "together",
		label: "Together",
		kind: "openai",
		baseUrl: "https://api.together.xyz/v1",
		models: ["meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
		keyHint: "",
		blurb: "Together AI. Paste the full model string."
	},
	{
		id: "custom",
		label: "Custom endpoint",
		kind: "openai",
		baseUrl: "",
		models: ["local"],
		keyHint: "optional",
		blurb: "Any public https OpenAI-compatible /v1 base. Localhost is for the Windows app, not this preview."
	}
];
var PERSONALITIES = [
	{
		id: "plain",
		name: "Plain",
		text: "You are a clear, direct assistant sitting at a desk. Answer in plain language. No filler, no false cheer."
	},
	{
		id: "editor",
		name: "Editor",
		text: "You are a precise editor. Improve structure and wording. Keep the author’s meaning. Show the revision, then one sentence on what changed."
	},
	{
		id: "tutor",
		name: "Tutor",
		text: "You are a patient tutor. Explain one step at a time, use a concrete example, and stop before the lecture gets long."
	},
	{
		id: "pair",
		name: "Pair",
		text: "You are a senior engineer pairing at the desk. Prefer working code, name the tradeoff, and skip the pep talk."
	},
	{
		id: "brief",
		name: "Brief",
		text: "Answer in as few words as possible. No preamble, no closing offer."
	},
	{
		id: "custom",
		name: "Custom",
		text: ""
	}
];
function personalityText(id, custom) {
	if (id === "custom") return custom.trim();
	return PERSONALITIES.find((item) => item.id === id)?.text ?? PERSONALITIES[0].text;
}
function providerById(id) {
	return PROVIDERS.find((item) => item.id === id) ?? PROVIDERS[1];
}
function uid$1() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function freshThread() {
	return {
		id: uid$1(),
		title: "New thread",
		createdAt: Date.now(),
		messages: []
	};
}
var first = freshThread();
var useDesk = create()(persist((set) => ({
	threads: [first],
	activeId: first.id,
	providerId: "builtin",
	model: "grok-4.5",
	customBaseUrl: "",
	temperature: .7,
	maxTokens: 800,
	personalityId: "plain",
	customPersonality: "You are Keel, a calm desk assistant. Be specific. Admit when you are unsure.",
	keys: {},
	setProvider: (id) => set((state) => {
		const provider = providerById(id);
		return {
			providerId: id,
			model: provider.models.includes(state.model) ? state.model : provider.models[0]
		};
	}),
	setModel: (model) => set({ model: model.slice(0, 120) }),
	setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
	setTemperature: (temperature) => set({ temperature }),
	setMaxTokens: (maxTokens) => set({ maxTokens }),
	setPersonality: (personalityId) => set({ personalityId }),
	setCustomPersonality: (customPersonality) => set({ customPersonality }),
	setKey: (providerId, key) => set((state) => ({ keys: {
		...state.keys,
		[providerId]: key
	} })),
	newThread: () => set((state) => {
		const thread = freshThread();
		return {
			threads: [thread, ...state.threads].slice(0, 40),
			activeId: thread.id
		};
	}),
	selectThread: (activeId) => set({ activeId }),
	renameThread: (id, title) => set((state) => ({ threads: state.threads.map((thread) => thread.id === id ? {
		...thread,
		title: title.slice(0, 80) || "Untitled"
	} : thread) })),
	deleteThread: (id) => set((state) => {
		const threads = state.threads.filter((thread) => thread.id !== id);
		if (threads.length === 0) {
			const thread = freshThread();
			return {
				threads: [thread],
				activeId: thread.id
			};
		}
		return {
			threads,
			activeId: state.activeId === id ? threads[0].id : state.activeId
		};
	}),
	appendMessage: (threadId, message) => set((state) => ({ threads: state.threads.map((thread) => {
		if (thread.id !== threadId) return thread;
		const title = thread.messages.length === 0 && message.role === "user" ? message.content.replace(/\s+/g, " ").trim().slice(0, 48) || thread.title : thread.title;
		return {
			...thread,
			title,
			messages: [...thread.messages, message].slice(-80)
		};
	}) })),
	updateMessage: (threadId, messageId, patch) => set((state) => ({ threads: state.threads.map((thread) => thread.id !== threadId ? thread : {
		...thread,
		messages: thread.messages.map((message) => message.id === messageId ? {
			...message,
			...patch
		} : message)
	}) }))
}), {
	name: "keel-desk",
	storage: createJSONStorage(() => localStorage),
	skipHydration: true,
	partialize: (state) => ({
		threads: state.threads,
		activeId: state.activeId,
		providerId: state.providerId,
		model: state.model,
		customBaseUrl: state.customBaseUrl,
		temperature: state.temperature,
		maxTokens: state.maxTokens,
		personalityId: state.personalityId,
		customPersonality: state.customPersonality,
		keys: state.keys
	})
}));
function withPreviewPrefix(path) {
	if (typeof window === "undefined") return path;
	return `${previewPathPrefix(window.location.hostname, window.location.pathname) ?? ""}${path}`;
}
var KIT = [
	["Keel.exe", "The Windows program. Compiled machine code. Double-click it."],
	["icon.ico", "Window icon. Replace this file, then open Keel again."],
	["interface/theme.css", "Colors and type. This is the skin."],
	["interface/index.html", "The layout of the desk."],
	["interface/app.js", "How chat, keys, and offline download behave."],
	["api/providers.json", "Endpoints and model lists. Add your own."],
	["settings/settings.json", "Temperature, model, window title."],
	["settings/keys.json", "API keys on that PC. Don’t share this file."],
	["personality/active.txt", "The voice the model uses."],
	["models/catalog.json", "Which offline models can be downloaded."]
];
function uid() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `id-${Date.now()}`;
}
function RichText({ text }) {
	const parts = text.split("```");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: parts.map((part, index) => {
			if (index % 2 === 1) {
				const newline = part.indexOf("\n");
				const body = newline === -1 ? part : part.slice(newline + 1);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "overflow-x-auto rounded-md bg-ink px-3 py-3 text-left font-mono text-sm text-bone-dim",
					children: body.replace(/\n$/, "")
				}, index);
			}
			if (!part.trim()) return null;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "whitespace-pre-wrap text-pretty",
				children: part
			}, index);
		})
	});
}
function DeskApp() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [builtin, setBuiltin] = (0, import_react.useState)(null);
	const [railOpen, setRailOpen] = (0, import_react.useState)(false);
	const [drawerOpen, setDrawerOpen] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("model");
	const [draft, setDraft] = (0, import_react.useState)("");
	const [sending, setSending] = (0, import_react.useState)(false);
	const [waited, setWaited] = (0, import_react.useState)(0);
	const scroller = (0, import_react.useRef)(null);
	const box = (0, import_react.useRef)(null);
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
	(0, import_react.useEffect)(() => {
		Promise.resolve(useDesk.persist.rehydrate()).catch(() => void 0).finally(() => setReady(true));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		keelStatus().then((status) => {
			setBuiltin(status.builtin);
			if (!status.builtin && useDesk.getState().providerId === "builtin") useDesk.getState().setProvider("xai");
		}).catch(() => setBuiltin(false));
	}, [ready]);
	(0, import_react.useEffect)(() => {
		const node = scroller.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [
		active?.messages,
		sending,
		ready
	]);
	(0, import_react.useEffect)(() => {
		if (!sending) {
			setWaited(0);
			return;
		}
		const timer = window.setInterval(() => setWaited((value) => value + 1), 1e3);
		return () => window.clearInterval(timer);
	}, [sending]);
	const providers = (0, import_react.useMemo)(() => PROVIDERS.filter((item) => item.id !== "builtin" || builtin || providerId === "builtin"), [builtin, providerId]);
	async function send(text) {
		const content = text.trim();
		if (!content || sending || !active) return;
		const threadId = active.id;
		const state = useDesk.getState();
		const chosen = providerById(state.providerId);
		const user = {
			id: uid(),
			role: "user",
			content
		};
		const assistantId = uid();
		state.appendMessage(threadId, user);
		state.appendMessage(threadId, {
			id: assistantId,
			role: "assistant",
			content: ""
		});
		setDraft("");
		setSending(true);
		const history = [...active.messages ?? [], user].filter((message) => message.content.trim() && !message.error).slice(-24).map((message) => ({
			role: message.role,
			content: message.content
		}));
		try {
			const result = await sendChat({ data: {
				kind: chosen.kind,
				baseUrl: chosen.id === "custom" ? state.customBaseUrl : chosen.baseUrl,
				model: state.model,
				temperature: state.temperature,
				maxTokens: state.maxTokens,
				system: personalityText(state.personalityId, state.customPersonality),
				apiKey: chosen.kind === "builtin" ? void 0 : state.keys[chosen.id] ?? "",
				messages: history
			} });
			if (!result.ok) {
				useDesk.getState().updateMessage(threadId, assistantId, {
					content: result.error,
					error: true
				});
				return;
			}
			useDesk.getState().updateMessage(threadId, assistantId, { content: result.text });
		} catch (error) {
			const message = error instanceof Error ? error.message : "The desk couldn’t reach the model.";
			useDesk.getState().updateMessage(threadId, assistantId, {
				content: message,
				error: true
			});
		} finally {
			setSending(false);
			box.current?.focus();
		}
	}
	if (!ready || !active) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-dvh flex-col justify-between bg-ink px-6 py-8 text-bone",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-4xl italic",
			children: "Keel"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "max-w-sm text-mute",
			children: "Opening the desk…"
		})]
	});
	const keyValue = keys[provider.id] ?? "";
	const needsKey = provider.kind !== "builtin";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-ink text-bone",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 md:px-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "inline-flex h-11 items-center gap-2 rounded-md px-2 text-bone md:hidden",
						onClick: () => setRailOpen(true),
						"aria-label": "Open threads",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-xl italic",
							children: "Keel"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden font-display text-xl italic md:block",
						children: "Keel"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden text-sm text-mute sm:block",
						children: "Model desk"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "hidden max-w-48 truncate rounded-full border border-line px-3 py-1 text-sm text-bone-dim sm:inline",
								children: [provider.label, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-mute",
									children: [" · ", model]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: downloadHref,
								download: true,
								className: "inline-flex h-11 items-center gap-2 rounded-md bg-brass px-3 text-sm font-medium text-ink",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
										className: "size-4",
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hidden sm:inline",
										children: "Windows"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sm:hidden",
										children: "Get app"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-bone xl:hidden",
								onClick: () => setDrawerOpen(true),
								"aria-label": "Open settings",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelRight, { className: "size-4" })
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid min-h-0 flex-1 md:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_22rem]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: `${railOpen ? "fixed inset-y-0 left-0 z-30 flex w-72" : "hidden"} flex-col border-r border-line bg-ink-2 md:static md:flex md:w-auto`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between px-4 pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs tracking-widest text-mute uppercase",
								children: "Threads"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-brass",
								onClick: () => {
									useDesk.getState().newThread();
									setRailOpen(false);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									className: "size-4",
									"aria-hidden": "true"
								}), "New"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "min-h-0 flex-1 overflow-y-auto px-2 py-2",
							children: threads.map((thread, index) => {
								const selected = thread.id === active.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "group flex items-stretch",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											useDesk.getState().selectThread(thread.id);
											setRailOpen(false);
										},
										className: `flex min-h-11 min-w-0 flex-1 items-baseline gap-3 rounded-md px-2 text-left ${selected ? "bg-panel text-bone" : "text-bone-dim"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "w-6 shrink-0 text-xs text-mute tabular-nums",
											children: String(index + 1).padStart(2, "0")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate text-sm",
											children: thread.title
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "inline-flex h-11 w-11 items-center justify-center text-mute opacity-100 md:opacity-0 md:group-hover:opacity-100",
										"aria-label": `Delete ${thread.title}`,
										onClick: () => useDesk.getState().deleteThread(thread.id),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
									})]
								}, thread.id);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex min-h-0 min-w-0 flex-col",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-3 border-b border-line px-4 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									"aria-label": "Thread title",
									value: active.title,
									onChange: (event) => useDesk.getState().renameThread(active.id, event.target.value),
									className: "w-full bg-transparent font-display text-2xl text-bone outline-none"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								ref: scroller,
								className: "min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8",
								children: active.messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mx-auto flex max-w-xl flex-col gap-6 pt-6",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-display text-4xl text-balance italic",
											children: "Any model. Your key. Your desk."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "max-w-md text-pretty text-bone-dim",
											children: builtin ? "Built-in Grok is ready if you want to try a short reply. Or paste a key for OpenAI, Claude, Gemini, and the rest." : "Paste an API key for the model you want. Nothing is sent until you press Send."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "rounded-lg border border-line bg-ink-2 p-4",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start gap-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, {
													className: "mt-1 size-4 shrink-0 text-brass",
													"aria-hidden": "true"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "space-y-2",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-sm text-bone",
															children: "The Windows program is a real Keel.exe, not a browser tab."
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-sm text-mute",
															children: "Unzip it, double-click the program, then edit the folders beside it — icon, theme, personality, providers. Offline chat downloads a small model onto that PC."
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
															href: downloadHref,
															download: true,
															className: "inline-flex h-11 items-center text-sm text-brass",
															children: "Download Keel for Windows"
														})
													]
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-col gap-2",
											children: [
												"Explain Keel in three sentences, as if to a friend.",
												"Rewrite this so it sounds calm and specific: we should talk soon.",
												"Give me a short plan to learn one new tool this week."
											].map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "min-h-11 rounded-md border border-line px-3 text-left text-sm text-bone-dim",
												onClick: () => {
													setDraft(prompt);
													box.current?.focus();
												},
												children: prompt
											}, prompt))
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
									className: "mx-auto flex max-w-2xl flex-col gap-6",
									children: active.messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
										className: message.role === "user" ? "flex justify-end" : "",
										children: message.role === "user" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "max-w-[85%] rounded-lg bg-panel px-4 py-3 text-bone",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichText, { text: message.content })
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "max-w-full",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mb-2 text-xs tracking-widest text-brass uppercase",
												children: message.error ? "Desk" : "Keel"
											}), message.content ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: message.error ? "text-bone-dim" : "text-bone",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichText, { text: message.content })
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-mute tabular-nums",
												children: [
													"Writing… ",
													waited,
													"s"
												]
											})]
										})
									}, message.id))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								className: "border-t border-line px-3 py-3 pb-16 md:px-6",
								onSubmit: (event) => {
									event.preventDefault();
									send(draft);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mx-auto flex max-w-2xl items-end gap-2 rounded-lg border border-line bg-ink-2 p-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										ref: box,
										value: draft,
										"aria-label": "Message",
										rows: 1,
										placeholder: needsKey && !keyValue ? `Key for ${provider.label}, then a message` : "Write to the desk",
										onChange: (event) => setDraft(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(pointer: fine)").matches) {
												event.preventDefault();
												send(draft);
											}
										},
										className: "max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-bone outline-none placeholder:text-mute"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: sending || !draft.trim(),
										className: "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brass text-ink disabled:opacity-40",
										"aria-label": sending ? "Writing" : "Send",
										children: sending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mx-auto mt-2 max-w-2xl text-xs text-mute",
									children: provider.kind === "builtin" ? "Built-in replies use this app’s Grok connection and stay short." : "Your key stays in this browser and is sent only when you press Send."
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: `${drawerOpen ? "fixed inset-y-0 right-0 z-30 flex w-[min(100%,22rem)]" : "hidden"} flex-col border-l border-line bg-ink-2 xl:static xl:flex`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-1 border-b border-line p-2",
							children: [
								["model", "Model"],
								["voice", "Voice"],
								["key", "Key"],
								["files", "Files"]
							].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setTab(id),
								className: `h-11 flex-1 rounded-md text-sm ${tab === id ? "bg-panel text-bone" : "text-mute"}`,
								children: label
							}, id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-h-0 flex-1 space-y-5 overflow-y-auto p-4",
							children: [
								tab === "model" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs tracking-widest text-mute uppercase",
											children: "Provider"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: provider.id,
											onChange: (event) => useDesk.getState().setProvider(event.target.value),
											className: "h-11 w-full rounded-md border border-line bg-ink px-3 text-bone",
											children: providers.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: item.id,
												children: item.label
											}, item.id))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-mute",
										children: provider.blurb
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs tracking-widest text-mute uppercase",
												children: "Model id"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: model,
												onChange: (event) => useDesk.getState().setModel(event.target.value),
												className: "h-11 w-full rounded-md border border-line bg-ink px-3 text-bone",
												list: "keel-models"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
												id: "keel-models",
												children: provider.models.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: item }, item))
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-2",
										children: provider.models.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => useDesk.getState().setModel(item),
											className: `min-h-11 rounded-full border px-3 text-sm ${item === model ? "border-brass text-brass" : "border-line text-bone-dim"}`,
											children: item
										}, item))
									}),
									provider.id === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs tracking-widest text-mute uppercase",
											children: "Base URL"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: customBaseUrl,
											placeholder: "https://example.com/v1",
											onChange: (event) => useDesk.getState().setCustomBaseUrl(event.target.value),
											className: "h-11 w-full rounded-md border border-line bg-ink px-3 text-bone"
										})]
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex justify-between text-xs tracking-widest text-mute uppercase",
											children: ["Temperature", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "tabular-nums text-bone-dim",
												children: temperature.toFixed(1)
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "range",
											min: 0,
											max: 1.5,
											step: .1,
											value: temperature,
											"aria-label": "Temperature",
											onChange: (event) => useDesk.getState().setTemperature(Number(event.target.value)),
											className: "w-full"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs tracking-widest text-mute uppercase",
											children: "Max tokens"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: 16,
											max: 4096,
											value: maxTokens,
											onChange: (event) => useDesk.getState().setMaxTokens(Number(event.target.value) || 800),
											className: "h-11 w-full rounded-md border border-line bg-ink px-3 text-bone tabular-nums"
										})]
									})
								] }) : null,
								tab === "voice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-mute",
										children: "This is the personality. On Windows the same words live in personality/active.txt."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-2",
										children: PERSONALITIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => useDesk.getState().setPersonality(item.id),
											className: `min-h-11 rounded-full border px-3 text-sm ${item.id === personalityId ? "border-brass text-brass" : "border-line text-bone-dim"}`,
											children: item.name
										}, item.id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs tracking-widest text-mute uppercase",
											children: personalityId === "custom" ? "Custom personality" : "What this voice says"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: personalityId === "custom" ? customPersonality : personalityText(personalityId, ""),
											readOnly: personalityId !== "custom",
											onChange: (event) => useDesk.getState().setCustomPersonality(event.target.value),
											rows: 8,
											className: "w-full rounded-md border border-line bg-ink px-3 py-3 text-sm text-bone outline-none read-only:text-bone-dim"
										})]
									})
								] }) : null,
								tab === "key" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-brass",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, {
										className: "size-4",
										"aria-hidden": "true"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm",
										children: provider.label
									})]
								}), provider.kind === "builtin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-mute",
									children: "Built-in Grok doesn’t ask for a key here. On the Windows program, add your own xAI key in settings/keys.json."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs tracking-widest text-mute uppercase",
											children: "API key"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "password",
											autoComplete: "off",
											value: keyValue,
											placeholder: provider.keyHint || "Paste key",
											onChange: (event) => useDesk.getState().setKey(provider.id, event.target.value),
											className: "h-11 w-full rounded-md border border-line bg-ink px-3 text-bone"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-sm text-mute",
											children: "Stored only in this browser. Cleared if you empty the field."
										})
									]
								})] }) : null,
								tab === "files" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-bone-dim",
										children: "Download the folder, unzip it, and double-click Keel.exe. Windows may say the publisher is unknown — that’s because it isn’t signed. Choose More info, then Run anyway."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: downloadHref,
										download: true,
										className: "inline-flex h-11 items-center gap-2 rounded-md bg-brass px-3 text-sm font-medium text-ink",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
											className: "size-4",
											"aria-hidden": "true"
										}), "Keel for Windows"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "space-y-3",
										children: KIT.map(([file, note]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-mono text-sm text-brass",
											children: file
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-mute",
											children: note
										})] }, file))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-mute",
										children: "Offline, inside the Windows app: download the local runner, then SmolLM2. After that, pick Offline model and chat with no key."
									})
								] }) : null
							]
						})]
					})
				]
			}),
			railOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Close threads",
				className: "fixed inset-0 z-20 bg-ink/70 md:hidden",
				onClick: () => setRailOpen(false)
			}) : null,
			drawerOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Close settings",
				className: "fixed inset-0 z-20 bg-ink/70 xl:hidden",
				onClick: () => setDrawerOpen(false)
			}) : null
		]
	});
}
var SplitComponent = DeskApp;
//#endregion
export { SplitComponent as component };
