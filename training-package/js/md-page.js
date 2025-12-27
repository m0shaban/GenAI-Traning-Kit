(function () {
  'use strict';

  function prefersReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    } catch {
      return false;
    }
  }

  function ensureBackToTop() {
    if (document.querySelector('.md-back-to-top')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'md-back-to-top';
    btn.textContent = 'أعلى';

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });

    document.body.appendChild(btn);

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      btn.classList.toggle('is-visible', y > 500);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function ensureTocToggle() {
    const tocHost = document.getElementById('toc');
    if (!tocHost) return;
    if (document.querySelector('.md-toc-toggle')) return;

    const layout = tocHost.closest('.md-layout') || tocHost.parentElement;
    if (!layout) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'md-toc-toggle';
    btn.setAttribute('aria-controls', 'toc');
    btn.setAttribute('aria-expanded', 'true');
    btn.textContent = 'إظهار/إخفاء الفهرس';

    btn.addEventListener('click', () => {
      const collapsed = tocHost.classList.toggle('is-collapsed');
      btn.setAttribute('aria-expanded', String(!collapsed));
    });

    layout.insertBefore(btn, tocHost);
  }

  function buildToc(container) {
    const tocHost = document.getElementById('toc');
    if (!tocHost) return;

    const headings = container.querySelectorAll('h2, h3');
    if (!headings.length) {
      tocHost.innerHTML = '';
      tocHost.setAttribute('hidden', '');
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'md-toc-list';

    headings.forEach((h) => {
      if (!h.id) {
        h.id = window.SimpleMarkdown
          ? window.SimpleMarkdown.slugify(h.textContent)
          : '';
      }

      const li = document.createElement('li');
      li.className = 'md-toc-item md-toc-' + h.tagName.toLowerCase();

      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;

      li.appendChild(a);
      ul.appendChild(li);
    });

    tocHost.removeAttribute('hidden');
    tocHost.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'md-toc-title';
    title.textContent = 'الفهرس';

    tocHost.appendChild(title);
    tocHost.appendChild(ul);
  }

  function enableCopyButtons(container) {
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.md-copy');
      if (!btn) return;

      const wrap = btn.closest('.md-code');
      const codeEl = wrap ? wrap.querySelector('code') : null;
      const text = codeEl ? codeEl.textContent : '';
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'تم النسخ';
        setTimeout(() => {
          btn.textContent = 'نسخ';
        }, 1200);
      } catch {
        // best-effort
      }
    });
  }

  async function renderMdInto(el) {
    const src = el.getAttribute('data-md-src');
    if (!src) return;

    el.classList.add('md-content');
    el.setAttribute('aria-busy', 'true');
    el.innerHTML =
      '<div class="md-loading"><div class="md-loading-text">جارٍ تحميل المحتوى…</div></div>';

    try {
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const md = await res.text();

      const html = window.SimpleMarkdown
        ? window.SimpleMarkdown.render(md)
        : '';
      el.innerHTML = html;

      ensureTocToggle();
      ensureBackToTop();

      buildToc(el);
      enableCopyButtons(el);
    } catch {
      el.innerHTML = '<div class="md-error">تعذر تحميل المحتوى حالياً.</div>';
    } finally {
      el.removeAttribute('aria-busy');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll('[data-md-src]');
    targets.forEach(renderMdInto);
  });
})();
