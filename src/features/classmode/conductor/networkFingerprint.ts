let cachedServerIp: string | null = null;

export async function getServerIp(): Promise<string> {
  if (cachedServerIp) return cachedServerIp;

  try {
    const res = await fetch('/api/geo');
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedServerIp = data.ip;
        return data.ip;
      }
    }
  } catch {
    // Fall back to a best-effort approach: let the server determine the IP
  }

  cachedServerIp = '0.0.0.0';
  return '0.0.0.0';
}

export function clearCachedIp() {
  cachedServerIp = null;
}
