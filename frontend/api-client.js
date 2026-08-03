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

    function decodeTokenPayload(token) {
        const parts = String(token || '').split('.');
        if (parts.length !== 2 && parts.length !== 3) return null;

        try {
            const payloadPart = parts.length === 3 ? parts[1] : parts[0];
            const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
            return JSON.parse(atob(padded));
        } catch {
            return null;
        }
    }

    function isUsableStoredToken(token) {
        if (!token || token === 'null' || token === 'undefined') return false;

        const payload = decodeTokenPayload(token);
        if (!payload) return false;

        if (payload.exp) {
            const expiresAt = payload.exp > 9999999999 ? payload.exp : payload.exp * 1000;
            if (expiresAt <= Date.now()) return false;
        }

        return true;
    }

    function getLocalStorageJwtToken() {
        const tokenKeys = ['authToken', 'hotelToken', 'token', 'adminToken'];
        for (const key of tokenKeys) {
            const token = localStorage.getItem(key);
            if (isUsableStoredToken(token)) return token;
        }

        return '';
    }

    function removeInvalidLocalStorageToken(token) {
        ['authToken', 'hotelToken', 'token', 'adminToken'].forEach((key) => {
            if (!token || localStorage.getItem(key) === token) {
                localStorage.removeItem(key);
            }
        });
    }

    function notify(detail) {
        window.dispatchEvent(new CustomEvent('gyangarbh:realtime', { detail }));
    }

    function startPollingFallback() {
        if (pollTimer) return;
        pollTimer = window.setInterval(() => notify({ type: 'poll' }), 15000);
    }

    function connect() {
        const token = getLocalStorageJwtToken();
        if (!token || typeof EventSource === 'undefined') {
            if (typeof EventSource === 'undefined') startPollingFallback();
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
        eventSource.onerror = function (err) {
            console.warn('SSE connection error/unauthorized. Closing stream.', err);
            removeInvalidLocalStorageToken(token);
            if (eventSource) eventSource.close();
            eventSource = null;
            window.clearTimeout(reconnectTimer);
            reconnectTimer = null;
        };
    }

    window.GyanGarbhApi = { connectRealtime: connect, getToken, getApiBaseUrl: resolveApiBaseUrl, rewriteApiUrl };
    window.addEventListener('DOMContentLoaded', connect);
}());
