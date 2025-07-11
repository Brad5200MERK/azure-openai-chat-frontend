import React, { useState, useRef, useCallback } from 'react';
import { globalConfig } from '../config/globalConfig.js';
import iconMicOff from '../svg/mic-icon.svg?raw';
import iconMicOn from '../svg/mic-record-on-icon.svg?raw';

const VoiceInputButton = ({ onVoiceInput }) => {
  const recognitionSvc = window.SpeechRecognition || window.webkitSpeechRecognition;
  const [showVoiceInput] = useState(recognitionSvc !== undefined);
  const [enableVoiceListening, setEnableVoiceListening] = useState(false);
  const speechRecognitionRef = useRef(null);

  const initializeSpeechRecognition = useCallback(() => {
    if (showVoiceInput && recognitionSvc && !speechRecognitionRef.current) {
      speechRecognitionRef.current = new recognitionSvc();
      const recognition = speechRecognitionRef.current;

      recognition.continuous = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let input = '';
        for (const result of event.results) {
          input += `${result[0].transcript}`;
        }
        onVoiceInput(input);
      };

      recognition.addEventListener('error', (event) => {
        if (recognition) {
          recognition.stop();
          console.log(`Speech recognition error detected: ${event.error} - ${event.message}`);
        }
      });
    }
  }, [showVoiceInput, recognitionSvc, onVoiceInput]);

  const handleVoiceInput = useCallback((event) => {
    event.preventDefault();
    
    if (!speechRecognitionRef.current) {
      initializeSpeechRecognition();
    }

    if (speechRecognitionRef.current) {
      setEnableVoiceListening(prev => {
        const newState = !prev;
        if (newState) {
          speechRecognitionRef.current.start();
        } else {
          speechRecognitionRef.current.stop();
        }
        return newState;
      });
    }
  }, [initializeSpeechRecognition]);

  if (!showVoiceInput) {
    return null;
  }

  return (
    <button
      title={enableVoiceListening
        ? globalConfig.CHAT_VOICE_REC_BUTTON_LABEL_TEXT
        : globalConfig.CHAT_VOICE_BUTTON_LABEL_TEXT}
      className={`voice-input-button ${enableVoiceListening ? 'recording' : 'not-recording'}`}
      onClick={handleVoiceInput}
      type="button"
    >
      <span dangerouslySetInnerHTML={{ 
        __html: enableVoiceListening ? iconMicOn : iconMicOff 
      }} />
    </button>
  );
};

export default VoiceInputButton;