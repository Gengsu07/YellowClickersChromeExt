// Content script that runs on all pages
// This provides additional functionality and can be extended as needed

// Auto-run functionality when page loads
window.addEventListener("load", async function () {
  // Wait for page to fully load
  setTimeout(async () => {
    try {
      const result = await chrome.storage.local.get([
        "autoRunEnabled",
        "continueAfterReload",
      ]);

      if (result.autoRunEnabled) {
        const tableWrapper = document.getElementById("dsp4list-grid_wrapper");
        if (tableWrapper) {
          console.log("Auto-run enabled: Starting yellow button click...");
          showAutoStartIndicator();

          // Clear reload flag if set
          if (result.continueAfterReload) {
            await chrome.storage.local.set({ continueAfterReload: false });
          }

          // Start the process
          findAndClickYellowButton();
        }
      }
    } catch (error) {
      console.error("Error checking auto-run setting:", error);
    }
  }, 2000);
});

// Auto mode function that runs continuously
function startAutoMode() {
  if (window.yellowButtonAutoInterval) {
    clearInterval(window.yellowButtonAutoInterval);
  }

  window.yellowButtonAutoInterval = setInterval(() => {
    const tableWrapper = document.getElementById("dsp4list-grid_wrapper");

    if (tableWrapper) {
      const yellowButtons = tableWrapper.querySelectorAll("a.btn.yellow");

      if (yellowButtons.length > 0) {
        const firstYellowButton = yellowButtons[0];

        // Check if button is visible in viewport
        const rect = firstYellowButton.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

        console.log("Yellow button found, scrolling and clicking...");

        if (!isVisible) {
          // Scroll to the button
          firstYellowButton.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }

        // Click the button after a short delay
        setTimeout(async () => {
          // Use native click() method
          firstYellowButton.click();
          console.log("Yellow button clicked");

          // Handle form selection persistence
          setTimeout(async () => {
            const reasonDiv = document.getElementById("wp_alasankpp");
            const selectElement = document.getElementById("wp_alasan");

            if (reasonDiv && selectElement) {
              // Get stored selection if exists
              const stored = await chrome.storage.local.get(["formSelection"]);
              if (stored.formSelection) {
                selectElement.value = stored.formSelection;
              } else {
                // Auto-select based on reason text
                const reasonText = reasonDiv.textContent
                  .replace("Alasan tidak setuju KPP :", "")
                  .trim();
                const options = Array.from(selectElement.options);
                const matchingOption = options.find((opt) =>
                  opt.text.includes(reasonText)
                );

                if (matchingOption) {
                  // Only set value if no selection exists
                  if (selectElement.value === "") {
                    selectElement.value = matchingOption.value;
                    // Store the selection
                  }
                  await chrome.storage.local.set({
                    formSelection: matchingOption.value,
                  });
                }
              }
            }
          }, 1500);
        }, 1000);
      }
    }
  }, 3000); // Check every 3 seconds
}

