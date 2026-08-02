(function () {
    let eventSource = null;
    let reconnectTimer = null;
    let pollTimer = null;

    // 🌐 Local Testing Ke Liye Base URL
    const LOCAL_API_URL = 'https://gyangarbh-project-1.onrender.com';
    const PRODUCTION_API_URL = 'https://gyangarbh-project-1.onrender.com';
    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
    const KNOWN_API_ORIGINS = new Set([LOCAL_API_URL, PRODUCTION_API_URL]);

    function resolveApiBaseUrl() {
        if (window.GYAN_GARBH_API_URL) return window.GYAN_GARBH_API_URL.replace(/\/$/, '');
        if (window.location.protocol === 'file:') return PRODUCTION_API_URL;
        return LOCAL_HOSTS.has(window.location.hostname) ? LOCAL_API_URL : PRODUCTION_API_URL;
    }

    function rewriteApiUrl(input) {
        if (typeof input !== 'string') return input;

        try {
            const url = new URL(input, window.location.href);
            if (KNOWN_API_ORIGINS.has(url.origin)) {
                return `${resolveApiBaseUrl()}${url.pathname}${url.search}${url.hash}`;
            }
        } catch {
            return input;
        }

        return input;
    }

    window.GYAN_GARBH_API_URL = resolveApiBaseUrl();
    window.API_URL = window.GYAN_GARBH_API_URL;

    function getToken() {
        return (
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('authToken') ||
            localStorage.getItem('hotelToken') ||
            sessionStorage.getItem('hotelToken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('token') ||
            ''
        );
    }

    function notify(detail) {
        window.dispatchEvent(new CustomEvent('gyangarbh:realtime', { detail }));
    }

    function startPollingFallback() {
        if (pollTimer) return;
        pollTimer = window.setInterval(() => notify({ type: 'poll' }), 15000);
    }

    function connect() {
        const token = getToken();
        if (!token || typeof EventSource === 'undefined') {
            startPollingFallback();
            return;
        }

        if (eventSource) eventSource.close();
        
        // 🛠️ FIXED: Agar global URL nahi milega, toh ab yeh seedhe configured Render server se connect hoga
        const baseUrl = resolveApiBaseUrl();
        
        eventSource = new EventSource(`${baseUrl}/api/events?token=${encodeURIComponent(token)}`);
        eventSource.addEventListener('update', (event) => {
            try {
                notify(JSON.parse(event.data));
            } catch {
                notify({ type: 'update' });
            }
        });
        eventSource.onerror = function () {
            eventSource.close();
            eventSource = null;
            startPollingFallback();
            window.clearTimeout(reconnectTimer);
            reconnectTimer = window.setTimeout(connect, 5000);
        };
    }

    window.GyanGarbhApi = { connectRealtime: connect, getToken, getApiBaseUrl: resolveApiBaseUrl, rewriteApiUrl };
    window.addEventListener('DOMContentLoaded', connect);
}());
