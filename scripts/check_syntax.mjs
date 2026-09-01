import ts from 'typescript';
import fs from 'fs';

const code = fs.readFileSync('server.mjs', 'utf8');
const sourceFile = ts.createSourceFile('server.mjs', code, ts.ScriptTarget.Latest, true);
const diagnostics = sourceFile.parseDiagnostics;

console.log('Total syntax errors in server.mjs:', diagnostics.length);
diagnostics.slice(0, 20).forEach(d => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
  console.log(`Line ${line + 1}:${character + 1} - ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
});
