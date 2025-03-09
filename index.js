// Clipboard Manager Extension for SillyTavern
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension configuration
const extensionName = "st-clipboard-manager";
const defaultSettings = {
  savedClipboards: [],  // Array to store saved clipboard items
  maxItems: 10          // Maximum number of items to store
};

// Initialize extension settings
function loadSettings() {
  // Create settings if they don't exist
  if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = {};
  }
  
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  
  saveSettingsDebounced();
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
  
  // Save settings
  saveSettingsDebounced();
}

// Remove an item from the clipboard list
function removeFromClipboardList(index) {
  const settings = extension_settings[extensionName];
  settings.savedClipboards.splice(index, 1);
  saveSettingsDebounced();
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
      toastr.success("已复制到剪贴板！");
    })
    .catch(err => {
      console.error('复制文本失败: ', err);
      toastr.error("复制到剪贴板失败");
    });
}

// Read from clipboard
async function readFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('读取剪贴板内容失败: ', err);
    toastr.error("无法访问剪贴板。请检查浏览器权限。");
    return null;
  }
}

// Handle the quick copy button click
async function onQuickCopyButtonClick() {
  const clipboardText = await readFromClipboard();
  if (clipboardText) {
    saveToClipboardList(clipboardText);
    toastr.success("剪贴板内容已保存！");
  }
}

// Generate the HTML for the clipboard list
function generateClipboardListHTML() {
  const settings = extension_settings[extensionName];
  let html = '';
  
  if (settings.savedClipboards.length === 0) {
    html = '<div class="clipboard-empty-message">没有保存的项目</div>';
  } else {
    settings.savedClipboards.forEach((text, index) => {
      html += `
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
      `;
    });
  }
  
  return html;
}

// Show the clipboard manager popup
function showClipboardPopup() {
  console.log("显示剪贴板弹窗");
  
  // Remove any existing popup
  $("#clipboard_manager_popup").remove();
  
  // Create the popup HTML
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
              ${generateClipboardListHTML()}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Append to body
  $("body").append(popupHtml);
  
  // Add event listeners
  $("#clipboard_popup_close").off().on("click", function() {
    $("#clipboard_manager_popup").removeClass("show");
    setTimeout(() => {
      $("#clipboard_manager_popup").remove();
    }, 300);
  });
  
  $("#clipboard_popup_save").off().on("click", async function() {
    const clipboardText = await readFromClipboard();
    if (clipboardText) {
      saveToClipboardList(clipboardText);
      // Refresh the list
      $("#clipboard_saved_list").html(generateClipboardListHTML());
      // Re-attach event handlers
      attachClipboardItemHandlers();
      toastr.success("剪贴板内容已保存！");
    }
  });
  
  // Add handlers to clipboard items
  attachClipboardItemHandlers();
  
  // Show the popup
  setTimeout(() => {
    $("#clipboard_manager_popup").addClass("show");
  }, 10);
}

// Attach event handlers to clipboard items
function attachClipboardItemHandlers() {
  $(".clipboard-copy-btn").off().on("click", function() {
    const index = $(this).data("index");
    const text = extension_settings[extensionName].savedClipboards[index];
    copyToClipboard(text);
  });
  
  $(".clipboard-delete-btn").off().on("click", function() {
    const index = $(this).data("index");
    removeFromClipboardList(index);
    // Refresh the list
    $("#clipboard_saved_list").html(generateClipboardListHTML());
    // Re-attach event handlers
    attachClipboardItemHandlers();
  });
}

// Initialize the extension
jQuery(async () => {
  // Add settings to the extensions panel
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
  
  // Load settings
  loadSettings();
  
  // Clear any existing bindings
  $("#clipboard_quick_save, #clipboard_open_manager").off();
  
  // Add event listeners with explicit debug logging
  $("#clipboard_quick_save").on("click", function() {
    console.log("'保存剪贴板内容'按钮被点击");
    onQuickCopyButtonClick();
  });
  
  $("#clipboard_open_manager").on("click", function() {
    console.log("'打开剪贴板管理器'按钮被点击");
    showClipboardPopup();
  });
  
  // Close popup when clicking outside (document event)
  $(document).off('click.clipboardManager').on('click.clipboardManager', function(event) {
    const $popup = $("#clipboard_manager_popup");
    if ($popup.length && $popup.hasClass("show")) {
      if (!$(event.target).closest(".clipboard-popup-content").length && 
          !$(event.target).closest("#clipboard_open_manager").length) {
        $popup.removeClass("show");
        setTimeout(() => {
          $popup.remove();
        }, 300);
      }
    }
  });
  
  console.log(`${extensionName} 扩展已加载`);
});
