export default function handler(req, res) {
  res.json({ ok: true, cwd: process.cwd(), nodeVersion: process.version })
}
