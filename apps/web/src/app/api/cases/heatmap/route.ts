import { NextRequest, NextResponse } from "next/server";

// Mock heatmap data - replace with actual database queries
const mockDistrictData = {
  delhi: {
    districtId: "delhi",
    districtName: "Delhi",
    caseCount: 145 + Math.floor(Math.random() * 20),
    topCaseType: "Civil",
    momChange: 12.5 + (Math.random() - 0.5) * 5,
    lastUpdated: new Date().toISOString(),
  },
  "gautam-budh-nagar": {
    districtId: "gautam-budh-nagar",
    districtName: "Gautam Budh Nagar",
    caseCount: 89 + Math.floor(Math.random() * 15),
    topCaseType: "Criminal",
    momChange: -3.2 + (Math.random() - 0.5) * 3,
    lastUpdated: new Date().toISOString(),
  },
  mumbai: {
    districtId: "mumbai",
    districtName: "Mumbai",
    caseCount: 112 + Math.floor(Math.random() * 18),
    topCaseType: "Commercial",
    momChange: 8.7 + (Math.random() - 0.5) * 4,
    lastUpdated: new Date().toISOString(),
  },
  thane: {
    districtId: "thane",
    districtName: "Thane",
    caseCount: 67 + Math.floor(Math.random() * 12),
    topCaseType: "Family",
    momChange: 5.1 + (Math.random() - 0.5) * 2,
    lastUpdated: new Date().toISOString(),
  },
  chennai: {
    districtId: "chennai",
    districtName: "Chennai",
    caseCount: 92 + Math.floor(Math.random() * 16),
    topCaseType: "Labour",
    momChange: 2.3 + (Math.random() - 0.5) * 3,
    lastUpdated: new Date().toISOString(),
  },
  kanchipuram: {
    districtId: "kanchipuram",
    districtName: "Kanchipuram",
    caseCount: 56 + Math.floor(Math.random() * 10),
    topCaseType: "Property",
    momChange: -1.8 + (Math.random() - 0.5) * 2,
    lastUpdated: new Date().toISOString(),
  },
  bhopal: {
    districtId: "bhopal",
    districtName: "Bhopal",
    caseCount: 78 + Math.floor(Math.random() * 14),
    topCaseType: "Civil",
    momChange: 6.4 + (Math.random() - 0.5) * 3,
    lastUpdated: new Date().toISOString(),
  },
  indore: {
    districtId: "indore",
    districtName: "Indore",
    caseCount: 45 + Math.floor(Math.random() * 8),
    topCaseType: "Criminal",
    momChange: -2.5 + (Math.random() - 0.5) * 2,
    lastUpdated: new Date().toISOString(),
  },
  kolkata: {
    districtId: "kolkata",
    districtName: "Kolkata",
    caseCount: 103 + Math.floor(Math.random() * 17),
    topCaseType: "Civil",
    momChange: 9.8 + (Math.random() - 0.5) * 4,
    lastUpdated: new Date().toISOString(),
  },
};

export async function GET(request: NextRequest) {
  try {
    // In production, query your database here
    // Example: const data = await db.query('SELECT * FROM case_heatmap_data')
    
    // For demo purposes, add slight randomness to simulate live updates
    const responseData = Object.values(mockDistrictData).reduce(
      (acc: Record<string, any>, district) => {
        acc[district.districtId] = district;
        return acc;
      },
      {}
    );

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.districtId || !body.caseCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production, update your database here
    // Example: await db.query('UPDATE case_heatmap_data SET case_count = ? WHERE district_id = ?', [body.caseCount, body.districtId])
    
    return NextResponse.json(
      {
        success: true,
        message: "District data updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating heatmap data:", error);
    return NextResponse.json(
      { error: "Failed to update heatmap data" },
      { status: 500 }
    );
  }
}
