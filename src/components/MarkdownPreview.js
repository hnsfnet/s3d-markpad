import { Component } from './Component.js';
import { parseMarkdown } from '../utils/markdown.js';
import { icons } from '../utils/icons.js';

export class MarkdownPreview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: ''
    };
  }

  render() {
    const html = `
      <div class="preview-pane">
        <div class="pane-header">
          <span class="pane-title">
            ${icons.eye}
            预览
          </span>
        </div>
        <div class="preview" id="preview"></div>
      </div>
    `;

    if (this.element) {
      this.container.innerHTML = '';
    }
    this.element = this.createElement(html);
    this.container.appendChild(this.element);

    this.preview = this.element.querySelector('#preview');
  }

  updateContent(content) {
    if (this.preview) {
      this.preview.innerHTML = parseMarkdown(content);
    }
    this.setState({ content });
  }

  clear() {
    if (this.preview) {
      this.preview.innerHTML = '';
    }
  }
}
