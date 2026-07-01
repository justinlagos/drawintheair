/**
 * audioMute — single entry point for the parent "sound" control.
 *
 * Draw in the Air emits sound from two shared places: the tactile audio
 * singleton (movement/success cues, used by every mode) and the narrator
 * (spoken guidance). There is no other SFX path — modes do not create their
 * own <audio> elements. So applying the parent's sound_enabled control is a
 * matter of muting both from one place.
 *
 * The play app calls applyParentSound(enabled) whenever the active learner's
 * controls load or change, so the setting takes effect immediately and does
 * not drift between activities.
 */

import { tactileAudioManager } from './TactileAudioManager';
import { setNarratorMuted } from './narrator';

/**
 * Apply the parent sound control across all audio surfaces.
 * @param enabled true = sound on (default), false = fully muted.
 */
export function applyParentSound(enabled: boolean): void {
  tactileAudioManager.setMuted(!enabled);
  setNarratorMuted(!enabled);
}
