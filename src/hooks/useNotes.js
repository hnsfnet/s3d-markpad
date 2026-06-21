import { createStore } from './createStore.js';
import { generateId, extractTitle } from '../utils/helpers.js';

const store = createStore({
  notes: [],
  activeNoteId: null,
  isComposing: false,
  isSwitchingNote: false
});

let autosaveTimer = null;
const AUTOSAVE_DELAY = 500;
const LONG_CONTENT_THRESHOLD = 2000;

export function useNotes() {
  const { getState, setState, subscribe } = store;

  function getNotes() {
    return getState().notes;
  }

  function getActiveNote() {
    const { notes, activeNoteId } = getState();
    return notes.find(n => n.id === activeNoteId) || null;
  }

  function getActiveNoteId() {
    return getState().activeNoteId;
  }

  function getIsComposing() {
    return getState().isComposing;
  }

  function getIsSwitchingNote() {
    return getState().isSwitchingNote;
  }

  function setIsComposing(value) {
    setState({ isComposing: value });
  }

  function setIsSwitchingNote(value) {
    setState({ isSwitchingNote: value });
  }

  function setNotes(notes) {
    setState({ notes });
  }

  function setActiveNoteId(noteId) {
    setState({ activeNoteId: noteId });
  }

  function addNote(folderId = null) {
    const { notes } = getState();
    const newNote = {
      id: generateId(),
      content: '# 新笔记\n\n开始写作...\n',
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setState({
      notes: [...notes, newNote],
      activeNoteId: newNote.id
    });
    
    return newNote;
  }

  function deleteNote(noteId) {
    const { notes, activeNoteId } = getState();
    const note = notes.find(n => n.id === noteId);
    if (!note) return null;
    
    const title = extractTitle(note.content);
    if (!confirm(`确定要删除笔记「${title}」吗？此操作无法撤销。`)) {
      return null;
    }
    
    const newNotes = notes.filter(n => n.id !== noteId);
    let newActiveId = activeNoteId;
    
    if (activeNoteId === noteId) {
      if (newNotes.length > 0) {
        newActiveId = newNotes[0].id;
      } else {
        newActiveId = null;
      }
    }
    
    setState({
      notes: newNotes,
      activeNoteId: newActiveId
    });
    
    return noteId;
  }

  function updateNoteContent(noteId, content) {
    const { notes } = getState();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    note.content = content;
    note.updatedAt = Date.now();
    
    setState({ notes: [...notes] });
  }

  function updateNoteFolder(noteId, folderId) {
    const { notes } = getState();
    const note = notes.find(n => n.id === noteId);
    if (!note || note.folderId === folderId) return;
    
    note.folderId = folderId;
    note.updatedAt = Date.now();
    
    setState({ notes: [...notes] });
  }

  function getNotesInFolder(folderId) {
    return getState().notes.filter(n => n.folderId === folderId);
  }

  function getUnfiledNotes() {
    return getState().notes.filter(n => !n.folderId);
  }

  function getPreviewDelay(contentLength) {
    if (contentLength > LONG_CONTENT_THRESHOLD * 3) {
      return 800;
    } else if (contentLength > LONG_CONTENT_THRESHOLD * 2) {
      return 600;
    } else if (contentLength > LONG_CONTENT_THRESHOLD) {
      return 450;
    }
    return 300;
  }

  function clearTimers() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
  }

  function setAutosaveTimer(callback) {
    clearTimers();
    autosaveTimer = setTimeout(callback, AUTOSAVE_DELAY);
  }

  function initWelcomeNote() {
    const { notes } = getState();
    if (notes.length === 0) {
      const welcomeNote = {
        id: generateId(),
        content: `# 欢迎使用 Markdown 笔记

这是一款纯浏览器端的 Markdown 笔记应用，**无需后端**，所有数据都保存在你的浏览器本地。

## 📁 文件夹分类

你现在可以创建文件夹来管理笔记了！
- 点击顶部的「文件夹+」按钮创建新文件夹
- 拖拽笔记到不同的文件夹进行归类
- 悬停在文件夹上可以重命名或删除

## 🔍 全局搜索

在左侧搜索框输入关键词，可以实时搜索所有笔记的标题和内容，匹配的文字会高亮显示。

## 🌙 深色模式

点击右上角的太阳/月亮按钮，可以在浅色和深色主题之间切换，你的选择会被记住。

## 主要功能

- 📝 **实时编辑与预览**：上方编辑，下方实时预览
- 💾 **自动保存**：内容自动保存，无需手动操作
- 🗂️ **笔记管理**：左侧列表，支持新建和删除笔记
- 🔒 **隐私安全**：数据仅存储在本地 localStorage

## 支持的 Markdown 语法

### 文本格式

**粗体文本** 和 *斜体文本*，以及 ~~删除线~~。

### 列表

无序列表：
- 第一项
- 第二项
- 第三项

有序列表：
1. 第一步
2. 第二步
3. 第三步

### 链接和图片

[访问 GitHub](https://github.com)

### 代码

行内代码：\`console.log('Hello World')\`

代码块：

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Markdown'));
\`\`\`

### 引用

> 这是一段引用文字。
> Markdown 让写作变得简单而优雅。

### 表格

| 功能 | 描述 | 状态 |
|------|------|------|
| 文件夹 | 支持拖拽归类 | ✅ |
| 搜索 | 实时过滤高亮 | ✅ |
| 深色模式 | 主题切换 | ✅ |

---

开始创建你的第一篇笔记吧！点击左侧「新建笔记」按钮。
`,
        folderId: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setState({
        notes: [welcomeNote],
        activeNoteId: welcomeNote.id
      });
      
      return welcomeNote;
    }
    return null;
  }

  return {
    getNotes,
    getActiveNote,
    getActiveNoteId,
    getIsComposing,
    getIsSwitchingNote,
    setIsComposing,
    setIsSwitchingNote,
    setNotes,
    setActiveNoteId,
    addNote,
    deleteNote,
    updateNoteContent,
    updateNoteFolder,
    getNotesInFolder,
    getUnfiledNotes,
    getPreviewDelay,
    clearTimers,
    setAutosaveTimer,
    initWelcomeNote,
    subscribe
  };
}
