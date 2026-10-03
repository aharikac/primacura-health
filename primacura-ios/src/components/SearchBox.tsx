import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Search } from 'lucide-react-native'; /*[cite: 14]*/

export function SearchBox({
  value,
  onChange,
  home = false, /*[cite: 14]*/
  onSearch,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  home?: boolean;
  onSearch?: () => void;
  loading?: boolean;
}) {
  if (home) {
    return (
      <View style={styles.homeContainer}>
        <TextInput
          style={styles.textArea}
          value={value}
          onChangeText={onChange} /*[cite: 14]*/
          placeholder="Type the situation in detail..." /*[cite: 14]*/
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Type the situation in detail..." /*[cite: 14]*/
          multiline={true}
          numberOfLines={5} /*[cite: 14]*/
          editable={!loading} /*[cite: 14]*/
          textAlignVertical="top" 
        />
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={onSearch} 
          disabled={loading} /*[cite: 14]*/
          accessibilityLabel="Get help" /*[cite: 14]*/
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" /> /*[cite: 14]*/
          ) : (
            <Search size={24} strokeWidth={2.8} color="#fff" /> /*[cite: 14]*/
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      <Search size={24} strokeWidth={2.8} color="#9ca3af" /> 
      <TextInput
        style={styles.inlineInput}
        value={value}
        onChangeText={onChange} /*[cite: 14]*/
        placeholder="Search conditions..." /*[cite: 14]*/
        placeholderTextColor="#9ca3af"
        accessibilityLabel="Search conditions" /*[cite: 14]*/
        editable={!loading}
      />
    </View>
  ); /*[cite: 14]*/
}

const styles = StyleSheet.create({
  homeContainer: {
    width: '100%',
    backgroundColor: '#f4f4f5',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    marginBottom: 24,
  },
  textArea: {
    flex: 1,
    minHeight: 100, 
    fontSize: 16,
    color: '#050505',
    paddingRight: 12,
    paddingTop: 8,
  },
  submitButton: {
    backgroundColor: '#050505',
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    width: '100%',
  },
  inlineInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#050505',
  },
});