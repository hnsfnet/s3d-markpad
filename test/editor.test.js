// 编辑器组件和 Markdown 渲染测试
import { describe, test, expect, beforeEach, afterEach } from './test-framework.js';
import { parseMarkdown, highlightCode } from '../src/utils/markdown.js';
import { useNotes } from '../src/hooks/useNotes.js';
import { resetAllHooks, setupTestEnvironment, teardownTestEnvironment, createTestNote, wait } from './test-helpers.js';

describe('Markdown 解析器', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  test('空内容 - 应该返回空字符串', () => {
    expect(parseMarkdown('')).toBe('');
    expect(parseMarkdown(null)).toBe('');
    expect(parseMarkdown(undefined)).toBe('');
  });

  test('标题 - H1 应该正确渲染', () => {
    const html = parseMarkdown('# 一级标题');
    expect(html).toContain('<h1>');
    expect(html).toContain('一级标题');
    expect(html).toContain('</h1>');
  });

  test('标题 - H2 应该正确渲染', () => {
    const html = parseMarkdown('## 二级标题');
    expect(html).toContain('<h2>');
    expect(html).toContain('二级标题');
    expect(html).toContain('</h2>');
  });

  test('标题 - H3 到 H6 应该正确渲染', () => {
    expect(parseMarkdown('### 三级标题')).toContain('<h3>');
    expect(parseMarkdown('#### 四级标题')).toContain('<h4>');
    expect(parseMarkdown('##### 五级标题')).toContain('<h5>');
    expect(parseMarkdown('###### 六级标题')).toContain('<h6>');
  });

  test('标题 - 支持内联格式', () => {
    const html = parseMarkdown('# **加粗** 和 *斜体* 标题');
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>加粗</strong>');
    expect(html).toContain('<em>斜体</em>');
    expect(html).toContain('</h1>');
  });

  test('加粗 - ** 和 __ 应该正确渲染', () => {
    expect(parseMarkdown('**粗体文本**')).toContain('<strong>粗体文本</strong>');
    expect(parseMarkdown('__粗体文本__')).toContain('<strong>粗体文本</strong>');
  });

  test('斜体 - * 和 _ 应该正确渲染', () => {
    expect(parseMarkdown('*斜体文本*')).toContain('<em>斜体文本</em>');
    expect(parseMarkdown('_斜体文本_')).toContain('<em>斜体文本</em>');
  });

  test('删除线 - ~~ 应该正确渲染', () => {
    const html = parseMarkdown('~~删除线~~');
    expect(html).toContain('<del>删除线</del>');
  });

  test('段落 - 普通文本应该渲染为段落', () => {
    const html = parseMarkdown('这是一段普通文本');
    expect(html).toContain('<p>');
    expect(html).toContain('这是一段普通文本');
    expect(html).toContain('</p>');
  });

  test('多个段落 - 空行分隔的文本应该渲染为多个段落', () => {
    const html = parseMarkdown('第一段\n\n第二段');
    expect(html.match(/<p>/g) || []).toHaveLength(2);
    expect(html).toContain('第一段');
    expect(html).toContain('第二段');
  });

  test('无序列表 - 应该正确渲染', () => {
    const html = parseMarkdown('- 项目1\n- 项目2\n- 项目3');
    expect(html).toContain('<ul>');
    expect(html.match(/<li>/g) || []).toHaveLength(3);
    expect(html).toContain('项目1');
    expect(html).toContain('项目2');
    expect(html).toContain('项目3');
    expect(html).toContain('</ul>');
  });

  test('无序列表 - 支持 * 和 + 符号', () => {
    expect(parseMarkdown('* 项目1\n* 项目2')).toContain('<ul>');
    expect(parseMarkdown('+ 项目1\n+ 项目2')).toContain('<ul>');
  });

  test('有序列表 - 应该正确渲染', () => {
    const html = parseMarkdown('1. 第一项\n2. 第二项\n3. 第三项');
    expect(html).toContain('<ol>');
    expect(html.match(/<li>/g) || []).toHaveLength(3);
    expect(html).toContain('第一项');
    expect(html).toContain('第二项');
    expect(html).toContain('第三项');
    expect(html).toContain('</ol>');
  });

  test('列表 - 支持内联格式', () => {
    const html = parseMarkdown('- **加粗** 项目\n- *斜体* 项目');
    expect(html).toContain('<strong>加粗</strong>');
    expect(html).toContain('<em>斜体</em>');
  });

  test('链接 - 应该正确渲染', () => {
    const html = parseMarkdown('[百度](https://www.baidu.com)');
    expect(html).toContain('<a');
    expect(html).toContain('href="https://www.baidu.com"');
    expect(html).toContain('百度');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });

  test('图片 - 应该正确渲染', () => {
    const html = parseMarkdown('![图片描述](https://example.com/image.png)');
    expect(html).toContain('<img');
    expect(html).toContain('alt="图片描述"');
    expect(html).toContain('src="https://example.com/image.png"');
  });

  test('行内代码 - 应该正确渲染', () => {
    const html = parseMarkdown('使用 `console.log()` 输出');
    expect(html).toContain('<code>console.log()</code>');
    expect(html).toContain('使用');
    expect(html).toContain('输出');
  });

  test('代码块 - 应该正确渲染', () => {
    const markdown = '```\nconst x = 1;\nconsole.log(x);\n```';
    const html = parseMarkdown(markdown);
    expect(html).toContain('<pre>');
    expect(html).toContain('<code>');
    expect(html).toContain('const');
    expect(html).toContain('x =');
    expect(html).toContain('console');
    expect(html).toContain('log');
    expect(html).toContain('(x)');
    expect(html).toContain('</code>');
    expect(html).toContain('</pre>');
  });

  test('代码块 - 指定语言应该正确渲染', () => {
    const markdown = '```javascript\nconst x = 1;\n```';
    const html = parseMarkdown(markdown);
    expect(html).toContain('<pre>');
    expect(html).toContain('<code class="language-javascript">');
    expect(html).toContain('const');
    expect(html).toContain('x =');
  });

  test('代码块 - JavaScript 语法高亮', () => {
    const html = parseMarkdown('```javascript\nconst x = 1;\n```');
    expect(html).toContain('<span class="hljs-keyword">const</span>');
    expect(html).toContain('<span class="hljs-number">1</span>');
  });

  test('代码块 - Python 语法高亮', () => {
    const html = parseMarkdown('```python\ndef foo():\n    return True\n```');
    expect(html).toContain('<span class="hljs-keyword">def</span>');
    expect(html).toContain('<span class="hljs-keyword">return</span>');
    expect(html).toContain('<span class="hljs-keyword">True</span>');
  });

  test('引用块 - 应该正确渲染', () => {
    const html = parseMarkdown('> 这是一段引用');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<p>这是一段引用</p>');
    expect(html).toContain('</blockquote>');
  });

  test('引用块 - 多行引用应该正确渲染', () => {
    const html = parseMarkdown('> 第一行\n> 第二行');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('第一行');
    expect(html).toContain('第二行');
    expect(html).toContain('</blockquote>');
  });

  test('引用块 - 支持内联格式', () => {
    const html = parseMarkdown('> **加粗** 和 *斜体* 引用');
    expect(html).toContain('<strong>加粗</strong>');
    expect(html).toContain('<em>斜体</em>');
  });

  test('水平分割线 - 应该正确渲染', () => {
    expect(parseMarkdown('---')).toContain('<hr>');
    expect(parseMarkdown('----')).toContain('<hr>');
    expect(parseMarkdown('-----')).toContain('<hr>');
  });

  test('表格 - 应该正确渲染', () => {
    const markdown = '| 列1 | 列2 |\n| --- | --- |\n| 数据1 | 数据2 |';
    const html = parseMarkdown(markdown);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<th>列1</th>');
    expect(html).toContain('<th>列2</th>');
    expect(html).toContain('<td>数据1</td>');
    expect(html).toContain('<td>数据2</td>');
    expect(html).toContain('</table>');
  });

  test('表格 - 支持内联格式', () => {
    const markdown = '| **加粗** | *斜体* |\n| --- | --- |\n| 内容1 | 内容2 |';
    const html = parseMarkdown(markdown);
    expect(html).toContain('<th><strong>加粗</strong></th>');
    expect(html).toContain('<th><em>斜体</em></th>');
  });

  test('混合格式 - 标题、列表、代码块应该正确组合', () => {
    const markdown = '# 标题\n\n- 项目1\n- 项目2\n\n```js\nconst x = 1;\n```\n\n普通段落';
    const html = parseMarkdown(markdown);
    expect(html).toContain('<h1>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<pre>');
    expect(html).toContain('<p>普通段落</p>');
  });

  test('内联格式优先级 - 链接和加粗应该正确嵌套', () => {
    const html = parseMarkdown('[**加粗链接**](https://example.com)');
    expect(html).toContain('<a');
    expect(html).toContain('<strong>加粗链接</strong>');
  });

  test('转义字符 - 行内代码应该转义 HTML 特殊字符', () => {
    const html = parseMarkdown('`<div>标签</div>`');
    expect(html).toContain('&lt;div&gt;');
    expect(html).toContain('&lt;/div&gt;');
  });

  test('转义字符 - 代码块应该转义 HTML 特殊字符', () => {
    const markdown = '```\n<div>内容</div>\n```';
    const html = parseMarkdown(markdown);
    expect(html).toContain('&lt;div&gt;');
    expect(html).toContain('&lt;/div&gt;');
  });

  test('代码高亮 - 字符串应该高亮', () => {
    const html = highlightCode('const str = "hello";', 'javascript');
    expect(html).toContain('<span class="hljs-string">"hello"</span>');
  });

  test('代码高亮 - 注释应该高亮', () => {
    const html = highlightCode('// 这是注释\nconst x = 1;', 'javascript');
    expect(html).toContain('<span class="hljs-comment">// 这是注释</span>');
  });

  test('代码高亮 - 函数名应该高亮', () => {
    const html = highlightCode('function myFunc() {}', 'javascript');
    expect(html).toContain('<span class="hljs-function">myFunc</span>');
  });

  test('代码高亮 - 不识别的语言使用默认处理', () => {
    const html = highlightCode('const x = 1;', 'unknownlang');
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  });

  test('代码高亮 - 数字应该高亮', () => {
    const html = highlightCode('const x = 42;', 'javascript');
    expect(html).toContain('<span class="hljs-number">42</span>');
  });
});

