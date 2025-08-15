# Patch Notes – Smart Allocation & Dashboard "Kosong" Fix

## Perubahan Utama
1. **Dashboard (index.html) – Fix Kartu "Kosong"**
   - Menambahkan `assets/dashboard-fix.js` yang menghitung jumlah slot kosong secara akurat berbasis endpoint `/api/teams` (`seats_capacity` dan `seats_used`).
   - Nilai `Kosong` sekarang = Σ(seats_capacity) − Σ(seats_used), sama persis seperti perhitungan di menu *Seat*.

2. **Seat (seat.html) – Fitur *Tambah (Smart Allocation)***
   - Menambahkan tombol **Tambah (Smart Allocation)** di bagian atas halaman *Seat*.
   - Alur:
     - Step 1 (Form): isi **Email**, **Tipe**, **Mulai (datetime)**, dan **Durasi (hari)**.
     - Step 2 (Rekomendasi): sistem menampilkan daftar **akun team yang eligible** (kapasitas cukup dan masa berlaku cukup sampai tanggal berakhir), disortir dari **sisa durasi terpendek yang masih mencukupi**.
     - Klik **Gabung** pada team yang dipilih untuk otomatis membuat seat (`POST /api/seats`) dan diarahkan ke halaman detail team (`seat-team.html?teamId=...`).

## File Baru
- `app/assets/seat-smart.js`
- `app/assets/dashboard-fix.js`

## File yang Diubah
- `app/seat.html` (penambahan `<script src="assets/seat-smart.js"></script>`)
- `app/index.html` (penambahan `<script src="assets/dashboard-fix.js"></script>`)

## Catatan Teknis
- **Eligibilitas team**: team dipilih jika `sisa slot > 0` dan `masa berlaku team (created_at + durasi_hari)` ≥ `tanggal berakhir seat`. Daftar direkomendasikan dengan urutan `sisa durasi dari tanggal mulai` paling pendek terlebih dahulu.
- **Keamanan**: Form melakukan validasi dasar (email wajib, durasi ≥ 1, tanggal valid).
- **Aksesibilitas**: Modal dan tombol menggunakan komponen Bootstrap 5 standar.


## Tambahan: Persistensi + Ekspor/Impor
- **Persistensi data server**: data `teams` & `seats` kini disimpan ke file **`server/data.json`** setiap kali ada perubahan (tambah/edit/hapus). Jika server mati/nyala lagi, data tetap tersimpan.
- **API Ekspor**: `GET /api/export` (opsional `?download=1`) — mengembalikan seluruh data JSON.
- **API Impor**: `POST /api/import` dengan payload JSON `{ data: { teams: [...], seats: [...] } }`. Mode saat ini **replace** (menimpa seluruh data). Seat yang refer ke team yang tidak ada akan **di-drop** dan jumlahnya dilaporkan.
- **UI Backup & Restore** (Dashboard): tombol **Ekspor Data (JSON)** dan **Impor Data (JSON)** ditambahkan via `assets/backup.js`.
