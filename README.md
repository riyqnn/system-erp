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

```
project-4b/
├── app/                        # Next.js App Router
│   ├── api/                    # API Routes (server actions)
│   ├── inventory/              # Halaman & routing Inventory
│   ├── finance/                # Halaman & routing Finance
│   ├── purchasing/             # Halaman & routing Purchasing
│   ├── production/             # Halaman & routing Production
│   ├── snm/                    # Halaman & routing Sales & Marketing
│   ├── dashboard/              # Dashboard utama
│   ├── login/                  # Halaman login
│   ├── globals.css             # Global styles
│   └── layout.tsx              # Root layout
│
├── components/
│   ├── ui/                     # Reusable UI components
│   └── modules/                # Komponen spesifik per modul
│       ├── inventory/
│       ├── finance/
│       ├── purchasing/
│       ├── production/
│       └── snm/
│
├── lib/                        # Utility functions & Supabase client
│   ├── supabase/               # Supabase configuration
│   ├── auth/                   # Authentication helpers
│   └── database/               # Database queries & types
│
├── services/                   # API client calls
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript types
├── public/                     # Static assets
│
├── .env                        # Environment variables
├── .env.example
├── .gitignore
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies & scripts
└── README.md
```

## 5 Modul Bisnis

Sistem ini terdiri dari 5 modul bisnis utama. Setiap modul memiliki folder terpisah:

### 1. Inventory (Manajemen Stok & Gudang)
- **Frontend**: `app/inventory/`
- **Fungsi**: Kelola stok barang, masuk/keluar, transfer antar gudang

### 2. Finance (Akuntansi & Laporan Keuangan)
- **Frontend**: `app/finance/`
- **Fungsi**: Jurnal umum, neraca, laba rugi, arus kas

### 3. Purchasing (Pengadaan Bahan Baku)
- **Frontend**: `app/purchasing/`
- **Fungsi**: Purchase Order, penerimaan barang, supplier management

### 4. Production (Alur Produksi Barang)
- **Frontend**: `app/production/`
- **Fungsi**: Bill of Materials, production planning, job order

### 5. SNM (Sales & Marketing)
- **Frontend**: `app/snm/`
- **Fungsi**: Sales Order, customer management, marketing campaigns

## Panduan Kontribusi

### Workflow Pengembangan
1. **Routing**: Buat halaman di `app/[nama-modul]/`
2. **Components**:
   - Cek `components/ui/` dulu untuk komponen umum
   - Buat komponen spesifik modul di `components/modules/[nama-modul]/`
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

Agar tidak terjadi Merge Conflict:

1. **Update Lokal**: Selalu `git pull origin main` sebelum mulai ngoding

2. **Buat Branch per Modul**:
   ```bash
   git checkout -b inventory     # Tim Inventory
   git checkout -b finance       # Tim Finance
   git checkout -b purchasing    # Tim Purchasing
   git checkout -b production    # Tim Production
   git checkout -b snm           # Tim Sales & Marketing
   ```

3. **Commit dengan Pesan Jelas**:
   ```bash
   git commit -m "feat(inventory): tambah tabel stok barang"
   git commit -m "fix(auth): perbaiki bug di login"
   ```

4. **Push ke Branch Modul**:
   ```bash
   git push origin inventory
   ```

5. **Pull Request**: Buat PR dari branch modul ke `main`. Jangan langsung push ke main!

6. **Code Review**: Minimal 1 reviewer sebelum merge
