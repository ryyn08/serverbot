        const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'server.json');

// Fungsi membaca file server.json secara aman & anti-corrupt
function readDB() {
    try {
        if (!fs.existsSync(dbPath)) {
            console.log("[ERROR] File server.json tidak ditemukan!");
            return { servers: [] };
        }
        const rawData = fs.readFileSync(dbPath, 'utf8');
        if (!rawData.trim()) return { servers: [] };
        return JSON.parse(rawData);
    } catch (err) {
        console.error("[ERROR] Gagal parsing server.json:", err.message);
        return null; // Return null jika format rusak agar tidak menimpa file asli
    }
}

// Fungsi menulis kembali ke file server.json secara rapi
function writeDB(data) {
    try {
        if (!data) return;
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Gagal menulis ke server.json:", err.message);
    }
}

let liveLogs = ["[SYSTEM] Proxy Core Engine aktif mendengarkan database."];
function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    liveLogs.push(`[${time}] ${msg}`);
    if (liveLogs.length > 40) liveLogs.shift();
}

// Loop Otomatis: Update fluktuasi latency dan status langsung ke file server.json
setInterval(() => {
    let db = readDB();
    // Jika data tidak terbaca atau kosong, lewati biar gak nge-blank / corrupt
    if (!db || !db.servers || db.servers.length === 0) return;

    db.servers.forEach(srv => {
        // Cek switch killedByAdmin secara ketat (string atau boolean)
        if (srv.killedByAdmin === true || srv.killedByAdmin === "true") {
            srv.status = "OFFLINE";
            srv.latency = 0;
            return;
        }

        // Naik turunkan latency acak secara wajar (-20ms s/ad +20ms)
        const change = Math.floor(Math.random() * 40) - 20;
        let currentLatency = parseInt(srv.latency) || 50;
        srv.latency = Math.max(15, currentLatency + change);

        // Logic Auto Reconnect / Disconnect berdasarkan batas latency 150ms
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

// API GET: Mengirimkan data array dari server.json ke website monitor lu
app.get('/api/servers', (req, res) => {
    const db = readDB();
    if (!db || !db.servers) {
        return res.json({ servers: [] });
    }
    res.json({ servers: db.servers });
});

// API GET: Mengambil logs terminal backend
app.get('/api/logs', (req, res) => {
    res.json(liveLogs);
});

// API POST: Kontrol Kill/Run dari Admin Panel mengubah status di server.json
app.post('/api/control', (req, res) => {
    const { name, action } = req.body;
    let db = readDB();
    
    if (!db || !db.servers) return res.status(500).json({ error: "Database server.json kosong atau rusak" });
    
    // Cari server berdasarkan properti 'name' yang dikirim dari UI
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
    
    res.status(404).json({ error: "Nama server tidak ditemukan di database" });
});

app.listen(PORT, () => {
    console.log(`Backend Server Sukses Berjalan di Port ${PORT}`);
    addLog(`[SYSTEM] Cloudflare Tunnel endpoint siap dihubungkan.`);
});
