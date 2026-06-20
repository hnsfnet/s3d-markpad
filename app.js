(function() {
  'use strict';

  const STORAGE_KEY = 'markdown-notes-app';
  const THEME_KEY = 'markdown-notes-theme';
  const AUTOSAVE_DELAY = 500;
  const PREVIEW_DELAY = 300;
  const SEARCH_DELAY = 200;
  const LONG_CONTENT_THRESHOLD = 2000;

  let state = {
    notes: [],
    folders: [],
    activeNoteId: null,
    activeFolderId: null,
    expandedFolders: new Set(),
    theme: 'light',
    searchQuery: ''
  };

  let autosaveTimer = null;
  let previewTimer = null;
  let searchTimer = null;
  let editingFolderId = null;
  let isComposing = false;
  let isSwitchingNote = false;

  const elements = {
    folderTree: document.getElementById('folderTree'),
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    noteTitleInput: document.getElementById('noteTitleInput'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    newFolderBtn: document.getElementById('newFolderBtn'),
    saveStatus: document.getElementById('saveStatus'),
    emptyState: document.getElementById('emptyState'),
    searchNoResults: document.getElementById('searchNoResults'),
    mainContent: document.querySelector('.main-content'),
    splitterHorizontal: document.getElementById('splitterHorizontal'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    themeToggle: document.getElementById('themeToggle'),
    notePath: document.getElementById('notePath')
  };

  const icons = {
    trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    loader: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    alert: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    folder: '<svg class="icon folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    folderOpen: '<svg class="icon folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-8l-3-4z"></path></svg>',
    chevronRight: '<svg class="icon folder-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    file: '<svg class="icon unfiled-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>',
    edit: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>'
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

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
    return escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        state.notes = data.notes || [];
        state.folders = data.folders || [];
        state.activeNoteId = data.activeNoteId;
        state.expandedFolders = new Set(data.expandedFolders || []);
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      state.notes = [];
      state.folders = [];
      state.activeNoteId = null;
      state.expandedFolders = new Set();
    }

    try {
      const theme = localStorage.getItem(THEME_KEY);
      if (theme) {
        state.theme = theme;
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
  }

  function saveToStorage(immediate = false) {
    updateSaveStatus('saving');
    
    const doSave = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          notes: state.notes,
          folders: state.folders,
          activeNoteId: state.activeNoteId,
          expandedFolders: Array.from(state.expandedFolders)
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

  function saveThemeToStorage() {
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch (e) {
      console.error('Failed to save theme:', e);
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

  function applyTheme() {
    if (state.theme === 'dark') {
      document.body.classList.add('dark');
      elements.themeToggle.querySelector('.icon-sun').style.display = 'none';
      elements.themeToggle.querySelector('.icon-moon').style.display = 'inline-block';
    } else {
      document.body.classList.remove('dark');
      elements.themeToggle.querySelector('.icon-sun').style.display = 'inline-block';
      elements.themeToggle.querySelector('.icon-moon').style.display = 'none';
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveThemeToStorage();
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
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
    
    const contentLength = content.length;
    let delay = PREVIEW_DELAY;
    
    if (contentLength > LONG_CONTENT_THRESHOLD * 3) {
      delay = 800;
    } else if (contentLength > LONG_CONTENT_THRESHOLD * 2) {
      delay = 600;
    } else if (contentLength > LONG_CONTENT_THRESHOLD) {
      delay = 450;
    }
    
    previewTimer = setTimeout(() => {
      elements.preview.innerHTML = parseMarkdown(content);
    }, delay);
  }

  function getFolderById(folderId) {
    return state.folders.find(f => f.id === folderId) || null;
  }

  function getNotesInFolder(folderId) {
    return state.notes.filter(n => n.folderId === folderId);
  }

  function getUnfiledNotes() {
    return state.notes.filter(n => !n.folderId);
  }

  function searchNotes(query) {
    if (!query.trim()) return state.notes;
    const lowerQuery = query.toLowerCase().trim();
    return state.notes.filter(note => {
      const title = extractTitle(note.content).toLowerCase();
      const content = note.content.toLowerCase();
      return title.includes(lowerQuery) || content.includes(lowerQuery);
    });
  }

  function addFolder() {
    const folder = {
      id: generateId(),
      name: '新建文件夹',
      createdAt: Date.now()
    };
    state.folders.push(folder);
    state.expandedFolders.add(folder.id);
    renderFolderTree();
    saveToStorage(true);
    
    setTimeout(() => {
      startEditingFolder(folder.id);
    }, 50);
  }

  function startEditingFolder(folderId) {
    editingFolderId = folderId;
    renderFolderTree();
    
    setTimeout(() => {
      const input = document.querySelector('.folder-name-input[data-id="' + folderId + '"]');
      if (input) {
        input.focus();
        input.select();
      }
    }, 10);
  }

  function finishEditingFolder(folderId, newName) {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    const name = newName.trim();
    if (name && name !== folder.name) {
      folder.name = name;
      saveToStorage(true);
    }
    
    editingFolderId = null;
    renderFolderTree();
  }

  function deleteFolder(folderId) {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    const noteCount = getNotesInFolder(folderId).length;
    const confirmMsg = noteCount > 0 
      ? `确定要删除文件夹「${folder.name}」吗？该文件夹内的 ${noteCount} 篇笔记也会被一起删除。此操作无法撤销。`
      : `确定要删除文件夹「${folder.name}」吗？此操作无法撤销。`;
    
    if (!confirm(confirmMsg)) return;
    
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
    
    saveToStorage(true);
    
    state.notes = state.notes.filter(n => n.folderId !== folderId);
    state.folders = state.folders.filter(f => f.id !== folderId);
    state.expandedFolders.delete(folderId);
    
    if (state.activeNoteId && getActiveNote()?.folderId === folderId) {
      isSwitchingNote = true;
      state.activeNoteId = null;
      updateEditorContent();
      setTimeout(() => {
        isSwitchingNote = false;
      }, 0);
    }
    
    renderFolderTree();
    updateEmptyState();
    saveToStorage(true);
  }

  function toggleFolder(folderId) {
    if (state.expandedFolders.has(folderId)) {
      state.expandedFolders.delete(folderId);
    } else {
      state.expandedFolders.add(folderId);
    }
    renderFolderTree();
    saveToStorage(true);
  }

  function renderFolderTree() {
    elements.folderTree.innerHTML = '';
    
    const unfiledNotes = getUnfiledNotes();
    const hasUnfiled = unfiledNotes.length > 0 || state.folders.length === 0;
    
    if (hasUnfiled) {
      const unfiledSection = document.createElement('div');
      unfiledSection.className = 'unfiled-section';
      
      const header = document.createElement('div');
      header.className = 'unfiled-header';
      header.dataset.folderId = 'unfiled';
      header.innerHTML = `
        ${icons.file}
        <span class="unfiled-name">未分类笔记</span>
        <span class="unfiled-count">${unfiledNotes.length}</span>
      `;
      
      setupDragDrop(header, null);
      
      unfiledSection.appendChild(header);
      
      const notesContainer = document.createElement('div');
      notesContainer.className = 'folder-notes';
      renderNotesIntoContainer(unfiledNotes, notesContainer, null);
      unfiledSection.appendChild(notesContainer);
      
      elements.folderTree.appendChild(unfiledSection);
    }
    
    const sortedFolders = [...state.folders].sort((a, b) => a.createdAt - b.createdAt);
    sortedFolders.forEach(folder => {
      const folderItem = document.createElement('div');
      folderItem.className = 'folder-item' + (state.expandedFolders.has(folder.id) ? ' expanded' : ' collapsed');
      folderItem.dataset.id = folder.id;
      
      const header = document.createElement('div');
      header.className = 'folder-header';
      header.dataset.folderId = folder.id;
      
      const isEditing = editingFolderId === folder.id;
      
      header.innerHTML = `
        ${icons.chevronRight}
        ${state.expandedFolders.has(folder.id) ? icons.folderOpen : icons.folder}
        ${isEditing 
          ? `<input type="text" class="folder-name-input" data-id="${folder.id}" value="${escapeHtml(folder.name)}">`
          : `<span class="folder-name">${escapeHtml(folder.name)}</span>`
        }
        <span class="unfiled-count">${getNotesInFolder(folder.id).length}</span>
        ${isEditing ? '' : `
          <div class="folder-actions">
            <button class="folder-action-btn" data-action="rename" data-id="${folder.id}" title="重命名">
              ${icons.edit}
            </button>
            <button class="folder-action-btn" data-action="delete" data-id="${folder.id}" title="删除文件夹">
              ${icons.trash}
            </button>
          </div>
        `}
      `;
      
      const toggleBtn = header.querySelector('.folder-toggle');
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFolder(folder.id);
      });
      
      header.addEventListener('click', (e) => {
        if (e.target.closest('.folder-action-btn') || e.target.closest('.folder-name-input')) return;
        toggleFolder(folder.id);
      });
      
      const renameBtn = header.querySelector('[data-action="rename"]');
      if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          startEditingFolder(folder.id);
        });
      }
      
      const deleteBtn = header.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteFolder(folder.id);
        });
      }
      
      const nameInput = header.querySelector('.folder-name-input');
      if (nameInput) {
        nameInput.addEventListener('blur', () => {
          finishEditingFolder(folder.id, nameInput.value);
        });
        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            nameInput.blur();
          } else if (e.key === 'Escape') {
            editingFolderId = null;
            renderFolderTree();
          }
        });
      }
      
      setupDragDrop(header, folder.id);
      
      folderItem.appendChild(header);
      
      const notesContainer = document.createElement('div');
      notesContainer.className = 'folder-notes';
      renderNotesIntoContainer(getNotesInFolder(folder.id), notesContainer, folder.id);
      folderItem.appendChild(notesContainer);
      
      elements.folderTree.appendChild(folderItem);
    });
  }

  function renderNotesIntoContainer(notes, container, folderId) {
    const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    
    sortedNotes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'note-item' + (note.id === state.activeNoteId ? ' active' : '');
      item.dataset.id = note.id;
      item.draggable = true;
      
      const title = extractTitle(note.content);
      const preview = extractPreview(note.content);
      const date = formatDate(note.updatedAt);
      
      const query = state.searchQuery.trim();
      
      item.innerHTML = `
        <div class="note-item-content">
          <div class="note-item-title">${highlightText(title, query)}</div>
          <div class="note-item-preview">${highlightText(preview, query)}</div>
          <div class="note-item-date">${date}</div>
        </div>
        <button class="note-delete" title="删除笔记">
          ${icons.trash}
        </button>
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
      
      setupNoteDrag(item, note.id);
      
      container.appendChild(item);
    });
  }

  function setupNoteDrag(element, noteId) {
    element.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', noteId);
      e.dataTransfer.effectAllowed = 'move';
      element.classList.add('dragging');
    });
    
    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
  }

  function setupDragDrop(element, targetFolderId) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      element.classList.add('drag-over');
    });
    
    element.addEventListener('dragleave', () => {
      element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      
      const noteId = e.dataTransfer.getData('text/plain');
      if (!noteId) return;
      
      const note = state.notes.find(n => n.id === noteId);
      if (!note) return;
      
      if (note.folderId === targetFolderId) return;
      
      note.folderId = targetFolderId;
      note.updatedAt = Date.now();
      
      renderFolderTree();
      updateNotePath();
      saveToStorage(true);
    });
  }

  function updateEditorContent() {
    const note = getActiveNote();
    if (note) {
      elements.editor.value = note.content;
      elements.noteTitleInput.value = extractTitle(note.content);
      updatePreview(note.content);
    } else {
      elements.editor.value = '';
      elements.noteTitleInput.value = '';
      elements.preview.innerHTML = '';
    }
    updateNotePath();
  }

  function updateNotePath() {
    const note = getActiveNote();
    if (!note) {
      elements.notePath.textContent = '';
      return;
    }
    
    const title = extractTitle(note.content);
    if (note.folderId) {
      const folder = getFolderById(note.folderId);
      if (folder) {
        elements.notePath.innerHTML = `<span class="path-folder">${escapeHtml(folder.name)}</span> <span class="path-separator">/</span> <span>${escapeHtml(title)}</span>`;
        return;
      }
    }
    elements.notePath.innerHTML = `<span class="path-folder">未分类笔记</span> <span class="path-separator">/</span> <span>${escapeHtml(title)}</span>`;
  }

  function getActiveNote() {
    return state.notes.find(n => n.id === state.activeNoteId) || null;
  }

  function setActiveNote(noteId) {
    if (state.activeNoteId === noteId) return;
    
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
    
    saveToStorage(true);
    
    isSwitchingNote = true;
    state.activeNoteId = noteId;
    renderFolderTree();
    updateEditorContent();
    updateEmptyState();
    saveToStorage(true);
    
    setTimeout(() => {
      isSwitchingNote = false;
    }, 0);
  }

  function addNote() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
    
    saveToStorage(true);
    
    const newNote = {
      id: generateId(),
      content: '# 新笔记\n\n开始写作...\n',
      folderId: state.activeFolderId || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    if (newNote.folderId) {
      state.expandedFolders.add(newNote.folderId);
    }
    
    state.notes.push(newNote);
    state.activeNoteId = newNote.id;
    
    isSwitchingNote = true;
    renderFolderTree();
    updateEditorContent();
    updateEmptyState();
    saveToStorage(true);
    
    setTimeout(() => {
      isSwitchingNote = false;
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
    
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
    
    saveToStorage(true);
    
    state.notes = state.notes.filter(n => n.id !== noteId);
    
    if (state.activeNoteId === noteId) {
      isSwitchingNote = true;
      if (state.notes.length > 0) {
        state.activeNoteId = state.notes[0].id;
        updateEditorContent();
      } else {
        state.activeNoteId = null;
        updateEditorContent();
      }
      updateEmptyState();
      setTimeout(() => {
        isSwitchingNote = false;
      }, 0);
    }
    
    renderFolderTree();
    saveToStorage(true);
  }

  function updateEmptyState() {
    const hasNotes = state.notes.length > 0;
    const hasActiveNote = state.activeNoteId !== null;
    const hasSearchQuery = state.searchQuery.trim() !== '';
    const searchResults = searchNotes(state.searchQuery);
    
    if (hasSearchQuery) {
      if (searchResults.length === 0) {
        elements.emptyState.classList.remove('visible');
        elements.searchNoResults.classList.add('visible');
        elements.mainContent.style.display = 'none';
      } else {
        elements.emptyState.classList.remove('visible');
        elements.searchNoResults.classList.remove('visible');
        if (hasActiveNote) {
          elements.mainContent.style.display = 'flex';
        } else {
          elements.mainContent.style.display = 'none';
          elements.emptyState.classList.add('visible');
        }
      }
    } else {
      elements.searchNoResults.classList.remove('visible');
      if (!hasNotes || !hasActiveNote) {
        elements.emptyState.classList.add('visible');
        elements.mainContent.style.display = 'none';
      } else {
        elements.emptyState.classList.remove('visible');
        elements.mainContent.style.display = 'flex';
      }
    }
  }

  function onEditorInput() {
    if (isSwitchingNote) return;
    
    const note = getActiveNote();
    if (!note) return;
    
    const content = elements.editor.value;
    note.content = content;
    note.updatedAt = Date.now();
    
    const title = extractTitle(content);
    if (elements.noteTitleInput.value !== title) {
      elements.noteTitleInput.value = title;
    }
    
    updateNotePath();
    
    if (!isComposing) {
      updatePreview(content);
      
      if (state.searchQuery.trim()) {
        renderFolderTree();
      } else {
        const noteElement = document.querySelector('.note-item[data-id="' + note.id + '"]');
        if (noteElement) {
          const titleEl = noteElement.querySelector('.note-item-title');
          const previewEl = noteElement.querySelector('.note-item-preview');
          if (titleEl) titleEl.textContent = title;
          if (previewEl) previewEl.textContent = extractPreview(content);
        }
      }
    }
    
    saveToStorage();
  }

  function onCompositionStart() {
    isComposing = true;
  }

  function onCompositionEnd() {
    isComposing = false;
    onEditorInput();
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
    updateNotePath();
    renderFolderTree();
    saveToStorage();
  }

  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = elements.searchInput.value;
      elements.searchClear.style.display = state.searchQuery.trim() ? 'block' : 'none';
      renderFolderTree();
      updateEmptyState();
    }, SEARCH_DELAY);
  }

  function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClear.style.display = 'none';
    renderFolderTree();
    updateEmptyState();
    elements.searchInput.focus();
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
        document.querySelector('.top-bar').offsetHeight -
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
      
      state.notes.push(welcomeNote);
      state.activeNoteId = welcomeNote.id;
      saveToStorage(true);
    }
  }

  function bindEvents() {
    elements.newNoteBtn.addEventListener('click', addNote);
    elements.newFolderBtn.addEventListener('click', addFolder);
    elements.editor.addEventListener('input', onEditorInput);
    elements.editor.addEventListener('compositionstart', onCompositionStart);
    elements.editor.addEventListener('compositionend', onCompositionEnd);
    elements.noteTitleInput.addEventListener('change', onTitleInput);
    elements.searchInput.addEventListener('input', onSearchInput);
    elements.searchClear.addEventListener('click', clearSearch);
    elements.themeToggle.addEventListener('click', toggleTheme);
    
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
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
      }
      
      if (e.key === 'Escape') {
        if (document.activeElement === elements.searchInput) {
          clearSearch();
        }
      }
    });
  }

  function init() {
    loadFromStorage();
    applyTheme();
    initWelcomeNote();
    renderFolderTree();
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
