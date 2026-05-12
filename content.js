let settings = {
  fbReels: true,
  fbFeed: false,
  igReels: true,
  igExplore: false,
  ytShorts: true,
  ytFeed: false,
  upworkRedirect: true,
  upworkRefreshActive: false,
  upworkRefreshMin: 30,
  upworkRefreshMax: 60,
  upworkRefreshUrl: ''
};

let upworkRefreshTimerId = null;

function getSite() {
  const host = window.location.hostname;
  if (host.includes('facebook.com')) return 'fb';
  if (host.includes('instagram.com')) return 'ig';
  if (host.includes('youtube.com')) return 'yt';
  if (host.includes('upwork.com')) return 'upwork';
  return null;
}

function applyRules() {
  const site = getSite();
  if (!site) return;

  let css = '';

  if (site === 'fb') {
    if (settings.fbReels) {
      css += `
        /* Block Facebook Reels */
        div[aria-label="Reels"],
        a[href*="/reels/"],
        div[role="complementary"] div[aria-label="Reels"],
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
        /* Block Facebook Feed */
        div[role="feed"] {
          display: none !important;
        }
      `;
    }
  }

  if (site === 'ig') {
    if (settings.igReels) {
      css += `
        /* Block Instagram Reels */
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
        /* Block Instagram Explore */
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
        /* Block YouTube Shorts */
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
        /* Block YouTube Feed/Recommendations */
        ytd-browse[page-subtype="home"] #primary,
        #secondary #related,
        ytd-watch-next-secondary-results-renderer {
          display: none !important;
        }
      `;
    }
  }

  if (site === 'upwork') {
    if (settings.upworkRedirect) {
      // Redirect to most-recent instead of best-matches or default find-work page
      if (window.location.pathname === '/nx/find-work/best-matches' || 
          window.location.pathname === '/nx/find-work/' || 
          window.location.pathname === '/nx/find-work') {
        window.location.href = '/nx/find-work/most-recent';
        return; // Don't do other things if we are redirecting
      }
    }

    // Auto Refresh Logic
    if (settings.upworkRefreshActive && settings.upworkRefreshUrl) {
      // Check if current URL matches the target URL (ignoring hash)
      if (window.location.href.split('#')[0] === settings.upworkRefreshUrl.split('#')[0]) {
        if (!upworkRefreshTimerId) {
          const min = settings.upworkRefreshMin || 30;
          const max = settings.upworkRefreshMax || 60;
          const randomSeconds = Math.floor(Math.random() * (max - min + 1)) + min;
          
          const nextRefreshTime = Date.now() + randomSeconds * 1000;
          chrome.storage.local.set({ upworkNextRefreshTime: nextRefreshTime });
          
          upworkRefreshTimerId = setTimeout(() => {
            window.location.reload();
          }, randomSeconds * 1000);
        }
      } else {
        // Not on the target URL, clear timer if exists
        clearUpworkRefresh();
      }
    } else {
      clearUpworkRefresh();
    }
  }

  let styleEl = document.getElementById('breels-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'breels-style';
    // Use document.documentElement to append earlier than body
    (document.head || document.documentElement).appendChild(styleEl);
  }
  styleEl.textContent = css;
}

function loadSettingsAndApply() {
  chrome.storage.sync.get({
    fbReels: true,
    fbFeed: false,
    igReels: true,
    igExplore: false,
    ytShorts: true,
    ytFeed: false,
    upworkRedirect: true,
    upworkRefreshActive: false,
    upworkRefreshMin: 30,
    upworkRefreshMax: 60,
    upworkRefreshUrl: ''
  }, (items) => {
    settings = items;
    applyRules();
  });
}

function clearUpworkRefresh() {
  if (upworkRefreshTimerId) {
    clearTimeout(upworkRefreshTimerId);
    upworkRefreshTimerId = null;
  }
  chrome.storage.local.remove(['upworkNextRefreshTime']);
}

// Initial load
loadSettingsAndApply();

// Listen for settings changes from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSettings") {
    loadSettingsAndApply();
  }
});

// Since SPAs change URL without full reload, we need to handle redirects (e.g. going to /shorts manually)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    applyRules(); 
  }
}).observe(document, {subtree: true, childList: true});

