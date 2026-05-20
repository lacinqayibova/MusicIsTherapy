const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'backend', 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const STATE_PATH = path.join(DATA_DIR, 'user-state.json');
const CATALOG_PATH = path.join(DATA_DIR, 'catalog.json');

const SESSIONS = new Map();

const CONTENT_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = requestUrl.pathname;

        if (pathname === '/api/health' && req.method === 'GET') {
            return sendJson(res, 200, { ok: true, date: new Date().toISOString() });
        }

        if (pathname === '/api/auth/login' && req.method === 'POST') {
            return handleLogin(req, res);
        }

        if (pathname === '/api/auth/me' && req.method === 'GET') {
            const session = requireAuth(req, res);
            if (!session) {
                return;
            }
            return sendJson(res, 200, { user: session.user });
        }

        if (pathname === '/api/auth/logout' && req.method === 'POST') {
            const token = extractBearerToken(req);
            if (token) {
                SESSIONS.delete(token);
            }
            return sendJson(res, 200, { ok: true });
        }

        if (pathname === '/api/app' && req.method === 'GET') {
            const session = requireAuth(req, res);
            if (!session) {
                return;
            }

            const [catalog, fullState] = await Promise.all([
                readJson(CATALOG_PATH),
                readJson(STATE_PATH),
            ]);

            const state = sanitizeUserState(fullState[session.user.username] || {}, catalog);
            return sendJson(res, 200, {
                user: session.user,
                catalog,
                state,
            });
        }

        if (pathname === '/api/state' && req.method === 'PUT') {
            const session = requireAuth(req, res);
            if (!session) {
                return;
            }

            const [catalog, fullState, body] = await Promise.all([
                readJson(CATALOG_PATH),
                readJson(STATE_PATH),
                readJsonBody(req),
            ]);

            fullState[session.user.username] = sanitizeUserState(body, catalog);
            await writeJson(STATE_PATH, fullState);

            return sendJson(res, 200, {
                ok: true,
                state: fullState[session.user.username],
            });
        }

        return serveStatic(pathname, res);
    } catch (error) {
        console.error(error);
        sendJson(res, 500, { error: 'Server xətası baş verdi.' });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`MusicIsTherapy server is running on http://${HOST}:${PORT}`);
});

async function handleLogin(req, res) {
    const body = await readJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
        return sendJson(res, 400, { error: 'İstifadəçi adı və şifrə tələb olunur.' });
    }

    const users = await readJson(USERS_PATH);
    const user = users.find((item) => item.username === username && item.password === password);

    if (!user) {
        return sendJson(res, 401, { error: 'Məlumatlar yanlışdır.' });
    }

    const token = crypto.randomUUID();
    const publicUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
    };

    SESSIONS.set(token, {
        user: publicUser,
        createdAt: Date.now(),
    });

    return sendJson(res, 200, { token, user: publicUser });
}

function requireAuth(req, res) {
    const token = extractBearerToken(req);
    if (!token || !SESSIONS.has(token)) {
        sendJson(res, 401, { error: 'Giriş tələb olunur.' });
        return null;
    }
    return SESSIONS.get(token);
}

function extractBearerToken(req) {
    const value = req.headers.authorization || '';
    const [scheme, token] = value.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return null;
    }
    return token;
}

function sanitizeUserState(rawState, catalog) {
    const validSongIds = new Set(catalog.songs.map((song) => song.id));
    const favorites = uniqueNumberList(rawState.favorites).filter((songId) => validSongIds.has(songId));
    const history = Array.isArray(rawState.history)
        ? rawState.history
            .map((entry) => ({
                songId: Number(entry.songId),
                playedAt: Number(entry.playedAt) || Date.now(),
            }))
            .filter((entry) => validSongIds.has(entry.songId))
            .slice(0, 30)
        : [];
    const playlists = Array.isArray(rawState.playlists)
        ? rawState.playlists
            .map((playlist) => ({
                id: String(playlist.id || crypto.randomUUID()),
                name: String(playlist.name || '').trim().slice(0, 40),
                songIds: uniqueNumberList(playlist.songIds).filter((songId) => validSongIds.has(songId)),
                createdAt: Number(playlist.createdAt) || Date.now(),
            }))
            .filter((playlist) => playlist.name)
        : [];

    return { favorites, history, playlists };
}

function uniqueNumberList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return Array.from(new Set(value.map(Number).filter(Number.isFinite)));
}

async function serveStatic(pathname, res) {
    const relativePath = pathname === '/' ? '/login.html' : pathname;
    const filePath = path.join(ROOT_DIR, decodeURIComponent(relativePath));

    if (!filePath.startsWith(ROOT_DIR)) {
        return sendJson(res, 403, { error: 'Giriş qadağandır.' });
    }

    try {
        const file = await fs.readFile(filePath);
        const type = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(file);
    } catch (error) {
        if (error.code === 'ENOENT') {
            sendJson(res, 404, { error: 'Fayl tapılmadı.' });
            return;
        }
        throw error;
    }
}

async function readJson(filePath) {
    const file = await fs.readFile(filePath, 'utf8');
    return JSON.parse(file);
}

async function writeJson(filePath, value) {
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    if (!chunks.length) {
        return {};
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
        throw new Error('JSON body parse edilə bilmədi.');
    }
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify(payload));
}
