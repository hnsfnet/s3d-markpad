import { createStore } from './createStore.js';
import { generateId } from '../utils/helpers.js';

const store = createStore({
  folders: [],
  expandedFolders: new Set(),
  activeFolderId: null,
  editingFolderId: null
});

export function useFolders() {
  const { getState, setState, subscribe } = store;

  function getFolders() {
    return getState().folders;
  }

  function getSortedFolders() {
    return [...getState().folders].sort((a, b) => a.createdAt - b.createdAt);
  }

  function getFolderById(folderId) {
    return getState().folders.find(f => f.id === folderId) || null;
  }

  function getExpandedFolders() {
    return getState().expandedFolders;
  }

  function isFolderExpanded(folderId) {
    return getState().expandedFolders.has(folderId);
  }

  function getActiveFolderId() {
    return getState().activeFolderId;
  }

  function getEditingFolderId() {
    return getState().editingFolderId;
  }

  function setFolders(folders) {
    setState({ folders });
  }

  function setExpandedFolders(expandedFolders) {
    setState({ expandedFolders });
  }

  function setActiveFolderId(folderId) {
    setState({ activeFolderId: folderId });
  }

  function setEditingFolderId(folderId) {
    setState({ editingFolderId: folderId });
  }

  function addFolder() {
    const { folders, expandedFolders } = getState();
    const folder = {
      id: generateId(),
      name: '新建文件夹',
      createdAt: Date.now()
    };
    
    const newExpanded = new Set(expandedFolders);
    newExpanded.add(folder.id);
    
    setState({
      folders: [...folders, folder],
      expandedFolders: newExpanded,
      editingFolderId: folder.id
    });
    
    return folder;
  }

  function renameFolder(folderId, newName) {
    const { folders } = getState();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const name = newName.trim();
    if (name && name !== folder.name) {
      folder.name = name;
      setState({ folders: [...folders] });
      return true;
    }
    
    setState({ editingFolderId: null });
    return false;
  }

  function deleteFolder(folderId, notesInFolder) {
    const folder = getFolderById(folderId);
    if (!folder) return false;
    
    const confirmMsg = notesInFolder > 0 
      ? `确定要删除文件夹「${folder.name}」吗？该文件夹内的 ${notesInFolder} 篇笔记也会被一起删除。此操作无法撤销。`
      : `确定要删除文件夹「${folder.name}」吗？此操作无法撤销。`;
    
    if (!confirm(confirmMsg)) return false;
    
    const { folders, expandedFolders } = getState();
    const newExpanded = new Set(expandedFolders);
    newExpanded.delete(folderId);
    
    setState({
      folders: folders.filter(f => f.id !== folderId),
      expandedFolders: newExpanded,
      editingFolderId: null
    });
    
    return true;
  }

  function toggleFolder(folderId) {
    const { expandedFolders } = getState();
    const newExpanded = new Set(expandedFolders);
    
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    
    setState({ expandedFolders: newExpanded });
  }

  function initFromStorage(data) {
    setState({
      folders: data.folders || [],
      expandedFolders: new Set(data.expandedFolders || []),
      activeFolderId: data.activeFolderId || null
    });
  }

  return {
    getFolders,
    getSortedFolders,
    getFolderById,
    getExpandedFolders,
    isFolderExpanded,
    getActiveFolderId,
    getEditingFolderId,
    setFolders,
    setExpandedFolders,
    setActiveFolderId,
    setEditingFolderId,
    addFolder,
    renameFolder,
    deleteFolder,
    toggleFolder,
    initFromStorage,
    subscribe
  };
}
