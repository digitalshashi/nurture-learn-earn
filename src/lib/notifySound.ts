/**
 * A short two-note chime, for the moment a form refuses to go through.
 *
 * Synthesised rather than loaded: a sound file would be another request on the
 * checkout critical path, and this is two sine tones.
 *
 * Browsers only allow audio to start from a user gesture. Every caller here
 * runs inside a click handler, which is what makes it audible at all — and why
 * it stays silent rather than throwing if that ever stops being true.
 */

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

  if (!Ctor) return null;
  // One context for the page: browsers cap how many can exist, and creating
  // one per keystroke-worth of validation would eventually fail.
  if (!context) context = new Ctor();
  return context;
}

/** One sine tone with a soft attack and decay, so it reads as a bell not a beep. */
function tone(ctx: AudioContext, frequency: number, startAt: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startAt);

  // A square-edged envelope clicks audibly; ramping in and out does not.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.12, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

/**
 * Ting-ting: two rising notes, quiet and quick enough to be a nudge rather
 * than an alarm. Never throws — a browser that blocks audio must not take the
 * validation message down with it.
 */
export function playAttentionChime(): void {
  try {
    const ctx = audioContext();
    if (!ctx) return;

    // A context created before the first gesture starts suspended.
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    tone(ctx, 988, now, 0.16); // B5
    tone(ctx, 1319, now + 0.13, 0.22); // E6
  } catch {
    // Audio is a nicety here; the inline error is what actually informs.
  }
}
