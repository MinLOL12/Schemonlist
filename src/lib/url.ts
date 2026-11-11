/**
 * Only allow relative, same-site redirect targets. Blocks open redirects such
 * as `?next=https://evil.example` or protocol-relative `//evil.example`.
 */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(trimmed)) return fallback;
  return trimmed;
}
