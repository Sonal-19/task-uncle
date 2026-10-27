/** The installed app's launch splash (`#splash` in index.html) stays up
 * while the saved data is read back from IndexedDB, and at least long
 * enough for the bell to ring once, then fades out. */
const MIN_SHOWN = 900;
/** Never trap the app behind it, whatever happens during startup. */
const GIVE_UP = 5000;

let hidden = false;

export function hideSplash() {
  if (hidden) return;
  hidden = true;
  const el = document.getElementById("splash");
  if (!el || !document.documentElement.classList.contains("tu-splash")) {
    el?.remove();
    return;
  }
  const wait = Math.max(0, MIN_SHOWN - performance.now());
  setTimeout(() => {
    // Two frames: the first screen has painted underneath.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.classList.add("out");
        setTimeout(() => {
          el.remove();
          document.documentElement.classList.remove("tu-splash");
        }, 450);
      }),
    );
  }, wait);
}

setTimeout(hideSplash, GIVE_UP);
