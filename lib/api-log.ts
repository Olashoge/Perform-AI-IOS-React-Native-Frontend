export interface ApiCallEntry {
  method: string;
  url: string;
  status: number | string;
  timestamp: number;
}

const MAX_ENTRIES = 5;
const callLog: ApiCallEntry[] = [];

export function logApiCall(method: string, url: string, status: number | string) {
  const entry: ApiCallEntry = { method, url, status, timestamp: Date.now() };
  callLog.unshift(entry);
  if (callLog.length > MAX_ENTRIES) {
    callLog.length = MAX_ENTRIES;
  }
  console.log(`[API] ${method} ${url} -> ${status}`);
}

export function getApiCallLog(): ApiCallEntry[] {
  return [...callLog];
}
