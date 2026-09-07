/**
 * ModeMountHold. Shown for the moment between a paid mode being asked for
 * and the entitlement answer arriving. Exists so the mount guard never
 * leaves a child looking at an empty screen while it waits. No reading
 * needed, no controls, nothing to tap.
 */

export function ModeMountHold() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Getting ready"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.92)', borderRadius: 24, padding: '28px 36px',
          textAlign: 'center', boxShadow: '0 18px 60px rgba(64,50,90,0.18)',
          fontFamily: 'Nunito, system-ui, sans-serif', color: '#40325A',
        }}
      >
        <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: 8 }} aria-hidden>✨</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Getting ready</div>
      </div>
    </div>
  );
}
