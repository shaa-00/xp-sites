import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const trackedFiles = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' },
)
    .split('\0')
    .filter(Boolean)

const secretPatterns = [
    { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{20,}/ },
    { name: 'GitHub token', pattern: /(?:gh[pousr]_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,})/ },
    { name: 'Slack token', pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/ },
    { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
]

const findings = []

for (const file of trackedFiles) {
    const content = await readFile(file, 'utf8').catch(() => null)
    if (content === null || content.includes('\0')) continue

    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
        for (const { name, pattern } of secretPatterns) {
            if (pattern.test(line)) {
                findings.push(`${file}:${index + 1} ${name}`)
            }
        }
    })
}

if (findings.length) {
    console.error('Potential secrets found in tracked files:')
    for (const finding of findings) console.error(`- ${finding}`)
    process.exitCode = 1
} else {
    console.log(`Secret scan passed: ${trackedFiles.length} tracked files checked`)
}
