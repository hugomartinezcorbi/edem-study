// Twitch-style deterministic username colors — same palette family Twitch uses
// for chatters without a custom color: vivid, readable on a light background.
const USERNAME_COLORS = [
  "#FF4500", // orange red
  "#2E8B57", // sea green
  "#DAA520", // goldenrod
  "#1E90FF", // dodger blue
  "#B22222", // firebrick
  "#FF7F50", // coral
  "#9ACD32", // yellow green
  "#8A2BE2", // blue violet
  "#00CED1", // dark turquoise
  "#D2691E", // chocolate
  "#5F9EA0", // cadet blue
  "#FF69B4", // hot pink
];

export function usernameColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return USERNAME_COLORS[Math.abs(hash) % USERNAME_COLORS.length];
}
