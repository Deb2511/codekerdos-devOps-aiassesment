import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';

interface VoiceRecorderProps {
  onAnswerReceived: (text: string) => void;
  isActive: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAnswerReceived, isActive }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(100);
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(true);
  const [, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupportedBrowser(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setIsListening(false);
      setTranscript('Listening... speak now');
      finalTranscriptRef.current = '';
      console.log('🎤 Recording started...');

      listeningTimeoutRef.current = setTimeout(() => {
        setIsListening(true);
        setTranscript('Listening... speak now (no speech detected yet)');
      }, 2000);
    };

    recognition.onaudiostart = () => {
      console.log('🎙️ Audio input started');
    };

    recognition.onsoundstart = () => {
      console.log('🔊 Sound detected');
      setIsListening(true);
      setTranscript('Processing... speak more if needed');
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        const conf = Math.round(event.results[i][0].confidence * 100);

        if (isFinal) {
          finalTranscriptRef.current += transcriptSegment + ' ';
          setConfidence(conf);
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      const displayText = finalTranscriptRef.current.trim() + (interimTranscript ? ' | ' + interimTranscript : '');
      setTranscript(displayText || 'Listening...');
      console.log('📝 Transcript:', displayText);
    };

    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        console.warn('⚠️ No speech detected. Make sure:');
        console.warn('  1. Microphone is connected and enabled');
        console.warn('  2. Browser has microphone permission');
        console.warn('  3. Speak clearly and loud enough');
        console.warn('  4. Check if microphone is muted');

        setTranscript('No speech detected. Please check:\n1. Microphone is enabled\n2. You have browser permission\n3. Speak clearly and louder');
      } else {
        alert('Speech recognition error: ' + event.error);
      }

      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log('🛑 Recording ended');
      setIsRecording(false);
      setIsListening(false);
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
      setTranscript(finalTranscriptRef.current.trim());
    };

    recognitionRef.current = recognition;

    return () => {
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    };
  }, []);

  const startRecording = () => {
    try {
      setTranscript('');
      setConfidence(100);
      setIsListening(false);
      finalTranscriptRef.current = '';

      if (!recognitionRef.current) {
        alert('Speech Recognition not initialized. Please refresh the page.');
        return;
      }

      recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current?.start();
      }, 100);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
      const cleanTranscript = finalTranscriptRef.current.trim();
      console.log('🛑 Stop recording. Final transcript:', cleanTranscript, 'Length:', cleanTranscript.length);

      if (cleanTranscript.length > 20) {
        onAnswerReceived(cleanTranscript);
      } else {
        alert('Please provide a longer answer (minimum 20 characters). You said: "' + cleanTranscript + '"');
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const clearRecording = () => {
    setTranscript('');
    setConfidence(100);
    setIsListening(false);
    finalTranscriptRef.current = '';
  };

  if (!isSupportedBrowser) {
    return (
      <div className="voice-recorder">
        <div className="browser-not-supported">
          <h3>🎤 Voice Mode Not Supported</h3>
          <p>Your browser doesn't support speech recognition.</p>
          <p>Supported browsers: Chrome, Edge, Safari (iOS 14.5+), Opera</p>
          <p>Please use text mode instead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-recorder">
      <div className="recorder-info">
        <h3>🎤 Voice Answer Mode</h3>
        <p>Speak your answer naturally. The system will transcribe in real-time.</p>
      </div>

      <div className={`transcript-display ${isRecording ? 'recording' : ''}`}>
        <div className="transcript-content">
          {transcript || 'Click "Start Recording" and speak your answer...'}
        </div>
        {isRecording && <div className="recording-indicator">🔴 Recording...</div>}
        {confidence < 100 && !isRecording && (
          <div className="confidence-badge">Confidence: {confidence}%</div>
        )}
      </div>

      <div className="recorder-controls">
        {!isRecording ? (
          <button className="btn btn-voice-start" onClick={startRecording} disabled={!isActive}>
            🎤 Start Recording
          </button>
        ) : (
          <button className="btn btn-voice-stop" onClick={stopRecording}>
            ⏹️ Stop Recording
          </button>
        )}
        <button className="btn btn-voice-clear" onClick={clearRecording} disabled={isRecording || !transcript}>
          🗑️ Clear
        </button>
      </div>

      <div className="recorder-tips">
        <h4>💡 Tips:</h4>
        <ul>
          <li>Speak clearly and at a normal pace</li>
          <li>Pause briefly between sentences</li>
          <li>Minimum 20 characters required</li>
          <li>Live transcript appears as you speak</li>
          <li>You can edit the transcript if needed</li>
        </ul>
      </div>

      <div className="privacy-notice">
        <h4>🔒 Privacy Notice</h4>
        <p>
          Your voice is encrypted and sent to Google's servers for transcription.
          Audio is not stored by CodeKerdos.
        </p>
      </div>
    </div>
  );
};