// Show indicator that auto-start is running
function showAutoStartIndicator() {
  if (document.getElementById("auto-start-indicator")) return;

  const indicator = document.createElement("div");
  indicator.id = "auto-start-indicator";
  indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        opacity: 0.9;
        animation: pulse 2s infinite;
    `;

  // Add pulsing animation
  const style = document.createElement("style");
  style.textContent = `
        @keyframes pulse {
            0% { opacity: 0.9; }
            50% { opacity: 0.6; }
            100% { opacity: 0.9; }
        }
    `;
  document.head.appendChild(style);

  indicator.innerHTML = "🔄 Auto-Start Mode Active";
  document.body.appendChild(indicator);

  // Remove indicator after 5 seconds
  setTimeout(() => {
    const elem = document.getElementById("auto-start-indicator");
    if (elem) elem.remove();
  }, 5000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findAndClickYellowButton") {
    const result = findAndClickYellowButton();
    sendResponse(result);
  } else if (request.action === "findYellowButton") {
    const result = findYellowButtonInTable();
    sendResponse(result);
  }
});

function findAndClickYellowButton() {
  const tableWrapper = document.getElementById("dsp4list-grid_wrapper");

  if (!tableWrapper) {
    return { success: false, message: "Table not found on this page" };
  }

  const yellowButtons = tableWrapper.querySelectorAll("a.btn.yellow");

  if (yellowButtons.length === 0) {
    return { success: false, message: "No yellow buttons found in the table" };
  }

  const firstYellowButton = yellowButtons[0];
  firstYellowButton.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });

  setTimeout(() => {
    // CSP-compliant alternative to click()
    firstYellowButton.click();

    setTimeout(() => {
      const reasonDiv = document.getElementById("wp_alasankpp");
      const selectElement = document.getElementById("wp_alasan");

      if (reasonDiv && selectElement) {
        const reasonText = reasonDiv.textContent
          .replace("Alasan tidak setuju KPP :", "")
          .trim();
        const options = Array.from(selectElement.options);
        const matchingOption = options.find((opt) =>
          opt.text.includes(reasonText)
        );

        if (matchingOption) {
          // Extract exact value after colon
          const reasonValue = reasonDiv.textContent.split(":")[1].trim();
          const options = Array.from(selectElement.options);

          // Find exact matching option
          const matchingOption = options.find(
            (opt) => opt.text.trim() === reasonValue
          );

          if (matchingOption && selectElement.value !== matchingOption.value) {
            selectElement.value = matchingOption.value;
            console.log("Exact match selected:", matchingOption.text);

            // Handle form submission and reload
            const saveButton = document.querySelector(
              'button.btn.default[onclick="dppwp.simpanalasan()"]'
            );

            if (saveButton) {
              setTimeout(async () => {
                saveButton.click();
                console.log("Clicked save button");

                // Check if we should continue after reload
                const result = await chrome.storage.local.get([
                  "autoRunEnabled",
                ]);
                if (result.autoRunEnabled) {
                  await chrome.storage.local.set({
                    continueAfterReload: true,
                  });
                }
              }, 1000);
            }
          } else {
            console.warn("No matching option found for:", reasonText);
          }
        }
      }
    }, 1500);
  }, 1000);

  return {
    success: true,
    message: `Found and clicked yellow button (Total: ${yellowButtons.length} buttons)`,
  };
}

// Function to find yellow buttons in the specific table
function findYellowButtonInTable() {
  const tableWrapper = document.getElementById("dsp4list-grid_wrapper");

  if (!tableWrapper) {
    return { success: false, message: "Target table not found" };
  }

  const yellowButtons = tableWrapper.querySelectorAll("a.btn.yellow");

  return {
    success: true,
    count: yellowButtons.length,
    buttons: Array.from(yellowButtons).map((btn, index) => ({
      index: index,
      title: btn.getAttribute("title") || "",
      idwpk: btn.getAttribute("idwpk") || "",
      npwpk: btn.getAttribute("npwpk") || "",
      visible: isElementVisible(btn),
    })),
  };
}

// Helper function to check if element is visible
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Add visual indicator when extension is active (optional)
function addVisualIndicator() {
  if (document.getElementById("yellow-button-indicator")) return;

  const indicator = document.createElement("div");
  indicator.id = "yellow-button-indicator";
  indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        opacity: 0.9;
    `;
  indicator.textContent = "🎯 Yellow Button Finder Active";
  document.body.appendChild(indicator);

  // Remove indicator after 3 seconds
  setTimeout(() => {
    const elem = document.getElementById("yellow-button-indicator");
    if (elem) elem.remove();
  }, 3000);
}

// Optional: Add keyboard shortcut (Ctrl+Shift+Y) to trigger the function
document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.shiftKey && event.key === "Y") {
    event.preventDefault();

    const tableWrapper = document.getElementById("dsp4list-grid_wrapper");
    if (tableWrapper) {
      const yellowButtons = tableWrapper.querySelectorAll("a.btn.yellow");
      if (yellowButtons.length > 0) {
        addVisualIndicator();
        yellowButtons[0].scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        setTimeout(() => yellowButtons[0].click(), 1000);
      }
    }
  }

  // Ctrl+Shift+A to toggle auto-start
  if (event.ctrlKey && event.shiftKey && event.key === "A") {
    event.preventDefault();
    toggleAutoStart();
  }
});

// Toggle auto-start function
async function toggleAutoStart() {
  try {
    const result = await chrome.storage.local.get(["autoStartEnabled"]);
    const newState = !result.autoStartEnabled;
    await chrome.storage.local.set({ autoStartEnabled: newState });

    const message = newState ? "Auto-start ENABLED" : "Auto-start DISABLED";
    showToggleMessage(message, newState);

    if (newState) {
      startAutoMode();
    } else {
      if (window.yellowButtonAutoInterval) {
        clearInterval(window.yellowButtonAutoInterval);
      }
    }
  } catch (error) {
    console.error("Error toggling auto-start:", error);
  }
}

// Show toggle message
function showToggleMessage(message, enabled) {
  const indicator = document.createElement("div");
  indicator.style.cssText = `
        position: fixed;
        top: 50px;
        right: 10px;
        background: ${enabled ? "#28a745" : "#dc3545"};
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 14px;
        font-family: Arial, sans-serif;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
  indicator.textContent = message;
  document.body.appendChild(indicator);

  setTimeout(() => indicator.remove(), 3000);
}

// Console log for debugging
console.log("Yellow Button Auto Clicker extension loaded");
