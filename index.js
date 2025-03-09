// Clipboard Manager Extension for SillyTavern
import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// 設置擴展基本信息
const extensionName = "clipboard-manager";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 默認設置
const defaultSettings = {
  clipboardItems: [], // 存儲剪貼板項目
  maxItems: 20, // 最多儲存項目數
};

// 加載設置
async function loadSettings() {
  // 創建設置（如果不存在）
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
}

// 保存剪貼板內容到列表
async function saveToClipboardList() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text || text.trim() === '') {
      toastr.warning('剪貼板為空或無法訪問。', '剪貼板管理器');
      return;
    }

    // 檢查是否已存在相同內容
    if (extension_settings[extensionName].clipboardItems.includes(text)) {
      toastr.info('此內容已存在於列表中。', '剪貼板管理器');
      return;
    }

    // 添加到列表開頭
    extension_settings[extensionName].clipboardItems.unshift(text);
    
    // 限制列表長度
    if (extension_settings[extensionName].clipboardItems.length > extension_settings[extensionName].maxItems) {
      extension_settings[extensionName].clipboardItems.pop();
    }
    
    saveSettingsDebounced();
    toastr.success('已保存到剪貼板列表！', '剪貼板管理器');
    updateClipboardListDisplay();
  } catch (error) {
    console.error("無法訪問剪貼板:", error);
    toastr.error('無法訪問剪貼板。請確保您已授予權限。', '剪貼板管理器');
  }
}

// 複製項目到剪貼板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toastr.success('已複製到剪貼板！', '剪貼板管理器');
  } catch (error) {
    console.error("無法寫入剪貼板:", error);
    toastr.error('無法複製到剪貼板。', '剪貼板管理器');
  }
}

// 從列表中刪除項目
function removeFromList(index) {
  extension_settings[extensionName].clipboardItems.splice(index, 1);
  saveSettingsDebounced();
  updateClipboardListDisplay();
  toastr.info('已從列表中移除', '剪貼板管理器');
}

// 清空列表
function clearList() {
  extension_settings[extensionName].clipboardItems = [];
  saveSettingsDebounced();
  updateClipboardListDisplay();
  toastr.info('已清空列表', '剪貼板管理器');
}

// 更新剪貼板列表顯示
function updateClipboardListDisplay() {
  const clipboardList = $('#clipboard_list');
  clipboardList.empty();
  
  if (extension_settings[extensionName].clipboardItems.length === 0) {
    clipboardList.append('<li class="clipboard-item-empty">列表為空</li>');
    return;
  }
  
  extension_settings[extensionName].clipboardItems.forEach((item, index) => {
    // 創建項目元素
    const itemElement = $('<li class="clipboard-item"></li>');
    
    // 創建內容預覽（限制長度）
    const preview = item.length > 50 ? `${item.substring(0, 50)}...` : item;
    const contentElement = $('<div class="clipboard-item-content"></div>').text(preview);
    
    // 創建操作按鈕
    const actionsElement = $('<div class="clipboard-item-actions"></div>');
    const copyButton = $('<button class="clipboard-action-button"><i class="fa-solid fa-copy"></i></button>')
      .on('click', () => copyToClipboard(item));
    const deleteButton = $('<button class="clipboard-action-button"><i class="fa-solid fa-trash"></i></button>')
      .on('click', () => removeFromList(index));
    
    // 組合元素
    actionsElement.append(copyButton, deleteButton);
    itemElement.append(contentElement, actionsElement);
    
    // 點擊項目顯示完整內容
    itemElement.on('click', function(e) {
      if (!$(e.target).closest('button').length) {
        showFullContentModal(item);
      }
    });
    
    clipboardList.append(itemElement);
  });
}

