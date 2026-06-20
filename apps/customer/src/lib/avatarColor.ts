const AVATAR_COLORS = ["#7CB342", "#F4B942", "#E85D5D", "#5B9BD5", "#9B6CD9", "#EC8B5E"];

export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = Math.trunc(hash * 31 + (id.codePointAt(i) ?? 0));
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
