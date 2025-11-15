import { NextRequest, NextResponse } from "next/server";

// In-memory store for active viewers (in production, use Redis)
const activeViewers = new Map<string, number>();
const VIEWER_TIMEOUT = 30000; // 30 seconds timeout

// Clean up expired viewers
function cleanupExpiredViewers() {
  const now = Date.now();
  for (const [viewerId, lastSeen] of activeViewers.entries()) {
    if (now - lastSeen > VIEWER_TIMEOUT) {
      activeViewers.delete(viewerId);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { viewerId } = await request.json();
    
    if (!viewerId) {
      return NextResponse.json(
        { error: "Viewer ID is required" },
        { status: 400 }
      );
    }

    // Update viewer's last seen timestamp
    activeViewers.set(viewerId, Date.now());
    
    // Clean up expired viewers
    cleanupExpiredViewers();

    return NextResponse.json({
      success: true,
      activeViewers: activeViewers.size,
    });
  } catch (error) {
    console.error("Error updating viewer:", error);
    return NextResponse.json(
      { error: "Failed to update viewer" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Clean up expired viewers before returning count
    cleanupExpiredViewers();

    return NextResponse.json({
      activeViewers: activeViewers.size,
    });
  } catch (error) {
    console.error("Error fetching viewers:", error);
    return NextResponse.json(
      { error: "Failed to fetch viewers" },
      { status: 500 }
    );
  }
}
