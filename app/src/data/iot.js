// Jembatan IoT wadah pintar.
//
// Mode "server": jika VITE_API_URL di-set, klien berlangganan Server-Sent Events
//   GET {API}/api/stream  → event "telemetry" berisi data dari ESP32 (lewat HTTP atau MQTT).
// Mode "sim": tanpa server, klien membangkitkan data yang meniru firmware
//   firmware/rantang-bin/rantang-bin.ino (load cell HX711 + sensor suhu DS18B20).

// VITE_API_URL: URL lengkap (https://api.contoh.id) atau "same-origin" bila PWA disajikan oleh server yang sama
const RAW = import.meta.env.VITE_API_URL
const API = RAW ? (/^https?:\/\//.test(RAW) ? RAW.replace(/\/$/, '') : '') : null

export function startIot({ getDevices, onTelemetry, onMode }) {
  if (API !== null) {
    try {
      const es = new EventSource(`${API}/api/stream`)
      onMode?.('server')
      es.addEventListener('telemetry', (ev) => {
        const t = JSON.parse(ev.data)
        onTelemetry(toMsg(t))
      })
      es.onerror = () => onMode?.('server-retry')
      return () => es.close()
    } catch {
      // jatuh ke simulasi
    }
  }
  onMode?.('sim')
  return startSim({ getDevices, onTelemetry })
}

function toMsg(t) {
  return {
    at: t.ts ? new Date(t.ts).getTime() : Date.now(),
    deviceId: t.device_id,
    topic: `rantang/${t.site || 'sppg-01'}/bin/${t.device_id}/telemetry`,
    payload: t,
    patch: {
      weightKg: t.weight_g / 1000,
      tempC: t.temp_c,
      battery: t.battery_pct,
      rssi: t.rssi,
    },
  }
}

function startSim({ getDevices, onTelemetry }) {
  const state = {}
  const step = () => {
    const devices = getDevices()
    const now = Date.now()
    devices.forEach((dv) => {
      const s = (state[dv.id] ||= { trend: dv.kind === 'layak' ? 0.08 : 0.22 })
      // dapur menambah isi sedikit demi sedikit; derau sel beban ±15 g
      let w = Math.max(0, dv.weightKg + Math.random() * s.trend * 2 - s.trend * 0.4 + (Math.random() - 0.5) * 0.03)
      w = Math.min(w, dv.capacityKg)
      // suhu: pangan layak dijaga hangat (penghangat wadah), sisa piring mengikuti suhu ruang
      const target = dv.kind === 'layak' ? 64 : 30
      const t = dv.tempC + (target - dv.tempC) * 0.08 + (Math.random() - 0.5) * 0.4
      const battery = Math.max(5, dv.battery - (Math.random() < 0.03 ? 1 : 0))
      const rssi = Math.round(-60 - Math.random() * 10)
      const payload = {
        device_id: dv.id,
        site: 'sppg-01',
        stream: dv.kind,
        weight_g: Math.round(w * 1000),
        temp_c: Math.round(t * 10) / 10,
        battery_pct: battery,
        rssi,
        lid_open: Math.random() < 0.08,
        fw: dv.fw,
        ts: new Date(now).toISOString(),
      }
      onTelemetry(toMsg(payload))
    })
  }
  const h = setInterval(step, 3000)
  setTimeout(step, 400)
  return () => clearInterval(h)
}
