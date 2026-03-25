const DEPLOY_TOKEN = 'deploy-070322c-test'

export default function handler(req, res) {
  return res.json({ source: 'frontend-api', ok: true, token: DEPLOY_TOKEN, ts: Date.now() })
}
