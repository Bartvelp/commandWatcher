#!/usr/bin/env node
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
    exec(cmd + " && exit 0", (error, stdout, stderr) => {
    if (error) {
      console.warn(error);
    }
    resolve(stdout? stdout : stderr);
    });
  });
}

// https://stackoverflow.com/a/52171480/5329317
function hash (str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
  h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
  const result =  4294967296 * (2097151 & h2) + (h1>>>0);
  return result.toString()
};


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

function getPrevious(commandHash) {
  const prevPath = `/tmp/previous-output-watcher-${commandHash}`
  if (fs.existsSync(prevPath)) {
    const data = fs.readFileSync(prevPath, 'utf8')
    return data
  } else return ''
}

function setPrevious (data, commandHash) {
  fs.writeFileSync(`/tmp/previous-output-watcher-${commandHash}`, data)
}

async function main() {
  if (process.env.PUSHME_CODE === undefined) return console.log('Please set a PUSHME_CODE in .env')
  const command = process.argv.slice(2).join(' ')
  if (command === '') return console.log('Command is empty')
  const commandHash = hash(command)

  const user = (await execShellCommand('whoami')).replace('\n', '')
  const hostname = (await execShellCommand('hostname')).replace('\n', '')

  const output = await execShellCommand(command)
  const outputLines = output.split('\n').filter(line => !!line)
  
  let lastLine = outputLines[outputLines.length - 1]
  if (lastLine === undefined) lastLine = 'Command failed, got undefined'

  const previousLine = getPrevious(commandHash)
  console.log('last output', 'previous', [lastLine, previousLine])
  
  if (previousLine === lastLine) return // Were done here
  sendNotification('New command watcher output', `${user}@${hostname}\n$ ${command}\nnow: ${lastLine}\nwas: ${previousLine}`)
  setPrevious(lastLine, commandHash)
}

main()
