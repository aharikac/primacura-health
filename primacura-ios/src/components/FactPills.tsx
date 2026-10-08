import { ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';

// Key-number pills on one line. Sized to fit every row on phones 320 pt wide and
// up; anything wider would scroll sideways instead of wrapping.
export function FactPills({ facts }: { facts: string[] }) {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  if (!facts.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, narrow && styles.rowNarrow]}
      style={styles.scroll}
    >
      {facts.map((f) => (
        <View key={f} style={[styles.pill, narrow && styles.pillNarrow]}>
          <Text style={[styles.text, narrow && styles.textNarrow]} numberOfLines={1}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  // flexGrow + center: centered when the pills fit, normal sideways scroll if they ever don't.
  row: { flexGrow: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  rowNarrow: { gap: 5 },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fff1f0', borderWidth: 1.5, borderColor: '#f5c2bd' },
  pillNarrow: { paddingVertical: 5, paddingHorizontal: 8 },
  text: { color: '#9f1d15', fontSize: 13, fontWeight: '800' },
  textNarrow: { fontSize: 12 },
});