// 顯示完整內容模態框
function showFullContentModal(content) {
  // 創建或獲取模態框
  let modal = $('#clipboard_full_content_modal');
  if (modal.length === 0) {
    modal = $(`
      <div id="clipboard_full_content_modal" class="clipboard-modal">
        <div class="clipboard-modal-content">
          <div class="clipboard-modal-header">
            <span class="clipboard-modal-title">剪貼板內容</span>
            <span class="clipboard-modal-close">&times;</span>
          </div>
          <div class="clipboard-modal-body">
            <pre id="clipboard_full_content"></pre>
          </div>
          <div class="clipboard-modal-footer">
            <button id="clipboard_modal_copy_btn" class="clipboard-modal-button">複製</button>
          </div>
        </div>
      </div>
    `);
    $('body').append(modal);
    
    // 關閉模態框
    modal.find('.clipboard-modal-close').on('click', function() {
      modal.hide();
    });
    
    // 點擊模態框外部關閉
    $(window).on('click', function(e) {
      if ($(e.target).is(modal)) {
        modal.hide();
      }
    });
  }
  
  // 更新模態框內容
  $('#clipboard_full_content').text(content);
  
  // 設置複製按鈕功能
  $('#clipboard_modal_copy_btn').off('click').on('click', function() {
    copyToClipboard(content);
  });
  
  // 顯示模態框
  modal.show();
}

// 顯示剪貼板管理器彈窗
function showClipboardManager() {
  // 創建或獲取彈窗
  let clipboardManager = $('#clipboard_manager_modal');
  if (clipboardManager.length === 0) {
    clipboardManager = $(`
      <div id="clipboard_manager_modal" class="clipboard-modal">
        <div class="clipboard-modal-content clipboard-manager-content">
          <div class="clipboard-modal-header">
            <span class="clipboard-modal-title">剪貼板管理器</span>
            <span class="clipboard-modal-close">&times;</span>
          </div>
          <div class="clipboard-modal-body">
            <div class="clipboard-actions">
              <button id="clipboard_save_btn" class="clipboard-modal-button">保存當前剪貼板內容</button>
              <button id="clipboard_clear_btn" class="clipboard-modal-button clipboard-danger-button">清空列表</button>
            </div>
            <div class="clipboard-list-container">
              <h4>已保存項目 (點擊查看完整內容)</h4>
              <ul id="clipboard_list" class="clipboard-list"></ul>
            </div>
          </div>
        </div>
      </div>
    `);
    $('body').append(clipboardManager);
    
    // 關閉彈窗
    clipboardManager.find('.clipboard-modal-close').on('click', function() {
      clipboardManager.hide();
    });
    
    // 點擊彈窗外部關閉
    $(window).on('click', function(e) {
      if ($(e.target).is(clipboardManager)) {
        clipboardManager.hide();
      }
    });
    
    // 保存當前剪貼板內容
    $('#clipboard_save_btn').on('click', saveToClipboardList);
    
    // 清空列表
    $('#clipboard_clear_btn').on('click', function() {
      if (confirm('確定要清空列表嗎？')) {
        clearList();
      }
    });
  }
  
  // 更新列表顯示
  updateClipboardListDisplay();
  
  // 顯示彈窗
  clipboardManager.show();
}

// 當擴展加載時執行
jQuery(async () => {
  // 加載HTML
  const settingsHtml = `
    <div class="clipboard-manager-settings">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>剪貼板管理器</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="clipboard-manager_block flex-container">
            <input id="clipboard_manager_btn" class="menu_button" type="submit" value="打開剪貼板管理器" />
          </div>
          <div class="clipboard-manager_block flex-container">
            <label for="clipboard_max_items">最大保存數量：</label>
            <input id="clipboard_max_items" type="number" min="1" max="100" />
          </div>
          <hr class="sysHR" />
        </div>
      </div>
    </div>
  `;
  
  // 添加到設置面板
  $("#extensions_settings2").append(settingsHtml);
  
  // 註冊事件監聽器
  $("#clipboard_manager_btn").on("click", showClipboardManager);
  $("#clipboard_max_items").on("input", function() {
    const value = Number($(this).val());
    if (value >= 1 && value <= 100) {
      extension_settings[extensionName].maxItems = value;
      saveSettingsDebounced();
    }
  });
  
  // 加載設置
  await loadSettings();
  
  // 更新UI以匹配設置
  $("#clipboard_max_items").val(extension_settings[extensionName].maxItems);
});
