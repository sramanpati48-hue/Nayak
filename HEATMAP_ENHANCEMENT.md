# Case Heatmap Enhancement Guide

## Overview
The Case Heatmap component has been enhanced with GeoJSON district-level visualization and real-time data polling capabilities.

## Features

### 1. **District-Level GeoJSON Zones**
- Displays actual district boundaries instead of pin markers
- Data source: `public/data/india-districts-geo.json`
- Each district is styled with a color gradient based on case concentration

**Color Scale:**
- 🔴 `#8b0000` - Very High (80%+)
- 🔴 `#ff3333` - High (60-80%)
- 🟠 `#ff6600` - Medium (40-60%)
- 🟡 `#ffff66` - Low (1-40%)
- ⚪ `transparent` - No Activity

### 2. **Interactive Hover Tooltips**
Hover over any district to see:
- **District Name**: Full name of the district
- **Case Count**: Total number of cases in that district
- **Top Case Type**: Most common case type (Civil, Criminal, Commercial, etc.)
- **MoM % Change**: Month-over-Month percentage change (green for decrease, red for increase)

### 3. **Real-Time Data with `useRealtimeCases` Hook**

**Hook Location:** `src/hooks/useRealtimeCases.ts`

**Features:**
- Polls `/api/cases/heatmap` every 30 seconds
- Automatically updates only changed zones
- Shows a pulsing "Live" badge when connected
- Falls back to mock data if API is unavailable
- Returns:
  - `districtData`: Record of all district case data
  - `isLive`: Boolean indicating if connected to live API
  - `lastUpdate`: Timestamp of last data update
  - `loading`: Loading state during API calls

**Usage Example:**
```typescript
const { districtData, isLive, lastUpdate, loading } = useRealtimeCases();
```

### 4. **API Endpoint**

**Route:** `src/app/api/cases/heatmap/route.ts`

**GET Request:**
Returns real-time case data for all districts.

Response format:
```json
{
  "delhi": {
    "districtId": "delhi",
    "districtName": "Delhi",
    "caseCount": 145,
    "topCaseType": "Civil",
    "momChange": 12.5,
    "lastUpdated": "2026-06-06T10:30:00Z"
  },
  ...
}
```

**POST Request:**
Update case count for a specific district.

Request body:
```json
{
  "districtId": "delhi",
  "caseCount": 150
}
```

### 5. **Enhanced Dashboard**

The `/case-heatmap` page now includes:
- **Live Status Badge**: Shows when connected to real API
- **Updated Stats**: 
  - Total Cases across all districts
  - Number of Active Districts
  - Average Cases per District
  - Average MoM Change percentage
- **Top 5 Districts**: Ranked by case volume with MoM changes
- **Case Type Distribution**: Breakdown by case type
- **Color Legend**: Visual reference for intensity scale

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── cases/
│   │       └── heatmap/
│   │           └── route.ts          # API endpoint for heatmap data
│   └── case-heatmap/
│       └── page.tsx                   # Enhanced heatmap page
├── components/
│   ├── heatmap-map.tsx               # Map wrapper component
│   └── heatmap-map-content.tsx       # GeoJSON rendering logic
├── hooks/
│   ├── useRealtimeCases.ts           # Real-time data polling hook
│   └── index.ts                       # Hook exports
├── store/
│   └── heatmap.ts                    # Zustand store (existing)
└── public/
    └── data/
        └── india-districts-geo.json  # GeoJSON district boundaries
```

## Integration with Backend

To connect to your actual backend:

1. **Replace Mock Data:**
   In `src/hooks/useRealtimeCases.ts`, modify the API fetch:
   ```typescript
   const response = await fetch("/api/cases/heatmap");
   // This already calls the correct endpoint
   ```

2. **Update API Endpoint:**
   In `src/app/api/cases/heatmap/route.ts`, replace the mock data with your database queries:
   ```typescript
   const data = await db.query('SELECT * FROM case_heatmap_data');
   ```

3. **Update GeoJSON:**
   Replace `public/data/india-districts-geo.json` with accurate district boundaries

4. **Database Schema Example:**
   ```sql
   CREATE TABLE case_heatmap_data (
     id INT PRIMARY KEY,
     district_id VARCHAR(255) UNIQUE,
     district_name VARCHAR(255),
     case_count INT,
     top_case_type VARCHAR(100),
     mom_change DECIMAL(5, 2),
     last_updated TIMESTAMP
   );
   ```

## Performance Considerations

- **30-second Poll Interval**: Adjustable in `useRealtimeCases.ts` (line 68)
- **Lazy Loading**: GeoJSON loads on component mount
- **Selective Updates**: Only changed zones are re-rendered
- **Fallback Mechanism**: Mock data prevents UI breaks if API fails

## Customization

### Change Poll Interval
In `src/hooks/useRealtimeCases.ts`:
```typescript
const intervalId = setInterval(fetchCaseData, 30000); // Change this value (in ms)
```

### Add New Districts
Edit `public/data/india-districts-geo.json` with additional GeoJSON features.

### Modify Color Scheme
In `src/components/heatmap-map-content.tsx`, update the `getIntensityColor` function:
```typescript
const getIntensityColor = (caseCount: number, maxCount: number): string => {
  const intensity = caseCount / maxCount;
  // Modify color thresholds here
};
```

## Testing

1. **Live Mode**: If API is running, badge will show "Live Data"
2. **Fallback Mode**: If API fails, mock data is used automatically
3. **Hot Reload**: Edit district data in `useRealtimeCases.ts` to test updates

## Future Enhancements

- [ ] Add search/filter by district name
- [ ] Export data as CSV/PDF
- [ ] Time-series analysis for case trends
- [ ] Drill-down view into individual cases per district
- [ ] Integration with court calendar
- [ ] Predictive analytics for case volume

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers with Leaflet.js support
