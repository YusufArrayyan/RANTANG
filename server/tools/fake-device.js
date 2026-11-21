// Meniru dua ESP32 wadah pintar yang mengirim telemetri lewat HTTP.
// Pakai: node tools/fake-device.js [http://localhost:8080]
const API = process.argv[2] || 'http://localhost:8080'
const devices = [
  { id: 'RTG-01-L', key: 'demo-layak', stream: 'layak', w: 1200, t: 66 },
  { id: 'RTG-01-S', key: 'demo-sisa', stream: 'sisa', w: 5400, t: 30 },
]

async function tick() {
  for (const d of devices) {
    d.w += Math.round(Math.random() * (d.stream === 'layak' ? 180 : 420))
    d.t += ((d.stream === 'layak' ? 64 : 30) - d.t) * 0.1 + (Math.random() - 0.5) * 0.4
    const body = {
      device_id: d.id, site: 'sppg-01', stream: d.stream, weight_g: d.w, temp_c: Math.round(d.t * 10) / 10,
      battery_pct: 80, rssi: -63, lid_open: false, fw: '0.3.1', ts: new Date().toISOString(),
    }
    const r = await fetch(`${API}/api/iot/telemetry`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': d.key }, body: JSON.stringify(body),
    }).catch((e) => ({ status: e.message }))
    console.log(d.id, body.weight_g, 'g', body.temp_c, '°C →', r.status)
  }
}
setInterval(tick, 5000)
tick()
