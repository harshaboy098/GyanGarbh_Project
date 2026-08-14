const crypto = require('crypto');
const User = require('../models/User');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const timingSafeEquals = (a, b) => {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const decodeTokenPart = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
const getSessionSecret = () => String(process.env.JWT_SECRET || process.env.SESSION_SECRET || '').trim();

const normalizeEnterpriseRole = (role) => {
    if (['guest', 'mitra', 'customer'].includes(role)) return 'customer';
    if (['assistant', 'manager'].includes(role)) return 'assistant';
    return role;
};

const signTokenPayload = (payload) => crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');

const verifyJwtToken = (token) => {
    const [header, body, signature] = String(token || '').split('.');
    if (!header || !body || !signature || !getSessionSecret()) return null;

    const expected = crypto.createHmac('sha256', getSessionSecret()).update(`${header}.${body}`).digest('base64url');
    if (!timingSafeEquals(signature, expected)) return null;

    const decodedHeader = decodeTokenPart(header);
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;

    const payload = decodeTokenPart(body);
    if (!payload.email || !payload.role || !payload.exp || payload.exp * 1000 < Date.now()) return null;
    payload.enterpriseRole = payload.enterpriseRole || normalizeEnterpriseRole(payload.role);
    return payload;
};

const verifySessionToken = (token) => {
    try {
        if (!getSessionSecret()) return null;

        const parts = String(token || '').split('.');
        if (parts.length === 3) return verifyJwtToken(token);

        const [encodedPayload, signature] = parts;
        if (!encodedPayload || !signature) return null;

        const expected = signTokenPayload(encodedPayload);
        if (!timingSafeEquals(signature, expected)) return null;

        const payload = decodeTokenPart(encodedPayload);
        if (!payload.email || !payload.role || payload.exp < Date.now()) return null;
        payload.enterpriseRole = payload.enterpriseRole || normalizeEnterpriseRole(payload.role);
        return payload;
    } catch {
        return null;
    }
};

const readSessionToken = (req) => {
    const header = String(req.get('authorization') || '');
    let token = null;

    if (header.startsWith('Bearer ')) token = header.slice(7);
    else if (req.query?.token) token = String(req.query.token);
    else {
        const cookieHeader = String(req.get('cookie') || '');
        const cookieMatch = cookieHeader.match(/(?:^|;\s*)(?:authToken|token)=([^;]+)/);
        if (cookieMatch) token = decodeURIComponent(cookieMatch[1] || '');
    }

    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
};

const requireAuth = (allowedRoles = []) => async (req, res, next) => {
    try {
        const session = verifySessionToken(readSessionToken(req));
        if (!session) {
            return res.status(401).json({ success: false, message: 'Authentication required', code: 'SESSION_REQUIRED' });
        }

        if (allowedRoles.length && !allowedRoles.includes(session.role)) {
            return res.status(403).json({ success: false, message: 'Permission denied for this role', code: 'ROLE_FORBIDDEN' });
        }

        const user = await User.findOne({ email: normalizeEmail(session.email), role: session.role, isLocked: { $ne: true } })
            .select('_id name fullName email role');

        if (!user) {
            return res.status(403).json({ success: false, message: 'Account is unavailable or locked', code: 'ACCOUNT_FORBIDDEN' });
        }

        req.session = session;
        req.user = {
            id: String(user._id),
            _id: user._id,
            name: user.name || user.fullName || '',
            email: user.email,
            role: user.role
        };
        return next();
    } catch (error) {
        return next(error);
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }
    return next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    verifySessionToken,
    readSessionToken
};
