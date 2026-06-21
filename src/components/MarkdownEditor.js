import { Component } from './Component.js';
import { useNotes } from '../hooks/useNotes.js';
import { extractTitle } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';

export class MarkdownEditor extends Component {
  constructor(props) {
    super(props);
    this.notesHook = useNotes();
    this.state = {
      content: '',
      title: ''
    };
    this.previewTimer = null;
  }

  onMount() {
    const note = this.notesHook.getActiveNote();
    if (note) {
      this.setState({
      content: note.content,
      title: extractTitle(note.content)
    });
    this.updateEditorValue(note.content);
    }

    this.unsubscribe = this.notesHook.subscribe(() => {
      this.updateFromState();
    });
  }

  updateFromState() {
    if (this.notesHook.getIsSwitchingNote()) return;
    
    const note = this.notesHook.getActiveNote();
    if (note && this.editor && note.content !== this.editor.value) {
      this.setState({
        content: note.content,
        title: extractTitle(note.content)
      });
      this.updateEditorValue(note.content);
    }
  }

  onUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
  }

  updateEditorValue(content) {
    if (this.editor && this.editor.value !== content) {
      this.editor.value = content;
    }
  }

  render() {
    const html = `
      <div class="editor-pane">
        <div class="pane-header">
          <span class="pane-title">
            ${icons.editor}
            编辑器
          </span>
          <input type="text" class="note-title-input" id="noteTitleInput" placeholder="笔记标题..." value="${this.state.title}">
        </div>
        <textarea 
          class="editor" 
          id="editor" 
          placeholder="# 开始写作..."
        >${this.state.content}</textarea>
      </div>
    `;

    if (this.element) {
      this.container.innerHTML = '';
    }
    this.element = this.createElement(html);
    this.container.appendChild(this.element);

    this.editor = this.element.querySelector('#editor');
    this.titleInput = this.element.querySelector('#noteTitleInput');
  }

  bindEvents() {
    if (!this.editor) return;

    this.addEventListener(this.editor, 'input', (e) => this.handleInput(e));
    this.addEventListener(this.editor, 'compositionstart', () => this.handleCompositionStart());
    this.addEventListener(this.editor, 'compositionend', (e) => this.handleCompositionEnd(e));
    
    this.addEventListener(this.titleInput, 'change', () => this.handleTitleChange());
  }

  handleInput(e) {
    if (this.notesHook.getIsSwitchingNote()) return;
    
    const noteId = this.notesHook.getActiveNoteId();
    if (!noteId) return;

    const content = e.target.value;
    this.notesHook.updateNoteContent(noteId, content);

    const title = extractTitle(content);
    if (this.titleInput.value !== title) {
      this.titleInput.value = title;
    }

    if (this.props.onContentChange) {
      this.props.onContentChange(content);
    }

    if (this.props.onUpdateNotePath) {
      this.props.onUpdateNotePath();
    }

    if (!this.notesHook.getIsComposing()) {
      if (this.props.onPreview) {
        const delay = this.notesHook.getPreviewDelay(content.length);
        this.schedulePreviewUpdate(content, delay);
      }

      if (this.props.onUpdateNoteListPreview) {
        this.props.onUpdateNoteListPreview();
      }
    }

    if (this.props.onSave) {
      this.props.onSave();
    }
  }

  handleCompositionStart() {
    this.notesHook.setIsComposing(true);
  }

  handleCompositionEnd(e) {
    this.notesHook.setIsComposing(false);
    const content = e.target.value;
    
    if (this.props.onPreview) {
      const delay = this.notesHook.getPreviewDelay(content.length);
      this.schedulePreviewUpdate(content, delay);
    }

    if (this.props.onUpdateNoteListPreview) {
      this.props.onUpdateNoteListPreview();
    }
  }

  handleTitleChange() {
    if (this.props.onTitleChange) {
      this.props.onTitleChange(this.titleInput.value);
    }
  }

  schedulePreviewUpdate(content, delay) {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    this.previewTimer = setTimeout(() => {
      if (this.props.onPreview) {
        this.props.onPreview(content);
      }
    }, delay);
  }

  update(prevState) {
    const note = this.notesHook.getActiveNote();
    if (!note) return;
    
    const title = extractTitle(note.content);
    if (this.titleInput && this.titleInput.value !== title) {
      this.titleInput.value = title;
    }
  }

  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  setSelectionRange(start, end) {
    if (this.editor) {
      this.editor.setSelectionRange(start, end);
    }
  }
}
