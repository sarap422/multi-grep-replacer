/**
 * Electron モジュールのモック
 * ユニットテスト環境でElectronAPIをモック化
 */

const path = require('path');
const os = require('os');

// Mock Electron app object
const mockApp = {
  getPath: jest.fn((name) => {
    const mockPaths = {
      userData: path.join(os.tmpdir(), 'test-multi-grep-replacer'),
      documents: path.join(os.homedir(), 'Documents'),
      downloads: path.join(os.homedir(), 'Downloads'),
      desktop: path.join(os.homedir(), 'Desktop'),
      temp: os.tmpdir()
    };
    return mockPaths[name] || '/tmp/test-path';
  }),
  
  getName: jest.fn(() => 'MultiGrepReplacer'),
  getVersion: jest.fn(() => '1.0.0'),
  isReady: jest.fn(() => true),
  
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  
  quit: jest.fn(),
  exit: jest.fn()
};

// Mock BrowserWindow
const mockBrowserWindow = jest.fn(() => ({
  loadFile: jest.fn(),
  loadURL: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  close: jest.fn(),
  isDestroyed: jest.fn(() => false),
  isVisible: jest.fn(() => true),
  isMinimized: jest.fn(() => false),
  getBounds: jest.fn(() => ({ x: 100, y: 100, width: 800, height: 600 })),
  setBounds: jest.fn(),
  getTitle: jest.fn(() => 'MultiGrepReplacer'),
  setTitle: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  webContents: {
    executeJavaScript: jest.fn(),
    insertCSS: jest.fn(),
    openDevTools: jest.fn(),
    closeDevTools: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    send: jest.fn()
  }
}));

// Mock dialog
const mockDialog = {
  showOpenDialog: jest.fn(() => Promise.resolve({
    canceled: false,
    filePaths: ['/test/path/folder']
  })),
  
  showSaveDialog: jest.fn(() => Promise.resolve({
    canceled: false,
    filePath: '/test/path/save-file.json'
  })),
  
  showMessageBox: jest.fn(() => Promise.resolve({
    response: 0,
    checkboxChecked: false
  })),
  
  showErrorBox: jest.fn()
};

// Mock ipcMain
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn()
};

// Mock ipcRenderer
const mockIpcRenderer = {
  invoke: jest.fn(() => Promise.resolve({ success: true })),
  send: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn()
};

// Mock contextBridge
const mockContextBridge = {
  exposeInMainWorld: jest.fn()
};

// Mock shell
const mockShell = {
  openExternal: jest.fn(() => Promise.resolve()),
  openPath: jest.fn(() => Promise.resolve('')),
  showItemInFolder: jest.fn(),
  moveItemToTrash: jest.fn(() => true)
};

// Electronモジュール全体のモック
module.exports = {
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  dialog: mockDialog,
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  contextBridge: mockContextBridge,
  shell: mockShell,
  
  // その他のElectron API
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(() => 'test clipboard content')
  },
  
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: 'system'
  },
  
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 }
    }))
  }
};