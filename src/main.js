import { App } from './App.js';

const appContainer = document.getElementById('app');
if (appContainer) {
  const app = new App({ container: appContainer });
  app.mount();
} else {
  console.error('找不到 #app 容器元素');
}
