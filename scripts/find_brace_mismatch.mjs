import fs from 'fs';

const content = fs.readFileSync('./server.mjs', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
let stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Remove string literals and comments roughly
  let cleaned = line.replace(/\/\/.*/, '').replace(/'(?:\\'|[^'])*'/g, '').replace(/"(?:\\"|[^"])*"/g, '').replace(/`(?:\\`|[^`])*`/g, '');
  
  for (let j = 0; j < cleaned.length; j++) {
    const char = cleaned[j];
    if (char === '{') {
      openBraces++;
      stack.push({ line: i + 1, col: j + 1 });
    } else if (char === '}') {
      openBraces--;
      stack.pop();
    }
  }
}

console.log('Final open braces count:', openBraces);
console.log('Unclosed braces at lines:', stack.slice(-10));
