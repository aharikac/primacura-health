import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native'; 
import { optionIcon } from './optionIcons';

export function ClarificationScreen({
  message, 
  options = [],
  hints = [],
  onSelectOption,
  query, 
  setQuery, 
  onSearch, 
  onBack, 
  backLabel = 'Home',
  loading, 
}: {
  message: string; 
  options?: string[];
  hints?: string[];
  onSelectOption?: (option: string) => void;
  query: string; 
  setQuery: (value: string) => void; 
  onSearch: () => void; 
  onBack: () => void; 
  backLabel?: string;
  loading: boolean; 
}) {
  // Spacing between header, safety box and card scales with screen height:
  // compact on small phones (iPhone SE), roomier on tall ones (Pro Max).
  const { height } = useWindowDimensions();
  const space = Math.round(Math.min(32, Math.max(16, height * 0.03)));
  const inner = Math.round(space * 0.6);

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
          {/* Everything but the text box stays together at the top; the text
              box (when shown) sits at the bottom via space-between. */}
          <View>
          
          <View style={[styles.header, { marginBottom: space }]}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel={backLabel === 'Home' ? 'Back to home' : 'Back to the previous question'}>
                <View style={styles.navIconCircle}>
                  <ArrowLeft size={18} strokeWidth={2.8} color="#050505" />
                </View>
                <Text style={styles.navBackText}>{backLabel}</Text>
              </TouchableOpacity>
              
              <View style={styles.innerBrand}>
                <Text style={styles.innerBrandTitle}>PrimaCura</Text>
                <Text style={styles.innerBrandSlogan}>The First Care</Text>
              </View>
            </View>

            <View style={styles.headerTitleRow}>
              <Text style={styles.title}>Please clarify the situation</Text>
            </View>
          </View>

          <View style={[styles.safetyReminder, { marginBottom: space }]}>
            <Text style={styles.safetyReminderText}>
              <Text style={styles.safetyReminderBold}>CHECK SCENE FOR SAFETY. </Text>
              If it's life-threatening, call 911 immediately.
            </Text>
          </View>

          {/* With buttons, the question and its answers share one card so the
              question reads as the label for the buttons. Tapping sends the
              exact option label, which the backend always resolves. */}
          {options.length > 0 && onSelectOption ? (
            <View style={[styles.messageContainer, styles.choiceCard, { gap: inner + 4, paddingVertical: inner + 6 }]}>
              <View accessibilityRole="header">
                <MessageParagraphs text={message} centered />
              </View>
              <View style={[styles.optionsGroup, { gap: inner }]} accessibilityRole="radiogroup" accessibilityLabel={message.replace(/\*\*/g, '')}>
                {options.map((option, i) => {
                  const Icon = optionIcon(option);
                  const hint = hints[i];
                  return (
                    <Pressable
                      key={option}
                      style={({ pressed }) => [
                        styles.optionButton,
                        pressed && styles.optionButtonPressed,
                        loading && styles.optionButtonDisabled,
                      ]}
                      onPress={() => onSelectOption(option)}
                      disabled={loading}
                      accessibilityRole="button"
                      accessibilityLabel={hint ? `${option}. ${hint}` : option}
                    >
                      {({ pressed }) => (
                        <>
                          <View style={[styles.optionIcon, pressed && styles.optionIconPressed]}>
                            <Icon size={22} strokeWidth={2.4} color={pressed ? '#fff' : '#d33b32'} />
                          </View>
                          <View style={styles.optionText}>
                            <Text style={[styles.optionButtonText, pressed && styles.optionTextPressed]}>{option}</Text>
                            {hint ? (
                              <Text style={[styles.optionHint, pressed && styles.optionHintPressed]}>{hint}</Text>
                            ) : null}
                          </View>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : message ? (
            <View style={styles.messageContainer}>
              <MessageParagraphs text={message} />
            </View>
          ) : null}

          </View>

          {/* The text box only appears when we need the person to type: with
              buttons on screen, "None of these" is the way to describe instead. */}
          {options.length === 0 && (
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
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  ); 
}

// Converts backend markdown (**bold** and \n\n) into styled paragraphs.
const MessageParagraphs = ({ text, centered = false }: { text: string; centered?: boolean }) => (
  <>
    {text.split('\n\n').map((paragraph, pIndex) => (
      <Text key={pIndex} style={[styles.messageParagraph, centered && styles.centered]}>
        {paragraph.split(/(\*\*.*?\*\*)/).map((part, partIndex) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <Text key={partIndex} style={styles.messageHighlight}>
              {part.slice(2, -2)}
            </Text>
          ) : (
            <Text key={partIndex}>{part}</Text>
          ),
        )}
      </Text>
    ))}
  </>
);

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
  // Question + its buttons in one card (see messageContainer).
  choiceCard: {
    gap: 12,
  },
  centered: {
    textAlign: 'center',
  },
  optionsGroup: {
    gap: 10,
  },
  optionButton: {
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d33b32',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionHint: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: '#52525b',
  },
  optionButtonPressed: {
    backgroundColor: '#d33b32',
  },
  optionIconPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionTextPressed: {
    color: '#fff',
  },
  optionHintPressed: {
    color: '#ffe4e2',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    fontSize: 15,
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
    maxHeight: 120, // longer text scrolls inside the box
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