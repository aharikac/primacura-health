import { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { 
  useAudioRecorder, 
  useAudioRecorderState, 
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Screen, Condition, ChatResponse } from './src/types';
import { HomeScreen } from './src/components/HomeScreen';
import { GuidesScreen } from './src/components/GuidesScreen';
import { ProtocolScreen } from './src/components/ProtocolScreen';
import { ClarificationScreen } from './src/components/ClarificationScreen';
import { DisclaimerScreen } from './src/components/DisclaimerScreen';

// Update to your production API URL
const BACKEND_URL = 'https://api.primacura.health'; 
const REQUEST_TIMEOUT_MS = 15_000;
const RECORDING_TIMEOUT_MS = 20_000;

const createSessionId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [query, setQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [sessionId, setSessionId] = useState(createSessionId());
  const [loading, setLoading] = useState(false);

  const [, setStatus] = useState('');
  const [, setTranscript] = useState('');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500); 

  const isRecording = recorderState?.isRecording ?? false;
  const currentDurationMs = recorderState?.durationMillis ?? 0;
  const recordingTimeLeft = Math.max(0, Math.ceil((RECORDING_TIMEOUT_MS - currentDurationMs) / 1000));

  useEffect(() => {
    if (isRecording && currentDurationMs >= RECORDING_TIMEOUT_MS) {
      stopRecordingLogic();
    }
  }, [isRecording, currentDurationMs]);

  const startRecording = async () => {
    setTranscript('');
    setStatus('Initializing microphone...');

    try {
      const permission = await requestRecordingPermissionsAsync();
      
      if (!permission.granted) {
        setStatus('Microphone permission denied.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      
      setStatus('Recording... Speak into your microphone!');
    } catch (err) {
      console.error('Mic access error:', err);
      setStatus('Could not access microphone.');
    }
  };

  const stopRecording = async () => {
    if (isRecording) {
      await stopRecordingLogic();
    }
  };

  const stopRecordingLogic = async () => {
    setLoading(true);
    setStatus('Processing audio payload...');
    
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      
      const uri = audioRecorder.uri;
      if (!uri) {
        setTranscript("Recording resulted in 0 bytes.");
        setStatus('');
        setLoading(false);
        return;
      }

      // Native upload bypasses React Native's fetch FormData bug
      const response = await FileSystem.uploadAsync(
        `${BACKEND_URL}/transcribe/`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: 1 as any,
          fieldName: 'audio_file',
          mimeType: 'audio/m4a',
          parameters: {
            session_id: sessionId,
          },
        }
      );

      if (response.status !== 200) throw new Error('Backend failed to respond');

      const matchingCondition = JSON.parse(response.body) as ChatResponse;
      handleNavigation(matchingCondition);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setTranscript('Network Error connecting to backend.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleEmergencySearch = async (searchQuery: string) => {
    if (isRecording) {
      await stopRecordingLogic();
    }
    
    if (!searchQuery.trim()) {
      setScreen('guides');
      return;
    }

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

      const matchingCondition = await response.json() as ChatResponse;
      handleNavigation(matchingCondition);
    } catch (error) {
      console.error('Error connecting to backend:', error);
      setClarificationMessage(
        'The local first-aid engine did not respond. Call 911 now for a life-threatening emergency, then try again when the engine is ready.',
      );
      setScreen('clarification');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleNavigation = (matchingCondition: ChatResponse) => {
    if (
      matchingCondition.status === 'clarification_needed' || 
      matchingCondition.status === 'age_clarification_needed' || 
      matchingCondition.status === 'unable_to_identify'
    ) {
      setClarificationMessage(matchingCondition.message);
      setQuery('');
      setScreen('clarification');
    } else if (Array.isArray(matchingCondition.steps) && matchingCondition.steps.length > 0) {
      setSelectedCondition({
        title: matchingCondition.title,
        description: '',
        steps: matchingCondition.steps,
      });
      setQuery('');
      setScreen('protocol');
    } else {
      setScreen('guides');
    }
  };

  const openProtocol = (condition: Condition) => {
    setSelectedCondition(condition);
    setScreen('protocol');
  };

  const backToHome = async () => {
    if (isRecording) {
      await stopRecordingLogic();
    }
    
    setQuery('');
    setClarificationMessage('');
    setSessionId(createSessionId());
    setScreen('home');
  };

  return (
    <SafeAreaProvider>
      {screen === 'home' && (
        <HomeScreen
          query={query}
          setQuery={setQuery}
          onSearch={() => handleEmergencySearch(query)}
          onOpenDisclaimer={() => setScreen('disclaimer')}
          onOpenGuides={() => {
            setQuery('');
            setScreen('guides');
          }}
          loading={loading}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          recordingTimeLeft={recordingTimeLeft}
        />
      )}
      {screen === 'guides' && (
        <GuidesScreen
          query={query}
          setQuery={setQuery}
          onBack={backToHome}
          onOpenProtocol={openProtocol}
        />
      )}
      {screen === 'protocol' && selectedCondition && (
        <ProtocolScreen
          condition={selectedCondition}
          onBack={() => setScreen('guides')}
        />
      )}
      {screen === 'clarification' && (
        <ClarificationScreen
          message={clarificationMessage}
          query={query}
          setQuery={setQuery}
          onSearch={() => handleEmergencySearch(query)}
          onBack={backToHome}
          loading={loading}
        />
      )}
      {screen === 'disclaimer' && (
        <DisclaimerScreen onBack={backToHome} />
      )}
    </SafeAreaProvider>
  );
}