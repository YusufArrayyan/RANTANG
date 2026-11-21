# DESIGN.md — RANTANG

Sistem visual turunan PRD §7.2, diselaraskan dengan logo. Struktur komponen meminjam disiplin "retail flagship" ala Starbucks (dari pustaka awesome-design): beberapa tingkat hijau dengan peran berbeda, tombol pil, satu tombol aksi bundar yang selalu terjangkau, kuning hanya untuk status penting.

## Warna

| Token | Nilai | Peran |
|---|---|---|
| `--brand` | `#116C65` | Hijau teal logo. Aksi utama, judul, ikon aktif |
| `--brand-strong` | `#0B4F4A` | Hover/pressed, teks di atas mint |
| `--brand-deep` | `#0A3B38` | Pita gelap (header dasbor, sidebar desktop) |
| `--mint` | `#E6F1EE` | Latar kartu/zona (PRD: `#EEF4F1`) |
| `--mint-line` | `#CFE2DD` | Garis halus di atas mint |
| `--accent` | `#F2C200` | Kuning logo. Hanya penanda status "Menunggu", tenggat, sinyal IoT |
| `--ink` | `#23303A` | Teks utama |
| `--ink-2` | `#4A5862` | Teks sekunder (kontras 7:1 di atas putih) |
| `--line` | `#DDE5E3` | Garis pemisah |
| `--surface` | `#FFFFFF` | Kanvas utama |
| `--danger` | `#C8553D` | Sengketa, galat |

Status selalu warna + ikon + teks: **Layak** (hijau, ikon daun), **Sisa piring** (abu-coklat `#7A5C3E`, ikon daur ulang), **Menunggu** (kuning, ikon jam), **Diambil/Selesai** (hijau tua, ikon centang), **Sengketa** (`#C8553D`, ikon segitiga), **Kedaluwarsa** (abu).

## Tipografi

Satu keluarga: **Plus Jakarta Sans** (400/500/600/700/800).
Judul layar 22–24 px/700, subjudul 18 px/700, isi 16 px/400, label 13 px/600. Angka memakai `font-variant-numeric: tabular-nums`. Letter-spacing judul −0.01em.

## Bentuk dan ruang

- Sudut 12 px (kartu, input), pil 999 px (tombol), bundar (FAB 64 px).
- Bayangan tipis: `0 0 0.5px rgba(16,40,38,.16), 0 1px 2px rgba(16,40,38,.10)`.
- Jarak kelipatan 8 px (4 untuk detail kecil).
- Target sentuh ≥48 px; tombol utama tinggi 56 px di layar petugas.

## Komponen

- **Tombol utama**: pil, `--brand`, teks putih 16/700, tekan `scale(.97)`.
- **Tombol sekunder**: pil, garis 1.5 px `--brand`.
- **FAB "Catat"**: lingkaran 64 px di kanan bawah (seluler) — tanda tangan visual RANTANG.
- **Pilihan jenis**: dua tombol besar berdampingan, ikon + label + deskripsi pendek, terpilih = latar mint + garis 2 px brand.
- **Papan angka**: tombol 56 px, angka tabular.
- **Chip status**: pil kecil, ikon 14 px + teks 13/600.
- **Kartu wadah pintar (IoT)**: berat besar, suhu, baterai, sinyal, waktu sinkron terakhir; titik denyut kuning saat menerima data.

## Navigasi

Seluler: bilah bawah 4–5 tab sesuai peran. Desktop ≥1024 px: sidebar `--brand-deep` kiri, konten maks 1120 px.

## Gerak

150–200 ms, `cubic-bezier(.2,.8,.2,1)`. Hanya untuk perubahan status, umpan balik tekan, dan masuknya lembar bawah. `prefers-reduced-motion` mematikan semuanya.

## Ikon

Lucide, garis 1.75 px, satu keluarga.
