// 深色模式切换测试
import { describe, test, expect, beforeEach, afterEach } from './test-framework.js';
import { useTheme } from '../src/hooks/useTheme.js';
import { loadTheme, saveTheme } from '../src/utils/storage.js';
import { resetAllHooks, setupTestEnvironment, teardownTestEnvironment, clearLocalStorage } from './test-helpers.js';

describe('深色模式切换', () => {
  let themeHook;

  beforeEach(() => {
    setupTestEnvironment();
    resetAllHooks();
    themeHook = useTheme();
  });

  afterEach(() => {
    resetAllHooks();
    teardownTestEnvironment();
  });

  test('初始主题 - 应该是浅色模式', () => {
    expect(themeHook.getTheme()).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('切换主题 - 从浅色切换到深色', () => {
    const newTheme = themeHook.toggleTheme();

    expect(newTheme).toBe('dark');
    expect(themeHook.getTheme()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  test('切换主题 - 从深色切换到浅色', () => {
    themeHook.setTheme('dark');
    expect(themeHook.getTheme()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);

    const newTheme = themeHook.toggleTheme();

    expect(newTheme).toBe('light');
    expect(themeHook.getTheme()).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('设置主题 - 直接设置为深色', () => {
    themeHook.setTheme('dark');

    expect(themeHook.getTheme()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  test('设置主题 - 直接设置为浅色', () => {
    themeHook.setTheme('dark');
    themeHook.setTheme('light');

    expect(themeHook.getTheme()).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('主题持久化 - 切换主题后应该保存到 localStorage', () => {
    themeHook.toggleTheme();

    const savedTheme = loadTheme();
    expect(savedTheme).toBe('dark');
  });

  test('主题持久化 - 设置主题后应该保存到 localStorage', () => {
    themeHook.setTheme('dark');
    expect(loadTheme()).toBe('dark');

    themeHook.setTheme('light');
    expect(loadTheme()).toBe('light');
  });

  test('从存储初始化 - localStorage 有值时应该使用存储的主题', () => {
    saveTheme('dark');

    const result = themeHook.initFromStorage();

    expect(result).toBe('dark');
    expect(themeHook.getTheme()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  test('从存储初始化 - localStorage 没有值时应该使用浅色', () => {
    const result = themeHook.initFromStorage();

    expect(result).toBe('light');
    expect(themeHook.getTheme()).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('应用主题到 DOM - 深色模式应该添加 dark 类', () => {
    themeHook.applyThemeToDOM('dark');
    expect(document.body.classList.contains('dark')).toBe(true);

    themeHook.applyThemeToDOM('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('多次切换主题 - 状态应该正确', () => {
    expect(themeHook.toggleTheme()).toBe('dark');
    expect(themeHook.toggleTheme()).toBe('light');
    expect(themeHook.toggleTheme()).toBe('dark');
    expect(themeHook.toggleTheme()).toBe('light');

    expect(themeHook.getTheme()).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
    expect(loadTheme()).toBe('light');
  });

  test('订阅功能 - 主题变化时应该通知订阅者', () => {
    let notified = false;
    let receivedTheme = null;

    const unsubscribe = themeHook.subscribe((state) => {
      notified = true;
      receivedTheme = state.theme;
    });

    themeHook.toggleTheme();

    expect(notified).toBe(true);
    expect(receivedTheme).toBe('dark');

    unsubscribe();
  });

  test('取消订阅 - 取消后不再接收通知', () => {
    let notifyCount = 0;

    const unsubscribe = themeHook.subscribe(() => {
      notifyCount++;
    });

    themeHook.toggleTheme();
    expect(notifyCount).toBe(1);

    unsubscribe();

    themeHook.toggleTheme();
    expect(notifyCount).toBe(1);
  });

  test('多个订阅者 - 应该通知所有订阅者', () => {
    let count1 = 0;
    let count2 = 0;

    const unsub1 = themeHook.subscribe(() => count1++);
    const unsub2 = themeHook.subscribe(() => count2++);

    themeHook.toggleTheme();

    expect(count1).toBe(1);
    expect(count2).toBe(1);

    unsub1();
    unsub2();
  });

  test('主题图标切换 - 深色模式时显示太阳图标', () => {
    const sunIcon = document.createElement('span');
    sunIcon.className = 'icon-sun';
    const moonIcon = document.createElement('span');
    moonIcon.className = 'icon-moon';
    document.body.appendChild(sunIcon);
    document.body.appendChild(moonIcon);

    themeHook.applyThemeToDOM('dark');
    expect(sunIcon.style.display).toBe('none');
    expect(moonIcon.style.display).toBe('inline-block');

    themeHook.applyThemeToDOM('light');
    expect(sunIcon.style.display).toBe('inline-block');
    expect(moonIcon.style.display).toBe('none');

    document.body.removeChild(sunIcon);
    document.body.removeChild(moonIcon);
  });

  test('图标元素不存在时 - 不应该报错', () => {
    expect(() => {
      themeHook.applyThemeToDOM('dark');
      themeHook.applyThemeToDOM('light');
    }).not.toThrow();
  });

  test('刷新后保持主题偏好 - 模拟刷新场景', () => {
    themeHook.setTheme('dark');
    expect(themeHook.getTheme()).toBe('dark');
    expect(loadTheme()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);

    themeHook = useTheme();

    themeHook.initFromStorage();

    expect(themeHook.getTheme()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  test('存储无效主题 - 应该返回默认浅色', () => {
    localStorage.setItem('md-notes-theme', 'invalid-theme');
    
    const result = themeHook.initFromStorage();
    
    expect(result).toBe('light');
    expect(themeHook.getTheme()).toBe('light');
  });

  test('切换主题时应该保存正确的值', () => {
    themeHook.toggleTheme();
    expect(localStorage.getItem('md-notes-theme')).toBe('"dark"');

    themeHook.toggleTheme();
    expect(localStorage.getItem('md-notes-theme')).toBe('"light"');
  });

  test('多次设置相同主题 - 不应该有副作用', () => {
    themeHook.setTheme('light');
    expect(themeHook.getTheme()).toBe('light');

    themeHook.setTheme('light');
    expect(themeHook.getTheme()).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
    expect(loadTheme()).toBe('light');
  });

  test('测试隔离 - 不同测试之间不应该共享状态', () => {
    themeHook.setTheme('dark');
    expect(themeHook.getTheme()).toBe('dark');
  });
});

describe('主题存储工具', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
  });

  test('loadTheme - 没有存储时返回 null', () => {
    const theme = loadTheme();
    expect(theme).toBe(null);
  });

  test('saveTheme - 应该正确保存主题', () => {
    saveTheme('dark');
    expect(localStorage.getItem('md-notes-theme')).toBe('"dark"');

    saveTheme('light');
    expect(localStorage.getItem('md-notes-theme')).toBe('"light"');
  });

  test('loadTheme - 应该正确读取保存的主题', () => {
    saveTheme('dark');
    expect(loadTheme()).toBe('dark');

    saveTheme('light');
    expect(loadTheme()).toBe('light');
  });

  test('saveTheme - 存储无效值应该被忽略', () => {
    localStorage.setItem('md-notes-theme', 'invalid-json');
    const theme = loadTheme();
    expect(theme).toBe(null);
  });
});
