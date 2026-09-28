const DEFAULT_SETTINGS = {
  enabled: true,
  fbReels: true,
  fbFeed: false,
  igReels: true,
  igExplore: false,
  ytShorts: true,
  ytFeed: false
};

document.addEventListener('DOMContentLoaded', () => {
  const elements = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    elements[key] = document.getElementById(key);
  }

  function applyEnabledState(isEnabled) {
    document.querySelectorAll('.section').forEach((section) => {
      section.classList.toggle('disabled', !isEnabled);
    });
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    for (const [key, value] of Object.entries(items)) {
      if (elements[key]) elements[key].checked = value;
    }
    applyEnabledState(items.enabled);
  });

  function notifyTabs() {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: 'updateSettings' }, () => {
          // Ignore errors from tabs without the content script (e.g. chrome:// pages)
          void chrome.runtime.lastError;
        });
      }
    });
  }

  for (const [key, element] of Object.entries(elements)) {
    element.addEventListener('change', (e) => {
      const value = e.target.checked;
      chrome.storage.sync.set({ [key]: value }, notifyTabs);
      if (key === 'enabled') applyEnabledState(value);
    });
  }
});
