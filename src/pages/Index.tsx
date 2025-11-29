import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { EmotionType } from "@/components/EmotionIndicator";
import { AgentType } from "@/components/AgentIndicator";
import { VoiceChat } from "@/components/VoiceChat";
import { ModeToggle } from "@/components/ModeToggle";
import { VoiceModeView } from "@/components/VoiceModeView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, LogOut, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  message: string;
  isUser: boolean;
  emotion?: EmotionType;
  agent?: AgentType;
  timestamp: Date;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Preload voices for speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        // Fetch user profile
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      if (data) {
        setUserName(data.display_name);
        // Set welcome message with user's name
        setMessages([{
          id: "welcome",
          message: `Hello ${data.display_name}! I'm TARA, your emotion-aware AI assistant. I'm here to understand and respond to your feelings. How are you today?`,
          isUser: false,
          emotion: "calm",
          agent: "emotional",
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSendMessage = async (messageText: string, playResponse: boolean = false) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      message: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          userName: userName,
          messages: messages
            .filter((m) => !m.id.includes("welcome"))
            .map((m) => ({
              role: m.isUser ? "user" : "assistant",
              content: m.message,
            }))
            .concat([{ role: "user", content: messageText }]),
        },
      });

      if (error) throw error;

      // Safely parse the AI response with fallbacks
      const aiMessage: Message = {
        id: Date.now().toString() + "-ai",
        message: data?.message || "I apologize, but I encountered an issue processing your message. Please try again.",
        isUser: false,
        emotion: data?.emotion || "neutral",
        agent: data?.agent || "conversational",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      
      // Play audio response ONLY in voice mode when requested
      if (playResponse && aiMessage.message && window.speechSynthesis) {
        console.log('Playing voice response:', aiMessage.message.substring(0, 50));
        
        // Notify that speech is starting
        if ((window as any).taraVoiceSpeechStart) {
          (window as any).taraVoiceSpeechStart();
        }
        
        // Small delay to ensure voices are loaded
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(aiMessage.message);
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          const voices = window.speechSynthesis.getVoices();
          console.log('Available voices:', voices.length);
          
          const preferredVoice = voices.find(voice => 
            voice.name.includes('Google US English') ||
            voice.name.includes('Microsoft Zira') ||
            voice.name.includes('Samantha') ||
            voice.name.includes('Victoria') ||
            voice.lang.includes('en-US')
          );
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log('Using voice:', preferredVoice.name);
          }
          
          utterance.onstart = () => {
            console.log('Speech started');
          };
          
          utterance.onend = () => {
            console.log('Speech ended');
            if ((window as any).taraVoiceSpeechEnd) {
              (window as any).taraVoiceSpeechEnd();
            }
          };
          
          utterance.onerror = (event) => {
            console.error('Speech error:', event);
            if ((window as any).taraVoiceSpeechEnd) {
              (window as any).taraVoiceSpeechEnd();
            }
          };
          
          window.speechSynthesis.speak(utterance);
        }, 100);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      
      // Add error message to chat so it doesn't appear blank
      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        message: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
        isUser: false,
        emotion: "neutral",
        agent: "conversational",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: "Connection Error",
        description: error?.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-secondary relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md bg-background/70 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl gradient-primary glow-primary animate-glow relative">
              <Brain className="h-6 w-6 text-white" />
              <Sparkles className="h-3 w-3 text-white absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold gradient-primary bg-clip-text text-transparent">
                TARA
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Multi-Agent Emotion AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle mode={mode} onModeChange={setMode} />
            {userName && (
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline px-3 py-1.5 rounded-full bg-muted/50">
                Hello, {userName}
              </span>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-full"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {mode === "text" ? (
          <div className="flex flex-col gap-4 mb-32">
            {messages.map((msg, index) => (
              <div key={msg.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <ChatMessage {...msg} />
              </div>
            ))}
            {isLoading && <TypingIndicator />}
          </div>
        ) : (
          <VoiceModeView 
            onTranscript={handleSendMessage}
            userName={userName}
          />
        )}
      </main>

      {/* Input Area - Only show in text mode */}
      {mode === "text" && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-md bg-background/70 shadow-2xl z-20">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <ChatInput onSend={handleSendMessage} disabled={isLoading} />
              </div>
              <VoiceChat 
                onTranscript={handleSendMessage} 
                isEnabled={!isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
