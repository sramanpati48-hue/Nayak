import { create } from "zustand";

export interface Right {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  relatedRights?: string[];
  source?: string;
  created_at: string;
}

export interface RightResource {
  id: string;
  title: string;
  type: "guide" | "checklist" | "faq" | "contact";
  url?: string;
  content?: string;
  created_at: string;
}

interface KnowMyRightsState {
  rights: Right[];
  resources: RightResource[];
  favorites: string[];
  loading: boolean;
  error: string | null;
  
  fetchRights: (category?: string) => Promise<void>;
  fetchResources: () => Promise<void>;
  getRightById: (id: string) => Right | null;
  addToFavorites: (rightId: string) => void;
  removeFromFavorites: (rightId: string) => void;
  searchRights: (query: string) => Right[];
}

export const useKnowMyRightsStore = create<KnowMyRightsState>((set, get) => ({
  rights: [],
  resources: [],
  favorites: [],
  loading: false,
  error: null,

  fetchRights: async (category?: string) => {
    set({ loading: true, error: null });
    try {
      // Mock data - replace with actual API call
      const mockRights: Right[] = [
        {
          id: "1",
          title: "Right to Legal Representation",
          description: "You have the right to be represented by a lawyer in court proceedings",
          category: "Legal Rights",
          content: "Every citizen has the fundamental right to legal representation. You can hire a lawyer of your choice or request state-provided legal aid if you cannot afford one.",
          source: "Constitution Article 20",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          title: "Right to a Fair Hearing",
          description: "You have the right to present your case and hear evidence against you",
          category: "Legal Rights",
          content: "A fair hearing means you get to speak your side of the story and know what the other party is saying. No one can decide against you without listening to you first.",
          source: "Constitution Article 21",
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          title: "Right to Information",
          description: "You can request information from government bodies",
          category: "Information Rights",
          content: "Under the Right to Information Act, you can ask for documents and information held by government offices. They must respond within 30 days.",
          source: "RTI Act 2005",
          created_at: new Date().toISOString(),
        },
        {
          id: "4",
          title: "Property Rights",
          description: "You have rights related to owning and managing property",
          category: "Property Rights",
          content: "You have the right to own, buy, sell, and rent property. No one can take your property without proper legal procedure and compensation.",
          source: "Constitution Article 19",
          created_at: new Date().toISOString(),
        },
        {
          id: "5",
          title: "Consumer Rights",
          description: "You are protected when buying goods or services",
          category: "Consumer Rights",
          content: "You have the right to safe products, correct information, fair pricing, and redressal for complaints. Consumer courts can help resolve disputes.",
          source: "Consumer Protection Act 2019",
          created_at: new Date().toISOString(),
        },
      ];

      const filtered = category 
        ? mockRights.filter(r => r.category === category)
        : mockRights;

      set({ rights: filtered, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch rights", loading: false });
    }
  },

  fetchResources: async () => {
    set({ loading: true, error: null });
    try {
      const mockResources: RightResource[] = [
        {
          id: "r1",
          title: "Filing a Court Case - Step by Step Guide",
          type: "guide",
          content: "Learn how to file a case in civil or criminal court",
          created_at: new Date().toISOString(),
        },
        {
          id: "r2",
          title: "Legal Aid Services Checklist",
          type: "checklist",
          content: "Check what documents you need for legal aid",
          created_at: new Date().toISOString(),
        },
        {
          id: "r3",
          title: "Common Legal Questions Answered",
          type: "faq",
          content: "Find answers to frequently asked legal questions",
          created_at: new Date().toISOString(),
        },
      ];

      set({ resources: mockResources, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch resources", loading: false });
    }
  },

  getRightById: (id: string) => {
    return get().rights.find(r => r.id === id) || null;
  },

  addToFavorites: (rightId: string) => {
    set((state) => ({
      favorites: [...new Set([...state.favorites, rightId])],
    }));
  },

  removeFromFavorites: (rightId: string) => {
    set((state) => ({
      favorites: state.favorites.filter(id => id !== rightId),
    }));
  },

  searchRights: (query: string) => {
    return get().rights.filter(r => 
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase()) ||
      r.content.toLowerCase().includes(query.toLowerCase())
    );
  },
}));
