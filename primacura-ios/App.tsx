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
import { GuidesScreen, GuidesTab } from './src/components/GuidesScreen';
import { HowToScreen } from './src/components/HowToScreen';
import { AGE_HINTS, AGE_OPTIONS, cardForAge } from './src/components/howToAge';
import { howTos } from './src/data/howTo';
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

// Before a How-To card whose steps differ by age, ask who needs help
// ("Show me how" links to ask_age cards).
const LINK_AGE_MESSAGE = '**Who needs help?** Tap their age to see the right steps.';
type ClarificationState = { message: string; options: string[]; hints: string[]; history: { message: string; options: string[]; hints: string[] }[] };
// Where the age question came from (Back returns there), and the conversation's
// question it temporarily replaced (restored for Back -> Options on the steps).
type AgePick = { group: string; back: Screen; backLabel: string; saved?: ClarificationState };

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
  // Kept here (not in ProtocolScreen) so Back from "Show me how" returns to the same step.
  const [protocolStep, setProtocolStep] = useState(0);
  // The How-To card on screen and where its Back button goes.
  const [howToId, setHowToId] = useState<string | null>(null);
  const [howToBack, setHowToBack] = useState<{ screen: Screen; label: string }>({ screen: 'guides', label: 'Guides' });
  const [guidesTab, setGuidesTab] = useState<GuidesTab>('guides');
  const [agePick, setAgePick] = useState<AgePick | null>(null);
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

  const openHowTo = (id: string, back: { screen: Screen; label: string }) => {
    setHowToId(id);
    setHowToBack(back);
    setScreen('howto');
  };

  const askAge = (pick: AgePick, message: string) => {
    setAgePick({
      ...pick,
      saved: { message: clarificationMessage, options: clarificationOptions, hints: clarificationHints, history: clarificationHistory },
    });
    setClarificationHistory([]);
    setClarificationMessage(message);
    setClarificationOptions(AGE_OPTIONS);
    setClarificationHints(AGE_HINTS);
    setQuery('');
    setScreen('clarification');
  };


  // "Show me how" on a guide step: cards marked ask_age ask who needs help first.
  const openStepHowTo = (id: string) => {
    const card = howTos.find((h) => h.id === id);
    const stepLabel = `Step ${protocolStep + 1}`;
    if (card?.askAge && card.group) {
      askAge({ group: card.group, back: 'protocol', backLabel: stepLabel }, LINK_AGE_MESSAGE);
    } else {
      openHowTo(id, { screen: 'protocol', label: stepLabel });
    }
  };

  const showMessage = (message: string, options: string[] = [], hints: string[] = []) => {
    setAgePick(null);
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
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

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
        howTo: matchingCondition.step_howto,
        diagram: matchingCondition.step_diagram,
        rhythm: matchingCondition.step_rhythm,
        actions: matchingCondition.step_action,
        facts: matchingCondition.step_facts,
      });
      setProtocolStep(0);
      setProtocolBack(screen === 'clarification' && clarificationOptions.length > 0 ? 'clarification' : 'guides');
      setQuery('');
      setScreen('protocol');
    } else {
      setScreen('guides');
    }
  };

  const openProtocol = (condition: Condition) => {
    setSelectedCondition(condition);
    setProtocolStep(0);
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
    setAgePick(null);
    setGuidesTab('guides');
    setSessionId(createSessionId());
    setScreen('home');
  };

  const clarificationBack = () => {
    if (agePick && agePick.back !== 'home') {
      if (agePick.saved) {
        setClarificationMessage(agePick.saved.message);
        setClarificationOptions(agePick.saved.options);
        setClarificationHints(agePick.saved.hints);
        setClarificationHistory(agePick.saved.history);
      }
      setAgePick(null);
      setScreen(agePick.back);
      return;
    }
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
          tab={guidesTab}
          onTabChange={setGuidesTab}
          onBack={backToHome}
          onOpenProtocol={openProtocol}
          onOpenHowTo={(id) => openHowTo(id, { screen: 'guides', label: 'Guides' })}
        />
      )}
      {screen === 'protocol' && selectedCondition && (
        <ProtocolScreen
          condition={selectedCondition}
          stepIndex={protocolStep}
          onStepChange={setProtocolStep}
          onOpenHowTo={openStepHowTo}
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
          onSelectOption={(option) =>
            agePick
              ? openHowTo(cardForAge(agePick.group, option), { screen: 'clarification', label: 'Back' })
              : handleEmergencySearch(option)
          }
          query={query}
          setQuery={setQuery}
          onSearch={() => handleEmergencySearch(query)}
          onBack={clarificationBack}
          backLabel={agePick ? agePick.backLabel : clarificationHistory.length > 0 ? 'Back' : 'Home'}
          loading={loading}
        />
      )}
      {screen === 'howto' && howToId && (
        <HowToScreen howToId={howToId} onBack={() => setScreen(howToBack.screen)} backLabel={howToBack.label} />
      )}
      {screen === 'disclaimer' && <DisclaimerScreen onBack={backToHome} />}
      {screen === 'about' && <AboutScreen onBack={backToHome} />}
      {screen === 'contact' && <ContactScreen onBack={backToHome} />}
    </SafeAreaProvider>
  );
}