// Make sure it runs when DOM is loaded as a fallback
document.addEventListener('DOMContentLoaded', loadSettingsAndApply);

// --- Facebook Timer and Sponsor Hider ---
let fbTimerInterval = null;

function processFbRightRail() {
  if (getSite() !== 'fb') return;

  const rightRail = document.querySelector('div[data-pagelet="RightRail"]');
  if (!rightRail) return;

  // Insert Timer
  let timerDiv = document.getElementById('breels-timer-container');
  if (!timerDiv) {
    timerDiv = document.createElement('div');
    timerDiv.id = 'breels-timer-container';
    timerDiv.innerHTML = `
      <div style="background: #1c1c21; border-radius: 12px; padding: 24px; margin: 16px 16px 24px 16px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
        <div style="position: absolute; top: -50px; left: -50px; width: 100px; height: 100px; background: #ff4757; opacity: 0.3; filter: blur(30px); border-radius: 50%;"></div>
        <div style="position: absolute; bottom: -50px; right: -50px; width: 100px; height: 100px; background: #ffa502; opacity: 0.3; filter: blur(30px); border-radius: 50%;"></div>
        
        <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.5); position: relative; z-index: 1;">Session Time</h3>
        <div id="breels-timer-display" style="font-size: 40px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -2px; margin-bottom: 16px; position: relative; z-index: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); color: #fff;">00:00:00</div>
        
        <div style="background: rgba(255, 71, 87, 0.15); border-radius: 8px; padding: 12px; position: relative; z-index: 1; border: 1px solid rgba(255, 71, 87, 0.3);">
          <div style="font-size: 13px; font-weight: 600; color: #ff4757; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Reminder
          </div>
          <div style="font-size: 12px; opacity: 0.9; line-height: 1.5; color: rgba(255,255,255,0.9);">You have other tasks to do. Don't spend too much time here.</div>
        </div>
      </div>
    `;
    
    // Attempt to prepend to the first inner container to keep layout consistent
    const innerWrapper = rightRail.querySelector('div > div > div');
    if (innerWrapper) {
      innerWrapper.prepend(timerDiv);
    } else {
      rightRail.prepend(timerDiv);
    }

    let startTime = sessionStorage.getItem('breels_fb_session_start');
    if (!startTime) {
      startTime = Date.now();
      sessionStorage.setItem('breels_fb_session_start', startTime);
    }

    if (!fbTimerInterval) {
      fbTimerInterval = setInterval(() => {
        const display = document.getElementById('breels-timer-display');
        if (!display) return;
        
        const now = Date.now();
        let diff = Math.floor((now - parseInt(startTime)) / 1000);
        
        const h = Math.floor(diff / 3600);
        diff %= 3600;
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        
        display.textContent = 
          String(h).padStart(2, '0') + ':' + 
          String(m).padStart(2, '0') + ':' + 
          String(s).padStart(2, '0');
      }, 1000);
    }
  }

  // Hide sponsored elements
  const rightRailWrapper = rightRail.querySelector('div > div > div');
  if (rightRailWrapper) {
    Array.from(rightRailWrapper.children).forEach(child => {
      // Skip our timer div
      if (child.id === 'breels-timer-container') return;
      
      const isSponsoredLabel = child.querySelector('[aria-label="Sponsored"]') || 
                               child.querySelector('[aria-label="Sponsor"]');
      
      let textHasSponsored = false;
      if (child.textContent) {
        const text = child.textContent.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (text.includes('sponsored') || text.includes('sponsor')) {
          textHasSponsored = true;
        }
      }

      if (isSponsoredLabel || textHasSponsored) {
        child.style.display = 'none';
      }
    });
  } else {
    // Fallback: search for sponsored labels and hide their 5th parent
    const sponsoredLabels = rightRail.querySelectorAll('[aria-label="Sponsored"], [aria-label="Sponsor"]');
    sponsoredLabels.forEach(el => {
      let parent = el;
      for (let i = 0; i < 5; i++) {
        if (parent && parent.parentElement && parent.parentElement !== rightRail) {
           parent = parent.parentElement;
        }
      }
      if (parent) parent.style.display = 'none';
    });
  }
}

if (getSite() === 'fb') {
  setInterval(processFbRightRail, 2000);
}
