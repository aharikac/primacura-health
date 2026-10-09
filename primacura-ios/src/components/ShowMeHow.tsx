import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { howTos } from '../data/howTo';
import { linkTitle } from './howToAge';

// "Show me how" under a guide step: one clear, full-width button that opens the
// matching How-To card. The card's name sits under the label.
export function ShowMeHow({ howToId, onOpen }: { howToId: string; onOpen: (id: string) => void }) {
  const card = howTos.find((h) => h.id === howToId);
  if (!card) return null;
  const title = linkTitle(card);
  return (
    <Pressable
      onPress={() => onOpen(card.id)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Show me how: ${title}`}
    >
      <View style={styles.play}>
        <Play size={13} color="#fff" fill="#fff" />
      </View>
      <View>
        <Text style={styles.label}>Show me how</Text>
        <Text style={styles.sub} numberOfLines={1}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d33b32',
    backgroundColor: '#fff',
  },
  pressed: { backgroundColor: '#fff1f0' },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#d33b32', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  label: { fontSize: 17, fontWeight: '900', color: '#991b1b' },
  sub: { fontSize: 12.5, fontWeight: '700', color: '#71717a' },
});
