/**
 * BuildingPanels, presentational overlay panels for BuildingMode.
 *
 * Split out of BuildingMode.tsx to keep that file under the 500-line
 * cap. These components are stateless; all data they need is passed
 * in via props, all callbacks come from the parent shell.
 */

import { KidPanel } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
import { getObjectThumbnailUrl } from './buildingAssets';

export type PickerTile = {
    objectId: string;
    label: string;
    enabled: boolean;
};

// ─── Brand + prompt + top buttons ─────────────────────────────────────

export const BrandHeader = () => (
    <div style={{
        ...overlayBaseStyle,
        top: tokens.spacing.lg,
        left: tokens.spacing.lg,
    }}>
        <KidPanel size="sm" tone="white" style={{
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
        }}>
            <div style={{
                fontFamily: tokens.fontFamily.display,
                fontWeight: tokens.fontWeight.extrabold,
                fontSize: '1.3rem',
                lineHeight: 1,
                color: tokens.semantic.textPrimary,
            }}>
                Building
            </div>
            <div style={{
                marginTop: '4px',
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.semibold,
                fontSize: tokens.fontSize.label,
                color: tokens.semantic.textSecondary,
                lineHeight: 1,
            }}>
                Build it. Your way.
            </div>
        </KidPanel>
    </div>
);

export const PromptBar = ({ displayName }: { displayName: string }) => (
    <div style={{
        ...overlayBaseStyle,
        top: tokens.spacing.lg,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(520px, 50vw)',
    }}>
        <KidPanel size="sm" tone="white" style={{
            padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            justifyContent: 'center',
        }}>
            <span style={{ fontSize: '1.2rem' }} role="img" aria-label="audio">🔊</span>
            <span style={{
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.semibold,
                fontSize: tokens.fontSize.button,
                color: tokens.semantic.textPrimary,
                whiteSpace: 'nowrap',
            }}>
                Let&apos;s build a{' '}
                <span style={{
                    color: '#6C3FA4',
                    fontWeight: tokens.fontWeight.extrabold,
                    textTransform: 'capitalize',
                }}>
                    {displayName || '...'}
                </span>
            </span>
        </KidPanel>
    </div>
);

export const TopRightButtons = ({ onHome }: { onHome?: () => void }) => (
    <div style={{
        ...overlayBaseStyle,
        top: tokens.spacing.lg,
        right: tokens.spacing.lg,
        display: 'flex',
        gap: tokens.spacing.sm,
        pointerEvents: 'auto',
    }}>
        <ActionTile icon="🏠" label="Home" onClick={onHome} />
        <ActionTile icon="✏️" label="Sandbox" disabled />
    </div>
);

export const ActionTile = ({
    icon, label, onClick, disabled,
}: { icon: string; label: string; onClick?: () => void; disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            background: '#FFFFFF',
            border: `1.5px solid ${tokens.semantic.borderPanel}`,
            borderRadius: '14px',
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            minWidth: '64px',
            boxShadow: tokens.shadow.panel,
            fontFamily: tokens.fontFamily.body,
        }}
    >
        <span style={{ fontSize: '1.3rem' }} role="img" aria-label={label}>{icon}</span>
        <span style={{
            fontWeight: tokens.fontWeight.semibold,
            fontSize: '0.78rem',
            color: tokens.semantic.textPrimary,
        }}>
            {label}
        </span>
    </button>
);

// ─── Object picker (left sidebar) ─────────────────────────────────────

export const ObjectPicker = ({
    selectedId,
    tiles,
}: { selectedId: string; tiles: PickerTile[] }) => (
    <div style={{
        ...overlayBaseStyle,
        top: '120px',
        left: tokens.spacing.lg,
        width: '170px',
        pointerEvents: 'auto',
    }}>
        <KidPanel size="md" tone="white" style={{
            padding: tokens.spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.sm,
        }}>
            <div style={{
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.bold,
                fontSize: tokens.fontSize.label,
                color: tokens.semantic.textPrimary,
                marginBottom: '2px',
                lineHeight: 1.15,
            }}>
                Choose something to build
            </div>
            {tiles.map(tile => (
                <PickerTileButton
                    key={tile.objectId}
                    tile={tile}
                    selected={tile.objectId === selectedId}
                />
            ))}
            <div style={{
                ...pickerTileStyle(false, false),
                background: tokens.semantic.bgPanelTinted,
                color: tokens.semantic.textSecondary,
                fontWeight: tokens.fontWeight.semibold,
                justifyContent: 'center',
            }}>
                <span style={{ fontSize: '1rem' }}>⋯</span> More
            </div>
        </KidPanel>
    </div>
);

