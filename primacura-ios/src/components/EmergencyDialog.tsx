import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Phone } from 'lucide-react-native'; /*[cite: 15]*/

export function EmergencyDialog({ onCancel }: { onCancel: () => void }) { /*[cite: 15]*/
  return (
    <Modal transparent={true} visible={true} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessible={true} accessibilityRole="alert">
          <View style={styles.heading}>
            <View style={styles.dot} />
            <Text style={styles.title}>CONFIRM EMERGENCY CALL</Text>
          </View>
          
          <Text style={styles.paragraph}>
            This will dial <Text style={styles.boldText}>911</Text> from your phone. Only use in a real emergency.
          </Text>

          {/* Replaces the <a href="tel:911"> tag with React Native Linking[cite: 15] */}
          <TouchableOpacity 
            style={styles.callButton} 
            onPress={() => Linking.openURL('tel:911')}
            accessibilityLabel="YES, CALL 911"
          >
            <Phone size={26} color="#fff" fill="#fff" />
            <Text style={styles.callButtonText}>YES, CALL 911</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel}
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ); /*[cite: 15]*/
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Replicates the dialog-backdrop[cite: 15]
    justifyContent: 'flex-end', // Pins the sheet to the bottom like the web version
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40, // Extra padding for safe area at the bottom of iPhones
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d33b32', // Red indicator dot
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#050505',
    letterSpacing: 1,
  },
  paragraph: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '800',
    color: '#050505',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d33b32',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 12,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '700',
  },
});