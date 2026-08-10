(function () {
    const STYLE_ID = 'gg-dashboard-notification-style';
    const DEFAULT_API = 'https://gyangarbh-project-1.onrender.com';
    const instances = new Map();

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '.gg-notify{position:relative;display:inline-flex;align-items:center}.gg-notify-btn{position:relative;width:42px;height:42px;border:1px solid rgba(148,163,184,.36);border-radius:8px;background:#fff;color:#0f172a;display:grid;place-items:center;cursor:pointer;box-shadow:0 10px 28px rgba(15,23,42,.12)}.gg-notify-btn i{font-size:18px}.gg-notify-badge{position:absolute;top:-6px;right:-6px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:900;display:none;align-items:center;justify-content:center}.gg-notify-badge.show{display:flex}.gg-notify-panel{position:absolute;right:0;top:50px;z-index:9999;width:min(360px,calc(100vw - 28px));max-height:440px;display:none;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-shadow:0 26px 70px rgba(15,23,42,.28);color:#0f172a}.gg-notify.open .gg-notify-panel{display:grid;grid-template-rows:auto minmax(0,1fr)}.gg-notify-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #e2e8f0}.gg-notify-head strong{font-size:14px}.gg-notify-head button{border:0;border-radius:7px;padding:7px 9px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:900;cursor:pointer}.gg-notify-list{overflow:auto;max-height:380px}.gg-notify-item{display:grid;grid-template-columns:9px 1fr;gap:10px;width:100%;padding:12px 14px;border:0;border-bottom:1px solid #f1f5f9;background:#fff;cursor:pointer;text-align:left}.gg-notify-item:hover{background:#f8fafc}.gg-notify-dot{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#4f46e5}.gg-notify-item.read .gg-notify-dot{background:#cbd5e1}.gg-notify-item h4{margin:0 0 4px;font-size:13px;color:#0f172a}.gg-notify-item p{margin:0;color:#475569;font-size:12px;line-height:1.45}.gg-notify-item small{display:block;margin-top:6px;color:#94a3b8;font-size:11px}.gg-notify-empty{padding:24px;text-align:center;color:#64748b;font-size:13px}.gg-notify-dark .gg-notify-btn{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.16);color:#fff;backdrop-filter:blur(14px)}';
        document.head.appendChild(style);
    }

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
    const apiBase = (cfg) => (cfg.apiBase || window.GYAN_GARBH_API_URL || DEFAULT_API).replace(/\/$/, '');
    const authToken = (cfg) => cfg.token || localStorage.getItem('authToken') || localStorage.getItem('assistantToken') || localStorage.getItem('adminToken') || localStorage.getItem('sessionToken') || '';
    const canMarkRead = (role) => role === 'admin' || role === 'assistant';

    async function request(cfg, requestPath, options = {}) {
        const response = await fetch(apiBase(cfg) + requestPath, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + authToken(cfg),
                'x-gyangarbh-admin-shield': window.GYAN_GARBH_ADMIN_SHIELD || 'gg-admin-shield-v1-9821',
                ...(options.headers || {})
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed: ' + response.status);
        return data;
    }

    function formatDate(value) {
        if (!value) return '';
        return new Date(value).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }

    function render(inst) {
        const unread = Number(inst.unreadCount || 0);
        const markAll = canMarkRead(inst.cfg.role) ? '<button type="button" data-action="read-all">Mark all read</button>' : '';
        const rows = inst.items.length ? inst.items.map((item) => '<button type="button" class="gg-notify-item ' + (item.isRead ? 'read' : '') + '" data-id="' + esc(item._id || '') + '"><span class="gg-notify-dot"></span><span><h4>' + esc(item.title || 'System notification') + '</h4><p>' + esc(item.message || '') + '</p><small>' + esc(formatDate(item.createdAt)) + '</small></span></button>').join('') : '<div class="gg-notify-empty">No notifications yet.</div>';
        inst.root.className = 'gg-notify ' + (inst.cfg.theme === 'dark' ? 'gg-notify-dark ' : '') + (inst.open ? 'open' : '');
        inst.root.innerHTML = '<button class="gg-notify-btn" type="button" title="Notifications" aria-label="Notifications"><i class="bi bi-bell"></i><span class="gg-notify-badge ' + (unread ? 'show' : '') + '">' + (unread > 99 ? '99+' : unread) + '</span></button><div class="gg-notify-panel"><div class="gg-notify-head"><strong>Notifications</strong>' + markAll + '</div><div class="gg-notify-list">' + rows + '</div></div>';
    }

    async function load(inst, silent = false) {
        try {
            const data = await request(inst.cfg, '/api/notifications');
            inst.items = data.data || data.notifications || [];
            inst.unreadCount = data.unreadCount ?? inst.items.filter((item) => !item.isRead).length;
            render(inst);
            inst.cfg.onPoll?.();
        } catch (err) {
            if (!silent) { inst.items = []; inst.unreadCount = 0; render(inst); }
        }
    }

    async function markRead(inst, id) {
        if (!id || !canMarkRead(inst.cfg.role)) return;
        await request(inst.cfg, '/api/notifications/' + id + '/read', { method: 'PUT' });
        await load(inst, true);
    }

    async function markAllRead(inst) {
        if (!canMarkRead(inst.cfg.role)) return;
        await request(inst.cfg, '/api/notifications/read-all', { method: 'PUT' });
        await load(inst, true);
    }

    function init(config = {}) {
        injectStyle();
        const root = document.getElementById(config.containerId);
        if (!root) return null;
        const existing = instances.get(config.containerId);
        if (existing?.timer) clearInterval(existing.timer);
        const inst = { root, cfg: config, items: [], unreadCount: 0, open: false, timer: null };
        instances.set(config.containerId, inst);
        root.onclick = async (event) => {
            const readAll = event.target.closest('[data-action="read-all"]');
            if (readAll) { event.stopPropagation(); await markAllRead(inst); return; }
            const item = event.target.closest('.gg-notify-item');
            if (item) { event.stopPropagation(); await markRead(inst, item.dataset.id); return; }
            if (event.target.closest('.gg-notify-btn')) { inst.open = !inst.open; render(inst); }
        };
        document.addEventListener('click', (event) => { if (!root.contains(event.target) && inst.open) { inst.open = false; render(inst); } });
        render(inst);
        load(inst, true);
        inst.timer = setInterval(() => load(inst, true), config.intervalMs || 30000);
        window.addEventListener('gyangarbh:realtime', () => load(inst, true));
        return inst;
    }

    window.GyanGarbhNotifications = { init };
}());
