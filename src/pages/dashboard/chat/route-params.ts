// Use /dashboard/chat?match=<matchId>
export function useChatMatchId(): string | undefined {
  const s = new URLSearchParams(location.search)
  return s.get('match') || undefined
}