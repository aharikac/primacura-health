import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native'; 

export function ClarificationScreen({
  message, 
  query, 
  setQuery, 
  onSearch, 
  onBack, 
  loading, 
}: {
  message: string; 
  query: string; 
  setQuery: (value: string) => void; 
  onSearch: () => void; 
  onBack: () => void; 
  loading: boolean; 
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel="Back to home">
                <View style={styles.navIconCircle}>
                  <ArrowLeft size={18} strokeWidth={2.8} color="#050505" />
                </View>
                <Text style={styles.navBackText}>Home</Text>
              </TouchableOpacity>
              
              <View style={styles.innerBrand}>
                <Text style={styles.innerBrandTitle}>PrimaCura</Text>
                <Text style={styles.innerBrandSlogan}>The First Care</Text>
              </View>
            </View>

            <View style={styles.headerTitleRow}>
              <Text style={styles.eyebrow}>MORE INFO NEEDED</Text>
              <Text style={styles.title}>Please clarify the situation</Text>
            </View>
          </View>

          <View style={styles.safetyReminder}>
            <Text style={styles.safetyReminderText}>
              <Text style={styles.safetyReminderBold}>CHECK SCENE FOR SAFETY. </Text>
              If it's life-threatening, call 911 immediately.
            </Text>
          </View>

          <FormattedMessage text={message} />

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput} 
              value={query} 
              onChangeText={setQuery} 
              placeholder={"Type clarification in\ndetail..."} 
              placeholderTextColor="#9ca3af" 
              onSubmitEditing={onSearch} 
              returnKeyType="send" 
              multiline={true}
              blurOnSubmit={true}
              editable={!loading} 
            />
            <TouchableOpacity style={styles.searchButton} onPress={onSearch} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Search color="#fff" size={22} />}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  ); 
}

const FormattedMessage = ({ text }: { text: string }) => { 
  if (!text) return null; 
  
  return (
    <View style={styles.messageContainer}>
      {text.split('\n\n').map((paragraph, pIndex) => ( 
        <Text key={pIndex} style={styles.messageParagraph}>
          {paragraph.split(/(\*\*.*?\*\*)/).map((part, partIndex) => { 
            if (part.startsWith('**') && part.endsWith('**')) { 
              return (
                <Text key={partIndex} style={styles.messageHighlight}>
                  {part.slice(2, -2)}
                </Text>
              ); 
            }
            return <Text key={partIndex}>{part}</Text>; 
          })}
        </Text>
      ))}
    </View>
  ); 
};

const styles = StyleSheet.create({ 
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff', 
  }, 
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 20, 
    paddingTop: 8, 
    paddingBottom: 24, 
    justifyContent: 'space-between',
  }, 
  header: { 
    marginBottom: 10, 
  }, 
  headerTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12, 
  }, 
  navBackBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
  }, 
  navIconCircle: { 
    backgroundColor: '#f4f4f5', 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
  }, 
  navBackText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#050505', 
  }, 
  innerBrand: { 
    alignItems: 'flex-end', 
  }, 
  innerBrandTitle: { 
    fontSize: 15, 
    fontWeight: '900', 
    color: '#050505', 
    letterSpacing: -0.5, 
  }, 
  innerBrandSlogan: { 
    fontSize: 9, 
    fontWeight: '600', 
    color: '#6b7280', 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
  }, 
  headerTitleRow: { 
    marginTop: 4, 
  }, 
  eyebrow: { 
    color: '#d33b32', 
    fontSize: 12, 
    fontWeight: '800', 
    letterSpacing: 1.5, 
    marginBottom: 4, 
  }, 
  title: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#050505', 
    lineHeight: 26, 
  }, 
  safetyReminder: { 
    backgroundColor: '#fee2e2', 
    padding: 10, 
    borderRadius: 10, 
    marginBottom: 12, 
  }, 
  safetyReminderText: { 
    color: '#991b1b', 
    fontSize: 13, 
    lineHeight: 18, 
  }, 
  safetyReminderBold: { 
    fontWeight: '800', 
  }, 
  messageContainer: { 
    flexGrow: 1, 
    marginBottom: 12, 
    backgroundColor: '#fafafa', 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e4e4e7',
    overflow: 'hidden',
  }, 
  messageParagraph: { 
    fontSize: 14, 
    lineHeight: 20, 
    color: '#374151', 
    marginBottom: 6, 
  }, 
  messageHighlight: { 
    fontWeight: '800', 
    color: '#050505', 
  }, 
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'stretch',
    gap: 8, 
    flexShrink: 0, 
  }, 
  searchInput: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15, 
    fontWeight: '500', 
    color: '#050505', 
    minHeight: 72, 
    borderWidth: 1,
    borderColor: '#e4e4e7',
    textAlignVertical: 'top',
  }, 
  searchButton: { 
    backgroundColor: '#050505', 
    borderRadius: 12, 
    width: 56, 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: 72, 
  }, 
});