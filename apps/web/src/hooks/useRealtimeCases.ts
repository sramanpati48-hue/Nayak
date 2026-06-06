import { useState, useEffect, useCallback } from "react";
import { useHeatmapStore } from "@/store/heatmap";

export interface DistrictCaseData {
  districtId: string;
  districtName: string;
  caseCount: number;
  topCaseType: string;
  momChange: number; // Month-over-month percentage change
  lastUpdated: string;
}

interface UseRealtimeCasesReturn {
  districtData: Record<string, DistrictCaseData>;
  isLive: boolean;
  lastUpdate: Date | null;
  loading: boolean;
}

export function useRealtimeCases(): UseRealtimeCasesReturn {
  const [districtData, setDistrictData] = useState<Record<string, DistrictCaseData>>({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const { points } = useHeatmapStore();

  // Mock data mapping - maps point IDs to district IDs
  const mockDistrictData: Record<string, DistrictCaseData> = {
    delhi: {
      districtId: "delhi",
      districtName: "Delhi",
      caseCount: 145,
      topCaseType: "Civil",
      momChange: 12.5,
      lastUpdated: new Date().toISOString(),
    },
    "gautam-budh-nagar": {
      districtId: "gautam-budh-nagar",
      districtName: "Gautam Budh Nagar",
      caseCount: 89,
      topCaseType: "Criminal",
      momChange: -3.2,
      lastUpdated: new Date().toISOString(),
    },
    mumbai: {
      districtId: "mumbai",
      districtName: "Mumbai",
      caseCount: 112,
      topCaseType: "Commercial",
      momChange: 8.7,
      lastUpdated: new Date().toISOString(),
    },
    thane: {
      districtId: "thane",
      districtName: "Thane",
      caseCount: 67,
      topCaseType: "Family",
      momChange: 5.1,
      lastUpdated: new Date().toISOString(),
    },
    chennai: {
      districtId: "chennai",
      districtName: "Chennai",
      caseCount: 92,
      topCaseType: "Labour",
      momChange: 2.3,
      lastUpdated: new Date().toISOString(),
    },
    kanchipuram: {
      districtId: "kanchipuram",
      districtName: "Kanchipuram",
      caseCount: 56,
      topCaseType: "Property",
      momChange: -1.8,
      lastUpdated: new Date().toISOString(),
    },
    bhopal: {
      districtId: "bhopal",
      districtName: "Bhopal",
      caseCount: 78,
      topCaseType: "Civil",
      momChange: 6.4,
      lastUpdated: new Date().toISOString(),
    },
    indore: {
      districtId: "indore",
      districtName: "Indore",
      caseCount: 45,
      topCaseType: "Criminal",
      momChange: -2.5,
      lastUpdated: new Date().toISOString(),
    },
    kolkata: {
      districtId: "kolkata",
      districtName: "Kolkata",
      caseCount: 103,
      topCaseType: "Civil",
      momChange: 9.8,
      lastUpdated: new Date().toISOString(),
    },
  };

  const fetchCaseData = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch from API
      const response = await fetch("/api/cases/heatmap");
      
      if (response.ok) {
        const data = await response.json();
        setDistrictData(data);
        setIsLive(true);
        setLastUpdate(new Date());
      } else {
        // Fallback to mock data
        setDistrictData(mockDistrictData);
        setIsLive(false);
        setLastUpdate(new Date());
      }
    } catch (error) {
      // API unavailable - use mock data
      console.log("API unavailable, using mock data");
      setDistrictData(mockDistrictData);
      setIsLive(false);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    // Fetch immediately
    fetchCaseData();

    // Poll every 30 seconds
    const intervalId = setInterval(fetchCaseData, 30000);

    return () => clearInterval(intervalId);
  }, [fetchCaseData]);

  return {
    districtData,
    isLive,
    lastUpdate,
    loading,
  };
}
