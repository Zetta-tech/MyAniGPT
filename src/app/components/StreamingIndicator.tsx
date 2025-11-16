export function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export function ToolStatusBadge({ status }: { status: 'running' | 'completed' }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      status === 'completed'
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 animate-pulse'
    }`}>
      {status === 'completed' ? '✓ Completed' : '⚙️ Running'}
    </span>
  );
}

export function AgentAvatar({ name }: { name?: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
      {name ? name.charAt(0).toUpperCase() : '🤖'}
    </div>
  );
}
