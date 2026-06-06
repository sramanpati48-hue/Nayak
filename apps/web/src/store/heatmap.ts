import { create } from "zustand";

export interface HeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number; // 0-1 scale
  caseType: string;
  location: string;
  casesCount: number;
  created_at: string;
}

interface HeatmapState {
  points: HeatmapPoint[];
  loading: boolean;
  error: string | null;
  
  fetchHeatmapData: () => Promise<void>;
  addPoint: (point: Omit<HeatmapPoint, "id" | "created_at">) => void;
  clearPoints: () => void;
}

export const useHeatmapStore = create<HeatmapState>((set, get) => ({
  points: [],
  loading: false,
  error: null,

  fetchHeatmapData: async () => {
    set({ loading: true, error: null });
    try {
      // Mock heatmap data - replace with actual API call
      const mockPoints: HeatmapPoint[] = [
        {
          id: "1",
          lat: 28.7041,
          lng: 77.1025,
          intensity: 0.9,
          caseType: "Civil",
          location: "Delhi - High Court",
          casesCount: 145,
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          lat: 28.5355,
          lng: 77.391,
          intensity: 0.7,
          caseType: "Criminal",
          location: "Noida Courts",
          casesCount: 89,
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          lat: 19.0760,
          lng: 72.8777,
          intensity: 0.8,
          caseType: "Commercial",
          location: "Mumbai - High Court",
          casesCount: 112,
          created_at: new Date().toISOString(),
        },
        {
          id: "4",
          lat: 13.0827,
          lng: 80.2707,
          intensity: 0.6,
          caseType: "Family",
          location: "Chennai District Courts",
          casesCount: 67,
          created_at: new Date().toISOString(),
        },
        {
          id: "5",
          lat: 23.1815,
          lng: 79.9864,
          intensity: 0.5,
          caseType: "Labour",
          location: "Bhopal Courts",
          casesCount: 45,
          created_at: new Date().toISOString(),
        },
        {
          id: "6",
          lat: 31.5497,
          lng: 74.3436,
          intensity: 0.7,
          caseType: "Property",
          location: "Lahore Courts",
          casesCount: 92,
          created_at: new Date().toISOString(),
        },
        {
          id: "7",
          lat: 22.5726,
          lng: 88.3639,
          intensity: 0.75,
          caseType: "Civil",
          location: "Kolkata High Court",
          casesCount: 103,
          created_at: new Date().toISOString(),
        },
      ];

      set({ points: mockPoints, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch heatmap data", loading: false });
    }
  },

  addPoint: (point) => {
    const newPoint: HeatmapPoint = {
      ...point,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      points: [...state.points, newPoint],
    }));
  },

  clearPoints: () => {
    set({ points: [] });
  },
}));
