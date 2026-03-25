const DEPLOY_TOKEN = 'deploy-780f272-test'

export default function handler(req, res) {
  return res.json({ ok: true, token: DEPLOY_TOKEN, ts: Date.now() })
}
