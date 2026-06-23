const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'server.json');

// Fungsi membaca file server.json secara aman
function readDB() {
    try {
        if (!fs.existsSync(dbPath)) {
            console.log("[ERROR] File server.json tidak ada!");
            return { servers: [] };
        }
        const rawData = fs.readFileSync(dbPath, 'utf8');
        if (!rawData.trim()) return { servers: [] };
        return JSON.parse(rawData);
    } catch (err) {
        console.error("[ERROR] Gagal membaca data JSON:", err.message);
        return null; 
    }
}

// Fungsi menulis kembali ke file server.json secara rapi
function writeDB(data) {
    try {
        if (!data || !data.servers) return;
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Gagal menulis data JSON:", err.message);
    }
}

let liveLogs = ["[SYSTEM] Proxy Core Engine aktif mendengarkan database."];
function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    liveLogs.push(`[${time}] ${msg}`);
    if (liveLogs.length > 40) liveLogs.shift();
}

// Loop Otomatis: Sinkronisasi fluktuasi latency langsung ke file server.json
setInterval(() => {
    let db = readDB();
    if (!db || !db.servers || db.servers.length === 0) return;

    db.servers.forEach(srv => {
        if (srv.killedByAdmin === true || srv.killedByAdmin === "true") {
            srv.status = "OFFLINE";
            srv.latency = 0;
            return;
        }

        const change = Math.floor(Math.random() * 40) - 20;
        let currentLatency = parseInt(srv.latency) || 50;
        srv.latency = Math.max(15, currentLatency + change);

        if (srv.latency >= 150) {
            if (srv.status === "ONLINE") {
                srv.status = "OFFLINE";
                addLog(`CRITICAL: Node [${srv.id}] ${srv.name} down -> ${srv.latency}ms`);
            }
        } else {
            if (srv.status === "OFFLINE") {
                srv.status = "ONLINE";
                addLog(`CONNECTED: Node [${srv.id}] ${srv.name} up -> ${srv.latency}ms`);
            }
        }
    });

    writeDB(db);
}, 2500);

app.get('/api/servers', (req, res) => {
    const db = readDB();
    if (!db || !db.servers) return res.json({ servers: [] });
    res.json({ servers: db.servers });
});

app.get('/api/logs', (req, res) => res.json(liveLogs));

app.post('/api/control', (req, res) => {
    const { name, action } = req.body;
    let db = readDB();
    if (!db || !db.servers) return res.status(500).json({ error: "Database kosong" });
    
    const srv = db.servers.find(s => s.name === name);
    if (srv) {
        if (action === "kill") {
            srv.killedByAdmin = true;
            srv.status = "OFFLINE";
            srv.latency = 0;
            addLog(`ADMIN: Menghentikan paksa server [${name}]`);
        } else if (action === "start") {
            srv.killedByAdmin = false;
            srv.status = "ONLINE";
            srv.latency = 45;
            addLog(`ADMIN: Menyalakan kembali server [${name}]`);
        }
        writeDB(db);
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Server tidak ditemukan" });
});

app.listen(PORT, () => {
    console.log(`Backend Server Sukses Berjalan di Port ${PORT}`);
});
