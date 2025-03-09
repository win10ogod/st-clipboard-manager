// Clipboard Manager Extension for SillyTavern
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension configuration
const extensionName = "st-clipboard-manager";
const defaultSettings = {
  savedClipboards: [],  // Array to store saved clipboard items
  maxItems: 10          // Maximum number of items to store
};

// DOM Elements (will be initialized when DOM is ready)
let quickSaveButton;
let openManagerButton;
let popupElement;
let popupCloseButton;
let popupSaveButton;
let clipboardListElement;

// Initialize extension settings
function loadSettings() {
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
  if (!clipboardListElement) return; // Exit if element doesn't exist yet
  
  // Clear the current list
  clipboardListElement.innerHTML = '';
  
  const settings = extension_settings[extensionName];
  
  if (!settings.savedClipboards || settings.savedClipboards.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'clipboard-empty-message';
    emptyMessage.textContent = '没有保存的内容';
    clipboardListElement.appendChild(emptyMessage);
    return;
  }
  
  // Create list items
  settings.savedClipboards.forEach((text, index) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'clipboard-item';
    
    // Text display
    const textElement = document.createElement('div');
    textElement.className = 'clipboard-item-text';
    textElement.textContent = text.length > 50 ? text.substring(0, 50) + '...' : text;
    
    // Actions container
    const actionsElement = document.createElement('div');
    actionsElement.className = 'clipboard-item-actions';
    
    // Copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'clipboard-copy-btn menu_button';
    copyButton.dataset.index = index;
    copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
    copyButton.addEventListener('click', function() {
      copyToClipboard(settings.savedClipboards[index]);
    });
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'clipboard-delete-btn menu_button';
    deleteButton.dataset.index = index;
    deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteButton.addEventListener('click', function() {
      removeFromClipboardList(index);
    });
    
    // Assemble
    actionsElement.appendChild(copyButton);
    actionsElement.appendChild(deleteButton);
    itemElement.appendChild(textElement);
    itemElement.appendChild(actionsElement);
    
    clipboardListElement.appendChild(itemElement);
  });
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      showToast('success', "内容已复制到剪贴板!");
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      showToast('error', "复制到剪贴板失败");
    });
}

// Simple toast function to use instead of toastr
function showToast(type, message) {
  // Check if toastr is available from SillyTavern
  if (typeof toastr !== 'undefined') {
    if (type === 'success') toastr.success(message);
    else if (type === 'error') toastr.error(message);
    else toastr.info(message);
    return;
  }
  
  // Fallback toast implementation
  const toast = document.createElement('div');
  toast.className = 'clipboard-toast clipboard-toast-' + type;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Read from clipboard
async function readFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err);
    showToast('error', "无法访问剪贴板。请检查浏览器权限。");
    return null;
  }
}

// Handle the quick copy button click
async function onQuickCopyButtonClick() {
  const clipboardText = await readFromClipboard();
  if (clipboardText) {
    saveToClipboardList(clipboardText);
    showToast('success', "剪贴板内容已保存!");
  }
}

// Handle opening the clipboard manager popup
function openClipboardManagerPopup() {
  if (!popupElement) return;
  
  // Update clipboard list before showing popup
  updateClipboardList();
  
  // Show popup
  popupElement.classList.add('show');
  console.log('Popup opened');
}

// Handle closing the clipboard manager popup
function closeClipboardManagerPopup() {
  if (!popupElement) return;
  popupElement.classList.remove('show');
}

// Handle the open popup button click
function onOpenPopupButtonClick() {
  console.log('Open popup button clicked');
  openClipboardManagerPopup();
}

// Handle the save from clipboard button in popup
async function onSaveClipboardInPopupClick() {
  const clipboardText = await readFromClipboard();
  if (clipboardText) {
    saveToClipboardList(clipboardText);
    showToast('success', "剪贴板内容已保存!");
  }
}

// Create and append settings UI
function createSettingsUI() {
  const extensionsSettings = document.getElementById('extensions_settings2');
  if (!extensionsSettings) {
    console.error('Extensions settings container not found');
    return false;
  }
  
  const settingsHTML = `
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
  
  // Insert settings HTML
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = settingsHTML;
  extensionsSettings.appendChild(tempContainer.firstElementChild);
  
  // Get button references
  quickSaveButton = document.getElementById('clipboard_quick_save');
  openManagerButton = document.getElementById('clipboard_open_manager');
  
  // Add event listeners
  if (quickSaveButton) {
    quickSaveButton.addEventListener('click', onQuickCopyButtonClick);
  }
  
  if (openManagerButton) {
    openManagerButton.addEventListener('click', onOpenPopupButtonClick);
  }
  
  return true;
}

// Create and append popup UI
function createPopupUI() {
  // Create popup HTML structure
  const popupHTML = `
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
  
  // Insert popup HTML
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = popupHTML;
  document.body.appendChild(tempContainer.firstElementChild);
  
  // Get element references
  popupElement = document.getElementById('clipboard_manager_popup');
  popupCloseButton = document.getElementById('clipboard_popup_close');
  popupSaveButton = document.getElementById('clipboard_popup_save');
  clipboardListElement = document.getElementById('clipboard_saved_list');
  
  // Add event listeners
  if (popupCloseButton) {
    popupCloseButton.addEventListener('click', closeClipboardManagerPopup);
  }
  
  if (popupSaveButton) {
    popupSaveButton.addEventListener('click', onSaveClipboardInPopupClick);
  }
  
  // Add click-outside-to-close functionality
  document.addEventListener('click', function(event) {
    if (popupElement && 
        popupElement.classList.contains('show') && 
        !popupElement.contains(event.target) && 
        event.target !== openManagerButton) {
      closeClipboardManagerPopup();
    }
  });
  
  return popupElement && clipboardListElement;
}

// Initialize the extension
function initializeExtension() {
  console.log(`${extensionName} extension initializing...`);
  
  // Create UI elements
  const settingsCreated = createSettingsUI();
  const popupCreated = createPopupUI();
  
  if (settingsCreated && popupCreated) {
    // Load settings
    loadSettings();
    console.log(`${extensionName} extension loaded successfully`);
  } else {
    console.error(`${extensionName} extension failed to initialize UI`);
  }
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // DOM already loaded, initialize right away
  initializeExtension();
}
