/**
 * Lead capture system
 * 
 * Submits leads to Google Forms endpoint (if configured) or falls back to localStorage
 */

export interface LeadData {
  type: 'school_pack_request' | 'pilot_list' | 'contact';
  [key: string]: string | number | boolean | undefined;
}

const ENDPOINT = import.meta.env.VITE_LEADS_ENDPOINT;

/**
 * Submit a lead to the configured endpoint or localStorage
 */
export async function submitLead(data: LeadData): Promise<void> {
  if (ENDPOINT) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Success - also store locally as backup
      storeLocally(data);
      return;
    } catch (error) {
      console.warn('Failed to submit to endpoint, falling back to localStorage:', error);
      // Fall through to localStorage
    }
  }

  // No endpoint or request failed - use localStorage
  storeLocally(data);
  
  // Show warning if no endpoint configured
  if (!ENDPOINT) {
    console.warn('VITE_LEADS_ENDPOINT not configured. Lead stored locally only.');
  }
}

/**
 * Store lead data in localStorage
 */
function storeLocally(data: LeadData): void {
  try {
    const stored = JSON.parse(localStorage.getItem('leads') || '[]');
    stored.push({
      ...data,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('leads', JSON.stringify(stored));
  } catch (error) {
    console.error('Failed to store lead locally:', error);
  }
}

/**
 * Get all stored leads (for admin/debugging)
 */
export function getStoredLeads(): LeadData[] {
  try {
    return JSON.parse(localStorage.getItem('leads') || '[]');
  } catch {
    return [];
  }
}

