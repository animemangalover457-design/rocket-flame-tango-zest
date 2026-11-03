import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as object, i as number, n as array, o as string, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chat.functions-Bf-udymm.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
var keelStatus_createServerFn_handler = createServerRpc({
	id: "a312684123fbfbcdcef3303a0720578538ef805cc104056b98182fa9af7f9539",
	name: "keelStatus",
	filename: "src/lib/chat.functions.ts"
}, (opts) => keelStatus.__executeServer(opts));
var keelStatus = createServerFn({ method: "GET" }).handler(keelStatus_createServerFn_handler, () => {
	return { builtin: Boolean(process.env.XAI_API_KEY?.trim()) };
});
var sendChat_createServerFn_handler = createServerRpc({
	id: "1f52bca271952cad5ff37d96814219878833f65591cf5b6efeb8abd49a80b0d9",
	name: "sendChat",
	filename: "src/lib/chat.functions.ts"
}, (opts) => sendChat.__executeServer(opts));
var sendChat = createServerFn({ method: "POST" }).validator((data) => {
	const parsed = chatSchema.safeParse(data);
	if (!parsed.success) throw new Error("The desk couldn’t read that message.");
	return parsed.data;
}).handler(sendChat_createServerFn_handler, async ({ data }) => {
	const { runChat } = await import("./upstream.server-C2fx1Q5Y.mjs");
	return runChat(data);
});
//#endregion
export { keelStatus_createServerFn_handler, sendChat_createServerFn_handler };
