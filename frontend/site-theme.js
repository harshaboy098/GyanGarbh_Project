(function () {
    const DEFAULT_API = 'https://gyangarbh-project-1.onrender.com';
    const presets = {
        'spiritual-gold': { brand:'#ff6b00', accent:'#f59e0b', ink:'#0f172a', surface:'#fff7ed', nav:'#1e3c72' },
        'modern-blue': { brand:'#2563eb', accent:'#f59e0b', ink:'#0f172a', surface:'#eff6ff', nav:'#0f3f7a' },
        'minimal-dark': { brand:'#22d3ee', accent:'#a3e635', ink:'#e5f7ff', surface:'#07111f', nav:'#020617' },
        'heritage-vibe': { brand:'#7c2d12', accent:'#d97706', ink:'#1c1917', surface:'#fef3c7', nav:'#431407' }
    };
    const apiBase = () => (window.GYAN_GARBH_API_URL || DEFAULT_API).replace(/\/$/, '');
    const active = (list, sectionId) => (list || []).find((item) => item.active !== false && (!sectionId || item.sectionId === sectionId)) || null;
    const safeUrl = (value) => String(value || '').replace(/'/g, '%27');
    function applyTheme(settings = {}) {
        const theme = { ...(presets[settings.activeTheme] || presets['spiritual-gold']) };
        if (settings.customColors?.primary) theme.brand = settings.customColors.primary;
        if (settings.customColors?.accent) theme.accent = settings.customColors.accent;
        const root = document.documentElement;
        root.style.setProperty('--dynamic-brand', theme.brand);
        root.style.setProperty('--dynamic-accent', theme.accent);
        root.style.setProperty('--dynamic-ink', theme.ink);
        root.style.setProperty('--dynamic-surface', theme.surface);
        root.style.setProperty('--dynamic-nav', theme.nav);
        root.style.setProperty('--brand', theme.brand);
        root.style.setProperty('--brand-dark', theme.brand);
        root.style.setProperty('--gold', theme.accent);
        root.style.setProperty('--accent', theme.accent);
        if (settings.typography?.headingFont) root.style.setProperty('--site-heading-font', settings.typography.headingFont);
        if (settings.typography?.bodyFont) root.style.setProperty('--site-body-font', settings.typography.bodyFont);
        root.dataset.siteTheme = settings.activeTheme || 'spiritual-gold';
        document.body?.classList.add('site-theme-ready');
        const homeBanner = active(settings.heroBanners, 'home') || active(settings.heroBanners);
        if (homeBanner) applyHero(homeBanner);
        const loginBanner = active(settings.loginBanners);
        if (loginBanner?.imageUrl) root.style.setProperty('--login-hero-image', "url('" + safeUrl(loginBanner.imageUrl) + "')");
        const loginTitle = document.querySelector('[data-login-title]');
        const loginSubtitle = document.querySelector('[data-login-subtitle]');
        const loginBadge = document.querySelector('[data-login-badge]');
        if (loginTitle && loginBanner?.title) loginTitle.textContent = loginBanner.title;
        if (loginSubtitle && loginBanner?.subtitle) loginSubtitle.textContent = loginBanner.subtitle;
        if (loginBadge && loginBanner?.badgeText) loginBadge.innerHTML = '<i class="bi bi-shield-check"></i> ' + loginBanner.badgeText;
    }
    function applyHero(banner) {
        const hero = document.querySelector('[data-site-hero="home"], .hero-premium');
        if (!hero) return;
        if (banner.imageUrl) hero.style.backgroundImage = "linear-gradient(rgba(0,0,0,.58), rgba(0,0,0,.58)), url('" + safeUrl(banner.imageUrl) + "')";
        const title = hero.querySelector('[data-hero-title], h1');
        const subtitle = hero.querySelector('[data-hero-subtitle], p');
        if (title && banner.title) title.textContent = banner.title;
        if (subtitle && banner.subtitle) subtitle.textContent = banner.subtitle;
        const cta = hero.querySelector('[data-hero-cta]');
        if (cta && banner.ctaLink) cta.href = banner.ctaLink;
    }
    async function loadSiteTheme() {
        try {
            const res = await fetch(apiBase() + '/api/site-settings');
            const json = await res.json();
            if (res.ok && json.success !== false) applyTheme(json.data || json.settings || json);
        } catch (err) {
            console.warn('Site theme unavailable:', err.message);
        }
    }
    window.GyanGarbhSiteTheme = { load: loadSiteTheme, apply: applyTheme, presets };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadSiteTheme); else loadSiteTheme();
}());
