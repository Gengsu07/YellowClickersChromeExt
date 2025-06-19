document.addEventListener("DOMContentLoaded", function () {
  const findAndClickBtn = document.getElementById("findAndClick");
  const autoRunBtn = document.getElementById("autoRun");
  const statusDiv = document.getElementById("status");
  const autoStartStatusDiv = document.getElementById("autoStartStatus");

  // Check auto-run status on load
  chrome.storage.local.get(["autoRunEnabled"], function(result) {
    updateAutoRunStatus(result.autoRunEnabled);
  });

  function updateStatus(message, type = "info") {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  function updateAutoRunStatus(isEnabled) {
    const statusText = isEnabled ? "Auto-Run: Enabled" : "Auto-Run: Disabled";
    const statusClass = isEnabled ? "success" : "info";
    autoStartStatusDiv.textContent = statusText;
    autoStartStatusDiv.className = `status ${statusClass}`;
  }

  // Single click function
  findAndClickBtn.addEventListener("click", async function () {
    updateStatus("Searching for yellow button...", "info");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Check for existing script first
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      const existingScript = scripts.find(s => s.id === 'yellowButtonScript');
      
      if (!existingScript) {
        await chrome.scripting.registerContentScripts([{
          id: 'yellowButtonScript',
          matches: ['<all_urls>'],
          js: ['content.js'],
          persistAcrossSessions: false
        }]);
      }

      // Execute the script via message passing
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'findAndClickYellowButton'
        });

        if (response && response.success) {
          updateStatus(response.message, "success");
        } else {
          updateStatus(response?.message || "Action failed", "error");
        }
      } catch (error) {
        updateStatus("Error: " + error.message, "error");
      } finally {
        // Clean up script after execution
        if (!existingScript) {
          await chrome.scripting.unregisterContentScripts({
            ids: ['yellowButtonScript']
          });
        }
      }
    } catch (error) {
      updateStatus("Error: " + error.message, "error");
    }
  });

  // Auto-run toggle handler
  autoRunBtn.addEventListener("click", async function() {
    try {
      const result = await chrome.storage.local.get(["autoRunEnabled"]);
      const newState = !result.autoRunEnabled;
      
      await chrome.storage.local.set({ autoRunEnabled: newState });
      updateAutoRunStatus(newState);
      
      // If enabling, trigger immediately
      if (newState) {
        findAndClickBtn.click();
      }
    } catch (error) {
      updateStatus("Error toggling auto-run: " + error.message, "error");
    }
  });
});

// Function to find and click yellow button (injected into page)
function findAndClickYellowButton() {
  const tableWrapper = document.getElementById("dsp4list-grid_wrapper");

  if (!tableWrapper) {
    return { success: false, message: "Table not found on this page" };
  }

  // Find all yellow buttons in the table
  const yellowButtons = tableWrapper.querySelectorAll("a.btn.yellow");

  if (yellowButtons.length === 0) {
    return { success: false, message: "No yellow buttons found in the table" };
  }

  // Get the first yellow button
  const firstYellowButton = yellowButtons[0];

  // Scroll the button into view
  firstYellowButton.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });

  // Wait a moment for scroll to complete, then click
  setTimeout(() => {
    firstYellowButton.click();

    // Wait for form to appear and match select option
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
          selectElement.value = matchingOption.value;
          // Optionally trigger form submission
          // document.querySelector('button[onclick="dppwp.simpanalasan()"]').click();
        }
      }
    }, 1500);
  }, 1000);

  return {
    success: true,
    message: `Found and clicked yellow button (Total: ${yellowButtons.length} buttons)`,
  };
}


