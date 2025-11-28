import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { EmotionType } from "@/components/EmotionIndicator";
import { AgentType } from "@/components/AgentIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, LogOut } from "lucide-react";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
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

  const handleSendMessage = async (messageText: string) => {
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-primary glow-primary">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold gradient-emotion bg-clip-text text-transparent">
                TARA
              </h1>
              <p className="text-xs text-muted-foreground">Multi-Agent Emotion AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userName && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Hello, {userName}
              </span>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col gap-4 mb-24">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} {...msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
