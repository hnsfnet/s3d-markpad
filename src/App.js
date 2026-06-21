import { Component } from './components/Component.js';
import { Sidebar } from './components/Sidebar.js';
import { MarkdownEditor } from './components/MarkdownEditor.js';
import { MarkdownPreview } from './components/MarkdownPreview.js';
import { EmptyState } from './components/EmptyState.js';
import { useNotes } from './hooks/useNotes.js';
import { useFolders } from './hooks/useFolders.js';
import { useTheme } from './hooks/useTheme.js';
import { useSearch } from './hooks/useSearch.js';
import { loadAppState, saveAppState } from './utils/storage.js';
import { icons } from './utils/icons.js';
import { extractTitle } from './utils/helpers.js';

export class App extends Component {
  constructor(props) {
    super(props);
    this.notesHook = useNotes();
    this.foldersHook = useFolders();
    this.themeHook = useTheme();
    this.searchHook = useSearch();
    
    this.saveTimer = null;
    this.unsubscribes = [];
    this.dragging = false;
    this.initialY = 0;
    this.initialEditorHeight = 0;
    this.initialPreviewHeight = 0;
    this.activeNoteContent = '';
  }

  onMount() {
    this.initFromStorage();
    this.setupTheme();
    this.setupSubscriptions();
    this.mountComponents();
    this.setupResize();
    this.setupWindowEvents();
    
    if (this.notesHook.getNotes().length === 0) {
      this.handleNewNote();
    } else if (this.notesHook.getActiveNoteId()) {
      this.renderActiveNote();
    }
  }

  onUnmount() {
    this.unsubscribes.forEach(unsub => unsub());
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.cleanupResize();
    this.unmountComponents();
  }

  initFromStorage() {
    const state = loadAppState();
    if (state) {
      this.notesHook.setNotes(state.notes || []);
      this.notesHook.setActiveNoteId(state.activeNoteId || null);
      this.foldersHook.setFolders(state.folders || []);
      this.foldersHook.setExpandedFolders(state.expandedFolders || new Set());
    }
  }

  setupTheme() {
    const savedTheme = this.themeHook.initFromStorage();
    const toggleBtn = this.container.querySelector('#themeToggle');
    if (toggleBtn && savedTheme === 'dark') {
      const sunIcon = toggleBtn.querySelector('.icon-sun');
      const moonIcon = toggleBtn.querySelector('.icon-moon');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline-block';
    }
  }

  setupSubscriptions() {
    this.unsubscribes.push(this.notesHook.subscribe(() => this.handleNotesChange()));
    this.unsubscribes.push(this.foldersHook.subscribe(() => this.handleFoldersChange()));
  }

  mountComponents() {
    const sidebarContainer = this.container.querySelector('.sidebar-container');
    const mainContent = this.container.querySelector('.main-content');
    const editorContainer = this.container.querySelector('.editor-container');
    const previewContainer = this.container.querySelector('.preview-container');

    this.sidebar = new Sidebar({
      container: sidebarContainer,
      onNewNote: () => this.handleNewNote(),
      onNewFolder: () => this.handleNewFolder(),
      onSelectNote: (noteId) => this.handleSelectNote(noteId),
      onDeleteNote: (noteId) => this.handleDeleteNote(noteId),
      onRenameFolder: (folderId, newName) => this.handleRenameFolder(folderId, newName),
      onDeleteFolder: (folderId) => this.handleDeleteFolder(folderId),
      onSearchChange: (query) => this.handleSearchChange(query),
      onMoveNote: (noteId, folderId) => this.handleMoveNote(noteId, folderId),
      onSave: () => this.handleSave()
    });
    this.sidebar.mount();

    this.editor = new MarkdownEditor({
      container: editorContainer,
      onContentChange: (content) => this.handleContentChange(content),
      onPreview: (content) => this.handlePreview(content),
      onUpdateNoteListPreview: () => this.handleUpdateNoteListPreview(),
      onUpdateNotePath: () => this.updateNotePath(),
      onTitleChange: (title) => this.handleTitleChange(title),
      onSave: () => this.handleSave()
    });

    this.preview = new MarkdownPreview({
      container: previewContainer
    });

    this.emptyState = new EmptyState({
      container: mainContent,
      title: '选择一篇笔记开始阅读',
      description: '点击左侧笔记列表，或创建新笔记'
    });
  }

