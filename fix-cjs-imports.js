#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.cjs')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace require('./something') with require('./something.cjs')
      // Only if the path doesn't already end with .cjs and doesn't include node_modules
      content = content.replace(/require\(['"](\..+?)(?<!\.cjs)['"]\)/g, (match, p1) => {
        // Don't modify if it's electron or sqlite3 or already has .cjs
        if (p1.includes('electron') || p1.includes('sqlite3') || p1.endsWith('.cjs')) {
          return match;
        }
        return `require('${p1}.cjs')`;
      });
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  });
}

const dirs = ['electron/db', 'electron/models', 'electron/controllers', 'electron/ipcHandlers', 'electron/constants', 'electron/utils'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fixImports(dir);
  }
});

console.log('✓ All imports fixed!');
