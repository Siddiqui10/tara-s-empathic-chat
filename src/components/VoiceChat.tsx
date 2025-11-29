import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  isEnabled: boolean;
}

// Browser Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const VoiceChat = ({ onTranscript, isEnabled }: VoiceChatProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not recognize speech. Please try again.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [onTranscript, toast]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast({
        title: "Voice Recognition Error",
        description: "Could not start voice recognition. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      setIsRecording(false);
    }
  };

  const playAudio = (text: string) => {
    if (!audioEnabled || !text || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings for natural speech
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a pleasant female voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google US English') ||
      voice.name.includes('Microsoft Zira') ||
      voice.name.includes('Samantha') ||
      voice.name.includes('Victoria') ||
      voice.name.toLowerCase().includes('female')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Expose playAudio to parent component
    (window as any).taraPlayAudio = playAudio;
    
    // Preload voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      // Some browsers need this event to load voices
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    
    return () => {
      delete (window as any).taraPlayAudio;
    };
  }, [audioEnabled]);

  if (!isEnabled) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isRecording ? "destructive" : "secondary"}
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        className={`rounded-full transition-all duration-300 ${
          isRecording ? 'animate-pulse-subtle glow-accent' : 'hover:glow-primary'
        }`}
        title={isRecording ? "Stop recording" : "Start voice input"}
      >
        {isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant={audioEnabled ? "secondary" : "ghost"}
        size="icon"
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="rounded-full hover:glow-primary transition-all duration-300"
        title={audioEnabled ? "Mute voice output" : "Enable voice output"}
      >
        {audioEnabled ? (
          <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse-subtle' : ''}`} />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};
