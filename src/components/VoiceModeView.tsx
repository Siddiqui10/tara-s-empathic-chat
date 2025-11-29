import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceModeViewProps {
  onTranscript: (text: string, playResponse: boolean) => void;
  userName: string;
}

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

export const VoiceModeView = ({ onTranscript, userName }: VoiceModeViewProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Changed to false for better control
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Set onstart handler (exists at runtime even if not in type)
      (recognitionRef.current as any).onstart = () => {
        console.log('Recognition started, microphone active');
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex)
          .map(result => result[0].transcript)
          .join('');
        
        setCurrentText(transcript);
        console.log('Speech recognized:', transcript, 'isFinal:', event.results[event.resultIndex].isFinal);
        
        // If final result, send to AI
        if (event.results[event.resultIndex].isFinal && transcript.trim()) {
          console.log('Sending to AI:', transcript);
          setIsListening(false);
          onTranscript(transcript, true);
          setCurrentText("");
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error, event);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice mode.",
            variant: "destructive",
          });
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('Recognition ended');
        if (isActive && !isSpeaking) {
          // Restart recognition if still active and not speaking
          setTimeout(() => {
            if (isActive && recognitionRef.current) {
              try {
                console.log('Restarting recognition...');
                recognitionRef.current.start();
              } catch (e) {
                console.error("Error restarting recognition:", e);
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isActive, isSpeaking, onTranscript, toast]);

  useEffect(() => {
    // Setup speech synthesis callbacks
    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);
    
    (window as any).taraVoiceSpeechStart = handleSpeechStart;
    (window as any).taraVoiceSpeechEnd = handleSpeechEnd;
    
    return () => {
      delete (window as any).taraVoiceSpeechStart;
      delete (window as any).taraVoiceSpeechEnd;
    };
  }, []);

  const startVoiceMode = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting voice mode...');
      recognitionRef.current.start();
      setIsActive(true);
      setIsListening(true);
      console.log('Voice mode started, listening...');
    } catch (error) {
      console.error("Error starting voice mode:", error);
      toast({
        title: "Voice Mode Error",
        description: "Could not start voice mode. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopVoiceMode = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentText("");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] relative">
      {/* Background ambient effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${
          isActive ? 'bg-primary/20 scale-150' : 'bg-primary/5 scale-100'
        }`}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Avatar with animation rings */}
        <div className="relative">
          {/* Outer rings - animated when listening or speaking */}
          {isListening && (
            <>
              <div className="absolute inset-0 -m-12 rounded-full border-2 border-primary/30 animate-ping"></div>
              <div className="absolute inset-0 -m-8 rounded-full border-2 border-primary/40 animate-pulse"></div>
            </>
          )}
          
          {isSpeaking && (
            <>
              <div className="absolute inset-0 -m-16 rounded-full border-4 border-accent/30 animate-pulse"></div>
              <div className="absolute inset-0 -m-12 rounded-full border-3 border-accent/40 animate-ping" style={{ animationDuration: '1.5s' }}></div>
              <div className="absolute inset-0 -m-8 rounded-full border-2 border-accent/50 animate-pulse" style={{ animationDuration: '0.8s' }}></div>
            </>
          )}

          {/* Center avatar */}
          <div className={`w-48 h-48 rounded-full gradient-primary flex items-center justify-center transition-all duration-500 ${
            isActive ? 'glow-primary scale-110' : 'scale-100'
          }`}>
            <div className="text-6xl font-display font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-bold gradient-primary bg-clip-text text-transparent">
            {!isActive && "Start Voice Chat"}
            {isActive && isListening && "I'm Listening..."}
            {isActive && isSpeaking && "TARA is Speaking..."}
            {isActive && !isListening && !isSpeaking && "Processing..."}
          </h2>
          
          {currentText && (
            <p className="text-lg text-muted-foreground animate-fade-in">
              "{currentText}"
            </p>
          )}
          
          {!isActive && (
            <p className="text-muted-foreground">
              Click the button below to start a live conversation with TARA
            </p>
          )}
        </div>

        {/* Control button */}
        <Button
          size="lg"
          onClick={isActive ? stopVoiceMode : startVoiceMode}
          className={`rounded-full px-8 py-6 text-lg transition-all duration-300 ${
            isActive 
              ? "bg-destructive hover:bg-destructive/90 glow-accent" 
              : "gradient-primary hover:scale-105 glow-primary"
          }`}
        >
          {isActive ? (
            <>
              <PhoneOff className="h-6 w-6 mr-2" />
              End Call
            </>
          ) : (
            <>
              <Phone className="h-6 w-6 mr-2" />
              Start Voice Chat
            </>
          )}
        </Button>

        {/* Hint */}
        {isActive && (
          <p className="text-sm text-muted-foreground animate-fade-in">
            Speak naturally - TARA will respond when you pause
          </p>
        )}
      </div>
    </div>
  );
};
