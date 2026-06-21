import { Component } from './Component.js';
import { icons } from '../utils/icons.js';

export class EmptyState extends Component {
  render() {
    const html = `
      <div class="main-content empty-state">
        ${icons.document}
        <h2>${this.props.title || '选择一篇笔记开始阅读'}</h2>
        <p>${this.props.description || '点击左侧笔记列表，或创建新笔记'}</p>
      </div>
    `;

    if (this.element) {
      this.container.innerHTML = '';
    }
    this.element = this.createElement(html);
    this.container.appendChild(this.element);
  }
}
