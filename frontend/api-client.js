(function () {
    let eventSource = null;
    let reconnectTimer = null;
    let pollTimer = null;

    const KNOWN_API_ORIGINS = new Set();

    function sameOriginApiBaseUrl() {
        const origin = window.location.origin || '';
        return origin && origin !== 'null' ? origin.replace(/\/$/, '') : '';
    }

    function resolveApiBaseUrl() {
        if (window.GYAN_GARBH_API_URL) return window.GYAN_GARBH_API_URL.replace(/\/$/, '');
        return sameOriginApiBaseUrl();
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

    const dedupeGetPaths = new Set(['/api/assistants/dashboard-stats', '/api/assistants/hotel-operations', '/api/site-settings', '/api/heritage']);
    const shortTtlGetPaths = new Set(['/api/heritage']);
    const SHORT_TTL_MS = 1000;
    const inFlightFetches = new Map();
    const recentFetches = new Map();
    const nativeFetch = window.fetch?.bind(window);
    if (nativeFetch && !window.__gyanGarbhFetchDedupeInstalled) {
        window.__gyanGarbhFetchDedupeInstalled = true;
        window.fetch = function dedupedFetch(input, init = {}) {
            const method = String(init?.method || input?.method || 'GET').toUpperCase();
            let url;
            try { url = new URL(input?.url || input, window.location.href); } catch { return nativeFetch(input, init); }
            const shouldDedupe = method === 'GET' && dedupeGetPaths.has(url.pathname);
            if (!shouldDedupe) return nativeFetch(input, init);
            const key = `${method}:${url.href}`;
            const recent = recentFetches.get(key);
            if (recent && Date.now() - recent.savedAt < SHORT_TTL_MS) return Promise.resolve(recent.response.clone());
            if (!inFlightFetches.has(key)) {
                const options = { cache: 'no-store', ...init };
                inFlightFetches.set(key, nativeFetch(input, options).then((response) => {
                    if (shortTtlGetPaths.has(url.pathname)) recentFetches.set(key, { response: response.clone(), savedAt: Date.now() });
                    return response;
                }).finally(() => inFlightFetches.delete(key)));
            }
            return inFlightFetches.get(key).then((response) => response.clone());
        };
    }

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
        notify({ type: 'poll', source: 'fallback' });
        pollTimer = window.setInterval(() => notify({ type: 'poll', source: 'fallback' }), 30000);
    }

    function closeSseAndPoll(reason) {
        try {
            if (eventSource) eventSource.close();
        } catch (_) {}
        eventSource = null;
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
        if (window.console?.debug) console.debug('SSE unavailable; using HTTP polling fallback.', reason || 'error');
        startPollingFallback();
    }

    function connect() {
        const token = getLocalStorageJwtToken();
        if (!token || typeof EventSource === 'undefined') {
            if (typeof EventSource === 'undefined') startPollingFallback();
            return;
        }

        if (eventSource) eventSource.close();
        
        const baseUrl = resolveApiBaseUrl();
        
        eventSource = new EventSource(`${baseUrl}/api/events?token=${encodeURIComponent(token)}`);
        eventSource.addEventListener('update', (event) => {
            try {
                notify(JSON.parse(event.data));
            } catch {
                notify({ type: 'update' });
            }
        });
        const handleSseFailure = (event) => {
            closeSseAndPoll(event?.type || 'error');
        };
        eventSource.addEventListener('unauthorized', handleSseFailure);
        eventSource.addEventListener('error', handleSseFailure);
        eventSource.onerror = handleSseFailure;
    }

    window.GyanGarbhApi = { connectRealtime: connect, getToken, getApiBaseUrl: resolveApiBaseUrl, rewriteApiUrl };
    window.addEventListener('DOMContentLoaded', connect);
}());
