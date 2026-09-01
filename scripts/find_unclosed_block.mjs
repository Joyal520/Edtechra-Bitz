import ts from 'typescript';
import fs from 'fs';

const code = fs.readFileSync('server.mjs', 'utf8');
const sourceFile = ts.createSourceFile('server.mjs', code, ts.ScriptTarget.Latest, true);

function inspectNode(node, depth = 0) {
  const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  
  if (node.syntaxCount !== undefined || ts.isFunctionDeclaration(node) || ts.isExpressionStatement(node)) {
    // check children
  }
  
  ts.forEachChild(node, child => {
    try {
      inspectNode(child, depth + 1);
    } catch (e) {
      console.log('Error inside node starting at line', startLine + 1);
    }
  });
}

console.log('Statements in sourceFile:', sourceFile.statements.length);
sourceFile.statements.forEach((stmt, idx) => {
  const { line: startLine, character: startCol } = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile));
  const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(stmt.getEnd());
  const textPreview = stmt.getText(sourceFile).slice(0, 40).replace(/\n/g, ' ');
  if (stmt.parseDiagnostics && stmt.parseDiagnostics.length > 0) {
    console.log(`[Diagnostic] Stmt ${idx} at line ${startLine + 1}: ${textPreview}`);
  }
});

// Let's print the last 10 top-level statements:
console.log('\nLast 15 top level statements:');
sourceFile.statements.slice(-15).forEach((stmt, idx) => {
  const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile));
  const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(stmt.getEnd());
  const textPreview = stmt.getText(sourceFile).slice(0, 60).replace(/\n/g, ' ');
  console.log(`[${startLine + 1} - ${endLine + 1}] ${textPreview}`);
});
