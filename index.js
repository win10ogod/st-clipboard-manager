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
  $(".clipboard-copy-btn").on("click", function() {
    const index = $(this).data("index");
    copyToClipboard(settings.savedClipboards[index]);
  });
  
  $(".clipboard-delete-btn").on("click", function() {
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

// Handle opening the clipboard manager popup
function openClipboardManagerPopup() {
  $("#clipboard_manager_popup").addClass("show");
}

// Handle closing the clipboard manager popup
function closeClipboardManagerPopup() {
  $("#clipboard_manager_popup").removeClass("show");
}

// Handle the open popup button click
async function onOpenPopupButtonClick() {
  // Update clipboard list before showing popup
  updateClipboardList();
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
  // Load HTML components
  const settingsHtml = await $.get(`${extensionFolderPath}/clipboard_manager.html`);
  $("#extensions_settings2").append(settingsHtml);
  
  // Create a floating popup and append to body
  const popupHtml = await $.get(`${extensionFolderPath}/clipboard_popup.html`);
  $("body").append(popupHtml);
  
  // Set up event listeners
  $("#clipboard_quick_save").on("click", onQuickCopyButtonClick);
  $("#clipboard_open_manager").on("click", onOpenPopupButtonClick);
  $("#clipboard_popup_close").on("click", closeClipboardManagerPopup);
  $("#clipboard_popup_save").on("click", onSaveClipboardInPopupClick);
  
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