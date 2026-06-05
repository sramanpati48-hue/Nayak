import { create } from "zustand";

export interface NyaybandhuSession {
  id: string;
  title: string;
  description?: string;
  mode: string;
  opposing_counsel_strategy: string;
  status: string;
  summary?: string;
  verdict?: string;
  created_at: string;
}

export interface TranscriptEvent {
  id: string;
  session_id: string;
  speaker: string;
  role: string;
  text: string;
  event_type: string;
  card_data?: {
    id: string;
    question: string;
    options: string[];
    side: "left" | "right";
    answered?: boolean;
    selected_option?: string;
  };
  score_delta?: {
    petitioner: number;
    respondent: number;
  };
  created_at: string;
}

interface NyaybandhuState {
  sessions: NyaybandhuSession[];
  activeSession: NyaybandhuSession | null;
  activeEvents: TranscriptEvent[];
  loading: boolean;
  error: string | null;
  
  createSession: (title: string, description: string, mode: string, opposing_counsel_strategy: string) => Promise<string>;
  fetchSessionDetails: (id: string) => Promise<void>;
  answerCard: (sessionId: string, cardId: string, selectedOption: string) => Promise<void>;
  continueSession: (sessionId: string) => Promise<void>;
  finalizeSession: (sessionId: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
  addEventStream: (event: TranscriptEvent) => void;
  clearEvents: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const useNyaybandhuStore = create<NyaybandhuState>((set, get) => ({
  sessions: [],
  activeSession: null,
  activeEvents: [],
  loading: false,
  error: null,

  createSession: async (title, description, mode, opposing_counsel_strategy) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/nyaybandhu/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, mode, opposing_counsel_strategy }),
      });
      if (!res.ok) throw new Error("Failed to initialize session");
      const data: NyaybandhuSession = await res.json();
      set({ activeSession: data, loading: false });
      return data.id;
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError && /failed to fetch/i.test(err.message);
      const friendlyMessage = isNetworkError
        ? "Could not connect to the server. Please make sure the backend is running on the expected port and try again."
        : err.message || "An unexpected error occurred while creating the session.";
      set({ error: friendlyMessage, loading: false });
      throw new Error(friendlyMessage);
    }
  },

  fetchSessionDetails: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/nyaybandhu/sessions/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Session details not found");
      const data = await res.json();
      set({ 
        activeSession: data.session, 
        activeEvents: data.events,
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  answerCard: async (sessionId, cardId, selectedOption) => {
    try {
      const res = await fetch(`${API_BASE_URL}/nyaybandhu/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, selected_option: selectedOption }),
      });
      if (!res.ok) throw new Error("Failed to submit clarification choice");
      
      // Re-fetch details to sync the state
      await get().fetchSessionDetails(sessionId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  continueSession: async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/nyaybandhu/sessions/${sessionId}/continue`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to trigger session continuation");
      // Re-fetch details to sync the state
      await get().fetchSessionDetails(sessionId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  finalizeSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/nyaybandhu/sessions/${sessionId}/finalize`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to compile final review");
      const data = await res.json();
      set({ activeSession: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchHistory: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/nyaybandhu/history`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch historical session logs");
      const data = await res.json();
      set({ sessions: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addEventStream: (event) => {
    set((state) => {
      // Avoid duplicate events if streaming is re-connected
      if (state.activeEvents.some((e) => e.id === event.id)) {
        return state;
      }
      return { activeEvents: [...state.activeEvents, event] };
    });
  },

  clearEvents: () => {
    set({ activeEvents: [] });
  }
}));
