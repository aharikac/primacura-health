import { useEffect, useRef, useState } from 'react';
import { Screen, Condition, ChatResponse } from './types';
import { HomeScreen } from './components/HomeScreen';
import { GuidesScreen, GuidesTab } from './components/GuidesScreen';
import { HowToScreen } from './components/HowToScreen';
import { AGE_HINTS, AGE_OPTIONS, cardForAge } from './components/howToAge';
import { howTos } from './data/howTo';
import { ProtocolScreen } from './components/ProtocolScreen';
import { ClarificationScreen } from './components/ClarificationScreen';
import { DisclaimerScreen } from './components/DisclaimerScreen';
import { AboutScreen } from './components/AboutScreen';
import { ContactScreen } from './components/ContactScreen';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const REQUEST_TIMEOUT_MS = 15_000;
const RECORDING_TIMEOUT_MS = 20_000;

// Before a How-To card whose steps differ by age, ask who needs help:
// home quick actions (CPR, choking) and "Show me how" links to ask_age cards.
type QuickAction = 'choking' | 'cpr';
const QUICK_MESSAGES: Record<QuickAction, string> = {
  cpr: '**Who needs CPR?** Tap their age to see how to do it.',
  choking: '**Who is choking?** Tap their age to see what to do.',
};
const LINK_AGE_MESSAGE = '**Who needs help?** Tap their age to see the right steps.';
// Where the age question came from, so Back from it returns there.
type ClarificationState = { message: string; options: string[]; hints: string[]; history: { message: string; options: string[]; hints: string[] }[] };
type AgePick = { group: string; back: Screen; backLabel: string; saved?: ClarificationState };

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function App() {
  const [screen, setScreen] = useState<Screen | 'about' | 'contact'>('home'); // Explicitly adding 'about' and 'contact' to type safety
  const [query, setQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  // Where the Back button on the steps screen goes: the question the person
  // answered (so they can pick a different option), or the guides list.
  const [protocolBack, setProtocolBack] = useState<Screen>('guides');
  // Kept here (not in ProtocolScreen) so Back from "Show me how" returns to the same step.
  const [protocolStep, setProtocolStep] = useState(0);
  // The How-To card on screen and where its Back button goes.
  const [howToId, setHowToId] = useState<string | null>(null);
  const [howToBack, setHowToBack] = useState<{ screen: Screen; label: string }>({ screen: 'guides', label: 'Guides' });
  const [guidesTab, setGuidesTab] = useState<GuidesTab>('guides');
  const [agePick, setAgePick] = useState<AgePick | null>(null);

  const openHowTo = (id: string, back: { screen: Screen; label: string }) => {
    setHowToId(id);
    setHowToBack(back);
    setScreen('howto');
  };

  const askAge = (pick: AgePick, message: string) => {
    // Keep the conversation's question so Back -> Options on the steps still shows it.
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

  const startQuickAction = (kind: QuickAction) =>
    askAge({ group: kind, back: 'home', backLabel: 'Home' }, QUICK_MESSAGES[kind]);

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
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);
  const [clarificationHints, setClarificationHints] = useState<string[]>([]);
  // Earlier questions in this conversation (oldest first), so Back on the
  // question screen steps back one question at a time before going home.
  const [clarificationHistory, setClarificationHistory] = useState<
    { message: string; options: string[]; hints: string[] }[]
  >([]);

  const showClarification = (response: ChatResponse) => {
    setAgePick(null);
    if (screen === 'clarification') {
      setClarificationHistory((history) => [
        ...history,
        { message: clarificationMessage, options: clarificationOptions, hints: clarificationHints },
      ]);
    } else if (screen !== 'protocol') {
      setClarificationHistory([]);
    }
    setClarificationMessage(response.message);
    setClarificationOptions(response.options ?? []);
    setClarificationHints(response.option_hints ?? []);
    setQuery('');
    setScreen('clarification');
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
  const [sessionId, setSessionId] = useState(createSessionId);
  const [loading, setLoading] = useState(false);

  // Speech Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [, setStatus] = useState('');
  const [, setTranscript] = useState('');

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const recordingTimeoutRef = useRef<number | null>(null);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(RECORDING_TIMEOUT_MS / 1000);
  const recordingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchMicrophones = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        setMics(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedMic(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };

    fetchMicrophones();
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setTranscript('');
    setStatus('Initializing microphone...');

    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setLoading(true);
        setStatus('Processing audio payload...');

        if (recordingTimeoutRef.current) {
          window.clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        if (recordingIntervalRef.current) {
          window.clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        const recordedMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        
        if (audioBlob.size === 0) {
          setTranscript("Recording resulted in 0 bytes. Check microphone permissions.");
          setStatus('');
          return;
        }

        const formData = new FormData();
        const fileExtension = recordedMimeType.includes('mp4') ? 'mp4' : 'webm';
        formData.append('audio_file', audioBlob, `recording.${fileExtension}`);
        formData.append('session_id', sessionId);

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        
        try {
          const response = await fetch(`${BACKEND_URL}/transcribe/`, {
            body: formData,
            method: 'POST',
            signal: controller.signal
          });

          if (!response.ok) throw new Error('Backend failed to respond');

          const matchingCondition = await response.json() as ChatResponse;

          if (matchingCondition.status === 'clarification_needed' || matchingCondition.status === 'age_clarification_needed' || matchingCondition.status === 'unable_to_identify') {
            showClarification(matchingCondition);
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
        } catch (error) {
          console.error('Upload failed:', error);
          setTranscript('Network Error connecting to backend.');
        } finally {
          window.clearTimeout(timeoutId);
          if (recordingIntervalRef.current) {
            window.clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          setLoading(false);
          setStatus('');
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250); 
      setIsRecording(true);
      setStatus('Recording... Speak into your microphone!');

      recordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, RECORDING_TIMEOUT_MS);

      setRecordingTimeLeft(RECORDING_TIMEOUT_MS / 1000);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            window.clearInterval(recordingIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      setStatus('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };
  
  const handleEmergencySearch = async (searchQuery: string) => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (!searchQuery.trim()) {
      setScreen('guides');
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${BACKEND_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, session_id: sessionId }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Backend failed to respond');

      const matchingCondition = await response.json() as ChatResponse;

      if (matchingCondition.status === 'clarification_needed' || matchingCondition.status === 'age_clarification_needed' || matchingCondition.status === 'unable_to_identify') {
        showClarification(matchingCondition);
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
    } catch (error) {
      console.error('Error connecting to backend:', error);
      setClarificationOptions([]);
      setClarificationHints([]);
      setClarificationMessage(
        'The local first-aid engine did not respond. Call 911 now for a life-threatening emergency, then try again when the engine is ready.',
      );
      setScreen('clarification');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const openProtocol = (condition: Condition) => {
    setSelectedCondition(condition);
    setProtocolStep(0);
    setProtocolBack('guides');
    setScreen('protocol');
  };

  const backToHome = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
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

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {screen === 'home' && (
          <HomeScreen
            query={query}
            setQuery={setQuery}
            onSearch={(overrideQuery?: string) => handleEmergencySearch(typeof overrideQuery === 'string' ? overrideQuery : query)}
            onOpenAbout={() => setScreen('about' as Screen)}
            onOpenContact={() => setScreen('contact' as Screen)}
            onOpenDisclaimer={() => setScreen('disclaimer' as Screen)}
            onOpenGuides={() => {
              setQuery('');
              setScreen('guides');
            }}
            onQuickAction={startQuickAction}
            loading={loading}
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            mics={mics}
            selectedMic={selectedMic}
            setSelectedMic={setSelectedMic}
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
            onSelectOption={(option: string) =>
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
        {screen === 'disclaimer' && (
          <DisclaimerScreen onBack={backToHome} />
        )}
        {screen === 'about' && (
          <AboutScreen onBack={backToHome} />
        )}
        {screen === 'contact' && (
          <ContactScreen onBack={backToHome} />
        )}
      </div>
    </div>
  );
}