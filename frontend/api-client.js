(function () {
    let eventSource = null;
    let reconnectTimer = null;
    let pollTimer = null;

    // Backend base URL
    const API_BASE_URL = 'https://gyangarbh-project-1.onrender.com';
    const KNOWN_API_ORIGINS = new Set([API_BASE_URL]);

    function resolveApiBaseUrl() {
        if (window.GYAN_GARBH_API_URL) return window.GYAN_GARBH_API_URL.replace(/\/$/, '');
        return API_BASE_URL;
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
