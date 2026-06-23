const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// DATABASE LOCAL STATE SERVER PROXY (TERBARU)
let proxyServers = [
    { id: 1, name: "Canada", ip: "98.142.250.14", latency: 45, status: "ONLINE", killedByAdmin: false },
    { id: 2, name: "Singapore", ip: "98.142.250.14", latency: 60, status: "ONLINE", killedByAdmin: false },
    { id: 3, name: "USA", ip: "98.142.250.14", latency: 75, status: "ONLINE", killedByAdmin: false },
    { id: 4, name: "India", ip: "172.67.162.58", latency: 50, status: "ONLINE", killedByAdmin: false },
    { id: 5, name: "Hong Kong", ip: "104.21.82.187", latency: 80, status: "ONLINE", killedByAdmin: false },
    { id: 6, name: "Poland", ip: "188.114.96.11", latency: 110, status: "ONLINE", killedByAdmin: false },
    { id: 7, name: "Switzerland", ip: "188.114.96.12", latency: 95, status: "ONLINE", killedByAdmin: false },
    { id: 8, name: "Turkey", ip: "188.114.97.7", latency: 125, status: "ONLINE", killedByAdmin: false },
    { id: 9, name: "Austria", ip: "188.114.96.10", latency: 65, status: "ONLINE", killedByAdmin: false },
    { id: 10, name: "Brazil", ip: "172.67.162.58", latency: 130, status: "ONLINE", killedByAdmin: false }
];

// Log khusus perubahan MS Server Real-Time (Tanpa kata update ke github dll)
let liveMsLogs = ["[SYSTEM] Proxy Monitor Core engine started..."];

function addMsLog(msg) {
    const time = new Date().toLocaleTimeString();
    liveMsLogs.push(`[${time}] ${msg}`);
    if (liveMsLogs.length > 80) liveMsLogs.shift(); // Biar log panjang tapi tetap hemat RAM
}

// LOGIKA AUTO-DISCONNECT (>150ms) & AUTO-RECONNECT (Kalo ping turun)
setInterval(() => {
    proxyServers.forEach(srv => {
        // Jika di-kill manual oleh admin, dia kekunci OFFLINE total & ga bisa auto-reconnect
        if (srv.killedByAdmin) {
            srv.status = "OFFLINE";
            srv.latency = 0;
            return;
        }

        // Setiap saat, server secara acak bisa down/naik-turun latency-nya
        const downChance = Math.random();
        if (downChance > 0.92) { 
            // Simulasi server mendadak bad-network / down di atas 150ms
            srv.latency = Math.floor(151 + Math.random() * 80);
        } else {
            // Simulasi normal fluktuasi network di bawah 150ms
            const change = Math.floor(Math.random() * 40) - 20;
            srv.latency = Math.max(15, srv.latency + change);
            if (srv.latency >= 150) srv.latency = 140; // Amankan jika tidak sedang kena downChance
        }

        // Pengecekan status berdasarkan batas 150ms
        if (srv.latency >= 150) {
            if (srv.status === "ONLINE") {
                srv.status = "OFFLINE";
                addMsLog(`PROXY NOTIF: Server ${srv.id} (${srv.name}) DISCONNECT -> Latency mencapai ${srv.latency}ms`);
            }
        } else {
            // Auto reconnect kembali aktif secara otomatis begitu ms nya turun!
            if (srv.status === "OFFLINE") {
                srv.status = "ONLINE";
                addMsLog(`PROXY NOTIF: Server ${srv.id} (${srv.name}) RECONNECT -> Jaringan stabil kembali ${srv.latency}ms`);
            }
        }
    });
}, 2500);

// ENDPOINT API UNTUK BOT WA / WEB MONITOR
app.get('/api/servers', (req, res) => {
    // Logika Mendeteksi IP asli request via Cloudflare Tunnel
    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Kirim informasi request log real-time ke terminal web
    const requestedServerId = req.query.id;
    if (requestedServerId) {
        const found = proxyServers.find(s => s.id == requestedServerId);
        if (found) addMsLog(`API REQUEST: Client [${clientIp}] memanggil Server ID: ${requestedServerId} (${found.latency}ms)`);
    }

    // Spek server tiruan proxy umum
    const cpuLoad = Math.floor(Math.random() * 20) + 8 + "%";
    const ramUsage = Math.floor(Math.random() * 80) + 180 + " MB";

    res.json({
        system: { cpu: cpuLoad, ram: ramUsage },
        servers: proxyServers
    });
});

// Endpoint khusus penampung Log
app.get('/api/logs', (req, res) => {
    res.json(liveMsLogs);
});

// API Kontrol Admin (Kill & Start Manual)
app.post('/api/control', (req, res) => {
    const { id, action } = req.body;
    const srv = proxyServers.find(s => s.id == id);
    
    if (srv) {
        if (action === "kill") {
            srv.killedByAdmin = true;
            srv.status = "OFFLINE";
            srv.latency = 0;
            addMsLog(`ADMIN CONTROL: Server ID ${id} (${srv.name}) telah DI-KILL secara manual. Auto-reconnect MATI.`);
        } else if (action === "start") {
            srv.killedByAdmin = false;
            srv.status = "ONLINE";
            srv.latency = 40;
            addMsLog(`ADMIN CONTROL: Server ID ${id} (${srv.name}) telah DI-START kembali oleh Admin.`);
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Server tidak ditemukan" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend Server Proxy sukses berjalan di Port: ${PORT}`);
});
