function removeElements() {
  const elementsToRemove = [
    'div[aria-label="Reels"]', // Main Reels section
    'a[href*="/reels/"]', // Any links leading to Reels
    'div[aria-label="See more"]', // "See More" button under Reels
    'div[aria-label="Video"] div[role="article"]', // Reels appearing as videos
    'div[role="complementary"] div[aria-label="Reels"]', // Sidebar Reels
  ];

  elementsToRemove.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.closest("div")?.remove(); // Ensure full removal of the parent wrapper
    });
  });

  // Remove suggested posts that include a "Follow" button
  document.querySelectorAll('div[role="article"]').forEach((post) => {
    if (post.innerText.includes("Follow")) {
      post.remove();
    }
  });
}

// Run immediately when the page loads
removeElements();

// Observe dynamic changes and apply filtering
const observer = new MutationObserver(() => removeElements());

observer.observe(document.body, { childList: true, subtree: true });
