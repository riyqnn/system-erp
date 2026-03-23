# Enterprise Management System (Project-4B)

Sistem Informasi Manajemen terintegrasi, dibangun menggunakan arsitektur **Monorepo** dengan pemisahan Frontend (Next.js) dan Backend (NestJS).

## Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Teknologi & File Extensions](#teknologi--file-extensions)
- [Struktur Folder](#struktur-folder)
- [5 Modul Bisnis](#5-modul-bisnis)
- [Panduan Kontribusi](#panduan-kontribusi)
- [Standar Desain (TBD)](#standar-desain-tbd---menunggu-tim-desain)
- [Alur Kerja Git](#alur-kerja-git-penting)

## Arsitektur Sistem

Sistem ini menggunakan pendekatan **Monorepo** dengan **Database Terpusat** dan pemisahan kode Frontend-Backend.

### Konsep Utama

**1. Monorepo Architecture**
- **Frontend** (`apps/web/`) - Next.js 14+ untuk user interface
- **Backend** (`apps/api/`) - NestJS untuk API dan business logic
- **Shared Types** (`packages/`) - Type definitions yang digunakan bersama

**2. Centralized Database**
- Satu database untuk semua modul agar data real-time
- Contoh: Stok di Inventory otomatis terupdate saat Production selesai
- Semua modul terhubung ke sumber data yang sama

**3. Modular Code Separation**
- Kode dipisah per folder modul agar tiap tim bisa bekerja tanpa konflik
- Setiap modul memiliki routing, components, dan services sendiri di frontend
- Setiap modul memiliki controller, service, dan module sendiri di backend

**4. Shared Components**
- Komponen UI yang dipakai di BANYAK modul sekaligus
- Contoh: Sidebar, Navbar, Button, Input, Card
- Keuntungan: Konsistensi desain, tidak perlu buat ulang, mudah maintain

## Teknologi & File Extensions

### Teknologi yang Digunakan

| Teknologi | Kegunaan | Lokasi |
|-----------|----------|--------|
| **Next.js 14+** | Framework Frontend (App Router) | `apps/web/` |
| **NestJS** | Framework Backend API | `apps/api/` |
| **TypeScript** | JavaScript dengan tipe data | Semua folder |
| **Tailwind CSS** | Framework CSS untuk styling | `apps/web/` |
| **Prisma** | ORM untuk database | `apps/api/` |
| **React** | Library untuk membuat UI komponen | `apps/web/` |
| **Axios/TanStack Query** | HTTP client & data fetching | `apps/web/` |

### Jenis File & Extensions

| Extension | Kegunaan | Contoh |
|-----------|----------|--------|
| **`.tsx`** | React Component dengan TypeScript | `page.tsx`, `Button.tsx` |
| **`.ts`** | TypeScript logic file | `service.ts`, `dto.ts` |
| **`.prisma`** | Database schema | `schema.prisma` |
| **`.json`** | Configuration file | `package.json` |

**Contoh Penggunaan:**
- `apps/web/app/inventory/page.tsx` → Halaman Inventory (UI)
- `apps/api/src/modules/inventory/inventory.controller.ts` → API Controller Inventory
- `apps/api/src/modules/inventory/inventory.service.ts` → Business Logic Inventory

## Struktur Folder

```
project-4b/
├── apps/
│   ├── web/                      # NEXT.JS Frontend
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── inventory/        # Halaman & routing Inventory
│   │   │   ├── finance/          # Halaman & routing Finance
│   │   │   ├── purchasing/       # Halaman & routing Purchasing
│   │   │   ├── production/       # Halaman & routing Production
│   │   │   ├── snm/              # Halaman & routing Sales & Marketing
│   │   │   └── dashboard/        # Dashboard utama
│   │   ├── components/
│   │   │   ├── ui/               # Reusable UI components
│   │   │   └── modules/          # Komponen spesifik per modul
│   │   │       ├── inventory/
│   │   │       ├── finance/
│   │   │       ├── purchasing/
│   │   │       ├── production/
│   │   │       └── snm/
│   │   ├── lib/                  # Utility functions
│   │   ├── services/             # API client calls
│   │   ├── hooks/                # Custom React hooks
│   │   ├── types/                # TypeScript types
│   │   └── public/               # Static assets
│   │
│   └── api/                      # NESTJS Backend
│       ├── src/
│       │   ├── common/           # Shared utilities
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   └── prisma/
│       │   ├── modules/          # Business modules
│       │   │   ├── inventory/
│       │   │   │   ├── dto/      # Data Transfer Objects
│       │   │   │   ├── entities/ # Database entities
│       │   │   │   ├── inventory.controller.ts
│       │   │   │   ├── inventory.service.ts
│       │   │   │   └── inventory.module.ts
│       │   │   ├── finance/
│       │   │   ├── purchasing/
│       │   │   ├── production/
│       │   │   └── snm/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma/
│       │   └── schema.prisma     # Database schema
│       └── test/
│
├── packages/                     # Shared packages
│   └── shared/
│       └── types/                # Shared TypeScript types
│
├── .env                          # Environment variables
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml           # PNPM workspace config
├── package.json                  # Root package.json
└── README.md
```

## 5 Modul Bisnis

Sistem ini terdiri dari 5 modul bisnis utama. Setiap modul memiliki folder terpisah di Frontend dan Backend:

### 1. Inventory (Manajemen Stok & Gudang)
- **Frontend**: `apps/web/app/inventory/`
- **Backend**: `apps/api/src/modules/inventory/`
- **Fungsi**: Kelola stok barang, masuk/keluar, transfer antar gudang

### 2. Finance (Akuntansi & Laporan Keuangan)
- **Frontend**: `apps/web/app/finance/`
- **Backend**: `apps/api/src/modules/finance/`
- **Fungsi**: Jurnal umum, neraca, laba rugi, arus kas

### 3. Purchasing (Pengadaan Bahan Baku)
- **Frontend**: `apps/web/app/purchasing/`
- **Backend**: `apps/api/src/modules/purchasing/`
- **Fungsi**: Purchase Order, penerimaan barang, supplier management

### 4. Production (Alur Produksi Barang)
- **Frontend**: `apps/web/app/production/`
- **Backend**: `apps/api/src/modules/production/`
- **Fungsi**: Bill of Materials, production planning, job order

### 5. SNM (Sales & Marketing)
- **Frontend**: `apps/web/app/snm/`
- **Backend**: `apps/api/src/modules/snm/`
- **Fungsi**: Sales Order, customer management, marketing campaigns

## Panduan Kontribusi

### Untuk Tim Frontend
1. **Routing**: Buat halaman di `apps/web/app/[nama-modul]/`
2. **Components**:
   - Cek `apps/web/components/ui/` dulu untuk komponen umum
   - Buat komponen spesifik modul di `apps/web/components/modules/[nama-modul]/`
3. **API Calls**: Buat service file di `apps/web/services/[nama-modul].ts`
4. **Data Fetching**: Gunakan hooks di `apps/web/hooks/` untuk reuse logic

### Untuk Tim Backend
1. **Module Structure**: Setiap modul memiliki:
   - `dto/` - Data Transfer Objects untuk validasi request
   - `entities/` - Database schema entities
   - `[module].controller.ts` - HTTP endpoints
   - `[module].service.ts` - Business logic
   - `[module].module.ts` - Module configuration
2. **Database**: Edit `apps/api/prisma/schema.prisma` untuk schema changes
3. **Common Utilities**: Gunakan `apps/api/src/common/` untuk shared code

### Aturan Umum
1. **Cek Dulu, Buat Nanti**: Sebelum membuat komponen/service baru, cek apakah sudah ada yang类似的
2. **Gunakan Absolute Imports**: Import dengan path alias untuk cleaner code
3. **Type Safety**: Selalu gunakan TypeScript types, export types yang reusable ke `packages/shared/types/`

## Available Commands

```bash
# Install semua dependencies
pnpm install

# Jalankan Frontend + Backend bersamaan
pnpm dev

# Hanya jalankan Frontend
pnpm dev:web

# Hanya jalankan Backend
pnpm dev:api

# Build semua aplikasi
pnpm build

# Build aplikasi spesifik
pnpm build:web
pnpm build:api

# Start production mode
pnpm start

# Clean semua node_modules
pnpm clean

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
   git commit -m "fix(api): perbaiki bug di finance endpoint"
   ```

4. **Push ke Branch Modul**:
   ```bash
   git push origin inventory
   ```

5. **Pull Request**: Buat PR dari branch modul ke `main`. Jangan langsung push ke main!

6. **Code Review**: Minimal 1 reviewer sebelum merge

## Environment Variables

Copy `.env.example` ke `.env` dan isi sesuai konfigurasi:

```bash
# Frontend (.env di apps/web/)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (.env di apps/api/)
DATABASE_URL="postgresql://user:password@localhost:5432/project4b"
JWT_SECRET=your-secret-key
PORT=3001
```
