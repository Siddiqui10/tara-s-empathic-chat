import { MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModeToggleProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
}

export const ModeToggle = ({ mode, onModeChange }: ModeToggleProps) => {
  return (
    <div className="flex items-center gap-2 p-1 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
      <Button
        variant={mode === "text" ? "default" : "ghost"}
        size="sm"
        onClick={() => onModeChange("text")}
        className={`rounded-full transition-all duration-300 ${
          mode === "text" 
            ? "gradient-primary text-white glow-primary" 
            : "hover:bg-accent/10"
        }`}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Text
      </Button>
      <Button
        variant={mode === "voice" ? "default" : "ghost"}
        size="sm"
        onClick={() => onModeChange("voice")}
        className={`rounded-full transition-all duration-300 ${
          mode === "voice" 
            ? "gradient-primary text-white glow-primary" 
            : "hover:bg-accent/10"
        }`}
      >
        <Mic className="h-4 w-4 mr-2" />
        Voice
      </Button>
    </div>
  );
};