const PickerTileButton = ({
    tile, selected,
}: { tile: PickerTile; selected: boolean }) => {
    const thumb = getObjectThumbnailUrl(tile.objectId);
    return (
        <div style={pickerTileStyle(selected, !tile.enabled)}>
            <div style={{
                width: '56px', height: '56px',
                borderRadius: '12px',
                background: tile.enabled && thumb
                    ? `center / contain no-repeat url(${thumb})`
                    : tokens.semantic.bgPanelTinted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
            }}>
                {(!tile.enabled || !thumb) && '🔒'}
            </div>
            <div style={{
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.bold,
                fontSize: '0.85rem',
                color: selected ? '#6C3FA4' : tokens.semantic.textPrimary,
            }}>
                {tile.label}
            </div>
        </div>
    );
};

// ─── Steps + hint cards (right sidebar) ───────────────────────────────

export const StepsPanel = ({ total, filled }: { total: number; filled: number }) => (
    <div style={{
        ...overlayBaseStyle,
        top: '120px',
        right: tokens.spacing.lg,
        width: '170px',
    }}>
        <KidPanel size="md" tone="white" style={{ padding: tokens.spacing.md }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: tokens.spacing.sm,
            }}>
                <span style={{
                    fontFamily: tokens.fontFamily.body,
                    fontWeight: tokens.fontWeight.bold,
                    fontSize: tokens.fontSize.label,
                    color: tokens.semantic.textPrimary,
                }}>
                    Steps
                </span>
                <span style={{
                    fontFamily: tokens.fontFamily.body,
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: '0.8rem',
                    color: tokens.semantic.textSecondary,
                }}>
                    {Math.min(filled, total)} / {total}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: total }).map((_, i) => {
                    const done = i < filled;
                    return (
                        <div key={i} style={{
                            width: '24px', height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: done ? '#6C3FA4' : tokens.semantic.bgPanelTinted,
                            color: done ? '#FFFFFF' : tokens.semantic.textSecondary,
                            fontFamily: tokens.fontFamily.body,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: '0.72rem',
                        }}>
                            {i + 1}
                        </div>
                    );
                })}
            </div>
        </KidPanel>
    </div>
);

export const HintCardLightbulb = () => (
    <div style={{
        ...overlayBaseStyle,
        top: '232px',
        right: tokens.spacing.lg,
        width: '170px',
    }}>
        <KidPanel size="md" tone="white" style={{ padding: tokens.spacing.md }}>
            <span style={{ fontSize: '1.3rem' }} role="img" aria-label="tip">💡</span>
            <div style={{
                marginTop: tokens.spacing.xs,
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.semibold,
                fontSize: '0.85rem',
                color: tokens.semantic.textPrimary,
                lineHeight: 1.3,
            }}>
                Match the pieces to the outline.
            </div>
        </KidPanel>
    </div>
);

export const HintCardCelebrate = () => (
    <div style={{
        ...overlayBaseStyle,
        top: '348px',
        right: tokens.spacing.lg,
        width: '170px',
    }}>
        <KidPanel size="md" tone="white" style={{ padding: tokens.spacing.md }}>
            <div style={{
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.bold,
                fontSize: tokens.fontSize.label,
                color: tokens.semantic.textPrimary,
                marginBottom: tokens.spacing.xs,
            }}>
                When you finish…
            </div>
            <span style={{ fontSize: '1.3rem' }} role="img" aria-label="celebrate">🎉</span>
            <div style={{
                marginTop: tokens.spacing.xs,
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.semibold,
                fontSize: '0.85rem',
                color: tokens.semantic.textPrimary,
                lineHeight: 1.3,
            }}>
                Your creation comes to life!
            </div>
        </KidPanel>
    </div>
);

// ─── Bottom hint + undo ───────────────────────────────────────────────

export const BottomHint = () => (
    <div style={{
        ...overlayBaseStyle,
        bottom: tokens.spacing.lg,
        left: '50%',
        transform: 'translateX(-50%)',
    }}>
        <KidPanel size="sm" tone="white" style={{
            padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
        }}>
            <span style={{ fontSize: '1.2rem' }} role="img" aria-label="hand">✋</span>
            <span style={{
                fontFamily: tokens.fontFamily.body,
                fontWeight: tokens.fontWeight.semibold,
                fontSize: tokens.fontSize.button,
                color: tokens.semantic.textPrimary,
            }}>
                Grab a piece and place it in the right spot
            </span>
        </KidPanel>
    </div>
);

export const UndoButton = () => (
    <div style={{
        ...overlayBaseStyle,
        bottom: tokens.spacing.lg,
        right: tokens.spacing.lg,
    }}>
        <ActionTile icon="↶" label="Undo" disabled />
    </div>
);

// ─── Shared styles ────────────────────────────────────────────────────

const overlayBaseStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: tokens.zIndex.hud,
    pointerEvents: 'none',
};

function pickerTileStyle(selected: boolean, disabled: boolean): React.CSSProperties {
    return {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        padding: tokens.spacing.sm,
        borderRadius: '12px',
        background: selected ? tokens.semantic.bgPanelTinted : '#FFFFFF',
        border: selected
            ? `2px solid #6C3FA4`
            : `1.5px solid ${tokens.semantic.borderPanel}`,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'default' : 'pointer',
    };
}
