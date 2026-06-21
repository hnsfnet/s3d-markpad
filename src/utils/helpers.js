export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(timestamp) {
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

export function extractTitle(content) {
  const firstLine = content.trim().split('\n')[0] || '';
  const titleMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  if (titleMatch) return titleMatch[1].trim();
  return firstLine.slice(0, 50) || '无标题笔记';
}

export function extractPreview(content) {
  const lines = content.trim().split('\n');
  const startIndex = lines[0] && lines[0].startsWith('#') ? 1 : 0;
  const preview = lines.slice(startIndex, startIndex + 3)
    .join(' ')
    .replace(/[#*`\[\]\(\)!]/g, '')
    .trim();
  return preview.slice(0, 60) || '暂无内容';
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
  return escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
}

export function debounce(func, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
