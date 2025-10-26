// Simple syntax validation for our Google Apps Script
// This will help catch any basic syntax errors

const fs = require('fs');

try {
  const code = fs.readFileSync('script/Code.gs', 'utf8');
  
  // Basic syntax checks
  let openBraces = 0;
  let openParens = 0;
  let inString = false;
  let inComment = false;
  let lineComment = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];
    
    // Handle comments
    if (!inString && char === '/' && nextChar === '/') {
      lineComment = true;
      i++; // skip next char
      continue;
    }
    
    if (!inString && char === '/' && nextChar === '*') {
      inComment = true;
      i++; // skip next char
      continue;
    }
    
    if (inComment && char === '*' && nextChar === '/') {
      inComment = false;
      i++; // skip next char
      continue;
    }
    
    if (lineComment && char === '\n') {
      lineComment = false;
      continue;
    }
    
    // Skip if in comment
    if (inComment || lineComment) continue;
    
    // Handle strings
    if (char === '"' || char === "'" || char === '`') {
      inString = !inString;
      continue;
    }
    
    // Skip if in string
    if (inString) continue;
    
    // Count braces and parentheses
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
  }
  
  console.log('Syntax validation results:');
  console.log(`Open braces: ${openBraces}`);
  console.log(`Open parentheses: ${openParens}`);
  
  if (openBraces === 0 && openParens === 0) {
    console.log('✅ Basic syntax appears correct!');
  } else {
    console.log('❌ Syntax issues detected!');
  }
  
  // Check for required functions
  const requiredFunctions = [
    'readReportConfigurations',
    'generateConfigurableReport',
    'exportReportToGoogleSheets',
    'exportConfigurableReportUI',
    'selectReportConfigurationUI'
  ];
  
  const missingFunctions = [];
  for (const funcName of requiredFunctions) {
    if (!code.includes(`function ${funcName}(`)) {
      missingFunctions.push(funcName);
    }
  }
  
  if (missingFunctions.length === 0) {
    console.log('✅ All required functions are present!');
  } else {
    console.log(`❌ Missing functions: ${missingFunctions.join(', ')}`);
  }
  
} catch (error) {
  console.error('Error validating syntax:', error.message);
}
