import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Volume2, VolumeX } from 'lucide-react-native';

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

  const beat = useAudioPlayer(require('../../assets/sounds/cpr-beat.wav'));
  const beat5 = useAudioPlayer(require('../../assets/sounds/cpr-beat-5.wav'));
  const breaths = useAudioPlayer(require('../../assets/sounds/cpr-breaths.wav'));

  const play = (player: typeof beat) => {
    if (!soundRef.current) return;
    player.seekTo(0).catch(() => undefined);
    player.play();
  };

  const clearTimers = () => {
    timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); });
    timers.current = [];
  };

  const run = (m: Mode) => {
    clearTimers();
    let n = 0;
    setBreathLeft(0);
    const push = () => {
      n += 1;
      setCount(m === 'hands-only' ? ((n - 1) % 30) + 1 : n);
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.84, duration: 60, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
      play(n % 5 === 0 ? beat5 : beat);
      if (m === 'cpr' && n === 30) {
        clearTimers();
        let left = BREATH_MS / 1000;
        setBreathLeft(left);
        play(breaths);
        timers.current.push(setInterval(() => { left -= 1; setBreathLeft(Math.max(left, 0)); }, 1000));
        timers.current.push(setTimeout(() => run(m), BREATH_MS));
      }
    };
    push();
    timers.current.push(setInterval(push, BEAT_MS));
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
    const title = !running
      ? 'Push with the beat'
      : breathing
        ? `Give 2 breaths · ${breathLeft}s`
        : mode === 'cpr' ? `${count} of 30` : `Push · ${count}`;
    return (
      <View style={styles.bar} accessibilityLabel="CPR rhythm guide">
        <Animated.View style={[styles.barDot, { transform: [{ scale }] }, breathing && styles.pulseBreathe]}>
          <Text style={[styles.barDotText, !running && styles.barDotIdle]}>{!running ? '110' : breathing ? '2' : count}</Text>
        </Animated.View>
        <View style={styles.barText}>
          <Text style={styles.barTitle} accessibilityLiveRegion="polite">{title}</Text>
          {running ? (
            <Text style={styles.barSub}>{breathing ? 'Then back to pushes' : prompt}</Text>
          ) : (
            <Pressable onPress={() => changeMode(mode === 'cpr' ? 'hands-only' : 'cpr')} accessibilityRole="button">
              <Text style={[styles.barSub, styles.barLink]}>{mode === 'cpr' ? 'Switch to hands-only' : 'Switch to 30 : 2'}</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setSound(!sound)}
          style={styles.barSound}
          accessibilityRole="button"
          accessibilityLabel={sound ? 'Turn beep off' : 'Turn beep on'}
        >
          {sound ? <Volume2 size={18} color="#3f3f46" /> : <VolumeX size={18} color="#a1a1aa" />}
        </Pressable>
        <Pressable onPress={running ? stop : start} style={[styles.barStart, running && styles.stop]} accessibilityRole="button">
          <Text style={styles.barStartText}>{running ? 'Stop' : 'Start'}</Text>
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
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 16, backgroundColor: '#fff1f0', borderWidth: 1.5, borderColor: '#f5c2bd' },
  barDot: { width: 46, height: 46, borderRadius: 23, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  barDotText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  barDotIdle: { fontSize: 13 },
  barText: { flex: 1, gap: 1 },
  barTitle: { fontSize: 15, fontWeight: '900', color: '#050505' },
  barSub: { fontSize: 12, fontWeight: '700', color: '#9f1d15' },
  barLink: { textDecorationLine: 'underline' },
  barSound: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: '#f5c2bd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  barStart: { height: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  barStartText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
