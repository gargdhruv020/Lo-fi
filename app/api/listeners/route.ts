import { NextRequest, NextResponse } from "next/server";

// Keep active sessions in global memory for Node.js process lifespans
const activeSessions = new Map<string, number>();

// Cleanup stale sessions that haven't sent a heartbeat in the last 10 seconds
const cleanupSessions = () => {
  const now = Date.now();
  for (const [sessionId, lastSeen] of activeSessions.entries()) {
    if (now - lastSeen > 10000) {
      activeSessions.delete(sessionId);
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (sessionId) {
      activeSessions.set(sessionId, Date.now());
    }
  } catch {
    // Ignore invalid JSON requests
  }

  cleanupSessions();

  return NextResponse.json({
    count: Math.max(1, activeSessions.size),
  });
}

export async function GET() {
  cleanupSessions();
  return NextResponse.json({
    count: Math.max(1, activeSessions.size),
  });
}
