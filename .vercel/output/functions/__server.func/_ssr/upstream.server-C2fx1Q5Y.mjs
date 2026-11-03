import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
//#region node_modules/.nitro/vite/services/ssr/assets/upstream.server-C2fx1Q5Y.js
var BLOCKED_HOSTS = /* @__PURE__ */ new Set([
	"localhost",
	"localhost.localdomain",
	"0.0.0.0",
	"::1",
	"metadata",
	"metadata.google.internal",
	"metadata.internal"
]);
function isPrivateIp(ip) {
	const raw = ip.toLowerCase().replace(/^\[|\]$/g, "");
	if (raw.includes(":")) {
		if (raw === "::1" || raw === "::" || raw === "0:0:0:0:0:0:0:1") return true;
		if (raw.startsWith("fe80:") || raw.startsWith("fc") || raw.startsWith("fd")) return true;
		const mapped = raw.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped) return isPrivateIp(mapped[1]);
		return false;
	}
	const parts = raw.split(".").map((part) => Number(part));
	if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
	const [a, b] = parts;
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	return false;
}
function blockedName(host) {
	const name = host.toLowerCase().replace(/\.$/, "");
	if (BLOCKED_HOSTS.has(name)) return true;
	if (name.endsWith(".local") || name.endsWith(".localhost") || name.endsWith(".internal")) return true;
	if (/^\d+$/.test(name)) return true;
	return false;
}
async function assertPublicHttps(raw) {
	let url;
	try {
		url = new URL(raw);
	} catch {
		throw new Error("That endpoint URL is not valid.");
	}
	if (url.protocol !== "https:") throw new Error("Endpoints must use https.");
	if (url.username || url.password) throw new Error("Don’t put a password in the endpoint URL.");
	const host = url.hostname.replace(/^\[|\]$/g, "");
	if (blockedName(host) || isIP(host) && isPrivateIp(host)) throw new Error("That endpoint is blocked. Local models run in the Windows app.");
	if (!isIP(host)) {
		const records = await lookup(host, {
			all: true,
			verbatim: true
		});
		if (records.length === 0) throw new Error("Could not resolve that endpoint.");
		for (const record of records) if (isPrivateIp(record.address)) throw new Error("That endpoint points at a private network.");
	}
	return url;
}
function joinUrl(base, path) {
	return `${base.endsWith("/") ? base.slice(0, -1) : base}${path.startsWith("/") ? path : `/${path}`}`;
}
function clipError(text) {
	const clean = text.replace(/\s+/g, " ").trim();
	try {
		const json = JSON.parse(text);
		return (typeof json.error === "string" ? json.error : json.error?.message || json.message || clean).slice(0, 400);
	} catch {
		return clean.slice(0, 400);
	}
}
async function readUpstreamError(res) {
	return clipError(await res.text()) || `The model returned ${res.status}.`;
}
async function streamUpstream(res, kind, send) {
	if (!res.body) throw new Error("The model returned an empty response.");
	const contentType = res.headers.get("content-type") ?? "";
	if (contentType.includes("application/json") && !contentType.includes("stream")) {
		const text = await res.text();
		const delta = extractFull(JSON.parse(text), kind);
		if (delta) send({ delta });
		return;
	}
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.startsWith("data:")) continue;
			const data = trimmed.slice(5).trim();
			if (!data || data === "[DONE]") continue;
			let json;
			try {
				json = JSON.parse(data);
			} catch {
				continue;
			}
			const delta = extractDelta(json, kind);
			if (delta) send({ delta });
		}
	}
}
function textOf(value) {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map((part) => {
		if (typeof part === "string") return part;
		if (part && typeof part === "object" && "text" in part) {
			const text = part.text;
			return typeof text === "string" ? text : "";
		}
		return "";
	}).join("");
	return "";
}
function extractDelta(json, kind) {
	if (kind === "anthropic") {
		const delta = json.delta;
		return typeof delta?.text === "string" ? delta.text : "";
	}
	if (kind === "gemini") {
		const candidates = json.candidates;
		return textOf(candidates?.[0]?.content?.parts);
	}
	const choices = json.choices;
	return textOf(choices?.[0]?.delta?.content);
}
function extractFull(json, kind) {
	if (kind === "anthropic") {
		const content = json.content;
		return textOf(content);
	}
	if (kind === "gemini") return extractDelta(json, kind);
	const choices = json.choices;
	return textOf(choices?.[0]?.message?.content);
}
function buildRequest(input) {
	const { kind, model, temperature, maxTokens, system, messages } = input;
	const key = input.apiKey.trim();
	if (kind === "anthropic") return {
		url: joinUrl(input.baseUrl, "/v1/messages"),
		init: {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-api-key": key,
				"anthropic-version": "2023-06-01"
			},
			body: JSON.stringify({
				model,
				max_tokens: maxTokens,
				temperature,
				stream: true,
				system: system || void 0,
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content
				}))
			})
		}
	};
	if (kind === "gemini") {
		const url = new URL(joinUrl(input.baseUrl, `/models/${encodeURIComponent(model)}:streamGenerateContent`));
		url.searchParams.set("alt", "sse");
		url.searchParams.set("key", key);
		const contents = messages.map((message) => ({
			role: message.role === "assistant" ? "model" : "user",
			parts: [{ text: message.content }]
		}));
		return {
			url: url.toString(),
			init: {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					systemInstruction: system ? { parts: [{ text: system }] } : void 0,
					contents,
					generationConfig: {
						temperature,
						maxOutputTokens: maxTokens
					}
				})
			}
		};
	}
	const isOpenAI = input.baseUrl.includes("api.openai.com");
	const body = {
		model,
		temperature,
		stream: true,
		messages: [...system ? [{
			role: "system",
			content: system
		}] : [], ...messages.map((message) => ({
			role: message.role,
			content: message.content
		}))]
	};
	if (isOpenAI) body.max_completion_tokens = maxTokens;
	else body.max_tokens = maxTokens;
	const headers = { "content-type": "application/json" };
	if (key) headers.authorization = `Bearer ${key}`;
	if (input.baseUrl.includes("openrouter.ai")) {
		headers["http-referer"] = "https://keel.desk";
		headers["x-title"] = "Keel";
	}
	return {
		url: joinUrl(input.baseUrl, "/chat/completions"),
		init: {
			method: "POST",
			headers,
			body: JSON.stringify(body)
		}
	};
}
var builtinHits = [];
function scrub(message, key) {
	const clean = message.replace(/\s+/g, " ").trim();
	if (!key) return clean.slice(0, 400);
	return clean.split(key).join("…").slice(0, 400);
}
async function runChat(input) {
	const key = input.kind === "builtin" ? "" : (input.apiKey ?? "").trim();
	try {
		const model = input.model.trim();
		if (!model) return {
			ok: false,
			error: "Choose a model first."
		};
		const messages = input.messages.filter((message) => message.content.trim()).slice(-24).map((message) => ({
			role: message.role,
			content: message.content
		}));
		const last = messages[messages.length - 1];
		if (!last || last.role !== "user") return {
			ok: false,
			error: "The last message has to be yours."
		};
		let base = "";
		let upstreamKey = key;
		let kind = input.kind;
		let maxTokens = Math.min(Math.max(Math.round(input.maxTokens ?? 800), 16), 4096);
		const temperature = Math.min(Math.max(input.temperature ?? .7, 0), 2);
		let upstreamModel = model;
		if (input.kind === "builtin") {
			const now = Date.now();
			while (builtinHits.length && now - builtinHits[0] > 6e5) builtinHits.shift();
			if (builtinHits.length >= 24) return {
				ok: false,
				error: "Built-in Grok is resting. Wait a few minutes, or paste your own key."
			};
			builtinHits.push(now);
			upstreamKey = process.env.XAI_API_KEY?.trim() ?? "";
			if (!upstreamKey) return {
				ok: false,
				error: "Built-in Grok isn’t available right now. Paste your own key."
			};
			base = "https://api.x.ai/v1";
			kind = "openai";
			upstreamModel = "grok-4.5";
			maxTokens = Math.min(maxTokens, 800);
		} else {
			if (!upstreamKey) return {
				ok: false,
				error: "Add an API key for this provider."
			};
			if (!input.baseUrl?.trim()) return {
				ok: false,
				error: "This provider needs an https endpoint."
			};
			base = (await assertPublicHttps(input.baseUrl.trim())).toString().replace(/\/$/, "");
		}
		const built = buildRequest({
			kind,
			baseUrl: base,
			apiKey: upstreamKey,
			model: upstreamModel,
			temperature,
			maxTokens,
			system: (input.system ?? "").slice(0, 8e3),
			messages
		});
		const res = await fetch(built.url, {
			...built.init,
			redirect: "error",
			signal: AbortSignal.timeout(9e4)
		});
		if (!res.ok) return {
			ok: false,
			error: scrub(await readUpstreamError(res), upstreamKey)
		};
		let text = "";
		await streamUpstream(res, kind, (event) => {
			if (event.delta) text += event.delta;
		});
		if (!text.trim()) return {
			ok: false,
			error: "The model returned nothing."
		};
		return {
			ok: true,
			text
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "The model failed.";
		if (/redirect/i.test(message)) return {
			ok: false,
			error: "That endpoint tried to redirect, so Keel stopped."
		};
		return {
			ok: false,
			error: scrub(message, key)
		};
	}
}
//#endregion
export { runChat };
