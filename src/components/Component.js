export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.element = null;
    this.container = null;
    this.eventListeners = [];
  }

  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    if (this.container) {
      this.update(prevState);
    }
  }

  mount(container) {
    this.container = container;
    this.render();
    this.bindEvents();
    this.onMount();
  }

  unmount() {
    this.onUnmount();
    this.removeEventListeners();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  render() {
    // 子类实现
  }

  update(prevState) {
    // 子类可选实现
  }

  bindEvents() {
    // 子类可选实现
  }

  onMount() {
    // 子类可选实现
  }

  onUnmount() {
    // 子类可选实现
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  removeEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  createElement(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const el = temp.firstElementChild;
    return el;
  }
}
