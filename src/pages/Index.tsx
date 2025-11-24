import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { EmotionType } from "@/components/EmotionIndicator";
import { AgentType } from "@/components/AgentIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain } from "lucide-react";

interface Message {
  id: string;
  message: string;
  isUser: boolean;
  emotion?: EmotionType;
  agent?: AgentType;
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      message: "Hello! I'm TARA, your emotion-aware AI assistant. I'm here to understand and respond to your feelings. How are you today?",
      isUser: false,
      emotion: "calm",
      agent: "emotional",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

      const aiMessage: Message = {
        id: Date.now().toString() + "-ai",
        message: data.message,
        isUser: false,
        emotion: data.emotion,
        agent: data.agent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
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
          <ThemeToggle />
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
