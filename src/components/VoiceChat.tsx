import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  isEnabled: boolean;
}

export const VoiceChat = ({ onTranscript, isEnabled }: VoiceChatProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsSpeaking(false);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        if (data?.text) {
          onTranscript(data.text);
        }
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription Error",
        description: "Could not transcribe audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const playAudio = async (text: string) => {
    if (!audioEnabled || !text) return;

    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'nova' }
      });

      if (error) throw error;

      if (data?.audioContent && audioRef.current) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
      toast({
        title: "Audio Error",
        description: "Could not play audio response.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Expose playAudio to parent component
    (window as any).taraPlayAudio = playAudio;
    
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
