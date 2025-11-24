import { Smile, Frown, Meh, Sparkles, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmotionType = "happy" | "sad" | "neutral" | "excited" | "calm";

interface EmotionIndicatorProps {
  emotion: EmotionType;
  className?: string;
}

const emotionConfig = {
  happy: {
    icon: Smile,
    color: "text-emotion-happy",
    bg: "bg-emotion-happy/10",
    label: "Happy",
  },
  sad: {
    icon: Frown,
    color: "text-emotion-sad",
    bg: "bg-emotion-sad/10",
    label: "Sad",
  },
  neutral: {
    icon: Meh,
    color: "text-emotion-neutral",
    bg: "bg-emotion-neutral/10",
    label: "Neutral",
  },
  excited: {
    icon: Sparkles,
    color: "text-emotion-excited",
    bg: "bg-emotion-excited/10",
    label: "Excited",
  },
  calm: {
    icon: Heart,
    color: "text-emotion-calm",
    bg: "bg-emotion-calm/10",
    label: "Calm",
  },
};

export const EmotionIndicator = ({ emotion, className }: EmotionIndicatorProps) => {
  const config = emotionConfig[emotion];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("p-2 rounded-full animate-pulse-subtle", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
    </div>
  );
};
