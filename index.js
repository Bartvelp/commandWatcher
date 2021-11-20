import childProcess from 'child_process'
import fs from 'fs'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { URL } from 'url'

const ENV_PATH = new URL('./.env', import.meta.url).pathname
dotenv.config({ path: ENV_PATH })
  
const exec = childProcess.exec;

// How to use
// node ~/Projects/commandWatcher/index.js grep joined ~/paper_server/logs/latest.log

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand (cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.warn(error);
    }
    resolve(stdout? stdout : stderr);
    });
  });
}

function sendNotification (title, message) {
  fetch('https://pushme.vercel.app/api/sendNotification', {
    method: 'POST',
    headers: {
      'content-type': 'application/json' // This is mandatory
    },
    body: JSON.stringify({
      code: process.env.PUSHME_CODE,
      title,
      message
    })
  })
}

function getPrevious() {
  const prevPath = '/tmp/previous-output-watcher'
  if (fs.existsSync(prevPath)) {
    const data = fs.readFileSync(prevPath, 'utf8')
    return data
  } else return ''
}

function setPrevious (data) {
  fs.writeFileSync("/tmp/previous-output-watcher", data)
}

async function main() {
  if (process.env.PUSHME_CODE === undefined) return console.log('Please set a PUSHME_CODE in .env')
  const command = process.argv.slice(2).join(' ')
  if (command === '') return console.log('Command is empty')
  
  const output = await execShellCommand(command)
  const outputLines = output.split('\n').filter(line => !!line)
  const lastLine = outputLines[outputLines.length - 1]
  const previousLine = getPrevious()
  console.log('last output', 'previous', [lastLine, previousLine])
  
  if (previousLine === lastLine) return // Were done here
  sendNotification('New output', lastLine)
  setPrevious(lastLine)
}

main()
