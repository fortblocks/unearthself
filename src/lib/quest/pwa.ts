export function registerQuestWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/quest-sw.js", { scope: "/quest" }).catch(() => {
    /* October test can run without a worker. Paper still wins. */
  });
}
