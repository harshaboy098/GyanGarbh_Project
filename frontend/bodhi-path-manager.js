(function () {
    const STYLE_ID = 'gg-bodhi-path-style';
    const fallbackImage = 'assets/bodhgaya-attraction-fallback.svg';
    let cfg = {};
    let items = [];
    let searchQuery = '';
    let statusFilter = 'all';
    let activeContainer = '';
    let isLoaded = false;
    let heritageSyncPromise = null;
    const CACHE_KEY = 'gg_assistant_bodhi_path_cache_v1';

    const DEFAULT_HERITAGE_ITEMS = [
        { _id: 'default-1', name: 'Mahabodhi Temple Complex', title: 'Mahabodhi Temple', category: 'temple', type: 'Temple', shortDescription: 'The ancient temple where Buddha attained enlightenment, a UNESCO World Heritage Site and one of the oldest brick structures in India.', tagline: 'Sacred site of Buddhist enlightenment', imageUrl: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800', coverImage: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800', images: ['https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800', 'https://images.unsplash.com/photo-1544367567-0d75bcac6d60?w=800'], visitingHours: '5:00 AM - 9:00 PM daily', openingHours: '5:00 AM - 9:00 PM', entryFee: 'Free', estimatedVisitTime: '2-3 hours', estimatedDuration: '2-3 hours', routeDetails: { startingPoint: 'Bodh Gaya Town', keyStops: ['Bodhi Tree', 'Temple Main Altar', 'Museum'], estimatedDuration: '2-3 hours', estimatedKm: '0.5 km' }, relatedTemples: ['Bodhi Tree', 'Chinese Temple', 'Japanese Temple'], status: 'Active' },
        { _id: 'default-2', name: 'Thai Monastery', title: 'Thai Monastery', category: 'monastery', type: 'Monastery', shortDescription: 'A serene Thai Buddhist monastery featuring traditional Southeast Asian architecture and peaceful meditation gardens.', tagline: 'Peaceful Thai Buddhist retreat', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', images: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'], visitingHours: '6:00 AM - 8:00 PM', openingHours: '6:00 AM - 8:00 PM', entryFee: 'Free', estimatedVisitTime: '1-2 hours', estimatedDuration: '1-2 hours', routeDetails: { startingPoint: 'Thai Monastery Main Gate', keyStops: ['Prayer Hall', 'Meditation Gardens', 'Monks Quarters'], estimatedDuration: '1-2 hours', estimatedKm: '0.3 km' }, relatedTemples: ['Chinese Temple', 'Japanese Temple'], status: 'Active' },
        { _id: 'default-3', name: 'Great Buddha Statue', title: 'Great Buddha Statue', category: 'monument', type: 'Monument', shortDescription: 'A magnificent statue of Buddha overlooking Bodh Gaya, symbolizing peace and compassion.', tagline: 'Iconic peace monument', imageUrl: 'https://images.unsplash.com/photo-1584734259123-456789012345?w=800', coverImage: 'https://images.unsplash.com/photo-1584734259123-456789012345?w=800', images: ['https://images.unsplash.com/photo-1584734259123-456789012345?w=800'], visitingHours: '6:00 AM - 6:00 PM', openingHours: '6:00 AM - 6:00 PM', entryFee: '₹50', estimatedVisitTime: '1-2 hours', estimatedDuration: '1-2 hours', routeDetails: { startingPoint: 'Great Buddha Statue Base', keyStops: ['Meditation Platform', 'Viewpoint'], estimatedDuration: '1-2 hours', estimatedKm: '1 km' }, status: 'Active' },
        { _id: 'default-4', name: 'Royal Bhutan Monastery', title: 'Royal Bhutan Monastery', category: 'monastery', type: 'Monastery', shortDescription: 'An ornate Bhutanese monastery featuring vibrant traditional architecture and authentic Buddhist practices.', tagline: 'Bhutanese spiritual sanctuary', imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', coverImage: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', images: ['https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800'], visitingHours: '6:00 AM - 9:00 PM', openingHours: '6:00 AM - 9:00 PM', entryFee: 'Free', estimatedVisitTime: '1.5-2 hours', estimatedDuration: '1.5-2 hours', routeDetails: { startingPoint: 'Royal Bhutan Monastery Gate', keyStops: ['Main Temple', 'Prayer Wheels', 'Spice Garden'], estimatedDuration: '1.5-2 hours', estimatedKm: '0.8 km' }, relatedTemples: ['Thai Monastery', 'Chinese Temple'], status: 'Active' },
        { _id: 'default-5', name: 'Japanese Temple Circuit', title: 'Japanese Temple Circuit', category: 'route', type: 'Route', shortDescription: 'A curated pilgrimage route connecting beautiful Japanese Buddhist temples in Bodh Gaya.', tagline: 'Japanese Buddhism heritage route', imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c6f2b0991?w=800', coverImage: 'https://images.unsplash.com/photo-1517604931442-7e0c6f2b0991?w=800', images: ['https://images.unsplash.com/photo-1517604931442-7e0c6f2b0991?w=800'], visitingHours: '7:00 AM - 6:00 PM', openingHours: '7:00 AM - 6:00 PM', entryFee: 'Free', estimatedVisitTime: '3-4 hours', estimatedDuration: '3-4 hours', routeDetails: { startingPoint: 'Mahabodhi Temple Complex', keyStops: ['Japanese Temple', 'Zen Gardens', 'Meditation Center', 'Temple Library'], estimatedDuration: '3-4 hours', estimatedKm: '2.5 km' }, relatedTemples: ['Thai Monastery', 'Chinese Temple', 'Korean Temple'], status: 'Active' },
        { _id: 'default-6', name: 'Bodhi Tree Sacred Site', title: 'Bodhi Tree', category: 'monument', type: 'Monument', shortDescription: 'The sacred fig tree under which Buddha attained enlightenment 2,600 years ago.', tagline: 'The tree of enlightenment', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', images: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'], visitingHours: '5:00 AM - 9:00 PM', openingHours: '5:00 AM - 9:00 PM', entryFee: 'Free', estimatedVisitTime: '1-2 hours', estimatedDuration: '1-2 hours', routeDetails: { startingPoint: 'Mahabodhi Temple Complex', keyStops: ['Meditation Platform'], estimatedDuration: '1-2 hours', estimatedKm: '0.1 km' }, status: 'Active' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
        .bp-shell{display:grid;gap:16px}.bp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.bp-toolbar h2{margin:0;font-size:22px}.bp-toolbar p{margin:4px 0 0}.bp-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.bp-search{position:relative;min-width:230px}.bp-search input{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px 10px 34px}.bp-search:before{content:'';position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.62}.bp-filter{border:1px solid #cbd5e1;border-radius:8px;padding:10px;background:#fff}.bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}.bp-card{overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.12)}.bp-cover{position:relative;aspect-ratio:4/3;background:#e2e8f0}.bp-cover img{width:100%;height:100%;object-fit:cover;display:block}.bp-badge{position:absolute;top:10px;left:10px;max-width:calc(100% - 20px);padding:6px 9px;border-radius:999px;background:rgba(15,23,42,.86);color:#fff;font-size:12px;font-weight:800}.bp-status{position:absolute;right:10px;bottom:10px;padding:5px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:900}.bp-status.inactive{background:#fee2e2;color:#991b1b}.bp-popularity{position:absolute;left:10px;bottom:10px;padding:5px 8px;border-radius:999px;background:#fff7ed;color:#9a3412;font-size:11px;font-weight:900;box-shadow:0 8px 20px rgba(15,23,42,.18)}.bp-body{display:grid;gap:10px;padding:13px}.bp-name{margin:0;color:#111827;font-size:16px;line-height:1.25}.bp-tagline{margin:0;color:#64748b;font-size:13px;line-height:1.45;min-height:38px}.bp-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.bp-meta div{padding:8px;border-radius:8px;background:#f8fafc}.bp-meta small{display:block;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase}.bp-meta strong{display:block;color:#0f172a;font-size:13px;overflow-wrap:anywhere}.bp-stops{display:flex;gap:6px;flex-wrap:wrap;min-height:26px}.bp-stop{padding:5px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:11px;font-weight:800}.bp-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bp-card-actions button,.bp-toolbar button,.bp-modal-actions button,.bp-stop-row button{border:0;border-radius:8px;padding:9px 10px;font-weight:800;cursor:pointer}.bp-primary{background:#4f46e5;color:#fff}.bp-soft{background:#eef2ff;color:#312e81}.bp-danger{background:#ef4444;color:#fff}.bp-ghost{background:#f1f5f9;color:#334155}.bp-empty{padding:34px;text-align:center;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:8px}.bp-modal{position:fixed;inset:0;z-index:9998;display:none;background:rgba(2,6,23,.62)}.bp-modal.open{display:grid;place-items:center}.bp-panel{width:min(980px,calc(100vw - 24px));max-height:90vh;overflow:auto;background:#fff;border-radius:8px;box-shadow:0 30px 90px rgba(0,0,0,.36)}.bp-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px;border-bottom:1px solid #e2e8f0;background:#0f172a;color:#fff}.bp-panel-head h3{margin:0}.bp-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px}.bp-field{display:grid;gap:6px}.bp-field.full{grid-column:1/-1}.bp-field label{font-size:12px;font-weight:900;text-transform:uppercase;color:#475569}.bp-field input,.bp-field select,.bp-field textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit}.bp-field textarea{min-height:82px;resize:vertical}.bp-drop{position:relative;display:grid;place-items:center;gap:8px;min-height:112px;border:1.5px dashed #94a3b8;border-radius:8px;background:#f8fafc;color:#475569;text-align:center;cursor:pointer}.bp-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}.bp-preview{display:flex;gap:8px;flex-wrap:wrap}.bp-preview img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0}.bp-stop-list{display:grid;gap:8px}.bp-stop-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px}.bp-stop-row input{min-width:0}.bp-modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:14px 18px;border-top:1px solid #e2e8f0}.bp-audit{display:grid;gap:10px;padding:18px}.bp-audit-row{display:grid;grid-template-columns:14px 1fr;gap:10px}.bp-audit-dot{width:10px;height:10px;border-radius:50%;background:#4f46e5;margin-top:5px}.bp-audit-card{padding:11px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}.bp-audit-card strong{display:block;color:#0f172a}.bp-audit-card small{color:#64748b}.bp-error{border-color:#fecaca;background:#fff1f2;color:#991b1b}@media(max-width:680px){.bp-form{grid-template-columns:1fr}.bp-card-actions,.bp-stop-row{grid-template-columns:1fr}.bp-toolbar{align-items:stretch}.bp-actions,.bp-toolbar button,.bp-search,.bp-filter{width:100%}}`;
        document.head.appendChild(style);
    }

    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const apiBase = () => (cfg.apiBase || (window.GYAN_GARBH_API_URL || (window.location.origin && window.location.origin !== 'null' ? window.location.origin : ''))).replace(/\/$/, '');
    const token = () => cfg.token || localStorage.getItem('assistantToken') || localStorage.getItem('authToken') || localStorage.getItem('sessionToken') || '';
    function redirectLogin(reason = 'Session expired. Please log in again.') { console.warn(reason); window.location.href = 'assistant-login.html'; }
    const headers = () => { const activeToken = token(); if (!activeToken) redirectLogin('Missing assistant token.'); return { 'Content-Type':'application/json', Authorization:`Bearer ${activeToken}`, 'x-gyangarbh-admin-shield': window.GYAN_GARBH_ADMIN_SHIELD || 'gg-admin-shield-v1-9821' }; };
    const currentActor = () => ({ name: cfg.actorName || localStorage.getItem('assistantName') || localStorage.getItem('mitraName') || localStorage.getItem('adminName') || 'User', email: cfg.actorEmail || localStorage.getItem('assistantEmail') || localStorage.getItem('mitraEmail') || localStorage.getItem('adminEmail') || '', role: cfg.role || 'assistant' });
    const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : String(value || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
    const normalize = (item) => ({ ...item, name: item.name || item.title || 'Untitled Heritage', coverImage: item.coverImage || item.imageUrl || (item.images || [])[0] || fallbackImage, galleryImages: item.galleryImages || item.images || [], routeDetails: item.routeDetails || {}, openingHours: item.openingHours || item.visitingHours || '', tagline: item.tagline || item.shortDescription || '' });
    const money = (v) => v || 'Free / NA';
    const categoryLabel = (item) => (item.type || item.category || 'Temple').toString().replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    const isInactive = (item) => item.status === 'Inactive' || item.isLocked;

    function readCache() { try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); return Array.isArray(cached) ? cached.map(normalize) : []; } catch { return []; } }
    function writeCache(nextItems) { try { if (Array.isArray(nextItems)) localStorage.setItem(CACHE_KEY, JSON.stringify(nextItems)); } catch (_) {} }
    function timeout(ms = 12000) { return new Promise((_, reject) => setTimeout(() => reject(new Error('API request timeout')), ms)); }
    async function request(path, options = {}) {
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const res = await Promise.race([fetch(`${apiBase()}${path}`, { cache: 'no-store', ...options, headers: { ...headers(), ...(options.headers || {}) } }), timeout(12000)]);
                const data = await res.json().catch(() => ({}));
                if (res.status === 401 || res.status === 403) { redirectLogin(data.message || 'Session expired or permission denied.'); throw new Error(data.message || `Request failed: ${res.status}`); }
                if (!res.ok || data.success === false) throw new Error(data.message || `Request failed: ${res.status}`);
                return data;
            } catch (error) {
                lastError = error;
                await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
            }
        }
        throw lastError || new Error('Failed to fetch');
    }

    function filteredItems() {
        const q = searchQuery.toLowerCase().trim();
        return items.filter((item) => {
            const statusOk = statusFilter === 'all' || (statusFilter === 'active' && !isInactive(item)) || (statusFilter === 'inactive' && isInactive(item));
            if (!statusOk) return false;
            if (!q) return true;
            return [item.name, item.category, item.type, item.tagline, item.entryFee, item.routeDetails?.startingPoint, ...(item.routeDetails?.keyStops || [])].join(' ').toLowerCase().includes(q);
        });
    }

    function render() {
        const root = document.getElementById(cfg.containerId);
        if (!root) return;
        const visible = filteredItems();
        root.innerHTML = `<div class="bp-shell"><div class="bp-toolbar"><div><h2>Bodhi Path</h2><p class="bp-tagline">Temple and pilgrimage route catalog</p></div><div class="bp-actions"><label class="bp-search"><input value="${esc(searchQuery)}" placeholder="Search temples, fees, stops" oninput="GyanGarbhBodhiPath.setSearch(this.value)"></label><select class="bp-filter" onchange="GyanGarbhBodhiPath.setStatus(this.value)"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button class="bp-ghost" onclick="GyanGarbhBodhiPath.load(true)">Refresh</button><button class="bp-primary" onclick="GyanGarbhBodhiPath.openForm()">Add New Temple / Route</button></div></div>${visible.length ? `<div class="bp-grid">${visible.map(card).join('')}</div>` : `<div class="bp-empty">${items.length ? 'No records match the current filters.' : 'No Bodhi Path records found.'}</div>`}</div>`;
        const filter = root.querySelector('.bp-filter');
        if (filter) filter.value = statusFilter;
        if (typeof cfg.onCount === 'function') cfg.onCount(items.length);
    }

    function popularityLabel(item) {
        const views = Number(item.views || 0);
        const inquiries = Number(item.inquiries || 0);
        if (views >= 100 || inquiries >= 20) return 'Popular Route';
        if (views >= 50 || inquiries >= 10) return 'Top Rated';
        return '';
    }

    function card(item) {
        const stops = (item.routeDetails.keyStops || item.relatedTemples || []).slice(0, 4);
        const inactive = isInactive(item);
        const popular = popularityLabel(item);
        return `<article class="bp-card"><div class="bp-cover"><img src="${esc(item.coverImage)}" alt="${esc(item.name)}" onerror="this.src='${fallbackImage}'"><span class="bp-badge">${esc(categoryLabel(item))}</span>${popular ? `<span class="bp-popularity">${esc(popular)}</span>` : ''}<span class="bp-status ${inactive ? 'inactive' : ''}">${inactive ? 'Inactive' : 'Active'}</span></div><div class="bp-body"><h3 class="bp-name">${esc(item.name)}</h3><p class="bp-tagline">${esc(item.tagline || item.shortDescription || '')}</p><div class="bp-meta"><div><small>Entry Fee</small><strong>${esc(money(item.entryFee))}</strong></div><div><small>Time</small><strong>${esc(item.routeDetails.estimatedDuration || item.estimatedVisitTime || 'Flexible')}</strong></div></div><div class="bp-stops">${stops.length ? stops.map((s) => `<span class="bp-stop">${esc(s)}</span>`).join('') : '<span class="bp-stop">Route stops pending</span>'}</div><div class="bp-card-actions"><button class="bp-soft" onclick="GyanGarbhBodhiPath.openForm('${item._id}')">Edit Heritage</button><button class="bp-soft" onclick="GyanGarbhBodhiPath.openRouteStops('${item._id}')">Manage Route Stops</button><button class="bp-ghost" onclick="GyanGarbhBodhiPath.openAudit('${item._id}')">View Audit Logs</button><button class="bp-danger" onclick="GyanGarbhBodhiPath.remove('${item._id}')">Delete</button></div></div></article>`;
    }

    function ensureModal(id) {
        let modal = document.getElementById(id);
        if (!modal) { modal = document.createElement('div'); modal.id = id; modal.className = 'bp-modal'; document.body.appendChild(modal); }
        return modal;
    }
    function close(id) { document.getElementById(id)?.classList.remove('open'); }

    function previewHtml(list) {
        return (list || []).slice(0, 10).map((src) => `<img src="${esc(src)}" alt="Preview" onerror="this.remove()">`).join('');
    }

    function stopRows(stops) {
        const data = stops.length ? stops : [''];
        return data.map((stop) => `<div class="bp-stop-row"><input value="${esc(stop)}" placeholder="Route stop"><button type="button" class="bp-ghost" onclick="GyanGarbhBodhiPath.moveStop(this,-1)">Up</button><button type="button" class="bp-ghost" onclick="GyanGarbhBodhiPath.moveStop(this,1)">Down</button><button type="button" class="bp-danger" onclick="GyanGarbhBodhiPath.removeStop(this)">Remove</button></div>`).join('');
    }

    function formHtml(item = {}) {
        const r = item.routeDetails || {};
        const gallery = item.galleryImages || [];
        return `<div class="bp-panel"><div class="bp-panel-head"><div><h3>${item._id ? 'Edit Heritage' : 'Add New Temple / Route'}</h3><small>${esc(currentActor().name)} (${esc(currentActor().role)})</small></div><button class="bp-ghost" onclick="GyanGarbhBodhiPath.closeModal('bpFormModal')">Close</button></div><form id="bpForm" class="bp-form"><input type="hidden" name="id" value="${esc(item._id || '')}"><div class="bp-field"><label>Name</label><input name="name" required value="${esc(item.name || '')}"></div><div class="bp-field"><label>Category / Type</label><select name="category"><option value="temple">Temple</option><option value="monastery">Monastery</option><option value="circuit-route">Circuit Route</option><option value="sacred-tree">Sacred Tree</option><option value="monument">Monument</option><option value="festival">Festival</option><option value="tradition">Tradition</option></select></div><div class="bp-field full"><label>Short Tagline</label><input name="tagline" value="${esc(item.tagline || '')}"></div><div class="bp-field full"><label>Rich Description</label><textarea name="fullDescription" required>${esc(item.fullDescription || '')}</textarea></div><div class="bp-field"><label>Opening Hours</label><input name="openingHours" value="${esc(item.openingHours || '')}"></div><div class="bp-field"><label>Entry Fee</label><input name="entryFee" value="${esc(item.entryFee || '')}"></div><div class="bp-field"><label>Cover Image URL</label><input name="coverImage" value="${esc(item.coverImage || '')}" oninput="GyanGarbhBodhiPath.previewUrl('bpCoverPreview', this.value)"></div><div class="bp-field"><label>Cover Photo</label><label class="bp-drop"><input name="coverFile" type="file" accept="image/*" onchange="GyanGarbhBodhiPath.previewFiles(this,'bpCoverPreview',false)"><strong>Upload cover image</strong><span>Drop or choose one photo</span></label><div id="bpCoverPreview" class="bp-preview">${previewHtml([item.coverImage].filter(Boolean))}</div></div><div class="bp-field full"><label>Gallery Image URLs</label><textarea name="galleryImages" placeholder="One image URL per line" oninput="GyanGarbhBodhiPath.previewUrls('bpGalleryPreview', this.value)">${esc(gallery.join('\n'))}</textarea></div><div class="bp-field full"><label>Gallery Photos</label><label class="bp-drop"><input name="galleryFiles" type="file" multiple accept="image/*" onchange="GyanGarbhBodhiPath.previewFiles(this,'bpGalleryPreview',true)"><strong>Upload gallery images</strong><span>Multiple images supported</span></label><div id="bpGalleryPreview" class="bp-preview">${previewHtml(gallery)}</div></div><div class="bp-field"><label>Starting Point</label><input name="startingPoint" value="${esc(r.startingPoint || '')}"></div><div class="bp-field"><label>Estimated Duration</label><input name="estimatedDuration" value="${esc(r.estimatedDuration || item.estimatedVisitTime || '')}"></div><div class="bp-field"><label>Estimated KM</label><input name="estimatedKm" value="${esc(r.estimatedKm || '')}"></div><div class="bp-field"><label>Best Time to Visit</label><input name="bestTimeToVisit" value="${esc(r.bestTimeToVisit || item.bestTimeToVisit || '')}"></div><div class="bp-field full"><label>Key Route Stops</label><div id="bpStopList" class="bp-stop-list">${stopRows(r.keyStops || item.relatedTemples || [])}</div><button type="button" class="bp-soft" onclick="GyanGarbhBodhiPath.addStop()">Add Route Stop</button></div><div class="bp-field"><label>Status</label><select name="status"><option>Active</option><option>Inactive</option></select></div></form><div class="bp-modal-actions"><button class="bp-ghost" onclick="GyanGarbhBodhiPath.closeModal('bpFormModal')">Cancel</button><button id="bpSaveButton" class="bp-primary" onclick="GyanGarbhBodhiPath.saveForm()">Save</button></div></div>`;
    }

    function setSelects(item) {
        const form = document.getElementById('bpForm');
        if (!form) return;
        form.category.value = item.category || 'temple';
        form.status.value = item.status || 'Active';
    }

    function readFiles(files) {
        return Promise.all(Array.from(files || []).map((file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve(''); reader.readAsDataURL(file); })));
    }

    async function payloadFromForm(form) {
        const fd = new FormData(form);
        const coverUploads = await readFiles(form.coverFile.files);
        const galleryUploads = await readFiles(form.galleryFiles.files);
        const galleryUrls = asArray(fd.get('galleryImages'));
        const keyStops = Array.from(document.querySelectorAll('#bpStopList input')).map((input) => input.value.trim()).filter(Boolean);
        const galleryImages = [...galleryUrls, ...galleryUploads].filter(Boolean);
        return { name: fd.get('name'), title: fd.get('name'), category: fd.get('category'), type: categoryLabel({ category: fd.get('category') }), tagline: fd.get('tagline'), shortDescription: fd.get('tagline') || fd.get('name'), fullDescription: fd.get('fullDescription'), openingHours: fd.get('openingHours'), visitingHours: fd.get('openingHours'), entryFee: fd.get('entryFee'), coverImage: coverUploads[0] || fd.get('coverImage') || galleryImages[0] || '', imageUrl: coverUploads[0] || fd.get('coverImage') || galleryImages[0] || '', galleryImages, images: galleryImages, routeDetails: { startingPoint: fd.get('startingPoint'), keyStops, estimatedDuration: fd.get('estimatedDuration'), estimatedKm: fd.get('estimatedKm'), bestTimeToVisit: fd.get('bestTimeToVisit') }, estimatedVisitTime: fd.get('estimatedDuration'), bestTimeToVisit: fd.get('bestTimeToVisit'), relatedTemples: keyStops, status: fd.get('status'), changes: `${currentActor().name} saved ${fd.get('name')} with ${keyStops.length} route stops` };
    }

    function ensureInstantItems() {
        if (!items.length) {
            const cached = readCache();
            items = cached.length ? cached : DEFAULT_HERITAGE_ITEMS.map(normalize);
        }
        isLoaded = true;
        activeContainer = cfg.containerId;
    }

    function syncHeritage(force = false) {
        if (heritageSyncPromise && !force) return heritageSyncPromise;
        heritageSyncPromise = request('/api/heritage?includeInactive=true')
            .then((response) => {
                const nextItems = (response.data || response.heritage || response.bodhiPaths || response.temples || []).map(normalize);
                if (nextItems.length || !items.length) items = nextItems;
                writeCache(items);
                isLoaded = true;
                activeContainer = cfg.containerId;
                render();
                return items;
            })
            .catch((err) => {
                console.warn('Bodhi Path background sync skipped:', err.message);
                const cached = items.length ? items : readCache();
                if (cached.length) { items = cached; isLoaded = true; activeContainer = cfg.containerId; render(); }
                return items;
            })
            .finally(() => { heritageSyncPromise = null; });
        return heritageSyncPromise;
    }

    function load(force = false) {
        const root = document.getElementById(cfg.containerId);
        if (!root) return Promise.resolve(items);
        ensureInstantItems();
        render();
        syncHeritage(force);
        return Promise.resolve(items);
    }

    function openForm(id = '') {
        const item = id ? items.find((x) => x._id === id) : {};
        const modal = ensureModal('bpFormModal');
        modal.innerHTML = formHtml(item || {});
        modal.classList.add('open');
        setSelects(item || {});
    }

    async function saveForm() {
        const form = document.getElementById('bpForm');
        if (!form.reportValidity()) return;
        const button = document.getElementById('bpSaveButton');
        const id = form.elements.id.value;
        try {
            if (button) { button.disabled = true; button.textContent = 'Saving...'; }
            const body = await payloadFromForm(form);
            await request(id ? `/api/heritage/${id}` : '/api/heritage', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
            close('bpFormModal');
            await load(true);
        } catch (err) {
            if (window.Swal) await Swal.fire('Unable to save', err.message, 'error'); else alert(err.message);
        } finally {
            if (button) { button.disabled = false; button.textContent = 'Save'; }
        }
    }

    function openRouteStops(id) { openForm(id); setTimeout(() => document.querySelector('#bpStopList input')?.focus(), 50); }
    function openAudit(id) {
        const item = items.find((x) => x._id === id);
        const logs = (item?.auditLogs || []).slice().reverse();
        const modal = ensureModal('bpAuditModal');
        modal.innerHTML = `<div class="bp-panel"><div class="bp-panel-head"><div><h3>Audit Trail</h3><small>${esc(item?.name || 'Bodhi Path')}</small></div><button class="bp-ghost" onclick="GyanGarbhBodhiPath.closeModal('bpAuditModal')">Close</button></div><div class="bp-audit">${logs.length ? logs.map((log) => `<div class="bp-audit-row"><span class="bp-audit-dot"></span><div class="bp-audit-card"><strong>${esc(log.action || 'UPDATE')}</strong><small>Updated by ${esc(log.updatedBy || 'System')} (${esc(log.role || 'role')}) on ${esc(new Date(log.timestamp || Date.now()).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }))}</small><p>${esc(log.changes || '')}</p></div></div>`).join('') : '<div class="bp-empty">No audit logs yet.</div>'}</div></div>`;
        modal.classList.add('open');
    }

    async function remove(id) {
        const item = items.find((x) => x._id === id);
        const ok = window.Swal ? (await Swal.fire({ title:'Delete heritage entry?', text:'This archives the route as inactive and keeps its audit history.', icon:'warning', showCancelButton:true, confirmButtonText:'Delete' })).isConfirmed : confirm('Delete heritage entry?');
        if (!ok) return;
        try {
            const response = await request(`/api/heritage/${id}`, { method:'DELETE', body: JSON.stringify({ reason:`${currentActor().name} deleted ${item?.name || 'heritage entry'}` }) });
            const updated = normalize(response.data || response.heritage || response.bodhiPath || {});
            items = items.map((entry) => entry._id === id ? updated : entry);
            render();
            if (window.Swal) await Swal.fire('Deleted', 'Route archived and audit log updated.', 'success');
        } catch (err) {
            if (window.Swal) await Swal.fire('Unable to delete', err.message, 'error'); else alert(err.message);
        }
    }

    function addStop(value = '') {
        const list = document.getElementById('bpStopList');
        if (!list) return;
        const wrap = document.createElement('div');
        wrap.className = 'bp-stop-row';
        wrap.innerHTML = `<input value="${esc(value)}" placeholder="Route stop"><button type="button" class="bp-ghost" onclick="GyanGarbhBodhiPath.moveStop(this,-1)">Up</button><button type="button" class="bp-ghost" onclick="GyanGarbhBodhiPath.moveStop(this,1)">Down</button><button type="button" class="bp-danger" onclick="GyanGarbhBodhiPath.removeStop(this)">Remove</button>`;
        list.appendChild(wrap);
        wrap.querySelector('input')?.focus();
    }
    function removeStop(button) {
        const row = button.closest('.bp-stop-row');
        const list = document.getElementById('bpStopList');
        if (!row || !list) return;
        if (list.children.length === 1) row.querySelector('input').value = '';
        else row.remove();
    }
    function moveStop(button, delta) {
        const row = button.closest('.bp-stop-row');
        if (!row) return;
        if (delta < 0 && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
        if (delta > 0 && row.nextElementSibling) row.parentElement.insertBefore(row.nextElementSibling, row);
    }
    async function previewFiles(input, targetId, append) {
        const target = document.getElementById(targetId);
        const data = await readFiles(input.files);
        if (!target) return;
        target.innerHTML = append ? target.innerHTML + previewHtml(data) : previewHtml(data);
    }
    function previewUrl(targetId, value) { const target = document.getElementById(targetId); if (target) target.innerHTML = previewHtml([value].filter(Boolean)); }
    function previewUrls(targetId, value) { const target = document.getElementById(targetId); if (target) target.innerHTML = previewHtml(asArray(value)); }
    function setSearch(value) { searchQuery = value || ''; render(); const input = document.querySelector(`#${cfg.containerId} .bp-search input`); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }
    function setStatus(value) { statusFilter = value || 'all'; render(); }

    window.GyanGarbhBodhiPath = { init(options) { const nextContainer = options?.containerId || ''; cfg = options || {}; injectStyle(); if (nextContainer !== activeContainer) isLoaded = false; load(false); }, load, openForm, saveForm, openRouteStops, openAudit, remove, closeModal: close, addStop, removeStop, moveStop, previewFiles, previewUrl, previewUrls, setSearch, setStatus };
}());
