import { Brain, MessageSquare, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentType = "emotional" | "conversational" | "analytical";

interface AgentIndicatorProps {
  agent: AgentType;
  className?: string;
}

const agentConfig = {
  emotional: {
    icon: Brain,
    color: "text-accent",
    label: "Emotion Agent",
    description: "Understanding feelings",
  },
  conversational: {
    icon: MessageSquare,
    color: "text-primary",
    label: "Chat Agent",
    description: "Natural dialogue",
  },
  analytical: {
    icon: Lightbulb,
    color: "text-emotion-excited",
    label: "Analysis Agent",
    description: "Deep insights",
  },
};

export const AgentIndicator = ({ agent, className }: AgentIndicatorProps) => {
  const config = agentConfig[agent];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <Icon className={cn("h-3 w-3", config.color)} />
      <span className="text-muted-foreground">{config.label}</span>
    </div>
  );
};
