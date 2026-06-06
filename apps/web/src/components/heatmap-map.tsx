"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Leaflet
const HeatmapMapContent = dynamic(() => import("./heatmap-map-content"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-secondary rounded-lg border border-border flex items-center justify-center">
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  ),
});

export function HeatmapMap() {
  return <HeatmapMapContent />;
}
