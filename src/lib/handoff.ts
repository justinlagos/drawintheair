/**
 * Mobile → desktop handoff (spec §4). Sends the parent a link to open the
 * experience on their laptop (where the webcam air-drawing works well),
 * carrying UTM + a resume token so attribution and funnel position survive.
 */

import { getSupabaseUrl, getAnonKey } from './supabase';

export async function sendLaptopLink(email: string, path = '/play'): Promise<boolean> {
  const clean = (email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return false;
  try {
    const res = await fetch(`${getSupabaseUrl()}/functions/v1/send-laptop-link`, {
      method: 'POST',
      headers: {
        apikey: getAnonKey(),
        Authorization: `Bearer ${getAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: clean,
        path,
        search: typeof window !== 'undefined' ? window.location.search : '',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
