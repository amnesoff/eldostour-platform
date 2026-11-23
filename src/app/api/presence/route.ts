import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkRateLimit, sanitizeInput } from '@/lib/server/security';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

// In-memory active presence cache (TTL = 90 seconds)
interface PresenceRecord {
  lastSeen: number;
  ip: string;
}

const activeClients = new Map<string, PresenceRecord>();

function cleanStalePresence() {
  const cutoff = Date.now() - 90 * 1000;
  for (const [key, record] of activeClients.entries()) {
    if (record.lastSeen < cutoff) {
      activeClients.delete(key);
    }
  }
}

export async function GET(req: NextRequest) {
  cleanStalePresence();
  
  // Also try reading from active_presence table if available
  let dbCount = 0;
  try {
    const cutoffIso = new Date(Date.now() - 90 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('active_presence')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', cutoffIso);
    if (typeof count === 'number') {
      dbCount = count;
    }
  } catch {
    // Ignore db presence table if not created
  }

  const memoryCount = activeClients.size;
  // Use maximum of memory or db count, ensure at least 1 when visited
  const currentCount = Math.max(dbCount, memoryCount, 1);

  return NextResponse.json({
    success: true,
    count: currentCount,
    timestamp: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clientId = sanitizeInput(body.clientId || body.deviceId || ip) || ip;
    const studentName = sanitizeInput(body.studentName || '');
    const now = Date.now();

    activeClients.set(clientId, { lastSeen: now, ip });
    cleanStalePresence();

    // Persist to database if active_presence table exists
    try {
      await supabaseAdmin.from('active_presence').upsert({
        client_id: clientId,
        student_name: studentName || null,
        ip_address: ip,
        last_seen: new Date(now).toISOString(),
      });
    } catch {
      // Ignore if table not created
    }

    const currentCount = Math.max(activeClients.size, 1);

    return NextResponse.json({
      success: true,
      count: currentCount,
      timestamp: now,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 });
  }
}
