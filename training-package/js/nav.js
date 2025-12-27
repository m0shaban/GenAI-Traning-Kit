(function () {
  function normalizePathname(pathname) {
    try {
      const clean = (pathname || '').split('?')[0].split('#')[0];
      const parts = clean.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    } catch {
      return '';
    }
  }

  function setActiveLink(links, predicate) {
    links.forEach((a) => {
      const isActive = predicate(a);
      if (isActive) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('is-active');
        a.removeAttribute('aria-current');
      }
    });
  }

  function initNavActiveState() {
    const links = Array.from(document.querySelectorAll('.nav-link'));
    if (!links.length) return;

    const currentFile = normalizePathname(window.location.pathname);
    const currentHash = window.location.hash || '';

    // Prefer exact filename match (e.g. tools.html)
    setActiveLink(links, (a) => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('http')) return false;
      if (href.startsWith('#')) return href === currentHash;

      const hrefFile = normalizePathname(href);
      if (!hrefFile) return false;
      return hrefFile === currentFile;
    });

    // If no filename matched (e.g. root path or directory), keep hash highlighting for internal links
    const hasActive = links.some((a) => a.classList.contains('is-active'));
    if (!hasActive && currentHash) {
      setActiveLink(
        links,
        (a) => (a.getAttribute('href') || '') === currentHash
      );
    }
  }

  document.addEventListener('DOMContentLoaded', initNavActiveState);
  window.addEventListener('hashchange', initNavActiveState);
})();
