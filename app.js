(function() {
  'use strict';

  const STORAGE_KEY = 'markdown-notes-app';
  const AUTOSAVE_DELAY = 500;
  const PREVIEW_DELAY = 300;

  let state = {
    notes: [],
    activeNoteId: null
  };

  let autosaveTimer = null;
  let previewTimer = null;

  const elements = {
    noteList: document.getElementById('noteList'),
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    noteTitleInput: document.getElementById('noteTitleInput'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    saveStatus: document.getElementById('saveStatus'),
    emptyState: document.getElementById('emptyState'),
    mainContent: document.querySelector('.main-content'),
    splitterHorizontal: document.getElementById('splitterHorizontal')
  };

  const icons = {
    trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    loader: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    alert: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
  };

  const codeHighlightKeywords = {
    javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'new', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'this'],
    python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'with', 'try', 'except', 'raise', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'],
    css: ['@import', '@media', '@keyframes', '@font-face', '!important', 'auto', 'inherit', 'none', 'transparent', 'solid', 'dashed', 'flex', 'grid', 'block', 'inline', 'relative', 'absolute', 'fixed'],
    html: ['<!DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta']
  };

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  function extractTitle(content) {
    const firstLine = content.trim().split('\n')[0] || '';
    const titleMatch = firstLine.match(/^#\s+(.+)$/);
    if (titleMatch) return titleMatch[1].trim();
    return firstLine.slice(0, 50) || '无标题笔记';
  }

  function extractPreview(content) {
    const lines = content.trim().split('\n');
    const startIndex = lines[0] && lines[0].startsWith('#') ? 1 : 0;
    const preview = lines.slice(startIndex, startIndex + 3)
      .join(' ')
      .replace(/[#*`\[\]\(\)!]/g, '')
      .trim();
    return preview.slice(0, 60) || '暂无内容';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        state.notes = data.notes || [];
        state.activeNoteId = data.activeNoteId;
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      state.notes = [];
      state.activeNoteId = null;
    }
  }

  function saveToStorage(immediate = false) {
    updateSaveStatus('saving');
    
    const doSave = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          notes: state.notes,
          activeNoteId: state.activeNoteId
        }));
        updateSaveStatus('saved');
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
        updateSaveStatus('error');
      }
    };

    if (immediate) {
      doSave();
    } else {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(doSave, AUTOSAVE_DELAY);
    }
  }

  function updateSaveStatus(status) {
    const icon = elements.saveStatus.querySelector('.icon');
    const text = elements.saveStatus.querySelector('span');
    
    elements.saveStatus.classList.remove('saving', 'saved', 'error');
    
    if (status === 'saving') {
      elements.saveStatus.classList.add('saving');
      icon.outerHTML = icons.loader;
      text.textContent = '保存中...';
    } else if (status === 'saved') {
      elements.saveStatus.classList.add('saved');
      icon.outerHTML = icons.check;
      text.textContent = '已保存';
    } else if (status === 'error') {
      icon.outerHTML = icons.alert;
      text.textContent = '保存失败';
    }
  }

  function highlightCode(code, lang) {
    let highlighted = escapeHtml(code);
    const keywords = codeHighlightKeywords[lang] || [];
    
    keywords.forEach(keyword => {
      const regex = new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
      highlighted = highlighted.replace(regex, '<span class="hljs-keyword">' + keyword + '</span>');
    });
    
    highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="hljs-string">$&</span>');
    highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="hljs-comment">$1</span>');
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
    highlighted = highlighted.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="hljs-function">$1</span>');
    
    return highlighted;
  }

  function parseMarkdown(text) {
    if (!text) return '';
    
    const codeBlocks = [];
    let blockIndex = 0;
    
    text = text.replace(/```(\w+)?\s*([\s\S]*?)```/g, function(match, lang, code) {
      const id = '%%CODEBLOCK' + (blockIndex++) + '%%';
      codeBlocks.push({ lang: lang || '', code: code });
      return '\n' + id + '\n';
    });
    
    const inlineCode = [];
    let inlineIndex = 0;
    
    text = text.replace(/`([^`]+)`/g, function(match, code) {
      const id = '%%INLINECODE' + (inlineIndex++) + '%%';
      inlineCode.push(code);
      return id;
    });
    
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let listType = null;
    let inBlockquote = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      if (/^%%CODEBLOCK\d+%%$/.test(line.trim())) {
        if (inList) { html += '</' + listType + '>'; inList = false; listType = null; }
        if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
        
        const idx = parseInt(line.trim().match(/\d+/)[0]);
        const block = codeBlocks[idx];
        const highlighted = highlightCode(block.code, block.lang);
        html += '<pre><code' + (block.lang ? ' class="language-' + block.lang + '"' : '') + '>' + highlighted + '</code></pre>';
        continue;
      }
      
      if (line.trim() === '') {
        if (inList) { html += '</' + listType + '>'; inList = false; listType = null; }
        if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
        continue;
      }
      
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (inList) { html += '</' + listType + '>'; inList = false; listType = null; }
        if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
        const level = headingMatch[1].length;
        html += '<h' + level + '>' + parseInlineMarkdown(headingMatch[2]) + '</h' + level + '>';
        continue;
      }
      
      const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      
      if (ulMatch || olMatch) {
        const newListType = ulMatch ? 'ul' : 'ol';
        const content = ulMatch ? ulMatch[1] : olMatch[1];
        
        if (!inList || listType !== newListType) {
          if (inList) html += '</' + listType + '>';
          if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
          html += '<' + newListType + '>';
          inList = true;
          listType = newListType;
        }
        html += '<li>' + parseInlineMarkdown(content) + '</li>';
        continue;
      }
      
      const bqMatch = line.match(/^>\s*(.+)$/);
      if (bqMatch) {
        if (inList) { html += '</' + listType + '>'; inList = false; listType = null; }
        if (!inBlockquote) {
          html += '<blockquote>';
          inBlockquote = true;
        }
        html += '<p>' + parseInlineMarkdown(bqMatch[1]) + '</p>';
        continue;
      }
      
      if (inList) { html += '</' + listType + '>'; inList = false; listType = null; }
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      
      if (/^\s*\|.*\|\s*$/.test(line) && i < lines.length - 1 && /^\s*\|[-:]+\|\s*$/.test(lines[i + 1])) {
        const headerCells = line.split('|').filter(c => c.trim() !== '');
        i += 2;
        html += '<table><thead><tr>';
        headerCells.forEach(cell => {
          html += '<th>' + parseInlineMarkdown(cell.trim()) + '</th>';
        });
        html += '</tr></thead><tbody>';
        
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          const cells = lines[i].split('|').filter(c => c.trim() !== '');
          html += '<tr>';
          cells.forEach(cell => {
            html += '<td>' + parseInlineMarkdown(cell.trim()) + '</td>';
          });
          html += '</tr>';
          i++;
        }
        i--;
        html += '</tbody></table>';
        continue;
      }
      
      if (/^\s*---+\s*$/.test(line)) {
        html += '<hr>';
        continue;
      }
      
      html += '<p>' + parseInlineMarkdown(line) + '</p>';
    }
    
    if (inList) html += '</' + listType + '>';
    if (inBlockquote) html += '</blockquote>';
    
    html = html.replace(/%%INLINECODE(\d+)%%/g, function(match, idx) {
      return '<code>' + escapeHtml(inlineCode[parseInt(idx)]) + '</code>';
    });
    
    return html;
  }

  function parseInlineMarkdown(text) {
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return text;
  }

  function updatePreview(content) {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      elements.preview.innerHTML = parseMarkdown(content);
    }, PREVIEW_DELAY);
  }

  function renderNoteList() {
    elements.noteList.innerHTML = '';
    
    const sortedNotes = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt);
    
    sortedNotes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'note-item' + (note.id === state.activeNoteId ? ' active' : '');
      item.dataset.id = note.id;
      
      const title = extractTitle(note.content);
      const preview = extractPreview(note.content);
      const date = formatDate(note.updatedAt);
      
      item.innerHTML = `
        <div class="note-item-content">
          <div class="note-item-title">${escapeHtml(title)}</div>
          <div class="note-item-preview">${escapeHtml(preview)}</div>
          <div class="note-item-date">${date}</div>
        </div>
        <div class="note-delete" title="删除笔记">
          ${icons.trash}
        </div>
      `;
      
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.note-delete')) {
          setActiveNote(note.id);
        }
      });
      
      const deleteBtn = item.querySelector('.note-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(note.id);
      });
      
      elements.noteList.appendChild(item);
    });
  }

  function updateEditorContent() {
    const note = getActiveNote();
    if (note) {
      elements.editor.value = note.content;
      elements.noteTitleInput.value = extractTitle(note.content);
      updatePreview(note.content);
    }
  }

  function getActiveNote() {
    return state.notes.find(n => n.id === state.activeNoteId) || null;
  }

  function setActiveNote(noteId) {
    saveToStorage(true);
    state.activeNoteId = noteId;
    renderNoteList();
    updateEditorContent();
    updateEmptyState();
    saveToStorage(true);
  }

  function addNote() {
    saveToStorage(true);
    
    const newNote = {
      id: generateId(),
      content: '# 新笔记\n\n开始写作...\n',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    state.notes.push(newNote);
    state.activeNoteId = newNote.id;
    
    renderNoteList();
    updateEditorContent();
    updateEmptyState();
    saveToStorage(true);
    
    setTimeout(() => {
      elements.editor.focus();
      elements.editor.setSelectionRange(2, 5);
    }, 50);
  }

  function deleteNote(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;
    
    const title = extractTitle(note.content);
    if (!confirm(`确定要删除笔记「${title}」吗？此操作无法撤销。`)) {
      return;
    }
    
    state.notes = state.notes.filter(n => n.id !== noteId);
    
    if (state.activeNoteId === noteId) {
      if (state.notes.length > 0) {
        state.activeNoteId = state.notes[0].id;
        updateEditorContent();
      } else {
        state.activeNoteId = null;
        elements.editor.value = '';
        elements.noteTitleInput.value = '';
        elements.preview.innerHTML = '';
      }
      updateEmptyState();
    }
    
    renderNoteList();
    saveToStorage(true);
  }

  function updateEmptyState() {
    if (state.notes.length === 0 || !state.activeNoteId) {
      elements.emptyState.classList.add('visible');
      elements.mainContent.style.display = 'none';
    } else {
      elements.emptyState.classList.remove('visible');
      elements.mainContent.style.display = 'flex';
    }
  }

  function onEditorInput() {
    const note = getActiveNote();
    if (!note) return;
    
    const content = elements.editor.value;
    note.content = content;
    note.updatedAt = Date.now();
    
    elements.noteTitleInput.value = extractTitle(content);
    
    updatePreview(content);
    renderNoteList();
    saveToStorage();
  }

  function onTitleInput() {
    const note = getActiveNote();
    if (!note) return;
    
    const newTitle = elements.noteTitleInput.value.trim();
    if (!newTitle) return;
    
    const content = note.content;
    const lines = content.split('\n');
    
    if (lines[0] && lines[0].startsWith('# ')) {
      lines[0] = '# ' + newTitle;
    } else {
      lines.unshift('# ' + newTitle, '');
    }
    
    note.content = lines.join('\n');
    note.updatedAt = Date.now();
    
    elements.editor.value = note.content;
    updatePreview(note.content);
    renderNoteList();
    saveToStorage();
  }

  function initSplitter() {
    const splitter = elements.splitterHorizontal;
    let isDragging = false;
    
    splitter.addEventListener('mousedown', (e) => {
      isDragging = true;
      splitter.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const rect = document.querySelector('.app').getBoundingClientRect();
      const editorPane = document.querySelector('.editor-pane');
      const previewPane = document.querySelector('.preview-pane');
      const totalHeight = editorPane.offsetHeight + previewPane.offsetHeight;
      const newEditorHeight = e.clientY - rect.top - 
        document.querySelector('.sidebar-header').offsetHeight;
      
      const minHeight = 100;
      const editorHeight = Math.max(minHeight, Math.min(totalHeight - minHeight, newEditorHeight - 48));
      const previewHeight = totalHeight - editorHeight - 4;
      
      editorPane.style.flex = '0 0 ' + editorHeight + 'px';
      previewPane.style.flex = '0 0 ' + previewHeight + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        splitter.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }

  function initWelcomeNote() {
    if (state.notes.length === 0) {
      const welcomeNote = {
        id: generateId(),
        content: `# 欢迎使用 Markdown 笔记

