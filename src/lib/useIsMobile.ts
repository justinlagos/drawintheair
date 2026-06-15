import { useEffect, useState } from 'react';

/**
 * True on phones / small touch screens, where the front-camera air-drawing
 * experience is poor and we should offer a laptop handoff instead (spec §4).
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const isPhoneUa = /Mobi|Android|iPhone|iPod/i.test(ua) || (/iPad/i.test(ua));
      const isSmall = typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 820px)').matches
        : window.innerWidth <= 820;
      setMobile(isPhoneUa || isSmall);
    } catch { /* default false */ }
  }, []);
  return mobile;
}
