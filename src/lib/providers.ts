export type ProviderKind = "openai" | "anthropic" | "gemini" | "builtin";

export type Provider = {
  id: string;
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  models: string[];
  keyHint: string;
  blurb: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "builtin",
    label: "Grok · built in",
    kind: "builtin",
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-4.5"],
    keyHint: "",
    blurb: "Uses this app’s Grok connection. No key to paste. Kept short so it doesn’t burn the quota.",
  },
  {
    id: "xai",
    label: "xAI",
    kind: "openai",
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-4.5", "grok-4", "grok-3"],
    keyHint: "xai-…",
    blurb: "Your own xAI key. Any Grok model id works.",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    keyHint: "sk-…",
    blurb: "Chat Completions. Type any model id if yours isn’t listed.",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    models: ["claude-sonnet-4-5", "claude-3-5-haiku-latest"],
    keyHint: "sk-ant-…",
    blurb: "Messages API. The key stays in this browser.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
    keyHint: "AIza…",
    blurb: "Gemini generateContent. Paste a Google AI Studio key.",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    keyHint: "gsk_…",
    blurb: "Fast OpenAI-compatible endpoint.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5"],
    keyHint: "sk-or-…",
    blurb: "One key, many models. Use the provider/model id.",
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    models: ["mistral-small-latest", "open-mistral-nemo"],
    keyHint: "",
    blurb: "Mistral’s OpenAI-compatible API.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyHint: "sk-…",
    blurb: "DeepSeek chat. Reasoner models may answer slowly.",
  },
  {
    id: "together",
    label: "Together",
    kind: "openai",
    baseUrl: "https://api.together.xyz/v1",
    models: ["meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
    keyHint: "",
    blurb: "Together AI. Paste the full model string.",
  },
  {
    id: "custom",
    label: "Custom endpoint",
    kind: "openai",
    baseUrl: "",
    models: ["local"],
    keyHint: "optional",
    blurb: "Any public https OpenAI-compatible /v1 base. Localhost is for the Windows app, not this preview.",
  },
];

export type Personality = {
  id: string;
  name: string;
  text: string;
};

export const PERSONALITIES: Personality[] = [
  {
    id: "plain",
    name: "Plain",
    text: "You are a clear, direct assistant sitting at a desk. Answer in plain language. No filler, no false cheer.",
  },
  {
    id: "editor",
    name: "Editor",
    text: "You are a precise editor. Improve structure and wording. Keep the author’s meaning. Show the revision, then one sentence on what changed.",
  },
  {
    id: "tutor",
    name: "Tutor",
    text: "You are a patient tutor. Explain one step at a time, use a concrete example, and stop before the lecture gets long.",
  },
  {
    id: "pair",
    name: "Pair",
    text: "You are a senior engineer pairing at the desk. Prefer working code, name the tradeoff, and skip the pep talk.",
  },
  {
    id: "brief",
    name: "Brief",
    text: "Answer in as few words as possible. No preamble, no closing offer.",
  },
  {
    id: "custom",
    name: "Custom",
    text: "",
  },
];

export function personalityText(id: string, custom: string): string {
  if (id === "custom") return custom.trim();
  return PERSONALITIES.find((item) => item.id === id)?.text ?? PERSONALITIES[0].text;
}

export function providerById(id: string): Provider {
  return PROVIDERS.find((item) => item.id === id) ?? PROVIDERS[1];
}
