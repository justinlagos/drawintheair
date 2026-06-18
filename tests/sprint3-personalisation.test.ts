import { describe, it, expect } from 'vitest';
import {
    classifyDevice,
    getDeviceProfile,
} from '../src/lib/deviceProfile';
import { nextVisit, isReturning } from '../src/lib/visitHistory';
import { deriveAudience, pathForAudience } from '../src/lib/audience';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile/15E148';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36';
const FB_IPHONE = `${IPHONE} FBAN/FBIOS;FBAV/450`;

describe('deviceProfile', () => {
    it('classifies desktop, mobile, tablet', () => {
        expect(classifyDevice(DESKTOP, 1440)).toBe('desktop');
        expect(classifyDevice(IPHONE, 390)).toBe('mobile');
        expect(classifyDevice(IPAD, 820)).toBe('tablet');
    });

    it('a narrow desktop window is still desktop (no mobile UA)', () => {
        expect(classifyDevice(DESKTOP, 600)).toBe('desktop');
    });

    it('laptops get the best camera fit and no positioning tip', () => {
        const p = getDeviceProfile(DESKTOP, 1440);
        expect(p.cameraFit).toBe('best');
        expect(p.positioningTip).toBe('');
        expect(p.inApp).toBe(false);
    });

    it('phones get an "ok" fit and a propping tip', () => {
        const p = getDeviceProfile(IPHONE, 390);
        expect(p.cameraFit).toBe('ok');
        expect(p.positioningTip.toLowerCase()).toContain('prop');
    });

    it('in-app webviews are flagged risky with no tip (handoff handles them)', () => {
        const p = getDeviceProfile(FB_IPHONE, 390);
        expect(p.inApp).toBe(true);
        expect(p.cameraFit).toBe('risky');
        expect(p.positioningTip).toBe('');
    });
});

describe('visitHistory (pure)', () => {
    it('first visit starts the record', () => {
        const v = nextVisit(null, 1000);
        expect(v).toEqual({ count: 1, firstSeen: 1000, lastSeen: 1000 });
        expect(isReturning(null)).toBe(false);
    });

    it('subsequent visits increment and preserve firstSeen', () => {
        const v1 = nextVisit(null, 1000);
        const v2 = nextVisit(v1, 5000);
        expect(v2.count).toBe(2);
        expect(v2.firstSeen).toBe(1000);
        expect(v2.lastSeen).toBe(5000);
        // First visit isn't returning; the second one is.
        expect(isReturning(v1)).toBe(false);
        expect(isReturning(v2)).toBe(true);
    });
});

describe('audience inference', () => {
    it('infers school from teacher/classroom signals', () => {
        expect(deriveAudience({ utmCampaign: 'teacher_eyfs_launch' })).toBe('school');
        expect(deriveAudience({ path: '/for-teachers' })).toBe('school');
    });
    it('infers home from parent/family signals', () => {
        expect(deriveAudience({ utmCampaign: 'parent_home_play' })).toBe('home');
    });
    it('stays unknown when there is no signal or it is mixed', () => {
        expect(deriveAudience({})).toBe('unknown');
        expect(deriveAudience({ utmCampaign: 'parents_and_teachers' })).toBe('unknown');
    });
    it('maps each audience to a distinct next step', () => {
        expect(pathForAudience('home')?.href).toBe('/parent/signup');
        expect(pathForAudience('school')?.href).toBe('/for-teachers');
        expect(pathForAudience('unknown')).toBeNull();
    });
});
