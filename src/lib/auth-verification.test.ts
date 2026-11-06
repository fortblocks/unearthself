/**
 * Verification tests for authentication on server functions
 * Checks that auth code is present without executing server runtime
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

test('extractAllActions includes requireStaffSession', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/action-tracking.ts'), 'utf-8');
  
  // Find extractAllActions handler
  const extractAllActionsStart = source.indexOf('export const extractAllActions');
  assert.ok(extractAllActionsStart > 0, 'extractAllActions should exist');
  
  const handlerEnd = source.indexOf('});', extractAllActionsStart);
  const handlerBlock = source.substring(extractAllActionsStart, handlerEnd);
  
  assert.ok(handlerBlock.includes('requireStaffSession'), 
    'extractAllActions should call requireStaffSession');
  assert.ok(handlerBlock.includes('await requireStaffSession()'), 
    'extractAllActions should await requireStaffSession()');
});

test('listMeetings includes requireStaffSession', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/minutes.ts'), 'utf-8');
  
  const listMeetingsStart = source.indexOf('export const listMeetings');
  assert.ok(listMeetingsStart > 0, 'listMeetings should exist');
  
  const handlerEnd = source.indexOf('});', listMeetingsStart);
  const handlerBlock = source.substring(listMeetingsStart, handlerEnd);
  
  assert.ok(handlerBlock.includes('requireStaffSession'), 
    'listMeetings should call requireStaffSession');
});

test('getMeetingMinutes includes requireStaffSession', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/minutes.ts'), 'utf-8');
  
  const getMeetingMinutesStart = source.indexOf('export const getMeetingMinutes');
  assert.ok(getMeetingMinutesStart > 0, 'getMeetingMinutes should exist');
  
  const handlerEnd = source.indexOf('});', getMeetingMinutesStart);
  const handlerBlock = source.substring(getMeetingMinutesStart, handlerEnd + 3);
  
  assert.ok(handlerBlock.includes('requireStaffSession'), 
    'getMeetingMinutes should call requireStaffSession');
});

test('markActionComplete includes requireStaffSession', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/action-tracking.ts'), 'utf-8');
  
  const markStart = source.indexOf('export const markActionComplete');
  assert.ok(markStart > 0, 'markActionComplete should exist');
  
  const handlerEnd = source.indexOf('  });', markStart);
  const handlerBlock = source.substring(markStart, handlerEnd);
  
  assert.ok(handlerBlock.includes('requireStaffSession'), 
    'markActionComplete should call requireStaffSession');
});

test('undoActionComplete includes requireStaffSession', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/action-tracking.ts'), 'utf-8');
  
  const undoStart = source.indexOf('export const undoActionComplete');
  assert.ok(undoStart > 0, 'undoActionComplete should exist');
  
  const handlerEnd = source.indexOf('  });', undoStart);
  const handlerBlock = source.substring(undoStart, handlerEnd);
  
  assert.ok(handlerBlock.includes('requireStaffSession'), 
    'undoActionComplete should call requireStaffSession');
});

test('getActionCompletions includes requireStaffSession', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/action-tracking.ts'), 'utf-8');
  
  const getStart = source.indexOf('export const getActionCompletions');
  assert.ok(getStart > 0, 'getActionCompletions should exist');
  
  const handlerEnd = source.indexOf(');', getStart + 200);
  const handlerBlock = source.substring(getStart, handlerEnd);
  
  assert.ok(handlerBlock.includes('requireStaffSession'), 
    'getActionCompletions should call requireStaffSession');
});

test('requireStaffSession helper exists in staff-session.ts', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/staff-session.ts'), 'utf-8');
  
  assert.ok(source.includes('export async function requireStaffSession'), 
    'requireStaffSession should be exported as async function');
  assert.ok(source.includes('throw new Error("Unauthorized")'), 
    'requireStaffSession should throw Unauthorized error');
});

test('requireStaffSession uses verifyStaffSession internally', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/staff-session.ts'), 'utf-8');
  
  assert.ok(source.includes('async function verifyStaffSession'), 
    'verifyStaffSession helper should exist');
  assert.ok(source.includes('const session = await verifyStaffSession'), 
    'requireStaffSession should call verifyStaffSession');
  assert.ok(source.includes('if (!session)'), 
    'requireStaffSession should check for null session');
});

test('All mutation server functions protected', () => {
  const source = readFileSync(join(projectRoot, 'src/lib/action-tracking.ts'), 'utf-8');
  
  // Count POST server functions
  const postFunctions = [
    'markActionComplete',
    'undoActionComplete'
  ];
  
  for (const fn of postFunctions) {
    const fnStart = source.indexOf(`export const ${fn}`);
    assert.ok(fnStart > 0, `${fn} should exist`);
    
    const nextExport = source.indexOf('export const', fnStart + 20);
    const block = source.substring(fnStart, nextExport > 0 ? nextExport : source.length);
    
    assert.ok(block.includes('requireStaffSession'), 
      `${fn} should call requireStaffSession`);
  }
});
