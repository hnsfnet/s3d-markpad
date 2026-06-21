import { Component } from './Component.js';
import { useNotes } from '../hooks/useNotes.js';
import { useFolders } from '../hooks/useFolders.js';
import { useSearch } from '../hooks/useSearch.js';
import { formatDate, extractTitle, extractPreview, highlightText, escapeHtml } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';

export class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.notesHook = useNotes();
    this.foldersHook = useFolders();
    this.searchHook = useSearch();
    this.unsubscribes = [];
  }

  onMount() {
    this.unsubscribes.push(this.notesHook.subscribe(() => this.render()));
    this.unsubscribes.push(this.foldersHook.subscribe(() => this.render()));
    this.unsubscribes.push(this.searchHook.subscribe(() => this.render()));
  }

  onUnmount() {
    this.unsubscribes.forEach(unsub => unsub());
  }

  render() {
    const notes = this.notesHook.getNotes();
    const folders = this.foldersHook.getSortedFolders();
    const unfiledNotes = this.notesHook.getUnfiledNotes();
    const query = this.searchHook.getQuery().trim();
    const hasUnfiled = unfiledNotes.length > 0 || folders.length === 0;
    const activeNoteId = this.notesHook.getActiveNoteId();
    const editingFolderId = this.foldersHook.getEditingFolderId();

    let folderTreeHtml = '';

    if (hasUnfiled) {
      const unfiledFiltered = query ? this.searchHook.filterNotes(unfiledNotes, query) : unfiledNotes;
      folderTreeHtml += `
        <div class="unfiled-section">
          <div class="unfiled-header" data-folder-id="unfiled">
            ${icons.file}
            <span class="unfiled-name">未分类笔记</span>
            <span class="unfiled-count">${unfiledNotes.length}</span>
          </div>
          <div class="folder-notes">
            ${this.renderNotes(unfiledFiltered, null)}
          </div>
        </div>
      `;
    }

    folders.forEach(folder => {
      const isExpanded = this.foldersHook.isFolderExpanded(folder.id);
      const folderNotes = this.notesHook.getNotesInFolder(folder.id);
      const filteredNotes = query ? this.searchHook.filterNotes(folderNotes, query) : folderNotes;
      const isEditing = editingFolderId === folder.id;

      folderTreeHtml += `
        <div class="folder-item ${isExpanded ? 'expanded' : 'collapsed'}" data-id="${folder.id}">
          <div class="folder-header" data-folder-id="${folder.id}">
            ${icons.chevronRight}
            ${isExpanded ? icons.folderOpen : icons.folder}
            ${isEditing 
              ? `<input type="text" class="folder-name-input" data-id="${folder.id}" value="${escapeHtml(folder.name)}">`
              : `<span class="folder-name">${escapeHtml(folder.name)}</span>`
            }
            <span class="unfiled-count">${folderNotes.length}</span>
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
          </div>
          <div class="folder-notes">
            ${this.renderNotes(filteredNotes, folder.id)}
          </div>
        </div>
      `;
    });

    const html = `
      <aside class="sidebar">
        <div class="sidebar-header">
          <h1 class="app-title">
            ${icons.notebook}
            Markdown 笔记
          </h1>
          <div class="sidebar-actions">
            <button class="btn-icon" id="newFolderBtn" title="新建文件夹">
              ${icons.folderPlus}
            </button>
            <button class="btn-icon" id="newNoteBtn" title="新建笔记">
              ${icons.plus}
            </button>
          </div>
        </div>
        
        <div class="search-container">
          ${icons.search}
          <input type="text" class="search-input" id="searchInput" placeholder="搜索笔记..." value="${query}">
          <button class="search-clear" id="searchClear" style="display: ${query ? 'block' : 'none'};">
            ${icons.x}
          </button>
        </div>
        
        <div class="folder-tree" id="folderTree">
          ${folderTreeHtml}
        </div>
        
        <div class="sidebar-footer">
          <span class="save-status" id="saveStatus">
            ${icons.check}
            <span>已保存</span>
          </span>
        </div>
      </aside>
    `;

    if (this.element) {
      this.container.innerHTML = '';
    }
    this.element = this.createElement(html);
    this.container.appendChild(this.element);

    this.folderTree = this.element.querySelector('#folderTree');
    this.searchInput = this.element.querySelector('#searchInput');
    this.searchClear = this.element.querySelector('#searchClear');
    this.newNoteBtn = this.element.querySelector('#newNoteBtn');
    this.newFolderBtn = this.element.querySelector('#newFolderBtn');
    this.saveStatus = this.element.querySelector('#saveStatus');
  }

  renderNotes(notes, folderId) {
    const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    const query = this.searchHook.getQuery().trim();
    const activeNoteId = this.notesHook.getActiveNoteId();

    return sortedNotes.map(note => {
      const title = extractTitle(note.content);
      const preview = extractPreview(note.content);
      const date = formatDate(note.updatedAt);
      const isActive = note.id === activeNoteId;

      return `
        <div class="note-item ${isActive ? 'active' : ''}" 
             data-id="${note.id}" 
             data-folder-id="${folderId || ''}"
             draggable="true">
          <div class="note-item-content">
            <div class="note-item-title">${highlightText(title, query)}</div>
            <div class="note-item-preview">${highlightText(preview, query)}</div>
            <div class="note-item-date">${date}</div>
          </div>
          <button class="note-delete" data-action="delete-note" data-id="${note.id}" title="删除笔记">
            ${icons.trash}
          </button>
        </div>
      `;
    }).join('');
  }

  bindEvents() {
    this.addEventListener(this.newNoteBtn, 'click', () => {
      if (this.props.onNewNote) {
        this.props.onNewNote();
      }
    });

    this.addEventListener(this.newFolderBtn, 'click', () => {
      if (this.props.onNewFolder) {
        this.props.onNewFolder();
      }
    });

    this.addEventListener(this.searchInput, 'input', (e) => {
      this.searchHook.debouncedSearch(e.target.value, () => {
        if (this.props.onSearchChange) {
          this.props.onSearchChange(e.target.value);
        }
      });
      this.searchClear.style.display = e.target.value.trim() ? 'block' : 'none';
    });

    this.addEventListener(this.searchClear, 'click', () => {
      this.searchHook.clearQuery();
      this.searchInput.value = '';
      this.searchClear.style.display = 'none';
      if (this.props.onSearchChange) {
        this.props.onSearchChange('');
      }
      this.searchInput.focus();
    });

    this.addEventListener(this.folderTree, 'click', (e) => this.handleTreeClick(e));
    this.addEventListener(this.folderTree, 'blur', (e) => this.handleTreeBlur(e), true);
    this.addEventListener(this.folderTree, 'keydown', (e) => this.handleTreeKeydown(e));
    this.addEventListener(this.folderTree, 'dragstart', (e) => this.handleDragStart(e));
    this.addEventListener(this.folderTree, 'dragend', (e) => this.handleDragEnd(e));
    this.addEventListener(this.folderTree, 'dragover', (e) => this.handleDragOver(e));
    this.addEventListener(this.folderTree, 'dragleave', (e) => this.handleDragLeave(e));
    this.addEventListener(this.folderTree, 'drop', (e) => this.handleDrop(e));
  }

  handleTreeClick(e) {
    const noteItem = e.target.closest('.note-item');
    const folderHeader = e.target.closest('.folder-header');
    const folderToggle = e.target.closest('.folder-toggle');
    const folderAction = e.target.closest('.folder-action-btn');
    const noteDelete = e.target.closest('.note-delete');

    if (noteDelete) {
      e.stopPropagation();
      const noteId = noteDelete.dataset.id;
      if (this.props.onDeleteNote) {
        this.props.onDeleteNote(noteId);
      }
      return;
    }

    if (folderAction) {
      e.stopPropagation();
      const action = folderAction.dataset.action;
      const folderId = folderAction.dataset.id;
      
      if (action === 'rename') {
        this.foldersHook.setEditingFolderId(folderId);
        setTimeout(() => {
          const input = this.folderTree.querySelector(`.folder-name-input[data-id="${folderId}"]`);
          if (input) {
            input.focus();
            input.select();
          }
        }, 10);
      } else if (action === 'delete') {
        if (this.props.onDeleteFolder) {
          this.props.onDeleteFolder(folderId);
        }
      }
      return;
    }

    if (folderToggle) {
      e.stopPropagation();
      const folderId = folderHeader.dataset.folderId;
      if (folderId !== 'unfiled') {
        this.foldersHook.toggleFolder(folderId);
        if (this.props.onSave) {
          this.props.onSave();
        }
      }
      return;
    }

    if (folderHeader && !e.target.closest('.folder-name-input')) {
      e.stopPropagation();
      const folderId = folderHeader.dataset.folderId;
      if (folderId !== 'unfiled') {
        this.foldersHook.toggleFolder(folderId);
        if (this.props.onSave) {
          this.props.onSave();
        }
      }
      return;
    }

    if (noteItem && !noteDelete) {
      e.stopPropagation();
      const noteId = noteItem.dataset.id;
      if (this.props.onSelectNote) {
        this.props.onSelectNote(noteId);
      }
    }
  }

  handleTreeBlur(e) {
    if (e.target.classList.contains('folder-name-input')) {
      const folderId = e.target.dataset.id;
      const newName = e.target.value;
      if (this.props.onRenameFolder) {
        this.props.onRenameFolder(folderId, newName);
      }
    }
  }

  handleTreeKeydown(e) {
    if (e.target.classList.contains('folder-name-input')) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.foldersHook.setEditingFolderId(null);
      }
    }
  }

  handleDragStart(e) {
    const noteItem = e.target.closest('.note-item');
    if (noteItem) {
      const noteId = noteItem.dataset.id;
      e.dataTransfer.setData('text/plain', noteId);
      e.dataTransfer.effectAllowed = 'move';
      noteItem.classList.add('dragging');
    }
  }

  handleDragEnd(e) {
    const noteItem = e.target.closest('.note-item');
    if (noteItem) {
      noteItem.classList.remove('dragging');
    }
    this.folderTree.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  handleDragOver(e) {
    const folderHeader = e.target.closest('.unfiled-header, .folder-header');
    if (folderHeader) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      folderHeader.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    const folderHeader = e.target.closest('.unfiled-header, .folder-header');
    if (folderHeader && !folderHeader.contains(e.relatedTarget)) {
      folderHeader.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    const folderHeader = e.target.closest('.unfiled-header, .folder-header');
    if (!folderHeader) return;
    
    e.preventDefault();
    folderHeader.classList.remove('drag-over');
    
    const noteId = e.dataTransfer.getData('text/plain');
    if (!noteId) return;
    
    const folderId = folderHeader.dataset.folderId;
    const targetFolderId = folderId === 'unfiled' ? null : folderId;
    
    if (this.props.onMoveNote) {
      this.props.onMoveNote(noteId, targetFolderId);
    }
  }

  updateSaveStatus(status) {
    if (!this.saveStatus) return;
    
    const icon = this.saveStatus.querySelector('.icon');
    const text = this.saveStatus.querySelector('span');
    
    this.saveStatus.classList.remove('saving', 'saved', 'error');
    
    if (status === 'saving') {
      this.saveStatus.classList.add('saving');
      icon.outerHTML = icons.loader;
      text.textContent = '保存中...';
    } else if (status === 'saved') {
      this.saveStatus.classList.add('saved');
      icon.outerHTML = icons.check;
      text.textContent = '已保存';
    } else if (status === 'error') {
      icon.outerHTML = icons.alert;
      text.textContent = '保存失败';
    }
  }
}
