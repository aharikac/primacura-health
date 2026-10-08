import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CirclePlay } from 'lucide-react-native';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { linkTitle } from './howToAge';

// "Show me how" chip under a guide step: opens the matching How-To card.
export function ShowMeHow({ howToId, onOpen }: { howToId: string; onOpen: (id: string) => void }) {
  const card = howTos.find((h) => h.id === howToId);
  if (!card) return null;
  const Icon = howToIcon(card.id);
  return (
    <Pressable
      onPress={() => onOpen(card.id)}
      style={({ pressed }) => [chipStyles.chip, chipStyles.howto, pressed && chipStyles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Show me how: ${linkTitle(card)}`}
    >
      <View style={[chipStyles.icon, chipStyles.iconRed]}>
        <Icon size={18} strokeWidth={2.4} color="#fff" />
      </View>
      <View style={chipStyles.text}>
        <View style={chipStyles.smallRow}>
          <CirclePlay size={11} strokeWidth={3} color="#b42318" />
          <Text style={chipStyles.small} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>SHOW ME HOW</Text>
        </View>
        <Text style={chipStyles.label} numberOfLines={2}>{linkTitle(card)}</Text>
      </View>
    </Pressable>
  );
}

// Shared with the "See picture" chip on the guide step screen.
export const chipStyles = StyleSheet.create({
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: '#e4e4e7', backgroundColor: '#fff' },
  howto: { flex: 1.5, borderColor: '#f5c2bd', backgroundColor: '#fff1ef' },
  pressed: { borderColor: '#d33b32' },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff1f0', alignItems: 'center', justifyContent: 'center' },
  iconRed: { backgroundColor: '#d33b32' },
  text: { flex: 1 },
  smallRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  small: { color: '#b42318', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  label: { color: '#050505', fontSize: 14, fontWeight: '800' },
});
