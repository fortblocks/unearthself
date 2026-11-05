/**
 * Debug Oct 8 parsing to see where it fails
 */

import { readFileSync } from 'fs';

const oct8Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct8-plaintext-nextsteps_5010.txt', 'utf-8');

const lines = oct8Content.split('\n');

console.log('Searching for "Next steps" heading...\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check if it's a heading
  if (trimmed.toLowerCase().includes('next step')) {
    console.log(`Line ${i}: "${trimmed}"`);
    
    // Normalize heading
    const normalized = trimmed
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .trim();
    
    console.log(`  Normalized: "${normalized}"`);
    console.log(`  Matches /^(suggested )?next steps$/i: ${/^(suggested )?next steps$/i.test(normalized)}`);
    
    // Show next 10 lines
    console.log('\n  Next 10 lines:');
    for (let j = 1; j <= 10 && i + j < lines.length; j++) {
      const nextLine = lines[i + j].trim();
      if (nextLine) {
        console.log(`    ${i + j}: "${nextLine.substring(0, 80)}..."`);
      }
    }
    console.log();
  }
}