这是一款纯浏览器端的 Markdown 笔记应用，**无需后端**，所有数据都保存在你的浏览器本地。

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

![示例图片](https://picsum.photos/600/200)

### 代码

行内代码：\`console.log('Hello World')\`

代码块：

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Markdown'));
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

### 引用

> 这是一段引用文字。
> Markdown 让写作变得简单而优雅。

### 表格

| 功能 | 描述 | 状态 |
|------|------|------|
| 标题 | 支持 # 到 ###### | ✅ |
| 列表 | 有序/无序 | ✅ |
| 代码 | 行内/代码块 | ✅ |
| 图片 | 支持外链 | ✅ |

---

开始创建你的第一篇笔记吧！点击左侧「新建笔记」按钮。
`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      state.notes.push(welcomeNote);
      state.activeNoteId = welcomeNote.id;
      saveToStorage(true);
    }
  }

  function bindEvents() {
    elements.newNoteBtn.addEventListener('click', addNote);
    elements.editor.addEventListener('input', onEditorInput);
    elements.noteTitleInput.addEventListener('change', onTitleInput);
    
    window.addEventListener('beforeunload', () => {
      saveToStorage(true);
    });
    
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addNote();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToStorage(true);
      }
    });
  }

  function init() {
    loadFromStorage();
    initWelcomeNote();
    renderNoteList();
    updateEditorContent();
    updateEmptyState();
    initSplitter();
    bindEvents();
    
    if (state.activeNoteId) {
      elements.editor.focus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
