import { create } from "zustand";

export interface VicharakReview {
  id: string;
  title: string;
  case_summary?: string;
  status: string;
  structure?: {
    claims?: { side: string; text: string }[];
    timeline?: { time: string; event: string }[];
  };
  confidence_ledger?: {
    side_a_confidence?: number;
    side_b_confidence?: number;
    change_log?: { timestamp: string; entry_title: string; reason: string; net_effect: number }[];
    caution_flags?: { id: string; title: string; description: string; severity: string }[];
    ledger?: { label: string; score: number; status: string }[];
  };
  suggestions?: {
    points?: { id: string; text: string; type?: string }[];
  };
  report?: {
    compiled_at: string;
    case_overview?: { title: string; summary: string; status: string };
    extracted_structure?: {
      claims?: { side: string; text: string }[];
      timeline?: { time: string; event: string }[];
    };
    bench_notes_summary?: {
      total_notes: number;
      timeline_count: number;
      citation_count: number;
      testimony_count: number;
      notes?: any[];
    };
    confidence_summary?: {
      side_a_confidence: number;
      side_b_confidence: number;
      ledger: any[];
      change_log: any[];
    };
    caution_flags?: any[];
    points_to_keep_in_mind?: any[];
    findings_summary: string;
  };
  created_at: string;
}

export interface UploadedDocument {
  id: string;
  review_id: string;
  filename: string;
  content_type: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface BenchNoteEntry {
  id: string;
  review_id: string;
  title: string;
  note_body: string;
  category: string;
  side_impact: string;
  materiality: string;
  verification_status: string;
  source_reference?: string;
  confidence_effect: number;
  effect_type?: string;
  source_strength?: string;
  ai_detected: boolean;
  created_at: string;
}

interface VicharakBandhuState {
  reviews: VicharakReview[];
  activeReview: VicharakReview | null;
  activeDocuments: UploadedDocument[];
  activeEntries: BenchNoteEntry[];
  loading: boolean;
  error: string | null;

  createReview: (title: string) => Promise<string>;
  fetchReviewDetails: (id: string) => Promise<void>;
  ingestText: (id: string, text: string) => Promise<void>;
  uploadFile: (id: string, file: File, type: "document" | "voice") => Promise<void>;
  createEntry: (id: string, entryData: Partial<BenchNoteEntry>) => Promise<void>;
  updateEntry: (entryId: string, entryData: Partial<BenchNoteEntry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  compileReport: (id: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const useVicharakBandhuStore = create<VicharakBandhuState>((set, get) => ({
  reviews: [],
  activeReview: null,
  activeDocuments: [],
  activeEntries: [],
  loading: false,
  error: null,

  createReview: async (title) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to initialize review session");
      const data: VicharakReview = await res.json();
      set({ activeReview: data, loading: false });
      return data.id;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchReviewDetails: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/reviews/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Case review details not found");
      const data = await res.json();
      set({
        activeReview: data.review,
        activeDocuments: data.documents,
        activeEntries: data.entries,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  ingestText: async (id, text) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/reviews/${id}/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to parse brief text");
      // Re-fetch details to sync the state
      await get().fetchReviewDetails(id);
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  uploadFile: async (id, file, type) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = type === "voice" ? "voice" : "documents";
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/reviews/${id}/${endpoint}`, {
        method: "POST",
        body: formData, // Browser sets Content-Type boundary automatically
      });
      if (!res.ok) throw new Error(`Failed to upload ${type} file`);
      
      // Re-fetch details to sync the state
      await get().fetchReviewDetails(id);
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createEntry: async (id, entryData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/reviews/${id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      });
      if (!res.ok) throw new Error("Failed to save Bench Note");
      
      // Re-fetch details to sync the state
      await get().fetchReviewDetails(id);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateEntry: async (entryId, entryData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      });
      if (!res.ok) throw new Error("Failed to update Bench Note");
      
      const activeId = get().activeReview?.id;
      if (activeId) {
        await get().fetchReviewDetails(activeId);
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteEntry: async (entryId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete Bench Note");
      
      const activeId = get().activeReview?.id;
      if (activeId) {
        await get().fetchReviewDetails(activeId);
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  compileReport: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/reviews/${id}/report`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to compile judicial report");
      const data = await res.json();
      set({ activeReview: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchHistory: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/vicharakbandhu/history`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load historical review files");
      const data = await res.json();
      set({ reviews: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  }
}));
