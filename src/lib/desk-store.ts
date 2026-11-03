import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { providerById } from "@/lib/providers";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
};

type DeskState = {
  threads: Thread[];
  activeId: string;
  providerId: string;
  model: string;
  customBaseUrl: string;
  temperature: number;
  maxTokens: number;
  personalityId: string;
  customPersonality: string;
  keys: Record<string, string>;
  setProvider: (id: string) => void;
  setModel: (model: string) => void;
  setCustomBaseUrl: (url: string) => void;
  setTemperature: (value: number) => void;
  setMaxTokens: (value: number) => void;
  setPersonality: (id: string) => void;
  setCustomPersonality: (text: string) => void;
  setKey: (providerId: string, key: string) => void;
  newThread: () => void;
  selectThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  deleteThread: (id: string) => void;
  appendMessage: (threadId: string, message: ChatMessage) => void;
  updateMessage: (threadId: string, messageId: string, patch: Partial<ChatMessage>) => void;
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function freshThread(): Thread {
  return {
    id: uid(),
    title: "New thread",
    createdAt: Date.now(),
    messages: [],
  };
}

const first = freshThread();

export const useDesk = create<DeskState>()(
  persist(
    (set) => ({
      threads: [first],
      activeId: first.id,
      providerId: "builtin",
      model: "grok-4.5",
      customBaseUrl: "",
      temperature: 0.7,
      maxTokens: 800,
      personalityId: "plain",
      customPersonality: "You are Keel, a calm desk assistant. Be specific. Admit when you are unsure.",
      keys: {},
      setProvider: (id) =>
        set((state) => {
          const provider = providerById(id);
          const model = provider.models.includes(state.model) ? state.model : provider.models[0];
          return { providerId: id, model };
        }),
      setModel: (model) => set({ model: model.slice(0, 120) }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setPersonality: (personalityId) => set({ personalityId }),
      setCustomPersonality: (customPersonality) => set({ customPersonality }),
      setKey: (providerId, key) =>
        set((state) => ({ keys: { ...state.keys, [providerId]: key } })),
      newThread: () =>
        set((state) => {
          const thread = freshThread();
          return { threads: [thread, ...state.threads].slice(0, 40), activeId: thread.id };
        }),
      selectThread: (activeId) => set({ activeId }),
      renameThread: (id, title) =>
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === id ? { ...thread, title: title.slice(0, 80) || "Untitled" } : thread,
          ),
        })),
      deleteThread: (id) =>
        set((state) => {
          const threads = state.threads.filter((thread) => thread.id !== id);
          if (threads.length === 0) {
            const thread = freshThread();
            return { threads: [thread], activeId: thread.id };
          }
          const activeId = state.activeId === id ? threads[0].id : state.activeId;
          return { threads, activeId };
        }),
      appendMessage: (threadId, message) =>
        set((state) => ({
          threads: state.threads.map((thread) => {
            if (thread.id !== threadId) return thread;
            const title =
              thread.messages.length === 0 && message.role === "user"
                ? message.content.replace(/\s+/g, " ").trim().slice(0, 48) || thread.title
                : thread.title;
            return {
              ...thread,
              title,
              messages: [...thread.messages, message].slice(-80),
            };
          }),
        })),
      updateMessage: (threadId, messageId, patch) =>
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id !== threadId
              ? thread
              : {
                  ...thread,
                  messages: thread.messages.map((message) =>
                    message.id === messageId ? { ...message, ...patch } : message,
                  ),
                },
          ),
        })),
    }),
    {
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
        keys: state.keys,
      }),
    },
  ),
);
