#!/data/data/com.termux/files/usr/bin/bash
clear
echo -e "\e[1;35m=== RYYN PROXY CORE CONTROL SYSTEM ===\e[0m"
echo "1. Install Server Dependencies"
echo "2. Start Core Server & Cloudflare Tunnel"
echo "3. Kill / Stop Server Engine"
echo "4. Exit"
echo "--------------------------------------"
read -p "Pilih menu [1-4]: " pilihan

if [ "$pilihan" = "1" ]; then
    echo -e "\n\e[1;32m[+] Menginstall Node Modules & Express...\e[0m"
    npm install express cors
    echo -e "\n\e[1;32m[+] Mengunduh binary Cloudflared untuk Termux ARM64...\e[0m"
    pkg install cloudflared -y 2>/dev/null || (wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O $PREFIX/bin/cloudflared && chmod +x $PREFIX/bin/cloudflared)
    echo -e "\n\e[1;32m[+] Semua dependensi berhasil dipasang! Silakan pilih Menu 2.\e[0m"

elif [ "$pilihan" = "2" ]; then
    # Proteksi: Cek apakah folder node_modules sudah ada, jika belum otomatis install
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
        echo -e "\n\e[1;33m[!] Node modules tidak ditemukan. Otomatis menginstall dulu...\e[0m"
        npm install express cors
    fi

    # Proteksi: Cek apakah cloudflared bisa dieksekusi, jika tidak ada otomatis download
    if ! command -v cloudflared &> /dev/null; then
        echo -e "\n\e[1;33m[!] Cloudflared belum terpasang. Otomatis mengunduh...\e[0m"
        wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O $PREFIX/bin/cloudflared && chmod +x $PREFIX/bin/cloudflared
    fi

    echo -e "\n\e[1;31m[-] Membersihkan sisa proses lama di background...\e[0m"
    killall node 2>/dev/null
    pkill cloudflared 2>/dev/null
    sleep 1

    echo -e "\n\e[1;32m[+] Menjalankan Server Node.js...\e[0m"
    node server.js &
    sleep 3
    
    echo -e "\n\e[1;36m[+] Membuka Cloudflare Tunnel Jaringan Publik...\e[0m"
    cloudflared tunnel --url http://127.0.0.1:3000

elif [ "$pilihan" = "3" ]; then
    echo -e "\n\e[1;31m[-] Mematikan semua proses engine node & cloudflare...\e[0m"
    killall node 2>/dev/null
    pkill cloudflared 2>/dev/null
    echo -e "\e[1;31m[+] Berhasil dimatikan bersih.\e[0m"
else
    exit
fi
