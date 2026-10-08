import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// CPR rhythm guide: a beat at 110 pushes a minute with a count to 30, then a
// "Give 2 breaths" pause (or non-stop in hands-only mode). Keeps the screen awake
// while running, where the browser supports it.
const BPM = 110;
const BEAT_MS = 60000 / BPM;
const BREATH_MS = 5000; // 2 breaths: about 5 s (pauses should stay under 10 s)

type Mode = 'cpr' | 'hands-only';

export function CprRhythm({
  initialMode = 'cpr',
  variant = 'full',
  onRunningChange,
}: {
  initialMode?: Mode;
  // full: the card on How-To pages. bar: the slim bar docked above Back/Next on guide steps.
  variant?: 'full' | 'bar';
  onRunningChange?: (running: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [breathLeft, setBreathLeft] = useState(0);
  const [pushing, setPushing] = useState(false);
  const [sound, setSound] = useState(true);

  const timers = useRef<number[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const clearTimers = () => {
    timers.current.forEach((t) => { window.clearInterval(t); window.clearTimeout(t); });
    timers.current = [];
  };

  const beep = (freq: number, ms: number) => {
    const ctx = audio.current;
    if (!soundRef.current || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000 + 0.02);
  };

  const run = (m: Mode) => {
    clearTimers();
    let n = 0;
    setBreathLeft(0);
    const push = () => {
      n += 1;
      setCount(m === 'hands-only' ? ((n - 1) % 30) + 1 : n);
      setPushing(true);
      timers.current.push(window.setTimeout(() => setPushing(false), 140));
      beep(n % 5 === 0 ? 1180 : 880, 70);
      if (m === 'cpr' && n === 30) {
        clearTimers();
        let left = BREATH_MS / 1000;
        setBreathLeft(left);
        beep(520, 250);
        timers.current.push(window.setInterval(() => { left -= 1; setBreathLeft(Math.max(left, 0)); }, 1000));
        timers.current.push(window.setTimeout(() => run(m), BREATH_MS));
      }
    };
    push();
    timers.current.push(window.setInterval(push, BEAT_MS));
  };

  const start = async () => {
    audio.current = audio.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    await audio.current.resume?.();
    try {
      wakeLock.current = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
    } catch { /* not supported or not allowed: the guide still works */ }
    setRunning(true);
    run(mode);
  };

  const stop = () => {
    clearTimers();
    setRunning(false);
    setCount(0);
    setBreathLeft(0);
    setPushing(false);
    wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
  };

  useEffect(() => onRunningChange?.(running), [running]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimers(); wakeLock.current?.release().catch(() => undefined); }, []);

  const changeMode = (m: Mode) => {
    setMode(m);
    if (running) run(m);
  };

  const breathing = breathLeft > 0;
  const prompt = !running
    ? 'Tap Start and push with the beat'
    : breathing
      ? `Give 2 breaths · ${breathLeft}s`
      : mode === 'cpr' && count >= 25
        ? 'Get ready to give breaths'
        : 'Push hard and fast';

  if (variant === 'bar') {
    const title = !running
      ? 'Push with the beat'
      : breathing
        ? `Give 2 breaths · ${breathLeft}s`
        : mode === 'cpr' ? `${count} of 30` : `Push · ${count}`;
    return (
      <section className={`cpr-bar ${running ? 'running' : ''}`} aria-label="CPR rhythm guide">
        <div className={`cpr-bar-dot ${pushing ? 'push' : ''} ${breathing ? 'breathe' : ''}`} aria-hidden="true">
          {!running ? '110' : breathing ? '2' : count}
        </div>
        <div className="cpr-bar-text">
          <b aria-live="polite">{title}</b>
          {running ? (
            <span>{breathing ? 'Then back to pushes' : prompt}</span>
          ) : (
            <button className="cpr-bar-mode" onClick={() => changeMode(mode === 'cpr' ? 'hands-only' : 'cpr')}>
              {mode === 'cpr' ? 'Switch to hands-only' : 'Switch to 30 : 2'}
            </button>
          )}
        </div>
        <button
          className="cpr-bar-sound"
          aria-pressed={sound}
          aria-label={sound ? 'Turn beep off' : 'Turn beep on'}
          onClick={() => setSound(!sound)}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button className={`cpr-bar-start ${running ? 'stop' : ''}`} onClick={running ? stop : start}>
          {running ? 'Stop' : 'Start'}
        </button>
      </section>
    );
  }

  return (
    <section className="cpr-rhythm" aria-label="CPR rhythm guide">
      <div className="cpr-rhythm-title">CPR rhythm guide · 110 a minute</div>
      <div className="cpr-rhythm-modes" role="group" aria-label="Mode">
        <button aria-pressed={mode === 'cpr'} onClick={() => changeMode('cpr')}>30 : 2 breaths</button>
        <button aria-pressed={mode === 'hands-only'} onClick={() => changeMode('hands-only')}>Hands-only</button>
      </div>
      <div className="cpr-rhythm-main">
        <div className={`cpr-rhythm-pulse ${pushing ? 'push' : ''} ${breathing ? 'breathe' : ''}`} aria-hidden="true">
          <span className="cpr-rhythm-count">{!running ? '—' : breathing ? '2' : count}</span>
          <span className="cpr-rhythm-label">{!running ? 'Ready' : breathing ? 'Breaths' : mode === 'cpr' ? 'of 30' : 'Push'}</span>
        </div>
        <div className="cpr-rhythm-side">
          <div className="cpr-rhythm-prompt" aria-live="polite">{prompt}</div>
          <div className="cpr-rhythm-controls">
            <button className={`cpr-rhythm-start ${running ? 'stop' : ''}`} onClick={running ? stop : start}>
              {running ? 'STOP' : 'START'}
            </button>
            <button
              className="cpr-rhythm-sound"
              aria-pressed={sound}
              aria-label={sound ? 'Turn beep off' : 'Turn beep on'}
              onClick={() => setSound(!sound)}
            >
              {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
