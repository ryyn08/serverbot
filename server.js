const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'server.json');

function readDB() {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

let liveLogs = ["[SYSTEM] Proxy Core Engine aktif."];
function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    liveLogs.push(`[${time}] ${msg}`);
    if (liveLogs.length > 30) liveLogs.shift();
}

// Loop Otomatis: Mengatur fluktuasi ping, Auto-Disconnect (>=150ms) & Auto-Reconnect (<150ms)
setInterval(() => {
    try {
        let db = readDB();
        db.servers.forEach(srv => {
            if (srv.killedByAdmin) {
                srv.status = "OFFLINE";
                srv.latency = 0;
                return;
            }

            // Naik turunkan ping secara acak kawan
            const change = Math.floor(Math.random() * 60) - 30;
            srv.latency = Math.max(20, srv.latency + change);

            if (srv.latency >= 150) {
                if (srv.status === "ONLINE") {
                    srv.status = "OFFLINE";
                    addLog(`REQ_ERR: Server ${srv.id} (${srv.name}) dc -> ${srv.latency}ms`);
                }
            } else {
                if (srv.status === "OFFLINE") {
                    srv.status = "ONLINE";
                    addLog(`REQ_CONN: Server ${srv.id} (${srv.name}) up -> ${srv.latency}ms`);
                }
            }
        });
        writeDB(db);
    } catch (e) {}
}, 2500);

// API Monitor untuk Website
app.get('/api/servers', (req, res) => {
    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const db = readDB();
    res.json({
        clientIp: clientIp,
        system: { cpu: Math.floor(Math.random() * 20) + 5 + "%", ram: Math.floor(Math.random() * 50) + 120 + " MB" },
        servers: db.servers
    });
});

app.get('/api/logs', (req, res) => res.json(liveLogs));

// API Kontrol Admin (Kill / Start)
app.post('/api/control', (req, res) => {
    const { id, action } = req.body;
    let db = readDB();
    const srv = db.servers.find(s => s.id === parseInt(id));

    if (srv) {
        if (action === "kill") {
            srv.killedByAdmin = true;
            srv.status = "OFFLINE";
            srv.latency = 0;
            addLog(`ADMIN: Kill Server ID ${id}`);
        } else if (action === "start") {
            srv.killedByAdmin = false;
            srv.status = "ONLINE";
            srv.latency = 50;
            addLog(`ADMIN: Start Server ID ${id}`);
        }
        writeDB(db);
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Not found" });
});

// Endpoint Request Simpel untuk Bot WhatsApp kamu: https://domain/server/1
app.get('/server/:id', (req, res) => {
    const srvId = parseInt(req.params.id);
    const db = readDB();
    const srv = db.servers.find(s => s.id === srvId);

    if (!srv || srv.status === "OFFLINE" || srv.killedByAdmin) {
        return res.json({ "server": srvId, "creator": "Ryyn", "status": "disconnect", "ms": "lockdown" });
    }
    res.json({ "server": srvId, "creator": "Ryyn", "status": "connect", "ms": `${srv.latency}ms` });
});

app.listen(PORT, () => console.log(`Backend run on port ${PORT}`));
