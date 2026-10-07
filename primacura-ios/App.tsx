import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Screen, Condition, ChatResponse } from './src/types';
import { BACKEND_URL, REQUEST_TIMEOUT_MS } from './src/config';
import { HomeScreen } from './src/components/HomeScreen';
import { GuidesScreen } from './src/components/GuidesScreen';
import { ProtocolScreen } from './src/components/ProtocolScreen';
import { ClarificationScreen } from './src/components/ClarificationScreen';
import { DisclaimerScreen } from './src/components/DisclaimerScreen';
import { AboutScreen } from './src/components/AboutScreen';
import { ContactScreen } from './src/components/ContactScreen';
import { WHISPER_RECORDING_OPTIONS, loadWhisper, transcribeOnDevice } from './src/speech/onDeviceWhisper';

const RECORDING_TIMEOUT_MS = 20_000;

// iOS transcribes speech on the device (whisper.cpp); the audio never leaves
// the phone. Android cannot record WAV with expo-audio, so it still uploads
// the recording to the backend's /transcribe/ endpoint.
const ON_DEVICE_SPEECH = Platform.OS === 'ios';

const createSessionId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SPEECH_FAILED_MESSAGE =
  "I couldn't understand the recording on this device. Please type what is happening instead.\n\n" +
  'If it is life-threatening, call 911 now.';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [query, setQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  // Where the Back button on the steps screen goes: the question the person
  // answered (so they can pick a different option), or the guides list.
  const [protocolBack, setProtocolBack] = useState<'clarification' | 'guides'>('guides');
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);
  const [clarificationHints, setClarificationHints] = useState<string[]>([]);
  // Earlier questions in this conversation (oldest first), so Back on the
  // question screen steps back one question at a time before going home.
  const [clarificationHistory, setClarificationHistory] = useState<
    { message: string; options: string[]; hints: string[] }[]
  >([]);
  const [sessionId, setSessionId] = useState(createSessionId());
  const [loading, setLoading] = useState(false);

  const audioRecorder = useAudioRecorder(ON_DEVICE_SPEECH ? WHISPER_RECORDING_OPTIONS : RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);

  const isRecording = recorderState?.isRecording ?? false;
  const currentDurationMs = recorderState?.durationMillis ?? 0;
  const recordingTimeLeft = Math.max(0, Math.ceil((RECORDING_TIMEOUT_MS - currentDurationMs) / 1000));

  // Load the speech model in the background so the first "Speak" is quick.
  useEffect(() => {
    if (ON_DEVICE_SPEECH) {
      loadWhisper().catch((error) => console.warn('Speech model failed to load:', error));
    }
  }, []);

  useEffect(() => {
    if (isRecording && currentDurationMs >= RECORDING_TIMEOUT_MS) {
      stopRecordingLogic();
    }
  }, [isRecording, currentDurationMs]);

  const showMessage = (message: string, options: string[] = [], hints: string[] = []) => {
    if (screen === 'clarification') {
      setClarificationHistory((history) => [
        ...history,
        { message: clarificationMessage, options: clarificationOptions, hints: clarificationHints },
      ]);
    } else if (screen !== 'protocol') {
      setClarificationHistory([]);
    }
    setClarificationMessage(message);
    setClarificationOptions(options);
    setClarificationHints(hints);
    setQuery('');
    setScreen('clarification');
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showMessage('Microphone access is off. Please type what is happening, or allow microphone access in Settings.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      console.error('Mic access error:', err);
    }
  };

  const stopRecording = async () => {
    if (isRecording) {
      await stopRecordingLogic();
    }
  };

  const stopRecordingLogic = async () => {
    setLoading(true);
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });

      const uri = audioRecorder.uri;
      if (!uri) {
        showMessage(SPEECH_FAILED_MESSAGE);
        return;
      }

      if (ON_DEVICE_SPEECH) {
        let text = '';
        try {
          text = await transcribeOnDevice(uri);
        } catch (error) {
          console.error('On-device transcription failed:', error);
        } finally {
          // The recording has served its purpose; don't keep audio on disk.
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
        }
        if (!text) {
          showMessage(SPEECH_FAILED_MESSAGE);
          return;
        }
        setQuery(text);
        await sendQuery(text);
        return;
      }

      // Android: upload the audio for server-side transcription.
      const response = await FileSystem.uploadAsync(`${BACKEND_URL}/transcribe/`, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'audio_file',
        mimeType: 'audio/m4a',
        parameters: { session_id: sessionId },
      });
      if (response.status !== 200) throw new Error('Backend failed to respond');
      handleNavigation(JSON.parse(response.body) as ChatResponse);
    } catch (error) {
      console.error('Speech request failed:', error);
      showMessage(SPEECH_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  /** Send text to the backend and route to the result. */
  const sendQuery = async (searchQuery: string) => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${BACKEND_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, session_id: sessionId }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Backend failed to respond');
      handleNavigation((await response.json()) as ChatResponse);
    } catch (error) {
      console.error('Error connecting to backend:', error);
      showMessage(
        'The first-aid engine did not respond. Call 911 now for a life-threatening emergency, then try again, ' +
          'or browse the guides from the home screen.',
      );
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleEmergencySearch = async (searchQuery: string) => {
    if (isRecording) {
      await audioRecorder.stop();
    }
    if (!searchQuery.trim()) {
      setScreen('guides');
      return;
    }
    await sendQuery(searchQuery);
  };

  const handleNavigation = (matchingCondition: ChatResponse) => {
    if (
      matchingCondition.status === 'clarification_needed' ||
      matchingCondition.status === 'age_clarification_needed' ||
      matchingCondition.status === 'unable_to_identify'
    ) {
      showMessage(matchingCondition.message, matchingCondition.options ?? [], matchingCondition.option_hints ?? []);
    } else if (Array.isArray(matchingCondition.steps) && matchingCondition.steps.length > 0) {
      setSelectedCondition({
        title: matchingCondition.title,
        description: '',
        steps: matchingCondition.steps,
      });
      setProtocolBack(screen === 'clarification' && clarificationOptions.length > 0 ? 'clarification' : 'guides');
      setQuery('');
      setScreen('protocol');
    } else {
      setScreen('guides');
    }
  };

  const openProtocol = (condition: Condition) => {
    setSelectedCondition(condition);
    setProtocolBack('guides');
    setScreen('protocol');
  };

  const backToHome = async () => {
    if (isRecording) {
      await audioRecorder.stop();
    }
    setQuery('');
    setClarificationMessage('');
    setClarificationOptions([]);
    setClarificationHints([]);
    setClarificationHistory([]);
    setSessionId(createSessionId());
    setScreen('home');
  };

  const clarificationBack = () => {
    const previous = clarificationHistory[clarificationHistory.length - 1];
    if (!previous) {
      backToHome();
      return;
    }
    setClarificationHistory(clarificationHistory.slice(0, -1));
    setClarificationMessage(previous.message);
    setClarificationOptions(previous.options);
    setClarificationHints(previous.hints);
  };

  return (
    <SafeAreaProvider>
      {screen === 'home' && (
        <HomeScreen
          query={query}
          setQuery={setQuery}
          onSearch={() => handleEmergencySearch(query)}
          onOpenDisclaimer={() => setScreen('disclaimer')}
          onOpenAbout={() => setScreen('about')}
          onOpenContact={() => setScreen('contact')}
          onOpenGuides={() => {
            setQuery('');
            setScreen('guides');
          }}
          onQuickAction={(text) => {
            setQuery(text);
            handleEmergencySearch(text);
          }}
          loading={loading}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          recordingTimeLeft={recordingTimeLeft}
        />
      )}
      {screen === 'guides' && (
        <GuidesScreen query={query} setQuery={setQuery} onBack={backToHome} onOpenProtocol={openProtocol} />
      )}
      {screen === 'protocol' && selectedCondition && (
        <ProtocolScreen
          condition={selectedCondition}
          onBack={() => setScreen(protocolBack)}
          onDone={() => setScreen('guides')}
          backLabel={protocolBack === 'clarification' ? 'Options' : 'First-Aid Guides'}
        />
      )}
      {screen === 'clarification' && (
        <ClarificationScreen
          message={clarificationMessage}
          options={clarificationOptions}
          hints={clarificationHints}
          onSelectOption={(option) => handleEmergencySearch(option)}
          query={query}
          setQuery={setQuery}
          onSearch={() => handleEmergencySearch(query)}
          onBack={clarificationBack}
          backLabel={clarificationHistory.length > 0 ? 'Back' : 'Home'}
          loading={loading}
        />
      )}
      {screen === 'disclaimer' && <DisclaimerScreen onBack={backToHome} />}
      {screen === 'about' && <AboutScreen onBack={backToHome} />}
      {screen === 'contact' && <ContactScreen onBack={backToHome} />}
    </SafeAreaProvider>
  );
}
