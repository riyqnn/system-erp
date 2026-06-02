# Enterprise Management System (Project-4B)

Sistem Informasi Manajemen terintegrasi, dibangun menggunakan **Next.js 14+** dengan Supabase sebagai backend.

## Daftar Isi

- [Teknologi & File Extensions](#teknologi--file-extensions)
- [Struktur Folder](#struktur-folder)
- [5 Modul Bisnis](#5-modul-bisnis)
- [Panduan Kontribusi](#panduan-kontribusi)
- [Standar Desain (TBD)](#standar-desain-tbd---menunggu-tim-desain)
- [Alur Kerja Git](#alur-kerja-git-penting)

## Teknologi & File Extensions

### Teknologi yang Digunakan

| Teknologi | Kegunaan |
|-----------|----------|
| **Next.js 16+** | Full-stack Framework (App Router) |
| **TypeScript** | JavaScript dengan tipe data |
| **Tailwind CSS 4** | Framework CSS untuk styling |
| **Supabase** | Backend-as-a-Service (Auth, Database, Storage) |
| **React 19** | Library untuk membuat UI komponen |
| **TanStack Query** | Data fetching & caching |
| **Axios** | HTTP client |

### Jenis File & Extensions

| Extension | Kegunaan | Contoh |
|-----------|----------|--------|
| **`.tsx`** | React Component dengan TypeScript | `page.tsx`, `Button.tsx` |
| **`.ts`** | TypeScript logic file | `service.ts`, `types.ts` |
| **`.css`** | Styling | `globals.css` |

## Struktur Folder

```text
project-4b/
├── app/                        # 👉 Tempat bikin Halaman (Routing Next.js)
│   ├── admin/                  # Halaman khusus Admin
│   ├── dashboard/              # Halaman Utama setelah login
│   ├── login/                  # Halaman Login
│   ├── inventory/              # (MODUL) Halaman Gudang & Stok
│   ├── finance/                # (MODUL) Halaman Keuangan
│   ├── purchasing/             # (MODUL) Halaman Pembelian
│   ├── production/             # (MODUL) Halaman Produksi
│   └── snm/                    # (MODUL) Halaman Sales & Marketing
│
├── components/                 # 👉 Tempat bikin Komponen (Tombol, Tabel, Card, dll)
│   ├── ui/                     # Komponen umum (bisa dipakai di mana aja)
│   ├── layout/                 # Komponen kerangka (Sidebar, Header)
│   ├── shared/                 # Komponen yang dipakai gabungan beberapa modul
│   ├── admin/                  # Komponen khusus halaman admin
│   └── modules/                # Komponen khusus untuk masing-masing modul bisnis
│
├── lib/                        # 👉 Kode bantuan teknis (Konfigurasi Supabase, Auth)
├── services/                   # 👉 Tempat naruh fungsi untuk panggil API / Fetch data
├── hooks/                      # 👉 Fungsi React buatan sendiri (Custom Hooks)
├── types/                      # 👉 Kumpulan tipe data TypeScript biar kode lebih aman
├── public/                     # 👉 Tempat naruh aset statis kayak gambar, ikon, logo
│
├── middleware.ts               # Skrip otomatis (contoh: ngecek user udah login apa belum)
└── package.json                # Daftar library/aplikasi yang kita install
```

## 5 Modul Bisnis

Sistem ini terdiri dari 5 modul bisnis utama. Setiap modul memiliki folder terpisah:

### 1. Inventory (Manajemen Stok & Gudang)
- **Route**: `/inventory/[nama-fitur]/`
- **Fungsi**: Kelola stok barang, masuk/keluar, transfer antar gudang

### 2. Finance (Akuntansi & Laporan Keuangan)
- **Route**: `/finance/[nama-fitur]/`
- **Fungsi**: Jurnal umum, neraca, laba rugi, arus kas

### 3. Purchasing (Pengadaan Bahan Baku)
- **Route**: `/purchasing/[nama-fitur]/`
- **Fungsi**: Purchase Order, penerimaan barang, supplier management

### 4. Production (Alur Produksi Barang)
- **Route**: `/production/[nama-fitur]/`
- **Fungsi**: Bill of Materials, production planning, job order

### 5. SNM (Sales & Marketing)
- **Route**: `/snm/[nama-fitur]/`
- **Fungsi**: Sales Order, customer management, marketing campaigns

## Panduan Kontribusi

### Workflow Pengembangan
1. **Routing**: Buat halaman dengan format `/[nama-modul]/[nama-fitur]/` (Jangan pakai folder `apps/`)
2. **Components**:
   - Cek `components/ui/` dulu untuk komponen umum
   - Buat komponen spesifik modul di `components/modules/[nama-modul]/[nama-fitur]/`
3. **API Calls**: Gunakan Supabase client di `lib/supabase/` atau buat di `app/api/`
4. **Data Fetching**: Gunakan hooks di `hooks/` atau TanStack Query

### Aturan Umum
1. **Cek Dulu, Buat Nanti**: Sebelum membuat komponen/service baru, cek apakah sudah ada yang similar
2. **Type Safety**: Selalu gunakan TypeScript types
3. **Server Actions**: Gunakan Server Actions untuk mutation, prefer keamanan

## Available Commands

```bash
# Install dependencies
pnpm install

# Jalankan development server
pnpm dev

# Build untuk production
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint
```

## Standar Desain (TBD - Menunggu Tim Desain)

> **Catatan**: Standar desain masih dalam tahap pengembangan oleh tim desain.

**Pendekatan Awal**
- **Borders**: Gunakan `border-2 border-black` pada card, button, dan container
- **Shadows**: Shadow tajam, contoh: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- **Warna**: Kontras tinggi dengan warna primary yang jelas
- **Typography**: Font yang tegas dan terbaca jelas

## Alur Kerja Git (PENTING!)

Ikuti langkah super sederhana ini agar kode tidak berantakan:

### 1. Buat Branch (CUKUP SEKALI saat mulai fitur baru)
Aturan penamaan branch **bukan** `apps/modul`, tapi langsung **`modul/fitur`**. 
Contoh kalau kamu di tim inventory dan mau bikin fitur tambah barang, ketik ini:
```bash
git checkout -b inventory/tambah-barang
```
*(Contoh lain: `finance/laporan-kas`, `purchasing/buat-po`, `snm/diskon`, dll)*

### 2. Simpan Kerjaan Kamu (Setiap Selesai Ngoding)
Kalau sudah selesai bikin fitur/halaman, simpan dengan urutan perintah ini:
```bash
git add .
git commit -m "pesan tentang apa yang kamu kerjakan"
git push origin inventory
```
*(Catatan: Ganti `inventory` dengan nama branch kamu di perintah push)*

### 3. Cara Dapat Update Terbaru dari Main
Biar kodemu selalu sinkron dengan update terbaru (lakukan secara berkala):
```bash
# Pastikan kamu sedang berada di branch kamu, lalu ketik ini:
git pull origin main
```
*(Perintah ini otomatis menarik kode terbaru dari main dan menggabungkannya ke branch kamu)*

### 4. Cara Menggabungkan Kode ke Main (Pull Request)
> **⚠️ PERINGATAN PENTING: Jangan langsung push ke main!**

Karena branch `main` dilindungi, semua kode baru harus lewat Pull Request:
1. Lakukan Langkah 2 di atas (`git push origin <nama-branch>`).
2. Buka GitHub, lalu klik tombol **Compare & pull request**.
3. Admin akan mereview kodemu dan menggabungkannya (merge) ke `main`.
