import { readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default function handler(req, res) {
  const info = {
    cwd: process.cwd(),
    __dirname,
    __filename,
    resultsVia__dirname: join(__dirname, '..', 'results'),
    resultsViaCwd: join(process.cwd(), 'results'),
    dirExists__dirname: existsSync(join(__dirname, '..', 'results')),
    dirExistsCwd: existsSync(join(process.cwd(), 'results')),
  }

  try {
    info.filesVia__dirname = readdirSync(join(__dirname, '..', 'results'))
  } catch (e) {
    info.filesVia__dirname_error = e.message
  }

  try {
    info.filesViaCwd = readdirSync(join(process.cwd(), 'results'))
  } catch (e) {
    info.filesViaCwd_error = e.message
  }

  try {
    info.parentDirFiles = readdirSync(join(__dirname, '..'))
  } catch (e) {
    info.parentDirFiles_error = e.message
  }

  try {
    info.cwdFiles = readdirSync(process.cwd())
  } catch (e) {
    info.cwdFiles_error = e.message
  }

  res.json(info)
}
