document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    fbReels: document.getElementById('fbReels'),
    fbFeed: document.getElementById('fbFeed'),
    igReels: document.getElementById('igReels'),
    igExplore: document.getElementById('igExplore'),
    ytShorts: document.getElementById('ytShorts'),
    ytFeed: document.getElementById('ytFeed'),
    upworkRedirect: document.getElementById('upworkRedirect'),
    upworkRefreshActive: document.getElementById('upworkRefreshActive')
  };

  const refreshSettingsRow = document.getElementById('refreshSettingsRow');
  const upworkRefreshMin = document.getElementById('upworkRefreshMin');
  const upworkRefreshMax = document.getElementById('upworkRefreshMax');
  const upworkRefreshTarget = document.getElementById('upworkRefreshTarget');
  const upworkCountdown = document.getElementById('upworkCountdown');

  let countdownInterval = null;

  // Load saved settings
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
    for (const [key, value] of Object.entries(items)) {
      if (elements[key]) {
        elements[key].checked = value;
      }
    }
    
    upworkRefreshMin.value = items.upworkRefreshMin;
    upworkRefreshMax.value = items.upworkRefreshMax;
    if (items.upworkRefreshUrl) {
      upworkRefreshTarget.textContent = 'Target: ' + items.upworkRefreshUrl;
    }
    
    if (items.upworkRefreshActive) {
      refreshSettingsRow.style.display = 'flex';
      startCountdown();
    }
  });

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    if (!elements.upworkRefreshActive.checked) {
      upworkCountdown.style.display = 'none';
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }
    
    chrome.storage.local.get(['upworkNextRefreshTime'], (result) => {
      if (result.upworkNextRefreshTime) {
        const remaining = Math.ceil((result.upworkNextRefreshTime - Date.now()) / 1000);
        upworkCountdown.style.display = 'block';
        if (remaining > 0) {
          upworkCountdown.textContent = `Next refresh in: ${remaining}s`;
        } else {
          upworkCountdown.textContent = `Refreshing...`;
        }
      } else {
        upworkCountdown.style.display = 'none';
      }
    });
  }

  // Handle number input changes
  [upworkRefreshMin, upworkRefreshMax].forEach(input => {
    input.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 5) val = 5;
      e.target.value = val;
      chrome.storage.sync.set({ [e.target.id]: val }, notifyTabs);
    });
  });

  // Save settings on change
  for (const [key, element] of Object.entries(elements)) {
    element.addEventListener('change', (e) => {
      const newValue = e.target.checked;
      
      if (key === 'upworkRefreshActive') {
        if (newValue) {
          refreshSettingsRow.style.display = 'flex';
          // Save the current tab's URL as the target if we're on upwork
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let url = tabs[0].url;
            if (url.includes('upwork.com')) {
              // Strip hash or query if needed, or just save exact URL
              const targetUrl = url.split('#')[0];
              chrome.storage.sync.set({ upworkRefreshUrl: targetUrl, upworkRefreshActive: true }, () => {
                upworkRefreshTarget.textContent = 'Target: ' + targetUrl;
                notifyTabs();
                startCountdown();
              });
            } else {
              alert("Please navigate to an Upwork page to turn on Auto Refresh for that page.");
              element.checked = false;
              refreshSettingsRow.style.display = 'none';
              upworkCountdown.style.display = 'none';
            }
          });
          return; // Early return since we handled storage and notify inside
        } else {
          refreshSettingsRow.style.display = 'none';
          upworkCountdown.style.display = 'none';
          chrome.storage.local.remove(['upworkNextRefreshTime']);
        }
      }
      
      chrome.storage.sync.set({ [key]: newValue }, notifyTabs);
    });
  }

  function notifyTabs() {
    chrome.tabs.query({}, function(tabs) {
      for (let tab of tabs) {
        try {
          chrome.tabs.sendMessage(tab.id, {action: "updateSettings"});
        } catch(err) {
          // Ignore errors
        }
      }
    });
  }
});
