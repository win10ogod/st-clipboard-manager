// Clipboard Manager Extension for SillyTavern
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension configuration
const extensionName = "st-clipboard-manager";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {
  savedClipboards: [],  // Array to store saved clipboard items
  maxItems: 10          // Maximum number of items to store
};

// Initialize extension settings
async function loadSettings() {
  // Create settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  
  // Initialize UI with current settings
  updateClipboardList();
}

// Add clipboard content to the saved list
function saveToClipboardList(text) {
  if (!text) return;
  
  const settings = extension_settings[extensionName];
  
  // Check if this item already exists to avoid duplicates
  const existingIndex = settings.savedClipboards.findIndex(item => item === text);
  if (existingIndex >= 0) {
    // Move to the top if already exists
    settings.savedClipboards.splice(existingIndex, 1);
  }
  
  // Add to the beginning of the array
  settings.savedClipboards.unshift(text);
  
  // Trim to max items
  if (settings.savedClipboards.length > settings.maxItems) {
    settings.savedClipboards = settings.savedClipboards.slice(0, settings.maxItems);
  }
  
  // Save settings and update UI
  saveSettingsDebounced();
  updateClipboardList();
}

// Remove an item from the clipboard list
function removeFromClipboardList(index) {
  const settings = extension_settings[extensionName];
  settings.savedClipboards.splice(index, 1);
  saveSettingsDebounced();
  updateClipboardList();
}

// Update the display of saved clipboard items
function updateClipboardList() {
  const $listContainer = $("#clipboard_saved_list");
  if ($listContainer.length === 0) return; // Exit if element doesn't exist yet
  
  $listContainer.empty();
  
  const settings = extension_settings[extensionName];
  
  if (settings.savedClipboards.length === 0) {
    $listContainer.append('<div class="clipboard-empty-message">No saved items</div>');
    return;
  }
  
  settings.savedClipboards.forEach((text, index) => {
    // Create a list item with copy and delete buttons
    const $item = $(`
      <div class="clipboard-item">
        <div class="clipboard-item-text">${escapeHtml(text.substring(0, 50))}${text.length > 50 ? '...' : ''}</div>
        <div class="clipboard-item-actions">
          <button class="clipboard-copy-btn menu_button" data-index="${index}">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button class="clipboard-delete-btn menu_button" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `);
    
    $listContainer.append($item);
  });
  
  // Add event listeners for the buttons
  $(".clipboard-copy-btn").off("click").on("click", function() {
    const index = $(this).data("index");
    copyToClipboard(settings.savedClipboards[index]);
  });
  
  $(".clipboard-delete-btn").off("click").on("click", function() {
    const index = $(this).data("index");
    removeFromClipboardList(index);
  });
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      toastr.success("Content copied to clipboard!");
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      toastr.error("Failed to copy to clipboard");
    });
}

// Read from clipboard
async function readFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err);
    toastr.error("Cannot access clipboard. Check browser permissions.");
    return null;
  }
}

// Handle the quick copy button click
async function onQuickCopyButtonClick() {
  const clipboardText = await readFromClipboard();
  if (clipboardText) {
    saveToClipboardList(clipboardText);
    toastr.success("Clipboard content saved!");
  }
}

// Function to create the popup manually instead of loading from HTML file
function createPopup() {
  // Check if popup already exists
  if ($("#clipboard_manager_popup").length > 0) {
    return;
  }
  
  // Create popup HTML structure
  const popupHtml = `
    <div id="clipboard_manager_popup" class="clipboard-popup">
      <div class="clipboard-popup-content">
        <div class="clipboard-popup-header">
          <h3>剪贴板管理器</h3>
          <button id="clipboard_popup_close" class="clipboard-popup-close">×</button>
        </div>
        <div class="clipboard-popup-body">
          <div class="clipboard-actions">
            <button id="clipboard_popup_save" class="menu_button">保存当前剪贴板内容</button>
          </div>
          <div class="clipboard-saved-items">
            <h4>保存的内容</h4>
            <div id="clipboard_saved_list" class="clipboard-list">
              <!-- Saved clipboard items will be inserted here -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Append to body
  $("body").append(popupHtml);
  
  // Add event listeners
  $("#clipboard_popup_close").on("click", closeClipboardManagerPopup);
  $("#clipboard_popup_save").on("click", onSaveClipboardInPopupClick);
}

// Handle opening the clipboard manager popup
function openClipboardManagerPopup() {
  // Make sure popup exists before trying to show it
  createPopup();
  
  // Update clipboard list before showing popup
  updateClipboardList();
  
  // Show popup
  $("#clipboard_manager_popup").addClass("show");
}

// Handle closing the clipboard manager popup
function closeClipboardManagerPopup() {
  $("#clipboard_manager_popup").removeClass("show");
}

// Handle the open popup button click
function onOpenPopupButtonClick() {
  openClipboardManagerPopup();
}

// Handle the save from clipboard button in popup
async function onSaveClipboardInPopupClick() {
  const clipboardText = await readFromClipboard();
  if (clipboardText) {
    saveToClipboardList(clipboardText);
    toastr.success("Clipboard content saved!");
  }
}

// Initialize the extension
jQuery(async () => {
  // Load settings UI HTML directly
  const settingsHtml = `
    <div class="clipboard-manager-settings">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>剪贴板管理器</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="clipboard-manager_block flex-container">
            <input id="clipboard_quick_save" class="menu_button" type="button" value="保存剪贴板内容" />
            <input id="clipboard_open_manager" class="menu_button" type="button" value="打开剪贴板管理器" />
          </div>
          <div class="clipboard-manager_info">
            <p>使用此插件可以快速保存和检索剪贴板内容。</p>
          </div>
          <hr class="sysHR" />
        </div>
      </div>
    </div>
  `;
  
  // Append settings HTML
  $("#extensions_settings2").append(settingsHtml);
  
  // Set up event listeners for settings buttons
  $("#clipboard_quick_save").on("click", onQuickCopyButtonClick);
  $("#clipboard_open_manager").on("click", onOpenPopupButtonClick);
  
  // Create popup on initialization
  createPopup();
  
  // Close popup when clicking outside
  $(document).on("click", function(event) {
    if ($(event.target).closest("#clipboard_manager_popup").length === 0 && 
        $(event.target).closest("#clipboard_open_manager").length === 0) {
      closeClipboardManagerPopup();
    }
  });
  
  // Load settings
  await loadSettings();
  
  console.log(`${extensionName} extension loaded`);
});
