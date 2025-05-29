function removeElements() {
  const elementsToRemove = [
    'div[aria-label="Reels"]',
    'a[href*="/reels/"]',
    'div[aria-label="See more"]',
    'div[aria-label="Video"] div[role="article"]',
    'div[role="complementary"] div[aria-label="Reels"]',
  ];

  elementsToRemove.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.closest("div")?.remove();
    });
  });

  document.querySelectorAll('div[role="article"]').forEach((post) => {
    if (post.innerText.includes("Follow")) {
      post.remove();
    }
  });
}

function monitorVideoPlayback() {
  if (location.href.startsWith("https://www.facebook.com/watch")) {
    document.querySelectorAll("video").forEach((video) => {
      if (!video.dataset.hasRedirectListener) {
        video.addEventListener("play", () => {
          window.location.href = "https://www.facebook.com/";
        });
        video.dataset.hasRedirectListener = "true";
      }
    });
  }
}

// Initial run
removeElements();
monitorVideoPlayback();

// Observe page mutations
const observer = new MutationObserver(() => {
  removeElements();
  monitorVideoPlayback();
});
observer.observe(document.body, { childList: true, subtree: true });

// Handle client-side navigation (SPA behavior)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    setTimeout(() => {
      removeElements();
      monitorVideoPlayback();
    }, 1000);
  }
});
urlObserver.observe(document, { childList: true, subtree: true });

// Fallback: trigger on tab focus
window.addEventListener("focus", () => {
  setTimeout(() => {
    removeElements();
    monitorVideoPlayback();
  }, 500);
});
