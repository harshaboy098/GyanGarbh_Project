(function () {
    const STYLE_ID = 'gg-theme-studio-style';
    const presets = [
        { id:'modern-blue', name:'MakeMyTrip Blue Gold', colors:['#2563eb','#f59e0b','#eff6ff'] },
        { id:'spiritual-gold', name:'Spiritual Heritage Gold', colors:['#ff6b00','#f59e0b','#fff7ed'] },
        { id:'heritage-vibe', name:'Heritage Vibe', colors:['#7c2d12','#d97706','#fef3c7'] },
        { id:'minimal-dark', name:'Futuristic Dark Glass', colors:['#020617','#22d3ee','#a3e635'] }
    ];
    let cfg = {};
    let settings = null;
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '.ts-shell{display:grid;gap:16px}.ts-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ts-head h2{margin:0;font-size:22px}.ts-head p{margin:5px 0 0;color:#64748b}.ts-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:16px}.ts-panel{border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-shadow:0 16px 42px rgba(15,23,42,.1);padding:16px}.ts-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ts-preset{border:1px solid #dbe3ef;border-radius:8px;background:#fff;padding:12px;text-align:left;font-weight:900;cursor:pointer}.ts-preset.active{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.14)}.ts-swatches{display:flex;gap:5px;margin-top:10px}.ts-swatches span{width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,.08)}.ts-form{display:grid;gap:12px;margin-top:14px}.ts-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ts-field{display:grid;gap:6px}.ts-field label{font-size:11px;font-weight:900;text-transform:uppercase;color:#475569}.ts-field input,.ts-field textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit}.ts-drop{position:relative;min-height:110px;border:1.5px dashed #94a3b8;border-radius:8px;background:#f8fafc;display:grid;place-items:center;text-align:center;color:#475569;cursor:pointer}.ts-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}.ts-btn{border:0;border-radius:8px;padding:10px 12px;font-weight:900;cursor:pointer}.ts-primary{background:#4f46e5;color:#fff}.ts-preview{overflow:hidden;min-height:360px;background:#0f172a;color:#fff;display:grid;grid-template-rows:1fr auto}.ts-preview-hero{min-height:250px;padding:24px;display:flex;flex-direction:column;justify-content:center;background-size:cover;background-position:center}.ts-preview-hero span{width:max-content;max-width:100%;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.16);font-size:12px;font-weight:900}.ts-preview-hero h3{margin:14px 0 8px;font-size:30px}.ts-preview-hero p{margin:0;color:#e2e8f0}.ts-mini-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px;background:#fff}.ts-mini-cards div{height:58px;border-radius:8px;background:#eef2ff}.ts-status{min-height:20px;color:#64748b;font-size:13px}.ts-list{display:grid;gap:10px;margin-top:10px}.ts-item{display:grid;grid-template-columns:72px 1fr;gap:10px;align-items:center;border:1px solid #e2e8f0;border-radius:8px;padding:8px}.ts-item img{width:72px;height:54px;object-fit:cover;border-radius:7px;background:#e2e8f0}@media(max-width:900px){.ts-grid,.ts-row{grid-template-columns:1fr}.ts-presets{grid-template-columns:1fr}}';
        document.head.appendChild(style);
    }
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
    const apiBase = () => (cfg.apiBase || window.GYAN_GARBH_API_URL || 'https://gyangarbh-project-1.onrender.com').replace(/\/$/, '');
    const headers = (json = true) => ({ ...(json ? { 'Content-Type':'application/json' } : {}), Authorization:'Bearer ' + (cfg.token || ''), 'x-gyangarbh-admin-shield': window.GYAN_GARBH_ADMIN_SHIELD || 'gg-admin-shield-v1-9821' });
    async function request(path, options = {}) {
        const res = await fetch(apiBase() + path, { ...options, headers:{ ...headers(options.json !== false), ...(options.headers || {}) } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.message || 'Request failed');
        return data;
    }
    function defaultBanner(sectionId) { return { sectionId, title: sectionId === 'login' ? 'Book Bodhgaya journeys with calm confidence.' : 'Discover Bodhgaya Stays', subtitle:'Verified hotels, heritage routes, and trusted travel support.', imageUrl:'', badgeText:'Verified Heritage Stays', ctaLink:'hotel.html', active:true }; }
    function activeHero() { return (settings?.heroBanners || []).find((banner) => banner.sectionId === 'home') || defaultBanner('home'); }
    function activeLogin() { return (settings?.loginBanners || [])[0] || defaultBanner('login'); }
    function activeBodhiCard() { return (settings?.heroBanners || []).find((banner) => banner.sectionId === 'bodhi-path-card') || { sectionId:'bodhi-path-card', title:'Bodhi Path Card Visual', subtitle:'Default card image used for pilgrimage catalog promos.', imageUrl:'', badgeText:'Popular Route', ctaLink:'', active:true }; }
    function value(id) { return document.getElementById(id)?.value.trim() || ''; }
    function readHeroForm() { return { sectionId:'home', title:value('tsHeroTitle'), subtitle:value('tsHeroSubtitle'), imageUrl:value('tsHeroImage'), badgeText:value('tsHeroBadge'), ctaLink:value('tsHeroCta'), active:true }; }
    function readLoginForm() { return { title:'Book Bodhgaya journeys with calm confidence.', subtitle:'Hotels, temple circuits, airport rides, and Bodhi Path experiences in one trusted travel account.', imageUrl:value('tsLoginImage'), badgeText:value('tsLoginBadge') || 'Verified stays and sacred routes', active:true }; }
    function readBodhiCardForm() { return { sectionId:'bodhi-path-card', title:'Bodhi Path Card Visual', subtitle:'Reusable Bodhi Path catalog card image.', imageUrl:value('tsBodhiCardImage'), badgeText:value('tsBodhiCardBadge') || 'Popular Route', ctaLink:'', active:Boolean(value('tsBodhiCardImage')) }; }
    function render() {
        const root = document.getElementById(cfg.containerId);
        if (!root || !settings) return;
        const hero = activeHero();
        const login = activeLogin();
        const bodhiCard = activeBodhiCard();
        const presetHtml = presets.map((preset) => '<button class="ts-preset ' + (settings.activeTheme === preset.id ? 'active' : '') + '" onclick="GyanGarbhThemeStudio.setTheme(&quot;' + preset.id + '&quot;)">' + esc(preset.name) + '<div class="ts-swatches">' + preset.colors.map((color) => '<span style="background:' + color + '"></span>').join('') + '</div></button>').join('');
        const published = [...(settings.heroBanners || []), ...(settings.loginBanners || []).map((banner) => ({ ...banner, sectionId:'login' }))].map((banner) => '<div class="ts-item"><img src="' + esc(banner.imageUrl || '') + '" onerror="this.style.visibility=&quot;hidden&quot;"><div><strong>' + esc(banner.sectionId || 'section') + '</strong><br><small>' + esc(banner.title || banner.badgeText || 'Untitled banner') + '</small></div></div>').join('');
        root.innerHTML = '<div class="ts-shell"><div class="ts-head"><div><h2>Visual Theme & Banner Studio</h2><p>Change customer-facing themes, hero banners, and login visuals without touching code.</p></div><button class="ts-btn ts-primary" onclick="GyanGarbhThemeStudio.publish()">Publish Changes</button></div><div class="ts-grid"><div class="ts-panel"><h3>Theme Presets</h3><div class="ts-presets">' + presetHtml + '</div><div class="ts-form"><div class="ts-row"><div class="ts-field"><label>Home Hero Title</label><input id="tsHeroTitle" value="' + esc(hero.title) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div><div class="ts-field"><label>Badge Text</label><input id="tsHeroBadge" value="' + esc(hero.badgeText) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div></div><div class="ts-field"><label>Home Hero Subtitle</label><textarea id="tsHeroSubtitle" oninput="GyanGarbhThemeStudio.updatePreview()">' + esc(hero.subtitle) + '</textarea></div><div class="ts-row"><div class="ts-field"><label>Hero Image URL</label><input id="tsHeroImage" value="' + esc(hero.imageUrl) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div><div class="ts-field"><label>CTA Link</label><input id="tsHeroCta" value="' + esc(hero.ctaLink) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div></div><label class="ts-drop"><input type="file" accept="image/*" onchange="GyanGarbhThemeStudio.upload(this,\'hero\')"><strong>Drop / upload home hero banner</strong><span>Cloud image URL is inserted automatically</span></label><div class="ts-row"><div class="ts-field"><label>Login Background URL</label><input id="tsLoginImage" value="' + esc(login.imageUrl) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div><div class="ts-field"><label>Login Badge</label><input id="tsLoginBadge" value="' + esc(login.badgeText) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div></div><label class="ts-drop"><input type="file" accept="image/*" onchange="GyanGarbhThemeStudio.upload(this,\'login\')"><strong>Drop / upload login split-screen banner</strong><span>Shown on index.html and login.html</span></label><div class="ts-row"><div class="ts-field"><label>Bodhi Path Card Image URL</label><input id="tsBodhiCardImage" value="' + esc(bodhiCard.imageUrl) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div><div class="ts-field"><label>Bodhi Card Badge</label><input id="tsBodhiCardBadge" value="' + esc(bodhiCard.badgeText) + '" oninput="GyanGarbhThemeStudio.updatePreview()"></div></div><label class="ts-drop"><input type="file" accept="image/*" onchange="GyanGarbhThemeStudio.upload(this,\'bodhi-card\')"><strong>Drop / upload Bodhi Path card visual</strong><span>Stored as the reusable catalog card image</span></label><div class="ts-status" id="tsStatus"></div></div></div><div class="ts-panel ts-preview"><div id="tsPreviewHero" class="ts-preview-hero"><span id="tsPreviewBadge"></span><h3 id="tsPreviewTitle"></h3><p id="tsPreviewSubtitle"></p></div><div class="ts-mini-cards"><div></div><div></div><div></div></div></div></div><div class="ts-panel"><h3>Published Banners</h3><div class="ts-list">' + published + '</div></div></div>';
        updatePreview();
    }
    async function load() {
        const root = document.getElementById(cfg.containerId);
        if (root) root.innerHTML = '<div class="ts-panel">Loading Theme Studio...</div>';
        try { const data = await request('/api/site-settings'); settings = data.data || data.settings; render(); }
        catch (err) { if (root) root.innerHTML = '<div class="ts-panel">' + esc(err.message) + '</div>'; }
    }
    function setTheme(id) { settings.activeTheme = id; render(); }
    function updatePreview() {
        if (!settings) return;
        const hero = readHeroForm();
        const preset = presets.find((item) => item.id === settings.activeTheme) || presets[0];
        const preview = document.getElementById('tsPreviewHero');
        if (!preview) return;
        preview.style.backgroundImage = 'linear-gradient(rgba(0,0,0,.58),rgba(0,0,0,.58)), url("' + (hero.imageUrl || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600').replace(/"/g, '%22') + '")';
        preview.style.borderTop = '6px solid ' + preset.colors[1];
        document.getElementById('tsPreviewBadge').textContent = hero.badgeText || 'Live Theme';
        document.getElementById('tsPreviewTitle').textContent = hero.title || 'Hero title';
        document.getElementById('tsPreviewSubtitle').textContent = hero.subtitle || 'Hero subtitle';
    }
    async function upload(input, target) {
        const file = input.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('banner', file);
        fd.append('sectionId', target === 'login' ? 'login' : target === 'bodhi-card' ? 'bodhi-path-card' : 'home');
        setStatus('Uploading banner...');
        try {
            const res = await fetch(apiBase() + '/api/site-settings/upload-banner', { method:'POST', headers: headers(false), body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.message || 'Upload failed');
            const url = data.data?.imageUrl || data.imageUrl;
            document.getElementById(target === 'login' ? 'tsLoginImage' : target === 'bodhi-card' ? 'tsBodhiCardImage' : 'tsHeroImage').value = url;
            updatePreview();
            setStatus('Banner uploaded. Publish to apply it.');
        } catch (err) { setStatus(err.message); }
    }
    async function publish() {
        const hero = readHeroForm();
        const login = readLoginForm();
        const bodhiCard = readBodhiCardForm();
        settings.heroBanners = [hero, bodhiCard, ...(settings.heroBanners || []).filter((banner) => !['home', 'bodhi-path-card'].includes(banner.sectionId))];
        settings.loginBanners = [login];
        setStatus('Publishing changes...');
        try { const data = await request('/api/site-settings', { method:'PUT', body: JSON.stringify(settings) }); settings = data.data || data.settings; setStatus('Published successfully. Public pages will use this theme on next load.'); render(); }
        catch (err) { setStatus(err.message); }
    }
    function setStatus(message) { const el = document.getElementById('tsStatus'); if (el) el.textContent = message || ''; }
    window.GyanGarbhThemeStudio = { init(options) { cfg = options || {}; injectStyle(); load(); }, load, setTheme, upload, publish, updatePreview };
}());
