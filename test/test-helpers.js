// 测试辅助函数
import { clearLocalStorage } from './test-framework.js';
export { clearLocalStorage };
import { useNotes } from '../src/hooks/useNotes.js';
import { useFolders } from '../src/hooks/useFolders.js';
import { useSearch } from '../src/hooks/useSearch.js';
import { useTheme } from '../src/hooks/useTheme.js';

let originalConfirm;
let originalAlert;

export function setupTestEnvironment() {
  originalConfirm = window.confirm;
  originalAlert = window.alert;
  window.confirm = () => true;
  window.alert = () => {};
}

export function teardownTestEnvironment() {
  window.confirm = originalConfirm;
  window.alert = originalAlert;
}

export function resetAllHooks() {
  const notesHook = useNotes();
  const foldersHook = useFolders();
  const searchHook = useSearch();
  const themeHook = useTheme();

  notesHook.setNotes([]);
  notesHook.setActiveNoteId(null);
  notesHook.setIsComposing(false);
  notesHook.setIsSwitchingNote(false);
  notesHook.clearTimers();

  foldersHook.setFolders([]);
  foldersHook.setExpandedFolders(new Set());
  foldersHook.setActiveFolderId(null);
  foldersHook.setEditingFolderId(null);

  searchHook.clearQuery();

  themeHook.reset();

  clearLocalStorage();
}

export function createTestNote(content = '# 测试笔记\n\n内容', folderId = null) {
  const notesHook = useNotes();
  const note = notesHook.addNote(folderId);
  if (content !== '# 新笔记\n\n开始写作...\n') {
    notesHook.updateNoteContent(note.id, content);
  }
  return note;
}

export function createTestFolder(name = '测试文件夹') {
  const foldersHook = useFolders();
  const folder = foldersHook.addFolder();
  if (name !== '新建文件夹') {
    foldersHook.renameFolder(folder.id, name);
  }
  return folder;
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createTestContainer() {
  const container = document.createElement('div');
  container.id = 'test-container-' + Date.now();
  document.body.appendChild(container);
  return container;
}

export function removeTestContainer(container) {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}
