import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ScrollView, NativeScrollEvent, NativeSyntheticEvent, LayoutChangeEvent } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

// "More below" hint for a ScrollView: a soft fade at the bottom edge and a small
// pill that scrolls down when tapped. Hidden once you reach the end.
export function useMoreBelow(resetKey: unknown) {
  const ref = useRef<ScrollView>(null);
  const view = useRef({ height: 0, content: 0, y: 0 });
  const [more, setMore] = useState(false);
  const update = () => {
    const v = view.current;
    setMore(v.content - v.y - v.height > 12);
  };
  useEffect(() => {
    view.current.y = 0;
    ref.current?.scrollTo({ y: 0, animated: false });
    update();
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollProps = {
    ref,
    scrollEventThrottle: 32,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => { view.current.y = e.nativeEvent.contentOffset.y; update(); },
    onLayout: (e: LayoutChangeEvent) => { view.current.height = e.nativeEvent.layout.height; update(); },
    onContentSizeChange: (_: number, h: number) => { view.current.content = h; update(); },
  };
  const scrollDown = () => ref.current?.scrollTo({ y: view.current.y + view.current.height * 0.7, animated: true });
  return { more, scrollProps, scrollDown };
}

export function MoreBelow({ show, onPress }: { show: boolean; onPress: () => void }) {
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    const bounce = Animated.sequence([
      Animated.timing(nudge, { toValue: 4, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(nudge, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    Animated.sequence([bounce, bounce]).start();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  return (
    <>
      <View style={styles.fade} pointerEvents="none">
        {[0.15, 0.35, 0.6, 0.85, 1].map((o) => <View key={o} style={[styles.fadeBand, { opacity: o }]} />)}
      </View>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { transform: [{ translateY: nudge }] }]}>
        <TouchableOpacity style={styles.pill} onPress={onPress} accessibilityRole="button" accessibilityLabel="Scroll down for more">
          <Text style={styles.text}>More below</Text>
          <ChevronDown size={16} strokeWidth={2.8} color="#3f3f46" />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 },
  fadeBand: { flex: 1, backgroundColor: '#fff' },
  wrap: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  text: { fontSize: 14, fontWeight: '800', color: '#3f3f46' },
});
