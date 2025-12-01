import { cn } from "@/lib/utils";
import { EmotionIndicator, EmotionType } from "./EmotionIndicator";
import { AgentIndicator, AgentType } from "./AgentIndicator";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  emotion?: EmotionType;
  agent?: AgentType;
  timestamp: Date;
}

export const ChatMessage = ({ message, isUser, emotion, agent, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full animate-slide-up",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-300",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card",
          !isUser && emotion === "happy" && "glow-happy",
          !isUser && emotion === "sad" && "glow-sad",
          !isUser && emotion === "excited" && "glow-excited",
          !isUser && emotion === "calm" && "glow-calm",
          !isUser && emotion === "neutral" && "glow-neutral"
        )}
      >
        {!isUser && agent && (
          <AgentIndicator agent={agent} className="mb-2" />
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex items-center justify-between mt-2 gap-3">
          <span className="text-xs opacity-60">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && emotion && <EmotionIndicator emotion={emotion} />}
        </div>
      </div>
    </div>
  );
};
