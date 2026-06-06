"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useHeatmapStore } from "@/store/heatmap";
import { useRealtimeCases } from "@/hooks/useRealtimeCases";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GeoJSONData {
  type: string;
  features: any[];
}

// Get color based on case count intensity
const getIntensityColor = (caseCount: number, maxCount: number): string => {
  const intensity = caseCount / maxCount;
  
  if (intensity >= 0.8) return "#8b0000"; // Dark red - very high
  if (intensity >= 0.6) return "#ff3333"; // Red - high
  if (intensity >= 0.4) return "#ff6600"; // Orange-red - medium
  if (intensity >= 0.2) return "#ffcc00"; // Yellow-orange - low-medium
  if (intensity > 0) return "#ffff66"; // Yellow - low
  return "transparent"; // No activity
};

// Calculate centroid of polygon for label placement
const calculateCentroid = (coordinates: number[][][]): [number, number] | null => {
  if (!coordinates || coordinates.length === 0) return null;
  
  const polygon = coordinates[0];
  let x = 0, y = 0;
  let pointCount = polygon.length;
  
  for (let i = 0; i < polygon.length; i++) {
    x += polygon[i][1];
    y += polygon[i][0];
  }
  
  return [x / pointCount, y / pointCount];
};

export default function HeatmapMapContent() {
  const { fetchHeatmapData } = useHeatmapStore();
  const { districtData, isLive, lastUpdate } = useRealtimeCases();
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONData | null>(null);
  const [maxCaseCount, setMaxCaseCount] = useState(0);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  
  const geoJsonLayerRef = useRef<any>(null);
  const districtLabelsRef = useRef<Map<string, L.Marker>>(new Map());
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Load GeoJSON data once
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const response = await fetch("/data/india-districts-geo.json");
        const data: GeoJSONData = await response.json();
        setGeoJsonData(data);

        // Calculate max case count for color scaling
        const counts = Object.values(districtData).map(d => d.caseCount);
        if (counts.length > 0) {
          setMaxCaseCount(Math.max(...counts));
        }
      } catch (error) {
        console.error("Error loading GeoJSON:", error);
      }
    };

    loadGeoJSON();
    fetchHeatmapData();
  }, []);

  // Only update colors when district data changes - don't re-render GeoJSON
  useEffect(() => {
    const counts = Object.values(districtData).map(d => d.caseCount);
    const newMax = counts.length > 0 ? Math.max(...counts) : 0;
    
    // Only update if max count actually changed
    if (newMax !== maxCaseCount) {
      setMaxCaseCount(newMax);
    }

    // Update layer colors and labels in place without re-rendering
    if (geoJsonLayerRef.current && mapRef) {
      geoJsonLayerRef.current.eachLayer((layer: any) => {
        const feature = layer.feature;
        const districtId = feature.properties.id;
        const districtName = feature.properties.name;
        const data = districtData[districtId];

        if (!data) {
          layer.setStyle({ fillOpacity: 0 });
          return;
        }

        const color = getIntensityColor(data.caseCount, newMax);

        // Update zone color
        layer.setStyle({
          fillColor: color,
          fillOpacity: 0.65,
        });

        // Update label if it exists
        const labelKey = `${districtId}-label`;
        const existingLabel = districtLabelsRef.current.get(labelKey);
        
        if (!existingLabel) {
          // Create label if it doesn't exist
          const centroid = calculateCentroid(feature.geometry.coordinates);
          if (centroid && layerGroupRef.current) {
            const labelIcon = L.divIcon({
              html: `
                <div style="
                  background: rgba(0, 0, 0, 0.8);
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: bold;
                  text-align: center;
                  white-space: nowrap;
                  border: 2px solid ${color};
                  box-shadow: 0 2px 6px rgba(0,0,0,0.6);
                  backdrop-filter: blur(4px);
                  font-family: system-ui, -apple-system, sans-serif;
                ">
                  <div>${districtName}</div>
                  <div style="font-size: 11px; color: ${color}; margin-top: 3px; font-weight: bold;">${data.caseCount} cases</div>
                </div>
              `,
              className: "district-label",
              iconSize: [100, 50],
              iconAnchor: [50, 25],
            });

            const marker = L.marker(centroid, { icon: labelIcon }).addTo(layerGroupRef.current);
            districtLabelsRef.current.set(labelKey, marker);
          }
        } else {
          // Update existing label's icon
          const labelIcon = L.divIcon({
            html: `
              <div style="
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                white-space: nowrap;
                border: 2px solid ${color};
                box-shadow: 0 2px 6px rgba(0,0,0,0.6);
                backdrop-filter: blur(4px);
                font-family: system-ui, -apple-system, sans-serif;
              ">
                <div>${districtName}</div>
                <div style="font-size: 11px; color: ${color}; margin-top: 3px; font-weight: bold;">${data.caseCount} cases</div>
              </div>
            `,
            className: "district-label",
            iconSize: [100, 50],
            iconAnchor: [50, 25],
          });
          existingLabel.setIcon(labelIcon);
        }
      });
    }
  }, [districtData, maxCaseCount, geoJsonData, mapRef]);

  const handleGeoJSONEachFeature = (feature: any, layer: any) => {
    const districtId = feature.properties.id;
    const districtName = feature.properties.name;
    const data = districtData[districtId];

    if (!data) {
      layer.setStyle({ fillOpacity: 0 });
      return;
    }

    const color = getIntensityColor(data.caseCount, maxCaseCount);

    // Initial zone styling with clear boundaries
    layer.setStyle({
      fillColor: color,
      weight: 3,
      opacity: 1,
      color: "#000000", // Black border for clear visibility
      dashArray: "",
      fillOpacity: 0.65,
      lineCap: "round",
      lineJoin: "round",
    });

    // Create detailed popup/tooltip HTML
    const tooltipHTML = `
      <div style="padding: 12px; font-size: 13px; min-width: 220px;">
        <strong style="font-size: 15px; display: block; margin-bottom: 10px; color: ${color};">${districtName}</strong>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div>
            <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">Cases</span><br/>
            <span style="font-weight: bold; color: ${color}; font-size: 18px;">${data.caseCount}</span>
          </div>
          <div>
            <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">MoM Change</span><br/>
            <span style="font-weight: bold; color: ${data.momChange >= 0 ? '#ff3333' : '#66ff66'}; font-size: 16px;">
              ${data.momChange >= 0 ? '📈 +' : '📉 '}${data.momChange.toFixed(1)}%
            </span>
          </div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
          <span style="color: #999; font-size: 11px; text-transform: uppercase; font-weight: bold;">Primary Case Type</span><br/>
          <span style="font-weight: bold; color: ${color}; font-size: 14px;">${data.topCaseType}</span>
        </div>
      </div>
    `;

    // Bind popup
    layer.bindPopup(tooltipHTML, {
      maxWidth: 280,
      className: "custom-popup",
    });
    
    // Bind tooltip for hover
    layer.bindTooltip(tooltipHTML, {
      permanent: false,
      direction: "top",
      offset: [0, -10],
      sticky: true,
    });

    // Enhanced hover effects
    layer.on("mouseover", function () {
      this.setStyle({
        weight: 4,
        opacity: 1,
        fillOpacity: 0.85,
        color: "#ffff00", // Yellow highlight on hover
      });
      this.bringToFront();
    });

    layer.on("mouseout", function () {
      this.setStyle({
        weight: 3,
        opacity: 1,
        color: "#000000",
        fillOpacity: 0.65,
      });
    });
  };

  return (
    <div className="relative w-full h-96 rounded-lg border border-border overflow-hidden">
      {/* Live Badge */}
      {isLive && (
        <div className="absolute top-4 right-4 z-[500] flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-primary">Live Data</span>
        </div>
      )}

      {/* Zone Legend */}
      <div className="absolute top-4 left-4 z-[500] bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
        <div className="font-bold text-foreground mb-3 flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-primary" />
          Zone Intensity
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: "#8b0000" }} />
            <span className="text-muted-foreground">Very High (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: "#ff3333" }} />
            <span className="text-muted-foreground">High (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: "#ff6600" }} />
            <span className="text-muted-foreground">Medium (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: "#ffff66" }} />
            <span className="text-muted-foreground">Low (1-40%)</span>
          </div>
        </div>
      </div>

      {/* Last Update Info */}
      {lastUpdate && (
        <div className="absolute bottom-4 left-4 z-[500] text-[10px] text-muted-foreground bg-card/80 border border-border rounded px-2.5 py-1.5 font-medium">
          Updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Info Tooltip */}
      <div className="absolute bottom-4 right-4 z-[500] text-[10px] text-muted-foreground bg-card/80 border border-border rounded px-2.5 py-1.5">
        Click zones for details • Hover for info
      </div>

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        ref={(map) => {
          if (map && !mapRef) {
            setMapRef(map);
            if (!layerGroupRef.current) {
              layerGroupRef.current = L.layerGroup().addTo(map);
            }
          }
        }}
        className="chunk-based-map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.85}
        />

        {/* Render GeoJSON zones - ONLY render once, then update in place */}
        {geoJsonData && (
          <GeoJSON 
            data={geoJsonData} 
            onEachFeature={handleGeoJSONEachFeature}
            ref={(geojson) => {
              if (geojson && !geoJsonLayerRef.current) {
                geoJsonLayerRef.current = geojson;
              }
            }}
          />
        )}
      </MapContainer>

      {/* Custom CSS for enhanced visuals */}
      <style>{`
        .chunk-based-map {
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .district-label {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .custom-popup .leaflet-popup-content {
          margin: 0;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .leaflet-popup-content-wrapper {
          background-color: rgba(20, 20, 20, 0.95) !important;
          border: 1px solid #333 !important;
          border-radius: 8px !important;
        }

        .leaflet-popup-tip {
          background-color: rgba(20, 20, 20, 0.95) !important;
        }

        .leaflet-container {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        }

        /* Enhanced zone boundary visibility */
        .leaflet-path {
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>
    </div>
  );
}
