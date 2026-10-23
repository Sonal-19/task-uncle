/** "Chrome on Android", "Safari on iPhone", "Edge on Windows"… from a
 * user-agent string (good enough to tell someone's devices apart). */
export function deviceLabel(ua: string | null | undefined) {
  if (!ua) return "Unknown device";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : /curl|bun|node/i.test(ua)
                ? "Script"
                : "Browser";
  return os ? `${browser} on ${os}` : browser;
}

/** Phone or tablet (for the device icon). */
export const isPhoneUa = (ua: string | null | undefined) =>
  !!ua && /iPhone|iPad|Android|Mobi/.test(ua);
