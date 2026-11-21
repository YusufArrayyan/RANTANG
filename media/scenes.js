// Naskah dan susunan adegan video "Alur kerja RANTANG dan integrasi IoT"
export const VOICE = 'id-ID-ArdiNeural'

export const SCENES = [
  {
    id: 's01', layout: 'title',
    title: 'RANTANG', sub: 'Alur kerja sistem dan integrasi wadah pintar IoT',
    say: 'Ini RANTANG, sistem pencocokan sisa pangan dapur MBG di tingkat kelurahan. Dalam beberapa menit ke depan, kita lihat alur kerjanya dari dapur sampai ke warga, dan bagaimana wadah pintar berbasis IoT membuat pencatatan cukup tiga ketukan.',
  },
  {
    id: 's02', layout: 'problem',
    title: 'Dua jenis sisa, satu dapur',
    say: 'Setiap hari, dapur SPPG menyisakan dua jenis pangan. Ada pangan layak yang belum disajikan, dan ada sisa piring bekas makan siswa. Selama ini keduanya sering tercampur, tidak ada yang mencocokkan dengan penerima di kelurahan, dan keluhan warga tidak punya jalur. RANTANG memisahkan dua aliran itu sejak di dapur.',
  },
  {
    id: 's03', layout: 'iot',
    title: 'Arsitektur: dari sensor ke layar',
    say: 'Sistemnya terdiri dari beberapa lapisan. Di dapur ada dua wadah pintar. Masing-masing punya sel beban dengan modul HX711 untuk menimbang, dan sensor suhu DS18B20. Sebuah ESP32 membaca sensor itu, lalu mengirim data lewat Wi-Fi memakai HTTPS atau MQTT ke server RANTANG. Server memeriksa kunci perangkat, menyimpan data, lalu menyiarkannya langsung ke aplikasi. Kabar untuk warga dan pengolah dikirim lewat WhatsApp.',
  },
  {
    id: 's04', layout: 'phone', clip: 'wadah', clipStart: 0.6, step: 'Integrasi IoT',
    title: 'Wadah pintar, data tiap detik',
    bullets: ['Berat, suhu, baterai, sinyal', 'Kirim tiap 10 detik atau saat berat berubah >100 g', 'Antre saat Wi-Fi putus, kirim ulang otomatis', 'Peringatan zona bahaya 5–60 °C'],
    say: 'Inilah layar Wadah di aplikasi petugas. Berat dan suhu diperbarui setiap beberapa detik. ESP32 mengirim data tiap sepuluh detik, atau segera saat berat berubah lebih dari seratus gram dan sudah stabil. Kalau Wi-Fi putus, perangkat menyimpan pesannya dan mengirim ulang begitu tersambung. Suhu pangan layak juga dipantau. Begitu masuk zona bahaya, antara lima sampai enam puluh derajat, aplikasi memberi peringatan.',
  },
  {
    id: 's05', layout: 'phone', clip: 'catat', clipStart: 0.6, step: 'Langkah 1–2 · Pilah dan catat',
    title: 'Mencatat dalam tiga ketukan',
    bullets: ['1  Pilih jenis: pangan layak', '2  Semua sesuai (cek kelayakan)', '3  Kirim', 'Berat terisi otomatis dari wadah'],
    say: 'Sekarang petugas mencatat. Ketukan pertama, pilih pangan layak. Berat langsung terisi dari wadah pintar, jadi petugas tidak perlu menimbang ulang atau mengetik angka. Jam masak sudah terpilih, dan aplikasi menunjukkan sampai jam berapa pangan ini aman ditawarkan. Ketukan kedua, Semua sesuai, untuk tiga butir cek kelayakan. Ketukan ketiga, Kirim. Catatan langsung ditawarkan.',
  },
  {
    id: 's06', layout: 'rules', step: 'Langkah 3 · Cocokkan',
    title: 'Aturan dua aliran yang terkunci',
    say: 'Begitu terkirim, sistem mencocokkan. Aturannya terkunci dan tidak bisa diubah dari aplikasi. Pangan layak ditawarkan ke penerima terdekat yang aktif. Sisa piring hanya ke pengolah maggot atau kompos, tidak pernah ke warga. Kalau tawaran tidak dijawab dalam tiga puluh menit, tawaran pindah ke penerima berikutnya. Dan kalau pangan layak sudah lewat empat jam dari jam masak, ia hanya boleh ke pengolah.',
  },
  {
    id: 's07', layout: 'phone', clip: 'penerima', clipStart: 0.6, step: 'Langkah 4 · Serah terima',
    title: 'Diambil, lalu dikonfirmasi dua pihak',
    bullets: ['Penerima: Saya ambil → Sudah diambil', 'Dapur: konfirmasi Benar', 'Jam dan berat tercatat', 'Nama penerima tetap privat'],
    say: 'Di sisi penerima, tawaran muncul sebagai kartu berisi perkiraan berat, lokasi, dan batas waktu ambil. Penerima menekan Saya ambil, datang ke dapur, lalu menekan Sudah diambil. Petugas dapur kemudian mengonfirmasi. Serah terima baru selesai setelah dua pihak setuju, lengkap dengan jam dan beratnya. Nama penerima tidak pernah terlihat oleh sesama warga.',
  },
  {
    id: 's08', layout: 'twophones', images: ['m-offline', 'm-tiket'], step: 'Keadaan khusus',
    title: 'Saat sinyal hilang, saat ada keluhan',
    say: 'Dapur tidak selalu punya sinyal. Dalam mode luring, catatan disimpan di ponsel dan dikirim otomatis saat sinyal kembali. Untuk keluhan, ada tiket sengketa dengan lima kategori: bau, jatah, mutu, jadwal, dan perilaku. Tim tiga orang menyelesaikannya dalam tiga hari. Lewat dari itu, tiket naik ke lurah dan DLH.',
  },
  {
    id: 's09', layout: 'laptop', clip: 'dasbor', clipStart: 0.6, step: 'Langkah 5 · Evaluasi',
    title: 'Dasbor untuk kelurahan dan DLH',
    say: 'Terakhir, admin kelurahan dan pengamat dari DLH melihat dasbor: berapa kilogram yang dialihkan dari TPA, persentase pangan layak yang sampai ke warga, pihak yang aktif, dan keluhan yang selesai tepat waktu. Kondisi wadah pintar ikut terpantau, dan semua data bisa diekspor ke CSV untuk pelaporan.',
  },
  {
    id: 's10', layout: 'end',
    title: 'Wadah mencatat. Aplikasi menjaga aturan. Warga menerima dengan tenang.',
    say: 'Itulah RANTANG. Wadah pintar mencatat beratnya, aplikasi menjaga aturannya, dan warga menerima pangan dengan tenang. Kode sumber dan dokumentasinya tersedia di GitHub.',
  },
]
