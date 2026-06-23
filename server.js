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
            console.log("File server.json tidak ditemukan!");
            return { servers: [] };
        }
        const rawData = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        console.error("Gagal membaca server.json, format rusak:", err.message);
        return { servers: [] };
    }
}

// Fungsi menulis kembali ke file server.json secara rapi
function writeDB(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("Gagal menulis ke server.json:", err.message);
    }
}

let liveLogs = ["[SYSTEM] Proxy Core Engine aktif mendengarkan database."];
function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    liveLogs.push(`[${time}] ${msg}`);
    if (liveLogs.length > 40) liveLogs.shift();
}

// Loop Otomatis: Update database server.json secara real-time tiap 2.5 detik
setInterval(() => {
    let db = readDB();
    if (!db.servers || db.servers.length === 0) return;

    db.servers.forEach(srv => {
        // Jika dimatikan admin, status mutlak OFFLINE
        if (srv.killedByAdmin === true || srv.killedByAdmin === "true") {
            srv.status = "OFFLINE";
            srv.latency = 0;
            return;
        }

        // Naik turunkan latency secara wajar berdasarkan data lama di server.json
        const change = Math.floor(Math.random() * 40) - 20; 
        srv.latency = Math.max(15, (srv.latency || 50) + change);

        // Logic Auto Reconnect / Disconnect berdasarkan indikator latency
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

// API GET: Mengirimkan data asli dari server.json ke website monitor lu
app.get('/api/servers', (req, res) => {
    const db = readDB();
    res.json({
        servers: db.servers || []
    });
});

// API GET: Mengambil logs terminal backend
app.get('/api/logs', (req, res) => {
    res.json(liveLogs);
});

// API POST: Kontrol Kill/Run dari Admin Panel mengubah status di server.json
app.post('/api/control', (req, res) => {
    const { name, action } = req.body;
    let db = readDB();
    
    if (!db.servers) return res.status(500).json({ error: "Data server kosong" });
    
    const srv = db.servers.find(s => s.name === name);

    if (srv) {
        if (action === "kill") {
            srv.killedByAdmin = true;
            srv.status = "OFFLINE";
            srv.latency = 0;
            addLog(`ADMIN_CONTROL: Menghentikan paksa server [${name}]`);
        } else if (action === "start") {
            srv.killedByAdmin = false;
            srv.status = "ONLINE";
            srv.latency = 45;
            addLog(`ADMIN_CONTROL: Menyalakan kembali server [${name}]`);
        }
        writeDB(db);
        return res.json({ success: true });
    }
    
    res.status(404).json({ error: "Nama server tidak valid" });
});

app.listen(PORT, () => {
    console.log(`Backend Server Sukses Berjalan di Port ${PORT}`);
    addLog(`[SYSTEM] Cloudflare Tunnel endpoint siap dihubungkan.`);
});
