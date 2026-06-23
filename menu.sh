#!/data/data/com.termux/files/usr/bin/bash

# Clear terminal
clear

# WARNA BARU UNTUK INDIKATOR UPDATE (Cyan & Biru)
echo -e "\e[1;36m======================================\e[0m"
echo -e "\e[1;34m=== RYYN PROXY CORE SYSTEM [UPDATED] ===\e[0m"
echo -e "\e[1;36m======================================\e[0m"
echo -e " \e[1;32m1.\e[0m Install Server Dependencies"
echo -e " \e[1;32m2.\e[0m Start Core Server & Cloudflare Tunnel"
echo -e " \e[1;32m3.\e[0m Kill / Stop Server Engine"
echo -e " \e[1;32m4.\e[0m Exit"
echo -e "\e[1;36m--------------------------------------\e[0m"
read -p "Pilih menu [1-4]: " pilihan

# Membersihkan karakter spasial atau newline tak terlihat dari input
pilihan=$(echo "$pilihan" | tr -d '\r\n[:space:]')

if [ "$pilihan" = "1" ]; then
    echo -e "\n\e[1;32m[+] Menginstall Node Modules & Express...\e[0m"
    npm install express cors
    echo -e "\n\e[1;32m[+] Mengunduh binary Cloudflared untuk Termux ARM64...\e[0m"
    pkg install cloudflared -y 2>/dev/null || (wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O $PREFIX/bin/cloudflared && chmod +x $PREFIX/bin/cloudflared)
    echo -e "\n\e[1;32m[+] Semua dependensi berhasil dipasang! Silakan pilih Menu 2.\e[0m"

elif [ "$pilihan" = "2" ]; then
    echo -e "\n\e[1;33m[-] Membersihkan sisa proses port 3000 lama biar gak bentrok...\e[0m"
    killall node 2>/dev/null
    pkill cloudflared 2>/dev/null
    sleep 1

    # Cek file server.js ada atau kagak sebelum di-run
    if [ ! -f "server.js" ]; then
        echo -e "\n\e[1;31m[!] Eror: File server.js tidak ditemukan di folder ini!\e[0m"
        exit 1
    fi

    echo -e "\n\e[1;32m[+] Menjalankan Server Node.js di background...\e[0m"
    node server.js &
    sleep 3
    
    echo -e "\n\e[1;36m[+] Membuka Cloudflare Tunnel Jaringan Publik...\e[0m"
    cloudflared tunnel --url http://127.0.0.1:3000

elif [ "$pilihan" = "3" ]; then
    echo -e "\n\e[1;31m[-] Mematikan semua proses engine node & cloudflare...\e[0m"
    killall node 2>/dev/null
    pkill cloudflared 2>/dev/null
    echo -e "\e[1;31m[+] Berhasil dimatikan bersih.\e[0m"

elif [ "$pilihan" = "4" ]; then
    echo -e "\n[+] Keluar dari sistem."
    exit 0

else
    echo -e "\n\e[1;31m[!] Input tidak dikenali! Lu ngetik: '$pilihan'\e[0m"
    exit 1
fi
