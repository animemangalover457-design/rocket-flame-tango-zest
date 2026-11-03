import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(16000),
});

const chatSchema = z.object({
  kind: z.enum(["openai", "anthropic", "gemini", "builtin"]),
  baseUrl: z.string().max(300).optional(),
  model: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(4096).optional(),
  system: z.string().max(8000).optional(),
  apiKey: z.string().max(500).optional(),
  messages: z.array(messageSchema).min(1).max(30),
});

export type ChatRequest = z.infer<typeof chatSchema>;

export const keelStatus = createServerFn({ method: "GET" }).handler(() => {
  return { builtin: Boolean(process.env.XAI_API_KEY?.trim()) };
});

export const sendChat = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const parsed = chatSchema.safeParse(data);
    if (!parsed.success) throw new Error("The desk couldn’t read that message.");
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const { runChat } = await import("./upstream.server");
    return runChat(data);
  });
