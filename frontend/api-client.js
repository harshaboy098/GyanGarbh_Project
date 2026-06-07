(function () {
    const originalFetch = window.fetch.bind(window);
    let eventSource = null;
    let reconnectTimer = null;
    let pollTimer = null;

    // 🌐 Local Testing Ke Liye Base URL
    const LOCAL_API_URL = 'http://localhost:5000';

    function getToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    }

    window.fetch = function (input, init) {
        const options = { ...(init || {}) };
        const headers = new Headers(options.headers || {});
        const token = getToken();
        if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        options.headers = headers;
        return originalFetch(input, options);
    };

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
        
        // 🛠️ FIXED: Agar global URL nahi milega, toh ab yeh seedhe local server (localhost:5000) se connect hoga
        const baseUrl = window.GYAN_GARBH_API_URL || LOCAL_API_URL;
        
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

    window.GyanGarbhApi = { connectRealtime: connect, getToken };
    window.addEventListener('DOMContentLoaded', connect);
}());