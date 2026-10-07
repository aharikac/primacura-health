import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Send } from 'lucide-react-native';
import { BACKEND_URL, CONTACT_EMAIL, REQUEST_TIMEOUT_MS } from '../config';

const MAX_MESSAGE = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function ContactScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const isFormValid = name.trim().length > 0 && EMAIL_PATTERN.test(email.trim()) && message.trim().length > 0;
  const disabled = status === 'submitting' || !isFormValid;

  const handleSubmit = async () => {
    if (disabled) return;
    setStatus('submitting');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${BACKEND_URL}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Contact request failed: ${response.status}`);
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Contact submission failed:', error);
      setStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.title}>Contact Us</Text>
              <Text style={styles.subtitle}>Get in touch with the team.</Text>
            </View>
          </View>

          <View style={styles.emailCard}>
            <View style={styles.emailCardRow}>
              <Mail size={18} color="#d33b32" />
              <Text style={styles.emailCardLabel}>Reach us directly at:</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} accessibilityRole="link">
              <Text style={styles.emailLink}>{CONTACT_EMAIL}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor="#9ca3af"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            editable={status !== 'submitting'}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={status !== 'submitting'}
          />

          <View style={styles.messageLabelRow}>
            <Text style={[styles.label, styles.labelNoMargin]}>Message</Text>
            <Text style={[styles.counter, message.length >= MAX_MESSAGE && styles.counterFull]}>
              {message.length} / {MAX_MESSAGE}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder="How can we help you?"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={MAX_MESSAGE}
            textAlignVertical="top"
            editable={status !== 'submitting'}
          />

          <TouchableOpacity
            style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {status === 'submitting' ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitText}>Sending...</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text style={styles.submitText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>

          {status === 'success' && (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Text style={[styles.bannerText, styles.bannerTextSuccess]}>
                Thank you! Your message has been sent successfully.
              </Text>
            </View>
          )}
          {status === 'error' && (
            <View style={[styles.banner, styles.bannerError]}>
              <Text style={[styles.bannerText, styles.bannerTextError]}>
                Failed to send message. Please try again or email us directly.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  header: { marginBottom: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navIconCircle: {
    backgroundColor: '#f4f4f5', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  navBackText: { fontSize: 14, fontWeight: '700', color: '#050505' },
  innerBrand: { alignItems: 'flex-end' },
  innerBrandTitle: { fontSize: 15, fontWeight: '900', color: '#050505', letterSpacing: -0.5 },
  innerBrandSlogan: { fontSize: 9, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitleRow: { marginTop: 4 },
  title: { fontSize: 24, fontWeight: '900', color: '#050505' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  emailCard: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', padding: 16, borderRadius: 10, marginBottom: 24,
  },
  emailCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emailCardLabel: { fontSize: 14, color: '#4b5563' },
  emailLink: { color: '#d33b32', fontWeight: '700', fontSize: 15, marginTop: 4, marginLeft: 26 },
  label: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  labelNoMargin: { marginBottom: 0 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 16, color: '#050505', marginBottom: 16, backgroundColor: '#fff',
  },
  messageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  counter: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  counterFull: { color: '#d33b32' },
  messageInput: { minHeight: 140 },
  submitButton: {
    backgroundColor: '#050505', borderRadius: 10, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  banner: { marginTop: 16, padding: 12, borderRadius: 10 },
  bannerSuccess: { backgroundColor: '#d1fae5' },
  bannerError: { backgroundColor: '#fee2e2' },
  bannerText: { textAlign: 'center', fontWeight: '600', fontSize: 14 },
  bannerTextSuccess: { color: '#065f46' },
  bannerTextError: { color: '#991b1b' },
});
