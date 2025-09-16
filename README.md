# Accounts Offline UI

UI manajemen akun ChatGPT dengan pendekatan offline-first. Antarmuka dibangun di atas template [SB Admin](https://startbootstrap.com/template/sb-admin) yang telah disesuaikan untuk kebutuhan proyek.

## Fitur
- Navigasi utama tanpa sidebar dengan menu Dashboard, Pantau, Seat, dan Akun Team.
- Dashboard ringkas untuk memantau metrik akun.
- Halaman pengelolaan pantau seat dan tim dasar.
- Mock API menggunakan Fastify sehingga aplikasi dapat berjalan sepenuhnya secara lokal.
- Komponen header dan footer dipisah sebagai partial dan dimuat secara dinamis.
- Seluruh aset dari template SB Admin telah diintegrasikan ke dalam folder `app/assets`.

## Struktur Proyek
```
app/
  assets/
  partials/
  index.html
  pantau.html
  seat.html
  teams.html
server/
  index.js
```

## Menjalankan Secara Lokal
```
npm install
npm start
```
Buka [http://localhost:5173/app/index.html](http://localhost:5173/app/index.html) di peramban untuk melihat dashboard.

## Deploy ke Alibaba Cloud ECS

Panduan berikut membantu Anda menjalankan aplikasi pada Elastic Compute Service (ECS) di Alibaba Cloud. Langkah-langkahnya dibuat urut dan mendalam agar bisa diikuti mulai dari pembuatan instance hingga aplikasi siap diakses publik.

### 1. Siapkan Instance ECS
1. Masuk ke [Alibaba Cloud Console](https://home-intl.console.aliyun.com/).
2. Buka menu **Elastic Compute Service > Instances** dan pilih **Create Instance**.
3. Gunakan pengaturan dasar berikut (sesuaikan jika diperlukan):
   - **Billing**: Pay-As-You-Go agar fleksibel.
   - **Region & Zone**: pilih lokasi terdekat dengan pengguna.
   - **Image**: Ubuntu Server 22.04 LTS (64-bit) atau distribusi Linux lain yang Anda kuasai.
   - **Instance Type**: minimal `ecs.t5-lc1m1.small` (1 vCPU, 1 GB RAM) sudah cukup untuk pengujian.
   - **Storage**: disk ESSD 20 GB.
4. Pada langkah **Network**, buat atau pilih **VPC** dan **vSwitch**. Aktifkan **Assign Public IP** agar server bisa diakses dari internet.
5. Di bagian **Security Group**, pastikan ada aturan untuk membuka port berikut:
   - TCP 22 (SSH)
   - TCP 80 (HTTP, jika menggunakan reverse proxy)
   - TCP 443 (HTTPS, jika akan menambahkan TLS)
   - TCP 5173 atau port kustom lain yang akan digunakan oleh aplikasi langsung
6. Pilih metode autentikasi SSH (pasang key pair sangat disarankan), buat instance, dan tunggu sampai statusnya **Running**.

### 2. Masuk ke Server dan Persiapan Sistem
1. Akses instance via SSH dari terminal lokal:
   ```bash
   ssh -i /path/to/key.pem root@IP_PUBLIC_ECS
   ```
2. Perbarui paket sistem dan instal utilitas dasar:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl ufw
   ```
3. (Opsional) Konfigurasikan firewall UFW pada instance agar hanya membuka port yang dibutuhkan:
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 5173/tcp
   sudo ufw enable
   ```

### 3. Instal Node.js dan NPM
1. Tambahkan repositori NodeSource untuk Node.js versi LTS terbaru:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. Verifikasi instalasi:
   ```bash
   node -v
   npm -v
   ```

### 4. Ambil Kode Aplikasi dan Instal Dependensi
1. Pilih direktori kerja permanen, misalnya `/opt/accounts-offline`:
   ```bash
   sudo mkdir -p /opt/accounts-offline
   sudo chown $USER:$USER /opt/accounts-offline
   cd /opt/accounts-offline
   ```
2. Clone repositori proyek (ganti URL dengan repositori Anda sendiri jika berbeda):
   ```bash
   git clone https://github.com/<username>/manage3.git .
   ```
3. Instal dependensi Node.js:
   ```bash
   npm install
   ```
4. Uji coba jalankan aplikasi secara manual untuk memastikan tidak ada error:
   ```bash
   npm start
   ```
   Server akan aktif pada port `5173` dan dapat diakses melalui `http://IP_PUBLIC_ECS:5173/app/index.html`. Tekan `Ctrl+C` untuk menghentikan server sebelum melanjutkan ke langkah berikutnya.

### 5. Konfigurasi Environment dan Penyimpanan Data
1. Aplikasi menyimpan data mock pada `server/data.json`. Pastikan direktori memiliki izin tulis agar perubahan bisa tersimpan.
2. Jika ingin menggunakan port selain 5173, ekspor variabel lingkungan `PORT` sebelum menjalankan aplikasi:
   ```bash
   export PORT=8080
   npm start
   ```
3. Untuk menjalankan secara non-interaktif, kita akan menggunakan layanan systemd agar aplikasi otomatis berjalan saat booting.

### 6. Jalankan Sebagai Service systemd
1. Buat file service baru:
   ```bash
   sudo tee /etc/systemd/system/accounts-offline.service > /dev/null <<'EOF'
   [Unit]
   Description=Accounts Offline UI Service
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/opt/accounts-offline
   Environment=NODE_ENV=production
   Environment=PORT=5173
   ExecStart=/usr/bin/node server/index.js
   Restart=always
   RestartSec=5
   # User=ubuntu

   [Install]
   WantedBy=multi-user.target
   EOF
   ```
   Ganti nilai `WorkingDirectory`, `Environment=PORT=`, dan (opsional) `User` bila menjalankan dengan akun non-root atau direktori berbeda. Pastikan akun tersebut memiliki izin baca/tulis ke direktori aplikasi.
2. Reload systemd dan aktifkan layanan:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now accounts-offline.service
   ```
3. Periksa status service untuk memastikan berjalan normal:
   ```bash
   sudo systemctl status accounts-offline.service
   journalctl -u accounts-offline.service -f
   ```

### 7. (Opsional) Tambahkan Reverse Proxy Nginx
Menjalankan aplikasi langsung pada port 5173 memang bekerja, tetapi praktik terbaik adalah meletakkan reverse proxy di depan aplikasi agar dapat menggunakan port standar 80/443 dan menambahkan TLS.

1. Instal Nginx:
   ```bash
   sudo apt install -y nginx
   ```
2. Buat konfigurasi server block baru:
   ```bash
   sudo tee /etc/nginx/sites-available/accounts-offline > /dev/null <<'EOF'
   server {
     listen 80;
     server_name _;

     location / {
       proxy_pass http://127.0.0.1:5173/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   EOF
   ```
3. Aktifkan konfigurasi dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/accounts-offline /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. (Opsional) Gunakan [Certbot](https://certbot.eff.org/) untuk menambahkan sertifikat TLS jika Anda memiliki domain sendiri.

### 8. Verifikasi dan Monitoring
1. Buka peramban dan akses `http://IP_PUBLIC_ECS/app/index.html` (atau domain yang diarahkan ke instance) untuk memastikan UI muncul.
2. Gunakan endpoint API seperti `http://IP_PUBLIC_ECS/api/summary` untuk menguji respon JSON.
3. Monitor log aplikasi secara berkala dengan `journalctl -u accounts-offline.service -f` serta log akses Nginx di `/var/log/nginx/access.log`.
4. Rencanakan backup berkala terhadap file `server/data.json` jika data mock tersebut penting.

## Lisensi
Kode sumber template SB Admin berada di bawah lisensi MIT. Penyesuaian pada proyek ini mengikuti lisensi yang sama.
