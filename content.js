const DEFAULT_SETTINGS = {
  enabled: true,
  fbReels: true,
  fbFeed: false,
  igReels: true,
  igExplore: false,
  ytShorts: true,
  ytFeed: false
};

let settings = { ...DEFAULT_SETTINGS };

function getSite() {
  const host = window.location.hostname;
  if (host.includes('facebook.com')) return 'fb';
  if (host.includes('instagram.com')) return 'ig';
  if (host.includes('youtube.com')) return 'yt';
  return null;
}

function applyRules() {
  const site = getSite();
  if (!site) return;

  let styleEl = document.getElementById('pa-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'pa-style';
    (document.head || document.documentElement).appendChild(styleEl);
  }

  if (!settings.enabled) {
    styleEl.textContent = '';
    return;
  }

  let css = '';

  if (site === 'fb') {
    if (settings.fbReels) {
      css += `
        div[aria-label="Reels"],
        a[href*="/reels/"],
        a[role="link"][href*="/reel/"] {
          display: none !important;
        }
      `;
      if (window.location.pathname.includes('/reel/')) {
        window.location.href = '/';
      }
    }
    if (settings.fbFeed) {
      css += `
        div[role="feed"] {
          display: none !important;
        }
      `;
    }
  }

  if (site === 'ig') {
    if (settings.igReels) {
      css += `
        a[href^="/reels/"],
        a[href*="/reels/"] {
          display: none !important;
        }
      `;
      if (window.location.pathname.startsWith('/reels/')) {
        window.location.href = '/';
      }
    }
    if (settings.igExplore) {
      css += `
        a[href^="/explore/"] {
          display: none !important;
        }
      `;
      if (window.location.pathname.startsWith('/explore/')) {
        window.location.href = '/';
      }
    }
  }

  if (site === 'yt') {
    if (settings.ytShorts) {
      css += `
        a[title="Shorts"],
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer,
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        ytd-guide-entry-renderer a[title="Shorts"],
        #shorts-container,
        a[href^="/shorts/"] {
          display: none !important;
        }
      `;
      if (window.location.pathname.startsWith('/shorts/')) {
        window.location.href = '/';
      }
    }
    if (settings.ytFeed) {
      css += `
        ytd-browse[page-subtype="home"] #primary,
        #secondary #related,
        ytd-watch-next-secondary-results-renderer {
          display: none !important;
        }
      `;
    }
  }

  styleEl.textContent = css;
}

function loadSettingsAndApply() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    settings = items;
    applyRules();
  });
}

loadSettingsAndApply();

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'updateSettings') {
    loadSettingsAndApply();
  }
});

// SPAs (FB/IG/YT) change URL without a full reload — re-apply rules only
// when the URL actually changes, not on every DOM mutation.
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    applyRules();
  }
});
observer.observe(document.documentElement, { subtree: true, childList: true });
