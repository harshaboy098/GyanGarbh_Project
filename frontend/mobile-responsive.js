(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function makeButton(label, expanded) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gg-mobile-menu-toggle';
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.innerHTML = '<span aria-hidden="true">&#9776;</span><span class="visually-hidden">Menu</span>';
    button.setAttribute('aria-label', label);
    return button;
  }

  function enhanceTopNav(navbar) {
    const inner = navbar.querySelector('.container, .container-fluid') || navbar;
    if (inner.dataset.ggNavEnhanced === 'true') return;

    const brand = inner.querySelector('.navbar-brand') || inner.firstElementChild;
    const menuItems = Array.from(inner.children).filter((child) => child !== brand);
    if (!brand || menuItems.length === 0) return;

    inner.dataset.ggNavEnhanced = 'true';
    inner.classList.add('gg-navbar-enhanced');

    const toggle = makeButton('Toggle navigation menu', false);
    const panel = document.createElement('div');
    panel.className = 'gg-mobile-nav-panel';
    panel.id = `gg-mobile-nav-${Math.random().toString(36).slice(2)}`;
    toggle.setAttribute('aria-controls', panel.id);

    menuItems.forEach((child) => panel.appendChild(child));
    inner.appendChild(toggle);
    inner.appendChild(panel);

    toggle.addEventListener('click', function () {
      const open = panel.classList.toggle('gg-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function enhanceSidebar(sidebar) {
    if (sidebar.dataset.ggSidebarEnhanced === 'true') return;
    const nav = sidebar.querySelector('nav, .sidebar-nav');
    if (!nav) return;

    sidebar.dataset.ggSidebarEnhanced = 'true';
    sidebar.classList.add('gg-sidebar-enhanced');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'gg-sidebar-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true">&#9776;</span><span>Menu</span>';
    sidebar.insertBefore(toggle, nav);

    toggle.addEventListener('click', function () {
      const open = sidebar.classList.toggle('gg-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 991px)').matches && event.target.closest('a, button')) {
        sidebar.classList.remove('gg-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function enhance() {
    document.querySelectorAll('.navbar').forEach(enhanceTopNav);
    document.querySelectorAll('.sidebar').forEach(enhanceSidebar);
  }

  ready(enhance);
})();