  unmountComponents() {
    if (this.sidebar) this.sidebar.unmount();
    if (this.editor) this.editor.unmount();
    if (this.preview) this.preview.unmount();
    if (this.emptyState) this.emptyState.unmount();
  }

  render() {
    const html = `
      <div class="app">
        <div class="theme-toggle" id="themeToggle">
          <span class="icon-sun" style="display: inline-block;">${icons.sun}</span>
          <span class="icon-moon" style="display: none;">${icons.moon}</span>
        </div>
        <div class="sidebar-container"></div>
        <div class="main-content">
          <div class="editor-container"></div>
          <div class="resizer" id="resizer"></div>
          <div class="preview-container"></div>
        </div>
      </div>
    `;

    if (this.element) {
      this.container.innerHTML = '';
    }
    this.element = this.createElement(html);
    this.container.appendChild(this.element);

    this.mainContent = this.element.querySelector('.main-content');
    this.editorContainer = this.element.querySelector('.editor-container');
    this.previewContainer = this.element.querySelector('.preview-container');
    this.resizer = this.element.querySelector('#resizer');
    this.themeToggle = this.element.querySelector('#themeToggle');
  }

  bindEvents() {
    this.addEventListener(this.themeToggle, 'click', () => {
      const newTheme = this.themeHook.toggleTheme();
      if (newTheme === 'dark') {
        this.themeToggle.querySelector('.icon-sun').style.display = 'none';
        this.themeToggle.querySelector('.icon-moon').style.display = 'inline-block';
      } else {
        this.themeToggle.querySelector('.icon-sun').style.display = 'inline-block';
        this.themeToggle.querySelector('.icon-moon').style.display = 'none';
      }
    });
  }

  setupResize() {
    this.addEventListener(this.resizer, 'mousedown', (e) => this.handleResizeStart(e));
  }

  handleResizeStart(e) {
    this.dragging = true;
    this.initialY = e.clientY;
    const editorRect = this.editorContainer.getBoundingClientRect();
    const previewRect = this.previewContainer.getBoundingClientRect();
    this.initialEditorHeight = editorRect.height;
    this.initialPreviewHeight = previewRect.height;
    
    document.body.style.cursor = 'row-resize';
    this.editorContainer.style.pointerEvents = 'none';
    this.previewContainer.style.pointerEvents = 'none';
  }

  handleResize(e) {
    if (!this.dragging) return;
    
    const deltaY = e.clientY - this.initialY;
    const minHeight = 100;
    const totalHeight = this.initialEditorHeight + this.initialPreviewHeight;
    
    let newEditorHeight = this.initialEditorHeight + deltaY;
    let newPreviewHeight = this.initialPreviewHeight - deltaY;
    
    if (newEditorHeight < minHeight) {
      newEditorHeight = minHeight;
      newPreviewHeight = totalHeight - minHeight;
    }
    if (newPreviewHeight < minHeight) {
      newPreviewHeight = minHeight;
      newEditorHeight = totalHeight - minHeight;
    }
    
    this.editorContainer.style.flex = `0 0 ${newEditorHeight}px`;
    this.previewContainer.style.flex = `0 0 ${newPreviewHeight}px`;
  }

  handleResizeEnd() {
    if (!this.dragging) return;
    
    this.dragging = false;
    document.body.style.cursor = '';
    this.editorContainer.style.pointerEvents = '';
    this.previewContainer.style.pointerEvents = '';
  }

  setupWindowEvents() {
    this.addEventListener(document, 'mousemove', (e) => this.handleResize(e));
    this.addEventListener(document, 'mouseup', () => this.handleResizeEnd());
    this.addEventListener(window, 'beforeunload', () => this.handleSaveNow());
    this.addEventListener(document, 'keydown', (e) => this.handleKeydown(e));
  }

