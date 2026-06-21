import { escapeHtml } from './helpers.js';

const codeHighlightKeywords = {
  javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'new', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'this'],
  python: ['def', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'with', 'try', 'except', 'raise', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'],
  css: ['@import', '@media', '@keyframes', '@font-face', '!important', 'auto', 'inherit', 'none', 'transparent', 'solid', 'dashed', 'flex', 'grid', 'block', 'inline', 'relative', 'absolute', 'fixed'],
  html: ['<!DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta']
};

export function highlightCode(code, lang) {
  let highlighted = escapeHtml(code);
  const keywords = codeHighlightKeywords[lang] || [];
  
  const placeholders = [];
  let placeholderIndex = 0;
  
  function createPlaceholder(content) {
    const id = `%%PLACEHOLDER${placeholderIndex++}%%`;
    placeholders.push({ id, content });
    return id;
  }
  
  highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, match => createPlaceholder(`<span class="hljs-string">${match}</span>`));
  
  highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, match => createPlaceholder(`<span class="hljs-comment">${match}</span>`));
  
  keywords.forEach(keyword => {
    const regex = new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    highlighted = highlighted.replace(regex, `<span class="hljs-keyword">${keyword}</span>`);
  });
  
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
  
  highlighted = highlighted.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="hljs-function">$1</span>');
  
  placeholders.forEach(({ id, content }) => {
    highlighted = highlighted.replace(id, content);
  });
  
  return highlighted;
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

export function parseMarkdown(text) {
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
    
    if (/^\s*\|.*\|\s*$/.test(line) && i < lines.length - 1 && /^\s*\|[-:| ]+\|\s*$/.test(lines[i + 1])) {
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
