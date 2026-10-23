# Login username + password (Google Apps Script)

Dashboard ini halaman statis, jadi ia butuh "penjaga" di sisi server agar
spreadsheet tetap pribadi. `Code.gs` adalah penjaga itu. Ia berjalan sebagai
Web App di akun Google pemilik spreadsheet, memeriksa username + password,
lalu memberi token sesi 30 hari. Hanya pemegang token yang bisa membaca
sheet REKAP, REAL, dan TRANSAKSI. Skrip ini tidak pernah menulis ke spreadsheet.

## Pemasangan (sekali saja, ±10 menit)

1. Buka <https://script.google.com/home> dengan akun pemilik spreadsheet
   ANALISA KEUANGAN, lalu klik **New project**.
2. Klik judul "Untitled project" di kiri atas dan ganti menjadi `Budget Rumah API`.
3. Di file `Code.gs`, hapus semua isinya. Tempel seluruh isi
   [`Code.gs`](https://raw.githubusercontent.com/andwowor/Budget-Rumah/main/apps-script/Code.gs),
   lalu simpan dengan **Ctrl+S** (atau ⌘+S).
4. Klik ikon roda gigi **Project Settings** di menu kiri. Gulir ke
   **Script Properties**, klik **Add script property**, dan isi dua baris berikut:
   | Property | Value |
   |---|---|
   | `APP_USERNAME` | username pilihanmu |
   | `APP_PASSWORD` | password pilihanmu, sebaiknya minimal 8 karakter |

   Klik **Save script properties**. Password hanya tersimpan di akun Google-mu,
   tidak di repo dan tidak di HP.
5. Klik **Deploy** di kanan atas, pilih **New deployment**, klik roda gigi di
   sebelah "Select type", lalu pilih **Web app**. Isi:
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone**

   Lalu klik **Deploy**.
6. Klik **Authorize access** dan pilih akunmu. Google akan menampilkan
   "Google hasn't verified this app". Ini normal untuk skrip buatan sendiri.
   Klik **Advanced**, lalu **Go to Budget Rumah API (unsafe)**, lalu **Allow**.
7. Salin **Web app URL** yang berakhiran `/exec`. Isikan ke `API_URL` di bagian
   CONFIG `index.html`, atau kirim ke Claude supaya diisikan.

## Perawatan

| Ingin… | Caranya |
|---|---|
| Ganti password | Ubah `APP_PASSWORD` di Script Properties. Semua perangkat otomatis keluar. |
| Mengeluarkan semua perangkat tanpa ganti password | Hapus property `SESSION_SECRET`, yang akan dibuat ulang otomatis. |
| Memperbarui kode | Tempel `Code.gs` baru, lalu **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL tetap sama. |

Lima kali salah password berturut-turut mengunci login selama 15 menit.
