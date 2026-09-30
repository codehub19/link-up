// Makes the OWNER_PASSWORD_HASH for the admin login (step 1) on YOUR computer.
// The password itself is never stored or sent anywhere — only this hash.
//
//   node functions/scripts/hash-admin-password.mjs
//
// It asks for the password twice (typing is hidden), then writes
// OWNER_PASSWORD_HASH=... into functions/.env.<project> (kept out of git).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const MIN = 12
const dir = path.dirname(fileURLToPath(import.meta.url))
const functionsDir = path.resolve(dir, '..')
const rcPath = path.resolve(functionsDir, '..', '.firebaserc')
const project = fs.existsSync(rcPath) ? JSON.parse(fs.readFileSync(rcPath, 'utf8')).projects?.default : null
const envFile = path.join(functionsDir, `.env${project ? '.' + project : ''}`)

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*') }
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a) })
  })
}

const pw = await askHidden('New admin password (12+ characters): ')
if (pw.length < MIN) { console.error(`Too short: use at least ${MIN} characters.`); process.exit(1) }
const again = await askHidden('Repeat it: ')
if (pw !== again) { console.error('The passwords don’t match.'); process.exit(1) }

const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')
const line = `OWNER_PASSWORD_HASH=scrypt:${salt}:${hash}`

let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
env = env.split(/\r?\n/).filter((l) => l && !l.startsWith('OWNER_PASSWORD_HASH=')).join('\n')
fs.writeFileSync(envFile, (env ? env + '\n' : '') + line + '\n')
console.log(`Saved to ${envFile}`)
console.log('Now deploy functions:  firebase deploy --only functions')
