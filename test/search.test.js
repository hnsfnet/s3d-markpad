// 搜索功能测试
import { describe, test, expect, beforeEach, afterEach } from './test-framework.js';
import { useSearch } from '../src/hooks/useSearch.js';
import { useNotes } from '../src/hooks/useNotes.js';
import { resetAllHooks, createTestNote, setupTestEnvironment, teardownTestEnvironment, wait } from './test-helpers.js';

describe('搜索功能', () => {
  let searchHook;
  let notesHook;

  beforeEach(() => {
    setupTestEnvironment();
    resetAllHooks();
    searchHook = useSearch();
    notesHook = useNotes();
  });

  afterEach(() => {
    resetAllHooks();
    teardownTestEnvironment();
  });

  test('初始状态 - 查询应该为空', () => {
    expect(searchHook.getQuery()).toBe('');
  });

  test('设置查询 - 应该正确设置查询内容', () => {
    searchHook.setQuery('测试');
    expect(searchHook.getQuery()).toBe('测试');
  });

  test('清除查询 - 应该清空查询内容', () => {
    searchHook.setQuery('测试');
    expect(searchHook.getQuery()).toBe('测试');

    searchHook.clearQuery();
    expect(searchHook.getQuery()).toBe('');
  });

  test('按标题搜索 - 应该正确匹配标题', () => {
    createTestNote('# JavaScript 教程\n\n内容');
    createTestNote('# Python 教程\n\n内容');
    createTestNote('# 其他笔记\n\n内容');

    searchHook.setQuery('JavaScript');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('JavaScript 教程');
  });

  test('按内容搜索 - 应该正确匹配内容', () => {
    createTestNote('# 笔记1\n\n这是关于 React 的内容');
    createTestNote('# 笔记2\n\n这是关于 Vue 的内容');
    createTestNote('# 笔记3\n\n其他内容');

    searchHook.setQuery('React');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('React');
  });

  test('搜索不区分大小写', () => {
    createTestNote('# JavaScript 教程\n\n内容');
    createTestNote('# 笔记2\n\n内容');

    searchHook.setQuery('javascript');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('JavaScript');
  });

  test('多个匹配结果 - 应该返回所有匹配的笔记', () => {
    createTestNote('# 前端开发\n\nJavaScript 教程');
    createTestNote('# 后端开发\n\nNode.js 开发');
    createTestNote('# 其他笔记\n\n内容');

    searchHook.setQuery('开发');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(2);
    const titles = results.map(n => n.content);
    expect(titles.some(t => t.includes('前端开发'))).toBe(true);
    expect(titles.some(t => t.includes('后端开发'))).toBe(true);
  });

  test('无匹配结果 - 应该返回空数组', () => {
    createTestNote('# 笔记1\n\n内容1');
    createTestNote('# 笔记2\n\n内容2');

    searchHook.setQuery('不存在的关键词');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(0);
  });

  test('空查询 - 应该返回所有笔记', () => {
    createTestNote('# 笔记1\n\n内容1');
    createTestNote('# 笔记2\n\n内容2');
    createTestNote('# 笔记3\n\n内容3');

    searchHook.setQuery('');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(3);
  });

  test('查询自动去首尾空格', () => {
    createTestNote('# JavaScript 教程\n\n内容');

    searchHook.setQuery('  JavaScript  ');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
  });

  test('传入自定义查询参数 - 应该使用传入的查询而不是状态中的查询', () => {
    createTestNote('# JavaScript 教程\n\n内容');
    createTestNote('# Python 教程\n\n内容');

    searchHook.setQuery('JavaScript');

    const results = searchHook.filterNotes(notesHook.getNotes(), 'Python');

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('Python');
  });

  test('防抖搜索 - 应该延迟设置查询', async () => {
    searchHook.debouncedSearch('测试');
    expect(searchHook.getQuery()).toBe('');

    await wait(250);

    expect(searchHook.getQuery()).toBe('测试');
  });

  test('防抖搜索 - 快速输入应该只执行最后一次', async () => {
    searchHook.debouncedSearch('第一个');
    searchHook.debouncedSearch('第二个');
    searchHook.debouncedSearch('第三个');

    await wait(100);
    expect(searchHook.getQuery()).toBe('');

    await wait(150);
    expect(searchHook.getQuery()).toBe('第三个');
  });

  test('防抖搜索 - 清除查询应该取消防抖', async () => {
    searchHook.debouncedSearch('测试');

    searchHook.clearQuery();

    await wait(250);
    expect(searchHook.getQuery()).toBe('');
  });

  test('防抖搜索 - 回调应该在设置查询后执行', async () => {
    let callbackCalled = false;

    searchHook.debouncedSearch('测试', () => {
      callbackCalled = true;
    });

    expect(callbackCalled).toBe(false);

    await wait(250);

    expect(callbackCalled).toBe(true);
    expect(searchHook.getQuery()).toBe('测试');
  });

  test('搜索标题和内容都匹配 - 应该只返回一次', () => {
    createTestNote('# JavaScript\n\nJavaScript 是一门编程语言');

    searchHook.setQuery('JavaScript');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
  });

  test('部分匹配 - 应该支持部分关键词匹配', () => {
    createTestNote('# 编程入门\n\n学习编程');

    searchHook.setQuery('编程');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
  });

  test('中文搜索 - 应该支持中文关键词', () => {
    createTestNote('# 我的笔记\n\n这是中文内容');
    createTestNote('# 其他笔记\n\n英文内容');

    searchHook.setQuery('中文');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('中文');
  });

  test('特殊字符搜索 - 应该正确处理特殊字符', () => {
    createTestNote('# 笔记 $100\n\n价格是 $100');
    createTestNote('# 其他笔记\n\n内容');

    searchHook.setQuery('$100');

    const results = searchHook.filterNotes(notesHook.getNotes());

    expect(results).toHaveLength(1);
  });

  test('空笔记列表 - 搜索应该返回空数组', () => {
    searchHook.setQuery('测试');

    const results = searchHook.filterNotes([]);

    expect(results).toHaveLength(0);
  });

  test('订阅功能 - 应该在查询变化时通知订阅者', () => {
    let notified = false;
    const unsubscribe = searchHook.subscribe(() => {
      notified = true;
    });

    searchHook.setQuery('测试');

    expect(notified).toBe(true);
    unsubscribe();
  });

  test('取消订阅 - 取消后不再接收通知', () => {
    let notifyCount = 0;
    const unsubscribe = searchHook.subscribe(() => {
      notifyCount++;
    });

    searchHook.setQuery('第一个');
    expect(notifyCount).toBe(1);

    unsubscribe();

    searchHook.setQuery('第二个');
    expect(notifyCount).toBe(1);
  });

  test('多个订阅者 - 应该通知所有订阅者', () => {
    let count1 = 0;
    let count2 = 0;

    const unsub1 = searchHook.subscribe(() => count1++);
    const unsub2 = searchHook.subscribe(() => count2++);

    searchHook.setQuery('测试');

    expect(count1).toBe(1);
    expect(count2).toBe(1);

    unsub1();
    unsub2();
  });

  test('清除防抖定时器 - clearQuery 应该清除防抖定时器', async () => {
    searchHook.debouncedSearch('测试');
    
    searchHook.clearQuery();
    
    await wait(250);
    
    expect(searchHook.getQuery()).toBe('');
  });
});
