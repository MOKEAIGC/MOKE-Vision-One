// 文件路径: electron/main.cjs
// Electron 主进程 — 虚拟量子相机桌面应用

const { app, BrowserWindow, shell, Menu, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// ========== 自动保存设置持久化 ==========
const settingsPath = path.join(app.getPath('userData'), 'moke-autosave-settings.json');

// ========== 安全凭证持久化（OS Keychain 加密）==========
// 文件路径：userData/secure-credentials.bin（密文，密钥由系统 Keychain/DPAPI 托管）
// 仅当操作系统支持加密（macOS Keychain / Windows DPAPI / Linux libsecret）时启用。
// 存储的是 JSON 字符串 -> safeStorage.encryptString() 后的 Buffer
const secureCredPath = path.join(app.getPath('userData'), 'secure-credentials.bin');

function secureReadAll() {
  try {
    if (!fs.existsSync(secureCredPath)) return {};
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[secure] 系统加密不可用，跳过读取密文凭证');
      return {};
    }
    const cipher = fs.readFileSync(secureCredPath);
    const plain = safeStorage.decryptString(cipher);
    return JSON.parse(plain || '{}');
  } catch (e) {
    console.error('[secure] 读取加密凭证失败:', e.message);
    return {};
  }
}

function secureWriteAll(obj) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, error: 'OS encryption not available' };
    }
    const plain = JSON.stringify(obj || {});
    const cipher = safeStorage.encryptString(plain);
    fs.writeFileSync(secureCredPath, cipher, { mode: 0o600 });
    return { success: true };
  } catch (e) {
    console.error('[secure] 写入加密凭证失败:', e.message);
    return { success: false, error: e.message };
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function saveSettings(data) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) { console.error('保存设置失败:', e); }
}

// 禁用硬件加速可能引发的 GPU 进程崩溃（可选，视平台而定）
// app.disableHardwareAcceleration();

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'MOKE Vision One · 虚拟量子相机',
    backgroundColor: '#050505',
    // macOS 原生标题栏样式
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // 允许加载外部图片和 API
      webSecurity: false,
    },
    icon: path.join(__dirname, '../build/icon.png'),
    show: false, // 等待 ready-to-show 再显示，避免白屏闪烁
  });

  // 等待页面加载完毕再显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // [容错] 无论加载是否成功，最多 5 秒后强制显示窗口，避免永久黑屏
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[main] ready-to-show 超时，强制显示窗口');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 5000);

  // [诊断] 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error(`[main] 页面加载失败: code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`);
    // 显示一个友好的错误页面，而不是黑屏
    const errHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`
      <html><body style="background:#050505;color:#F5F5F5;font-family:sans-serif;padding:40px;">
        <h1 style="color:#D00000;">⚠️ 应用加载失败</h1>
        <p><b>错误代码：</b>${errorCode}</p>
        <p><b>错误描述：</b>${errorDescription}</p>
        <p><b>请求 URL：</b>${validatedURL}</p>
        <hr style="border-color:#333;margin:20px 0;">
        <p>可能原因：前端产物 <code>dist/index.html</code> 不存在。</p>
        <p>请在项目根目录执行：<code style="background:#222;padding:4px 8px;">npm run build</code> 后重启应用。</p>
      </body></html>
    `)}`;
    mainWindow.loadURL(errHtml);
    if (!mainWindow.isVisible()) mainWindow.show();
  });

  // 开发模式加载 Vite 开发服务器，生产模式加载打包后的文件
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // 开发模式下自动打开 DevTools
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (!fs.existsSync(indexPath)) {
      console.error(`[main] 致命错误：前端产物不存在 -> ${indexPath}`);
      console.error('[main] 请先执行: npm run build');
    }
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[main] loadFile 失败:', err);
    });
  }

  // 外部链接在系统浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 构建应用菜单（macOS 需要）
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS 应用菜单
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about', label: '关于 MOKE Vision One' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    }] : []),
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    // 视图菜单
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    // 窗口菜单
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: '全部置于顶层' },
        ] : [
          { role: 'close', label: '关闭' },
        ]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ========== IPC 通信处理 ==========

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择自动保存文件夹',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// 保存文件到指定目录（base64 图片 → 文件）
ipcMain.handle('save-file', async (_event, { folderPath, fileName, base64Data }) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    // base64Data 格式: "data:image/png;base64,xxxxx"
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error('无效的 base64 数据');
    const buffer = Buffer.from(matches[2], 'base64');
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 保存文本文件
ipcMain.handle('save-text-file', async (_event, { folderPath, fileName, content }) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 读取/写入自动保存设置
ipcMain.handle('get-autosave-settings', () => loadSettings());
ipcMain.handle('set-autosave-settings', (_event, data) => {
  saveSettings(data);
  return { success: true };
});

// ========== 安全凭证 IPC（OS Keychain 加密）==========
// 渲染进程通过 window.electronAPI.secureCredentials 调用
// 存储的都是"全量 JSON 配置对象"，渲染进程只关心读一次/写一次
ipcMain.handle('secure-is-available', () => {
  try {
    return { available: safeStorage.isEncryptionAvailable() };
  } catch (e) {
    return { available: false, error: e.message };
  }
});
ipcMain.handle('secure-get', (_event, key) => {
  const all = secureReadAll();
  return { value: all[key] ?? null };
});
ipcMain.handle('secure-set', (_event, { key, value }) => {
  const all = secureReadAll();
  all[key] = value;
  return secureWriteAll(all);
});
ipcMain.handle('secure-delete', (_event, key) => {
  const all = secureReadAll();
  delete all[key];
  return secureWriteAll(all);
});

// 在 Finder/Explorer 中打开文件夹
ipcMain.handle('open-folder', async (_event, folderPath) => {
  shell.openPath(folderPath);
  return { success: true };
});

// ========== 下载文件（弹出系统另存为对话框） ==========

// 下载单个图片（base64 → 系统另存为）
ipcMain.handle('download-image', async (_event, { base64Data, defaultName }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存图片',
      defaultPath: defaultName || 'image.png',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    // 解析 base64 数据
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const buffer = Buffer.from(matches[2], 'base64');
      fs.writeFileSync(result.filePath, buffer);
    } else {
      // 如果不是 data URL，尝试直接当作 base64 解码
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(result.filePath, buffer);
    }
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 下载 ZIP 打包文件（Buffer → 系统另存为）
ipcMain.handle('download-blob', async (_event, { buffer, defaultName, filters }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存文件',
      defaultPath: defaultName || 'download.zip',
      filters: filters || [
        { name: 'ZIP 压缩包', extensions: ['zip'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    // buffer 是 Uint8Array 通过 IPC 传来
    fs.writeFileSync(result.filePath, Buffer.from(buffer));
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 应用就绪
app.whenReady().then(() => {
  createMenu();
  createWindow();

  // macOS: 点击 Dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