describe('编辑器组件逻辑', () => {
  let notesHook;

  beforeEach(() => {
    setupTestEnvironment();
    resetAllHooks();
    notesHook = useNotes();
  });

  afterEach(() => {
    resetAllHooks();
    teardownTestEnvironment();
  });

  test('编辑笔记内容 - 应该正确更新', async () => {
    const note = createTestNote('# 初始内容');
    notesHook.setActiveNoteId(note.id);

    await wait(10);
    notesHook.updateNoteContent(note.id, '# 更新后的内容');

    const updated = notesHook.getNoteById(note.id);
    expect(updated.content).toBe('# 更新后的内容');
    expect(updated.updatedAt).toBeGreaterThan(note.createdAt);
  });

  test('编辑不存在的笔记 - 应该返回 false', () => {
    const result = notesHook.updateNoteContent('non-existent-id', '内容');
    expect(result).toBe(false);
  });

  test('输入法组合事件 - 应该正确设置 isComposing', () => {
    expect(notesHook.getIsComposing()).toBe(false);

    notesHook.setIsComposing(true);
    expect(notesHook.getIsComposing()).toBe(true);

    notesHook.setIsComposing(false);
    expect(notesHook.getIsComposing()).toBe(false);
  });

  test('智能预览延迟 - 2000 字以内应该是 300ms', () => {
    const shortContent = 'a'.repeat(1000);
    expect(notesHook.getPreviewDelay(shortContent.length)).toBe(300);
  });

  test('智能预览延迟 - 2000-4000 字应该是 500ms', () => {
    const mediumContent = 'a'.repeat(3000);
    expect(notesHook.getPreviewDelay(mediumContent.length)).toBe(500);
  });

  test('智能预览延迟 - 4000-6000 字应该是 650ms', () => {
    const longContent = 'a'.repeat(5000);
    expect(notesHook.getPreviewDelay(longContent.length)).toBe(650);
  });

  test('智能预览延迟 - 6000 字以上应该是 800ms', () => {
    const veryLongContent = 'a'.repeat(7000);
    expect(notesHook.getPreviewDelay(veryLongContent.length)).toBe(800);
  });

  test('切换笔记 - 应该正确设置 isSwitchingNote', () => {
    expect(notesHook.getIsSwitchingNote()).toBe(false);

    notesHook.setIsSwitchingNote(true);
    expect(notesHook.getIsSwitchingNote()).toBe(true);

    notesHook.setIsSwitchingNote(false);
    expect(notesHook.getIsSwitchingNote()).toBe(false);
  });

  test('标题提取 - 应该正确从内容提取标题', () => {
    const note1 = createTestNote('# 我的标题\n\n内容');
    const note2 = createTestNote('## 二级标题\n\n内容');
    const note3 = createTestNote('没有标题的内容');

    expect(note1.title).toBe('我的标题');
    expect(note2.title).toBe('二级标题');
    expect(note3.title).toBe('没有标题的内容');
  });

  test('预览提取 - 应该正确提取内容预览', () => {
    const note = createTestNote('# 标题\n\n这是一段很长的内容，会被截断...'.padEnd(200, '内容'));
    expect(note.preview.length).toBeLessThanOrEqual(150);
    expect(note.preview).toContain('内容');
  });

  test('笔记时间戳 - 创建时应该有 createdAt 和 updatedAt', () => {
    const before = Date.now();
    const note = createTestNote('内容');
    const after = Date.now();

    expect(note.createdAt).toBeGreaterThanOrEqual(before);
    expect(note.createdAt).toBeLessThanOrEqual(after);
    expect(note.updatedAt).toBe(note.createdAt);
  });

  test('笔记更新时间戳 - 更新内容时 updatedAt 应该更新', async () => {
    const note = createTestNote('初始内容');
    const originalUpdatedAt = note.updatedAt;

    await wait(20);
    notesHook.updateNoteContent(note.id, '更新后的内容');
    const updated = notesHook.getNoteById(note.id);
    expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);
  });
});
