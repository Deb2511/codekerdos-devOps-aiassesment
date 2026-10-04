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
  const recognitionRef = useRef<any>(null);

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

    let interimTranscript = '';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      console.log('🎤 Recording started...');
    };

    recognition.onresult = (event: any) => {
      interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        const conf = Math.round(event.results[i][0].confidence * 100);

        if (isFinal) {
          setTranscript((prev) => {
            const cleaned = prev.split('|')[0] || '';
            return cleaned + (cleaned ? ' ' : '') + transcriptSegment;
          });
          setConfidence(conf);
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      if (interimTranscript) {
        setTranscript((prev) => {
          const finalPart = prev.split('|')[0] || '';
          return finalPart + (finalPart ? ' ' : '') + '| ' + interimTranscript;
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setTranscript((prev) => prev.split('|')[0]);
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = () => {
    const cleaned = transcript.split('|')[0];
    setTranscript(cleaned);
    setConfidence(100);
    recognitionRef.current?.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    const cleanTranscript = transcript.split('|')[0].trim();
    if (cleanTranscript.length > 20) {
      onAnswerReceived(cleanTranscript);
    } else {
      alert('Please provide a longer answer (minimum 20 characters)');
    }
  };

  const clearRecording = () => {
    setTranscript('');
    setConfidence(100);
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
