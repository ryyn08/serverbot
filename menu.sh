#!/data/data/com.termux/files/usr/bin/bash
clear
echo -e "\e[1;35m=== RYYN PROXY CORE CONTROL SYSTEM ===\e[0m"
echo "1. Install Server Dependencies"
echo "2. Start Core Server & Cloudflare Tunnel"
echo "3. Kill / Stop Server Engine"
echo "4. Exit"
echo "--------------------------------------"
read -p "Pilih menu [1-4]: " pilihan

# FIX: Menggunakan kutip dua agar jika input kosong tidak memicu eror unary operator
if [ "$pilihan" = "1" ]; then
    echo -e "\n\e[1;32m[+] Installing node modules...\e[0m"
    npm install
    pkg install cloudflared -y 2>/dev/null || (wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O $PREFIX/bin/cloudflared && chmod +x $PREFIX/bin/cloudflared)
    echo -e "\n\e[1;32m[+] Install selesai. Sila pilih menu 2 untuk jalan.\e[0m"

elif [ "$pilihan" = "2" ]; then
    echo -e "\n\e[1;31m[-] Membersihkan sisa proses port 3000 lama...\e[0m"
    killall node 2>/dev/null
    pkill cloudflared 2>/dev/null
    sleep 1

    echo -e "\n\e[1;32m[+] Menjalankan Server Node.js...\e[0m"
    # Menjalankan backend murni membaca server.json lu
    node server.js &
    sleep 3
    
    echo -e "\n\e[1;36m[+] Membuka Cloudflare Tunnel jaringan Publik...\e[0m"
    cloudflared tunnel --url http://127.0.0.1:3000

elif [ "$pilihan" = "3" ]; then
    echo -e "\n\e[1;31m[-] Mematikan semua proses engine node & cloudflare...\e[0m"
    killall node 2>/dev/null
    pkill cloudflared 2>/dev/null
    echo -e "\e[1;31m[+] Berhasil dimatikan bersih.\e[0m"
else
    exit
fi
