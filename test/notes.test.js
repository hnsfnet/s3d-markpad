// 笔记 CRUD 操作测试
import { describe, test, expect, beforeEach, afterEach } from './test-framework.js';
import { useNotes } from '../src/hooks/useNotes.js';
import { resetAllHooks, createTestNote, setupTestEnvironment, teardownTestEnvironment, wait } from './test-helpers.js';

describe('笔记 CRUD 操作', () => {
  let notesHook;

  beforeEach(() => {
    setupTestEnvironment();
    resetAllHooks();
    notesHook = useNotes();
  });

  afterEach(() => {
    resetAllHooks();
    teardownTestEnvironment();
  });

  test('创建笔记 - 应该成功创建新笔记并设置为活动笔记', () => {
    expect(notesHook.getNotes()).toHaveLength(0);
    expect(notesHook.getActiveNoteId()).toBe(null);

    const note = notesHook.addNote();

    expect(notesHook.getNotes()).toHaveLength(1);
    expect(notesHook.getActiveNoteId()).toBe(note.id);
    expect(note.content).toContain('# 新笔记');
    expect(note.folderId).toBe(null);
    expect(note.createdAt).toBeGreaterThan(0);
    expect(note.updatedAt).toBeGreaterThan(0);
  });

  test('创建笔记到指定文件夹 - 应该正确设置 folderId', () => {
    const folderId = 'test-folder-123';
    const note = notesHook.addNote(folderId);

    expect(note.folderId).toBe(folderId);
    expect(notesHook.getNotesInFolder(folderId)).toHaveLength(1);
  });

  test('创建多篇笔记 - 应该正确累加并设置最后创建的为活动笔记', () => {
    const note1 = notesHook.addNote();
    const note2 = notesHook.addNote();
    const note3 = notesHook.addNote();

    expect(notesHook.getNotes()).toHaveLength(3);
    expect(notesHook.getActiveNoteId()).toBe(note3.id);
    expect(notesHook.getNotes().map(n => n.id)).toContain(note1.id);
    expect(notesHook.getNotes().map(n => n.id)).toContain(note2.id);
    expect(notesHook.getNotes().map(n => n.id)).toContain(note3.id);
  });

  test('编辑笔记内容 - 应该正确更新内容和 updatedAt', async () => {
    const note = createTestNote();
    const originalUpdatedAt = note.updatedAt;
    const newContent = '# 更新后的标题\n\n更新后的内容';

    await wait(10);
    notesHook.updateNoteContent(note.id, newContent);

    const updatedNote = notesHook.getNoteById(note.id);
    expect(updatedNote.content).toBe(newContent);
    expect(updatedNote.updatedAt).toBeGreaterThan(originalUpdatedAt);
  });

  test('编辑笔记内容 - 不存在的笔记应该不报错', () => {
    expect(() => {
      notesHook.updateNoteContent('non-existent-id', 'content');
    }).not.toThrow();
  });

  test('删除笔记 - 应该正确删除笔记', () => {
    const note1 = createTestNote('# 笔记1');
    createTestNote('# 笔记2');
    createTestNote('# 笔记3');

    expect(notesHook.getNotes()).toHaveLength(3);

    const deletedId = notesHook.deleteNote(note1.id);

    expect(deletedId).toBe(note1.id);
    expect(notesHook.getNotes()).toHaveLength(2);
    expect(notesHook.getNoteById(note1.id)).toBe(null);
  });

  test('删除活动笔记 - 应该自动切换到另一篇笔记', () => {
    const note1 = createTestNote('# 笔记1');
    const note2 = createTestNote('# 笔记2');
    const note3 = createTestNote('# 笔记3');

    notesHook.setActiveNoteId(note2.id);
    expect(notesHook.getActiveNoteId()).toBe(note2.id);

    notesHook.deleteNote(note2.id);

    expect(notesHook.getNotes()).toHaveLength(2);
    expect(notesHook.getActiveNoteId()).not.toBe(note2.id);
    expect([note1.id, note3.id]).toContain(notesHook.getActiveNoteId());
  });

  test('删除最后一篇笔记 - 应该将活动笔记设为 null', () => {
    const note = createTestNote();

    notesHook.deleteNote(note.id);

    expect(notesHook.getNotes()).toHaveLength(0);
    expect(notesHook.getActiveNoteId()).toBe(null);
  });

  test('删除不存在的笔记 - 应该返回 null', () => {
    const result = notesHook.deleteNote('non-existent-id');
    expect(result).toBe(null);
  });

  test('切换笔记 - 应该正确设置活动笔记', () => {
    const note1 = createTestNote('# 笔记1');
    const note2 = createTestNote('# 笔记2');

    expect(notesHook.getActiveNoteId()).toBe(note2.id);

    notesHook.setActiveNoteId(note1.id);
    expect(notesHook.getActiveNoteId()).toBe(note1.id);
    expect(notesHook.getActiveNote().id).toBe(note1.id);
  });

  test('切换笔记时内容正确加载 - getActiveNote 应该返回正确的内容', () => {
    const content1 = '# 笔记1\n\n这是笔记1的内容';
    const content2 = '# 笔记2\n\n这是笔记2的内容';

    const note1 = createTestNote(content1);
    const note2 = createTestNote(content2);

    notesHook.setActiveNoteId(note1.id);
    expect(notesHook.getActiveNote().content).toBe(content1);

    notesHook.setActiveNoteId(note2.id);
    expect(notesHook.getActiveNote().content).toBe(content2);
  });

  test('getNoteById - 应该返回正确的笔记', () => {
    const note = createTestNote();

    const found = notesHook.getNoteById(note.id);
    expect(found.id).toBe(note.id);
    expect(found.content).toBe(note.content);
  });

  test('getNoteById - 不存在的 ID 应该返回 null', () => {
    const found = notesHook.getNoteById('non-existent-id');
    expect(found).toBe(null);
  });

  test('getUnfiledNotes - 应该只返回未分类的笔记', () => {
    createTestNote('# 未分类1');
    createTestNote('# 未分类2');
    createTestNote('# 文件夹笔记', 'folder-123');

    const unfiled = notesHook.getUnfiledNotes();
    expect(unfiled).toHaveLength(2);
    unfiled.forEach(note => {
      expect(note.folderId).toBe(null);
    });
  });

  test('getNotesInFolder - 应该只返回指定文件夹的笔记', () => {
    const folderId = 'test-folder';
    createTestNote('# 文件夹笔记1', folderId);
    createTestNote('# 文件夹笔记2', folderId);
    createTestNote('# 未分类笔记');

    const folderNotes = notesHook.getNotesInFolder(folderId);
    expect(folderNotes).toHaveLength(2);
    folderNotes.forEach(note => {
      expect(note.folderId).toBe(folderId);
    });
  });

  test('updateNoteFolder - 应该正确更新笔记的文件夹', () => {
    const note = createTestNote();
    const newFolderId = 'new-folder';

    expect(note.folderId).toBe(null);

    notesHook.updateNoteFolder(note.id, newFolderId);

    const updated = notesHook.getNoteById(note.id);
    expect(updated.folderId).toBe(newFolderId);
  });

  test('updateNoteFolder - 相同文件夹 ID 应该不更新', () => {
    const folderId = 'folder-123';
    const note = createTestNote('# 笔记', folderId);
    const originalUpdatedAt = note.updatedAt;

    setTimeout(() => {
      notesHook.updateNoteFolder(note.id, folderId);
    }, 10);

    const updated = notesHook.getNoteById(note.id);
    expect(updated.updatedAt).toBe(originalUpdatedAt);
  });

  test('智能预览延迟 - 短内容应该返回 300ms', () => {
    const delay = notesHook.getPreviewDelay(100);
    expect(delay).toBe(300);
  });

  test('智能预览延迟 - 中等内容应该返回 500ms', () => {
    const delay = notesHook.getPreviewDelay(3500);
    expect(delay).toBe(500);
  });

  test('智能预览延迟 - 长内容应该返回 650ms', () => {
    const delay = notesHook.getPreviewDelay(5000);
    expect(delay).toBe(650);
  });

  test('智能预览延迟 - 超长内容应该返回 800ms', () => {
    const delay = notesHook.getPreviewDelay(7000);
    expect(delay).toBe(800);
  });

  test('笔记 ID 应该唯一', () => {
    const ids = new Set();
    for (let i = 0; i < 10; i++) {
      const note = notesHook.addNote();
      ids.add(note.id);
    }
    expect(ids.size).toBe(10);
  });
});