  cleanupResize() {
    if (this.dragging) this.handleResizeEnd();
  }

  handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      this.handleNewNote();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.handleSaveNow();
    }
  }

  handleNewNote() {
    const newNote = this.notesHook.addNote(this.foldersHook.getActiveFolderId());
    this.renderActiveNote();
    this.searchHook.clearQuery();
    this.handleSave();
    
    setTimeout(() => {
      if (this.editor) {
        this.editor.mount();
        this.editor.focus();
        const note = this.notesHook.getActiveNote();
        if (note) {
          this.editor.setSelectionRange(note.content.length, note.content.length);
        }
      }
    }, 50);
    
    return newNote;
  }

  handleNewFolder() {
    const newFolder = this.foldersHook.addFolder();
    this.handleSave();
    
    setTimeout(() => {
      const input = this.container.querySelector(`.folder-name-input[data-id="${newFolder.id}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 10);
    
    return newFolder;
  }

  handleSelectNote(noteId) {
    this.notesHook.setIsSwitchingNote(true);
    if (this.editor && this.editor.previewTimer) {
      clearTimeout(this.editor.previewTimer);
      this.editor.previewTimer = null;
    }
    
    const currentNote = this.notesHook.getActiveNote();
    if (currentNote && this.editor && this.editor.editor) {
      const currentContent = this.editor.editor.value;
      if (currentContent !== currentNote.content) {
        this.notesHook.updateNoteContent(currentNote.id, currentContent);
      }
    }
    
    this.notesHook.setActiveNoteId(noteId);
    this.foldersHook.setActiveFolderId(this.notesHook.getNoteById(noteId)?.folderId || null);
    
    setTimeout(() => {
      this.notesHook.setIsSwitchingNote(false);
      this.renderActiveNote();
      this.handleSaveNow();
    }, 0);
  }

  handleDeleteNote(noteId) {
    const deleted = this.notesHook.deleteNote(noteId);
    if (!deleted) return;
    
    const remainingNotes = this.notesHook.getNotes();
    if (noteId === this.notesHook.getActiveNoteId()) {
      if (remainingNotes.length > 0) {
        this.notesHook.setActiveNoteId(remainingNotes[0].id);
        this.renderActiveNote();
      } else {
        this.notesHook.setActiveNoteId(null);
        this.showEmptyState();
      }
    }
    
    this.handleSave();
  }

  handleRenameFolder(folderId, newName) {
    const renamed = this.foldersHook.renameFolder(folderId, newName);
    if (renamed) {
      this.handleSave();
    }
  }

  handleDeleteFolder(folderId) {
    const notesInFolder = this.notesHook.getNotesInFolder(folderId).length;
    const deleted = this.foldersHook.deleteFolder(folderId, notesInFolder);
    if (!deleted) return;
    
    if (notesInFolder > 0) {
      const remainingNotes = this.notesHook.getNotes();
      if (remainingNotes.length > 0) {
        if (!this.notesHook.getNoteById(this.notesHook.getActiveNoteId())) {
          this.notesHook.setActiveNoteId(remainingNotes[0].id);
          this.renderActiveNote();
        }
      } else {
        this.notesHook.setActiveNoteId(null);
        this.showEmptyState();
      }
    }
    
    this.handleSave();
  }

  handleMoveNote(noteId, folderId) {
    const moved = this.notesHook.updateNoteFolder(noteId, folderId);
    if (moved) {
      this.handleSave();
    }
  }

  handleSearchChange(query) {
    const notes = this.notesHook.getNotes();
    const filtered = this.searchHook.filterNotes(notes, query);
    
    if (query && filtered.length === 0) {
      this.showNoResults();
    } else if (query && filtered.length > 0 && !this.notesHook.getActiveNoteId()) {
      this.handleSelectNote(filtered[0].id);
    }
  }

  handleContentChange(content) {
    this.activeNoteContent = content;
  }

  handlePreview(content) {
    if (this.preview) {
      this.preview.updateContent(content);
    }
  }

  handleUpdateNoteListPreview() {
    if (this.sidebar) {
      this.sidebar.render();
    }
  }

  handleTitleChange(title) {
    if (title && title.trim()) {
      const note = this.notesHook.getActiveNote();
      if (note) {
        const currentTitle = extractTitle(note.content);
        if (currentTitle !== title.trim()) {
          const newContent = `# ${title.trim()}\n${note.content.replace(/^#\s.*?\n/, '')}`;
          this.notesHook.updateNoteContent(note.id, newContent);
          if (this.editor && this.editor.editor) {
            this.editor.editor.value = newContent;
          }
          this.handleSave();
        }
      }
    }
  }

  handleNotesChange() {
    this.handleSave();
  }

  handleFoldersChange() {
    this.handleSave();
  }

  handleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    
    if (this.sidebar) {
      this.sidebar.updateSaveStatus('saving');
    }
    
    this.saveTimer = setTimeout(() => {
      try {
        this.handleSaveNow();
        if (this.sidebar) {
          this.sidebar.updateSaveStatus('saved');
        }
      } catch (e) {
        console.error('保存失败:', e);
        if (this.sidebar) {
          this.sidebar.updateSaveStatus('error');
        }
      }
    }, 500);
  }

  handleSaveNow() {
    const note = this.notesHook.getActiveNote();
    if (note && this.editor && this.editor.editor) {
      const currentContent = this.editor.editor.value;
      if (currentContent !== note.content) {
        this.notesHook.updateNoteContent(note.id, currentContent);
      }
    }
    
    const state = {
      notes: this.notesHook.getNotes(),
      folders: this.foldersHook.getFolders(),
      expandedFolders: this.foldersHook.getExpandedFolders(),
      activeNoteId: this.notesHook.getActiveNoteId()
    };
    
    saveAppState(state);
  }

  renderActiveNote() {
    const note = this.notesHook.getActiveNote();
    if (!note) {
      this.showEmptyState();
      return;
    }

    this.mainContent.classList.remove('empty-state');
    this.editorContainer.style.display = '';
    this.previewContainer.style.display = '';
    this.resizer.style.display = '';
    
    if (this.emptyState && this.emptyState.element) {
      this.emptyState.unmount();
    }
    
    this.editor.mount();
    this.preview.mount();
    
    this.preview.updateContent(note.content);
    this.activeNoteContent = note.content;
    
    this.updateNotePath();
  }

  showEmptyState() {
    if (this.editor && this.editor.element) {
      this.editor.unmount();
    }
    if (this.preview && this.preview.element) {
      this.preview.unmount();
    }
    
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'none';
    this.resizer.style.display = 'none';
    
    this.emptyState.mount();
    this.mainContent.classList.add('empty-state');
    
    const notePath = this.container.querySelector('.note-path');
    if (notePath) notePath.remove();
  }

  showNoResults() {
    if (this.editor && this.editor.element) {
      this.editor.unmount();
    }
    if (this.preview && this.preview.element) {
      this.preview.unmount();
    }
    
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'none';
    this.resizer.style.display = 'none';
    
    this.emptyState.props.title = '没有找到匹配的笔记';
    this.emptyState.props.description = '试试其他关键词，或清除搜索条件';
    this.emptyState.mount();
    this.mainContent.classList.add('empty-state');
    
    const notePath = this.container.querySelector('.note-path');
    if (notePath) notePath.remove();
  }

  updateNotePath() {
    let oldPath = this.container.querySelector('.note-path');
    if (oldPath) oldPath.remove();
    
    const note = this.notesHook.getActiveNote();
    if (!note) return;
    
    const folder = note.folderId ? this.foldersHook.getFolderById(note.folderId) : null;
    const pathHtml = `
      <div class="note-path">
        ${folder ? `
          <span>${icons.folder}</span>
          <span>${folder.name}</span>
          <span class="path-separator">/</span>
        ` : ''}
        <span>${icons.file}</span>
        <span>${extractTitle(note.content)}</span>
      </div>
    `;
    
    const pathElement = this.createElement(pathHtml);
    this.mainContent.insertBefore(pathElement, this.editorContainer);
  }
}
