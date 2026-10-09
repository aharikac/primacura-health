import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Music, Volume2, VolumeX } from 'lucide-react-native';

// CPR rhythm guide: a beat at 110 pushes a minute with a count to 30, then a
// "Give 2 breaths" pause (or non-stop in hands-only mode). Keeps the screen awake
// while running (no vibration).
const KEEP_AWAKE_TAG = 'cpr-rhythm';
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
  const compact = false;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [breathLeft, setBreathLeft] = useState(0);
  const [sound, setSound] = useState(true);
  const scale = useRef(new Animated.Value(1)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // Several players per sound, used in turn. A player that just finished sits at
  // its end, and play() right after an un-awaited seekTo(0) can be silently
  // skipped, so beats went missing and the count ran ahead of the sound. Each
  // beat now uses a rested player and starts only after its seek completes.
  const beatPool = [
    useAudioPlayer(require('../../assets/sounds/cpr-beat.wav')),
    useAudioPlayer(require('../../assets/sounds/cpr-beat.wav')),
    useAudioPlayer(require('../../assets/sounds/cpr-beat.wav')),
  ];
  const beat5Pool = [
    useAudioPlayer(require('../../assets/sounds/cpr-beat-5.wav')),
    useAudioPlayer(require('../../assets/sounds/cpr-beat-5.wav')),
  ];
  const breathsPool = [useAudioPlayer(require('../../assets/sounds/cpr-breaths.wav'))];
  const turn = useRef({ beat: 0, beat5: 0, breaths: 0 });

  const play = (kind: 'beat' | 'beat5' | 'breaths') => {
    if (!soundRef.current) return;
    const pool = kind === 'beat' ? beatPool : kind === 'beat5' ? beat5Pool : breathsPool;
    const player = pool[turn.current[kind] % pool.length];
    turn.current[kind] += 1;
    player.seekTo(0).then(() => player.play()).catch(() => player.play());
  };

  const clearTimers = () => {
    timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); });
    timers.current = [];
  };

  // Beats are timed against the clock (start + n × beat length), not by
  // chaining intervals, so the tempo stays at 110 a minute and the count, the
  // pulse and the sound always change on the same tick.
  const run = (m: Mode) => {
    clearTimers();
    let n = 0;
    const t0 = Date.now();
    setBreathLeft(0);
    const push = () => {
      n += 1;
      setCount(m === 'hands-only' ? ((n - 1) % 30) + 1 : n);
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.84, duration: 60, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
      play(n % 5 === 0 ? 'beat5' : 'beat');
      if (m === 'cpr' && n === 30) {
        let left = BREATH_MS / 1000;
        setBreathLeft(left);
        timers.current.push(setTimeout(() => play('breaths'), BEAT_MS));
        timers.current.push(setInterval(() => { left -= 1; setBreathLeft(Math.max(left, 0)); }, 1000));
        timers.current.push(setTimeout(() => run(m), BEAT_MS + BREATH_MS));
        return;
      }
      const next = t0 + n * BEAT_MS - Date.now();
      timers.current.push(setTimeout(push, Math.max(0, next)));
    };
    push();
  };

  const start = async () => {
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    setRunning(true);
    run(mode);
  };

  const stop = () => {
    clearTimers();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    setRunning(false);
    setCount(0);
    setBreathLeft(0);
  };

  useEffect(() => onRunningChange?.(running), [running]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    clearTimers();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
  }, []);

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
  const size = compact ? 84 : 112;

  if (variant === 'bar') {
    // Slim helper bar on guide steps. Idle: one quiet line + Start. Running: a
    // pulsing dot, the count, a small mode switch and Stop.
    const title = breathing
      ? `Give 2 breaths · ${breathLeft}s`
      : mode === 'cpr' ? `${count} of 30 · push` : `Push · ${count}`;
    return (
      <View style={[styles.bar, running && styles.barOn, breathing && styles.barBreathe]} accessibilityLabel="CPR rhythm guide">
        {running ? (
          <Animated.View style={[styles.barDot, { transform: [{ scale }] }, breathing && styles.pulseBreathe]} />
        ) : (
          <Music size={17} color="#52525b" strokeWidth={2.4} />
        )}
        {running ? (
          <Text style={[styles.barTitle, breathing && styles.barTitleBreathe]} accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{title}</Text>
        ) : (
          <View style={styles.barIdleBox}>
            <Text style={styles.barIdle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Push to the beat</Text>
            <Text style={styles.barMuted} numberOfLines={1}>110 pushes a minute</Text>
          </View>
        )}
        {running && !breathing ? (
          <Pressable onPress={() => changeMode(mode === 'cpr' ? 'hands-only' : 'cpr')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.barMode}>{mode === 'cpr' ? 'Hands-only' : '30 : 2'}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={running ? stop : start} style={[styles.barStart, running && styles.barStop]} accessibilityRole="button" accessibilityLabel={running ? 'Stop the beat' : 'Start the beat'}>
          <Text style={[styles.barStartText, running && styles.barStopText]}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.box, compact && styles.boxCompact]} accessibilityLabel="CPR rhythm guide">
      {!compact && <Text style={styles.title}>CPR RHYTHM GUIDE · 110 A MINUTE</Text>}
      <View style={styles.modes}>
        {(['cpr', 'hands-only'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => changeMode(m)}
            style={[styles.mode, mode === m && styles.modeActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m === 'cpr' ? '30 : 2 breaths' : 'Hands-only'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.main}>
        <Animated.View
          style={[styles.pulse, { width: size, height: size, borderRadius: size / 2, transform: [{ scale }] }, breathing && styles.pulseBreathe]}
        >
          <Text style={[styles.count, compact && styles.countCompact]}>{!running ? '—' : breathing ? '2' : count}</Text>
          <Text style={styles.countLabel}>{!running ? 'READY' : breathing ? 'BREATHS' : mode === 'cpr' ? 'OF 30' : 'PUSH'}</Text>
        </Animated.View>
        <View style={styles.side}>
          <Text style={[styles.prompt, compact && styles.promptCompact]} accessibilityLiveRegion="polite">{prompt}</Text>
          <View style={styles.controls}>
            <Pressable
              onPress={running ? stop : start}
              style={[styles.start, compact && styles.btnCompact, running && styles.stop]}
              accessibilityRole="button"
            >
              <Text style={styles.startText}>{running ? 'STOP' : 'START'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setSound(!sound)}
              style={[styles.sound, compact && styles.soundCompact]}
              accessibilityRole="button"
              accessibilityLabel={sound ? 'Turn beep off' : 'Turn beep on'}
            >
              {sound ? <Volume2 size={20} color="#3f3f46" /> : <VolumeX size={20} color="#a1a1aa" />}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const RED = '#d33b32';
const styles = StyleSheet.create({
  box: { gap: 12, padding: 14, borderWidth: 2, borderColor: '#f5c2bd', borderRadius: 16, backgroundColor: '#fffafa' },
  boxCompact: { padding: 10, gap: 8 },
  title: { color: RED, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  modes: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#f4f4f5', borderRadius: 10 },
  mode: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  modeActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  modeText: { fontSize: 13, fontWeight: '800', color: '#52525b' },
  modeTextActive: { color: RED },
  main: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pulse: { backgroundColor: RED, alignItems: 'center', justifyContent: 'center', shadowColor: RED, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  pulseBreathe: { backgroundColor: '#2563eb', shadowColor: '#2563eb' },
  count: { color: '#fff', fontSize: 40, fontWeight: '900' },
  countCompact: { fontSize: 30 },
  countLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  side: { flex: 1, gap: 10 },
  prompt: { fontSize: 16, fontWeight: '900', color: '#050505', minHeight: 40 },
  promptCompact: { fontSize: 15, minHeight: 0 },
  controls: { flexDirection: 'row', gap: 8 },
  start: { flex: 1, height: 48, borderRadius: 12, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  stop: { backgroundColor: '#050505' },
  btnCompact: { height: 42 },
  startText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  sound: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: '#e4e4e7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  soundCompact: { width: 42, height: 42 },
  bar: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 6, borderRadius: 12, backgroundColor: '#f4f4f5' },
  barOn: { backgroundColor: '#fff1f0' },
  barBreathe: { backgroundColor: '#eff6ff' },
  barDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: RED },
  barIdleBox: { flex: 1, minWidth: 0 },
  barIdle: { fontSize: 15, fontWeight: '800', color: '#3f3f46' },
  barMuted: { fontSize: 12, fontWeight: '600', color: '#71717a' },
  barTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: '#991b1b' },
  barTitleBreathe: { color: '#1d4ed8' },
  barMode: { fontSize: 13, fontWeight: '700', color: '#71717a', textDecorationLine: 'underline' },
  barStart: { height: 34, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1.5, borderColor: '#d4d4d8', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  barStartText: { fontSize: 14, fontWeight: '800', color: '#050505' },
  barStop: { backgroundColor: '#050505', borderColor: '#050505' },
  barStopText: { color: '#fff' },
});
