import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { diagrams } from '../data/diagrams';

// A step diagram (SVG generated from primacura-backend/data/diagrams).
export function StepDiagram({ id }: { id: string }) {
  const d = diagrams[id];
  if (!d) return null;
  return (
    <View style={styles.frame} accessible accessibilityRole="image" accessibilityLabel={d.alt}>
      <View style={{ width: '100%', aspectRatio: d.aspect }}>
        <SvgXml xml={d.svg} width="100%" height="100%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e4e4e7',
    borderRadius: 12,
  },
});
