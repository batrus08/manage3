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

## Lisensi
Kode sumber template SB Admin berada di bawah lisensi MIT. Penyesuaian pada proyek ini mengikuti lisensi yang sama.
