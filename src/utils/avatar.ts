export function avatarColor(userId: string): string {
  let hash = 0;
  for (const ch of userId) {
    hash = ((hash << 5) - hash) + ch.charCodeAt(0);
    hash |= 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 50%, 42%)`;
}

export function avatarInitial(name: string): string {
  return name[0].toUpperCase();
}