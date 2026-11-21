# Arsitektur RANTANG

## Lapisan

| Lapisan | Percontohan (repo ini) | Produksi |
|---|---|---|
| Klien | PWA React + Vite, cache layanan untuk luring, antrean sinkron | sama |
| API | Node.js `node:http`, REST + SSE | Node.js + Fastify, otorisasi berbasis peran dari sesi OTP |
| Data | Memori (data contoh) | PostgreSQL |
| Foto | Data URL terkompres | Penyimpanan objek, kedaluwarsa 90 hari |
| Notifikasi | Disimulasikan (toast) | WhatsApp Business API, SMS cadangan |
| IoT | Simulator di peramban, `tools/fake-device.js` | ESP32 + HX711 + DS18B20, HTTPS atau MQTT (Mosquitto/EMQX) |

## Entitas

Pengguna, Peran, Lokasi (SPPG/kelurahan), **Perangkat** (wadah pintar), **Telemetri**, Catatan (jenis, berat, jam masak, foto, suhu, sumber), Tawaran, SerahTerima, Tiket, Aturan, LogAudit.

## Wadah pintar

- Satu ESP32 per wadah. Id perangkat menandai alirannya (`-L` layak, `-S` sisa). Wadah tidak bisa "berpindah aliran" dari aplikasi.
- Pengiriman: saat berat berubah >100 g dan stabil 3 detik, atau detak tiap 10 detik.
- Keamanan: kunci per perangkat (`X-Device-Key`) dibandingkan waktu-konstan; di MQTT memakai ACL per topik.
- Luring: firmware mengantre 30 pesan; aplikasi menandai perangkat terputus bila tidak ada data >60 detik dan petugas mengetik berat manual.
- Suhu: pangan layak di wadah berpenghangat. Suhu 5–60 °C ditandai zona bahaya di aplikasi.
- Tare: petugas dapat menolkan timbangan dari layar *Wadah*.

## Aturan pencocokan (`app/src/data/rules.js`)

1. `sisa` → hanya pengolah.
2. `layak` → penerima terdekat yang aktif dan belum ditawari; bila lewat batas aman (default 4 jam dari jam masak) → hanya pengolah.
3. Tawaran tidak dijawab dalam `confirmMinutes` (default 30) → kedaluwarsa, diteruskan ke pihak berikutnya.
4. Serah terima selesai setelah konfirmasi dua pihak.

## Privasi

Data pribadi minimal (nama panggilan dan nomor). Penerima tidak melihat identitas penerima lain; API menyamarkan `partyId` untuk peran selain admin dan SPPG. Setiap perubahan aturan masuk log audit. Kepatuhan UU PDP perlu ditinjau ahli hukum sebelum peluncuran.
