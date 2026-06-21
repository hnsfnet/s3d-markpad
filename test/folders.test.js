// 文件夹操作测试
import { describe, test, expect, beforeEach, afterEach } from './test-framework.js';
import { useFolders } from '../src/hooks/useFolders.js';
import { useNotes } from '../src/hooks/useNotes.js';
import { resetAllHooks, createTestFolder, setupTestEnvironment, teardownTestEnvironment, wait } from './test-helpers.js';

describe('文件夹操作', () => {
  let foldersHook;
  let notesHook;

  beforeEach(() => {
    setupTestEnvironment();
    resetAllHooks();
    foldersHook = useFolders();
    notesHook = useNotes();
  });

  afterEach(() => {
    resetAllHooks();
    teardownTestEnvironment();
  });

  test('创建文件夹 - 应该成功创建新文件夹并自动展开', () => {
    expect(foldersHook.getFolders()).toHaveLength(0);

    const folder = foldersHook.addFolder();

    expect(foldersHook.getFolders()).toHaveLength(1);
    expect(folder.name).toBe('新建文件夹');
    expect(folder.createdAt).toBeGreaterThan(0);
    expect(foldersHook.isFolderExpanded(folder.id)).toBe(true);
    expect(foldersHook.getEditingFolderId()).toBe(folder.id);
  });

  test('创建多个文件夹 - 应该正确累加并按创建时间排序', async () => {
    const folder1 = foldersHook.addFolder();
    await wait(5);
    const folder2 = foldersHook.addFolder();
    await wait(5);
    const folder3 = foldersHook.addFolder();

    expect(foldersHook.getFolders()).toHaveLength(3);

    const sorted = foldersHook.getSortedFolders();
    expect(sorted[0].id).toBe(folder1.id);
    expect(sorted[1].id).toBe(folder2.id);
    expect(sorted[2].id).toBe(folder3.id);
    expect(sorted[0].createdAt).toBeLessThan(sorted[2].createdAt);
  });

  test('重命名文件夹 - 应该正确更新文件夹名称', () => {
    const folder = createTestFolder('原文件夹名');

    const result = foldersHook.renameFolder(folder.id, '新文件夹名');

    expect(result).toBe(true);
    expect(foldersHook.getFolderById(folder.id).name).toBe('新文件夹名');
  });

  test('重命名文件夹 - 名称去空格', () => {
    const folder = createTestFolder('原名称');

    const result = foldersHook.renameFolder(folder.id, '  新名称  ');

    expect(result).toBe(true);
    expect(foldersHook.getFolderById(folder.id).name).toBe('新名称');
  });

  test('重命名文件夹 - 空名称应该不更新', () => {
    const folder = createTestFolder('原名称');

    const result = foldersHook.renameFolder(folder.id, '   ');

    expect(result).toBe(false);
    expect(foldersHook.getFolderById(folder.id).name).toBe('原名称');
  });

  test('重命名文件夹 - 相同名称应该不更新', () => {
    const folder = createTestFolder('测试文件夹');

    const result = foldersHook.renameFolder(folder.id, '测试文件夹');

    expect(result).toBe(false);
    expect(foldersHook.getEditingFolderId()).toBe(null);
  });

  test('重命名文件夹 - 不存在的文件夹应该不报错', () => {
    expect(() => {
      foldersHook.renameFolder('non-existent-id', '新名称');
    }).not.toThrow();
  });

  test('删除空文件夹 - 应该成功删除', () => {
    const folder = createTestFolder('待删除文件夹');
    expect(foldersHook.getFolders()).toHaveLength(1);

    const result = foldersHook.deleteFolder(folder.id, notesHook);

    expect(result).toBe(true);
    expect(foldersHook.getFolders()).toHaveLength(0);
    expect(foldersHook.getFolderById(folder.id)).toBe(null);
    expect(foldersHook.isFolderExpanded(folder.id)).toBe(false);
  });

  test('删除含笔记的文件夹 - 应该删除文件夹及其中的笔记', () => {
    const folder = createTestFolder('测试文件夹');

    const note1 = notesHook.addNote(folder.id);
    const note2 = notesHook.addNote(folder.id);
    const note3 = notesHook.addNote(null);

    expect(foldersHook.getFolders()).toHaveLength(1);
    expect(notesHook.getNotes()).toHaveLength(3);
    expect(notesHook.getNotesInFolder(folder.id)).toHaveLength(2);

    const result = foldersHook.deleteFolder(folder.id, notesHook);

    expect(result).toBe(true);
    expect(foldersHook.getFolders()).toHaveLength(0);

    const remainingNoteIds = notesHook.getNotes().map(n => n.id);
    expect(remainingNoteIds).not.toContain(note1.id);
    expect(remainingNoteIds).not.toContain(note2.id);
    expect(remainingNoteIds).toContain(note3.id);
    expect(notesHook.getNotes()).toHaveLength(1);
  });

  test('删除含笔记的文件夹 - 不传入 notesHook 时只删除文件夹', () => {
    const folder = createTestFolder('测试文件夹');

    const note1 = notesHook.addNote(folder.id);
    const note2 = notesHook.addNote(folder.id);

    expect(foldersHook.getFolders()).toHaveLength(1);
    expect(notesHook.getNotes()).toHaveLength(2);

    const result = foldersHook.deleteFolder(folder.id, null);

    expect(result).toBe(true);
    expect(foldersHook.getFolders()).toHaveLength(0);
    expect(notesHook.getNotes()).toHaveLength(2);
    
    const updatedNote1 = notesHook.getNoteById(note1.id);
    const updatedNote2 = notesHook.getNoteById(note2.id);
    expect(updatedNote1.folderId).toBe(folder.id);
    expect(updatedNote2.folderId).toBe(folder.id);
  });

  test('删除不存在的文件夹 - 应该返回 false', () => {
    const result = foldersHook.deleteFolder('non-existent-id', notesHook);
    expect(result).toBe(false);
  });

  test('切换文件夹展开状态 - 应该正确切换', () => {
    const folder = createTestFolder();
    expect(foldersHook.isFolderExpanded(folder.id)).toBe(true);

    foldersHook.toggleFolder(folder.id);
    expect(foldersHook.isFolderExpanded(folder.id)).toBe(false);

    foldersHook.toggleFolder(folder.id);
    expect(foldersHook.isFolderExpanded(folder.id)).toBe(true);
  });

  test('切换多个文件夹展开状态 - 应该互不影响', () => {
    const folder1 = createTestFolder('文件夹1');
    const folder2 = createTestFolder('文件夹2');

    expect(foldersHook.isFolderExpanded(folder1.id)).toBe(true);
    expect(foldersHook.isFolderExpanded(folder2.id)).toBe(true);

    foldersHook.toggleFolder(folder1.id);

    expect(foldersHook.isFolderExpanded(folder1.id)).toBe(false);
    expect(foldersHook.isFolderExpanded(folder2.id)).toBe(true);
  });

  test('getFolderById - 应该返回正确的文件夹', () => {
    const folder = createTestFolder('测试文件夹');

    const found = foldersHook.getFolderById(folder.id);
    expect(found.id).toBe(folder.id);
    expect(found.name).toBe('测试文件夹');
  });

  test('getFolderById - 不存在的 ID 应该返回 null', () => {
    const found = foldersHook.getFolderById('non-existent-id');
    expect(found).toBe(null);
  });

  test('getExpandedFolders - 应该返回正确的展开集合', () => {
    const folder1 = createTestFolder('文件夹1');
    const folder2 = createTestFolder('文件夹2');
    const folder3 = createTestFolder('文件夹3');

    foldersHook.toggleFolder(folder2.id);

    const expanded = foldersHook.getExpandedFolders();
    expect(expanded.has(folder1.id)).toBe(true);
    expect(expanded.has(folder2.id)).toBe(false);
    expect(expanded.has(folder3.id)).toBe(true);
  });

  test('setActiveFolderId - 应该正确设置活动文件夹', () => {
    expect(foldersHook.getActiveFolderId()).toBe(null);

    const folder = createTestFolder();
    foldersHook.setActiveFolderId(folder.id);

    expect(foldersHook.getActiveFolderId()).toBe(folder.id);
  });

  test('setEditingFolderId - 应该正确设置编辑中的文件夹', () => {
    expect(foldersHook.getEditingFolderId()).toBe(null);

    const folder = createTestFolder();
    foldersHook.setEditingFolderId(folder.id);

    expect(foldersHook.getEditingFolderId()).toBe(folder.id);

    foldersHook.setEditingFolderId(null);
    expect(foldersHook.getEditingFolderId()).toBe(null);
  });

  test('setFolders - 应该正确设置文件夹列表', () => {
    const customFolders = [
      { id: 'custom-1', name: '自定义1', createdAt: Date.now() },
      { id: 'custom-2', name: '自定义2', createdAt: Date.now() + 1000 }
    ];

    foldersHook.setFolders(customFolders);

    expect(foldersHook.getFolders()).toHaveLength(2);
    expect(foldersHook.getFolderById('custom-1').name).toBe('自定义1');
  });

  test('setExpandedFolders - 应该正确设置展开状态', () => {
    const folder1 = createTestFolder('文件夹1');
    const folder2 = createTestFolder('文件夹2');

    const newExpanded = new Set([folder2.id]);
    foldersHook.setExpandedFolders(newExpanded);

    expect(foldersHook.isFolderExpanded(folder1.id)).toBe(false);
    expect(foldersHook.isFolderExpanded(folder2.id)).toBe(true);
  });

  test('initFromStorage - 应该正确从存储数据初始化', () => {
    const storageData = {
      folders: [
        { id: 'stored-1', name: '存储的文件夹1', createdAt: 1000 },
        { id: 'stored-2', name: '存储的文件夹2', createdAt: 2000 }
      ],
      expandedFolders: ['stored-1'],
      activeFolderId: 'stored-2'
    };

    foldersHook.initFromStorage(storageData);

    expect(foldersHook.getFolders()).toHaveLength(2);
    expect(foldersHook.isFolderExpanded('stored-1')).toBe(true);
    expect(foldersHook.isFolderExpanded('stored-2')).toBe(false);
    expect(foldersHook.getActiveFolderId()).toBe('stored-2');
  });

  test('initFromStorage - 空数据应该不报错', () => {
    expect(() => {
      foldersHook.initFromStorage({});
    }).not.toThrow();

    expect(foldersHook.getFolders()).toHaveLength(0);
    expect(foldersHook.getActiveFolderId()).toBe(null);
  });

  test('文件夹 ID 应该唯一', () => {
    const ids = new Set();
    for (let i = 0; i < 10; i++) {
      const folder = foldersHook.addFolder();
      ids.add(folder.id);
    }
    expect(ids.size).toBe(10);
  });

  test('删除含笔记的文件夹 - 活动笔记在被删除文件夹中时应该切换到其他笔记', () => {
    const folder = createTestFolder('测试文件夹');
    const noteInFolder = notesHook.addNote(folder.id);
    const noteOutside = notesHook.addNote(null);

    notesHook.setActiveNoteId(noteInFolder.id);
    expect(notesHook.getActiveNoteId()).toBe(noteInFolder.id);

    const result = foldersHook.deleteFolder(folder.id, notesHook);
    expect(result).toBe(true);

    const remainingNoteIds = notesHook.getNotes().map(n => n.id);
    expect(remainingNoteIds).not.toContain(noteInFolder.id);
    expect(remainingNoteIds).toContain(noteOutside.id);

    expect(notesHook.getActiveNoteId()).toBe(noteOutside.id);
  });

  test('删除含笔记的文件夹 - 删除最后一篇笔记时应该清空活动笔记', () => {
    const folder = createTestFolder('测试文件夹');
    const note = notesHook.addNote(folder.id);

    notesHook.setActiveNoteId(note.id);

    const result = foldersHook.deleteFolder(folder.id, notesHook);
    expect(result).toBe(true);

    expect(notesHook.getNotes()).toHaveLength(0);
    expect(notesHook.getActiveNoteId()).toBe(null);
  });
});
