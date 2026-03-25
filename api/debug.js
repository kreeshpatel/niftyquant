export default function handler(req, res) {
  return res.json({ source: 'root-api', cwd: process.cwd(), ts: Date.now() })
}
