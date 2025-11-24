export const TypingIndicator = () => {
  return (
    <div className="flex w-full justify-start">
      <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-subtle" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-subtle" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
