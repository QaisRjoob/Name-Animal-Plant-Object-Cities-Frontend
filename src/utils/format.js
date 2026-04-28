export function formatSeconds(totalSeconds) {
  const value = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
