/**
 * DotColor Communication - Thermal Printer Bridge Dispatcher
 * Directly communicates with local print agent on port 9123 (0ms instant hardware print)
 * Fallback to Express backend if agent is running on server
 */

export interface HardwareAgentStatus {
  isOnline: boolean;
  activePrinter?: string;
  printers?: string[];
  isUsbConnected?: boolean;
  isLanReachable?: boolean;
}

export async function checkHardwareAgentStatus(): Promise<HardwareAgentStatus> {
  // 1. Direct Local Agent Check (http://127.0.0.1:9123)
  try {
    const res = await fetch('http://127.0.0.1:9123/health', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        isOnline: true,
        activePrinter: data.activePrinter || '80 Printer',
        printers: data.printers || [],
        isUsbConnected: Boolean(data.isUsbConnected),
        isLanReachable: Boolean(data.isLanReachable),
      };
    }
  } catch {
    // Local agent not reachable
  }

  // 2. Server Cloud Bridge Status Check
  try {
    const sRes = await fetch('/api/print-bridge/status', {
      signal: AbortSignal.timeout(2000),
    });
    if (sRes.ok) {
      const sData = await sRes.json().catch(() => ({}));
      if (sData.isAgentOnline) {
        return {
          isOnline: true,
          activePrinter: sData.activePrinter || '80 Printer (Cloud Bridge)',
          printers: sData.printers || [],
          isUsbConnected: Boolean(sData.isUsbConnected),
          isLanReachable: Boolean(sData.isLanReachable),
        };
      }
    }
  } catch {
    // Cloud check failed
  }

  return { isOnline: false };
}

export async function dispatchHardwarePrint(endpoint: string, payload: any): Promise<boolean> {
  // 1. Instant Local Agent Dispatch (0ms delay when running on cashier PC)
  try {
    const localUrl = `http://127.0.0.1:9123${endpoint}`;
    const localRes = await fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    if (localRes.ok) {
      const data = await localRes.json().catch(() => ({}));
      if (data && data.success === true) {
        return true;
      }
    }
  } catch {
    // Not running on cashier machine or local agent unavailable, fallback to server queue
  }

  // 2. Server Cloud Queue Fallback
  try {
    const serverRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (serverRes.ok) {
      const data = await serverRes.json().catch(() => ({}));
      return data.success === true || Boolean(data.queued);
    }
  } catch (err) {
    console.warn(`[Hardware Print] Cloud dispatch error on ${endpoint}:`, err);
  }

  return false;
}
