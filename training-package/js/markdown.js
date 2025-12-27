/* Minimal Markdown renderer (no deps)
   - Supports headings, paragraphs, emphasis, inline code, links
   - Supports lists, blockquotes, hr
   - Supports fenced code blocks and pipe tables (basic)
*/

(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(text) {
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/[`~!@#$%^&*()=+\[\]{};:'",.<>/?\\|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function normalizeUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^(https?:)?\/\//i.test(u))
      return u.startsWith('//') ? 'https:' + u : u;
    if (/^(mailto:|tel:)/i.test(u)) return u;
    // common bare domains like chat.openai.com
    if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(u)) return 'https://' + u;
    return u;
  }

  function renderInline(text) {
    let out = escapeHtml(text);

    // links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      const rawHref = String(url || '').trim();
      const isHash = rawHref.startsWith('#');
      const href = isHash ? rawHref : normalizeUrl(rawHref);
      const safeLabel = escapeHtml(label);
      if (!href) return safeLabel;
      if (isHash) {
        return '<a href="' + escapeHtml(href) + '">' + safeLabel + '</a>';
      }
      return (
        '<a href="' +
        escapeHtml(href) +
        '" target="_blank" rel="noopener">' +
        safeLabel +
        '</a>'
      );
    });

    // inline code
    out = out.replace(/`([^`]+)`/g, function (_, code) {
      return '<code>' + escapeHtml(code) + '</code>';
    });

    // bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // italic (simple)
    out = out.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, '$1<em>$2</em>');

    // bare URLs (domain.tld...)
    out = out.replace(
      /(^|\s)([a-z0-9.-]+\.[a-z]{2,}(?:\/[\w\-./?%#=&+~:]*)?)/gi,
      function (_, pre, raw) {
        const href = normalizeUrl(raw);
        return (
          pre +
          '<a href="' +
          escapeHtml(href) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(raw) +
          '</a>'
        );
      }
    );

    return out;
  }

  function isTableRow(line) {
    return /\|/.test(line);
  }

  function isTableDivider(line) {
    // | --- | --- |
    const trimmed = line.trim();
    if (!trimmed) return false;
    return /^\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?$/.test(trimmed);
  }

  function splitTableCells(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  }

  function renderTable(lines, startIndex) {
    const headerLine = lines[startIndex];
    const dividerLine = lines[startIndex + 1];
    if (!isTableRow(headerLine) || !isTableDivider(dividerLine)) return null;

    const headers = splitTableCells(headerLine);
    let i = startIndex + 2;
    const rows = [];

    for (; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) break;
      if (!isTableRow(line)) break;
      if (isTableDivider(line)) break;
      rows.push(splitTableCells(line));
    }

    let html = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
    headers.forEach((h) => {
      html += '<th>' + renderInline(h) + '</th>';
    });
    html += '</tr></thead><tbody>';

    rows.forEach((r) => {
      html += '<tr>';
      for (let c = 0; c < headers.length; c++) {
        html += '<td>' + renderInline(r[c] || '') + '</td>';
      }
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return { html, nextIndex: i };
  }

  function render(markdown) {
    const lines = String(markdown || '')
      .replace(/\r\n?/g, '\n')
      .split('\n');

    let html = '';
    let inCode = false;
    let codeLang = '';
    let codeBuf = [];

    let inUl = false;
    let inOl = false;
    let inBlockquote = false;

    function closeLists() {
      if (inUl) {
        html += '</ul>';
        inUl = false;
      }
      if (inOl) {
        html += '</ol>';
        inOl = false;
      }
    }

    function closeBlockquote() {
      if (inBlockquote) {
        html += '</blockquote>';
        inBlockquote = false;
      }
    }

    function flushParagraph(text) {
      if (!text.trim()) return;
      html += '<p>' + renderInline(text.trim()) + '</p>';
    }

    let paragraphBuf = [];

    function flushParagraphBuf() {
      if (!paragraphBuf.length) return;
      const text = paragraphBuf.join(' ');
      paragraphBuf = [];
      flushParagraph(text);
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // fenced code
      const fenceMatch = line.match(/^```\s*([^\s]*)\s*$/);
      if (fenceMatch) {
        flushParagraphBuf();
        closeLists();
        closeBlockquote();

        if (!inCode) {
          inCode = true;
          codeLang = fenceMatch[1] || '';
          codeBuf = [];
        } else {
          const code = escapeHtml(codeBuf.join('\n'));
          const langClass = codeLang ? ' language-' + escapeHtml(codeLang) : '';
          html +=
            '<div class="md-code"><button class="md-copy" type="button">نسخ</button><pre><code class="md-code-inner' +
            langClass +
            '">' +
            code +
            '</code></pre></div>';
          inCode = false;
          codeLang = '';
          codeBuf = [];
        }
        continue;
      }

      if (inCode) {
        codeBuf.push(line);
        continue;
      }

      // table
      const table = renderTable(lines, idx);
      if (table) {
        flushParagraphBuf();
        closeLists();
        closeBlockquote();
        html += table.html;
        idx = table.nextIndex - 1;
        continue;
      }

      // hr
      if (/^\s*---\s*$/.test(line)) {
        flushParagraphBuf();
        closeLists();
        closeBlockquote();
        html += '<hr />';
        continue;
      }

      // headings
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushParagraphBuf();
        closeLists();
        closeBlockquote();
        const level = h[1].length;
        const text = h[2].trim();
        const id = slugify(text);
        html +=
          '<h' +
          level +
          ' id="' +
          escapeHtml(id) +
          '">' +
          renderInline(text) +
          '</h' +
          level +
          '>';
        continue;
      }

      // blockquote
      const bq = line.match(/^>\s?(.*)$/);
      if (bq) {
        flushParagraphBuf();
        closeLists();
        if (!inBlockquote) {
          html += '<blockquote>';
          inBlockquote = true;
        }
        const inner = bq[1] || '';
        if (inner.trim()) {
          html += '<p>' + renderInline(inner.trim()) + '</p>';
        }
        continue;
      } else {
        closeBlockquote();
      }

      // unordered list
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      if (ul) {
        flushParagraphBuf();
        if (!inUl) {
          closeLists();
          html += '<ul>';
          inUl = true;
        }
        html += '<li>' + renderInline(ul[1].trim()) + '</li>';
        continue;
      }

      // ordered list
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ol) {
        flushParagraphBuf();
        if (!inOl) {
          closeLists();
          html += '<ol>';
          inOl = true;
        }
        html += '<li>' + renderInline(ol[1].trim()) + '</li>';
        continue;
      }

      // blank line
      if (!line.trim()) {
        flushParagraphBuf();
        closeLists();
        continue;
      }

      // normal paragraph accumulation
      paragraphBuf.push(line.trim());
    }

    flushParagraphBuf();
    closeLists();
    closeBlockquote();

    return html;
  }

  global.SimpleMarkdown = {
    render,
    slugify,
    normalizeUrl,
  };
})(window);
