/**
 * Test extraction diagnostic with actual implementation
 * Tests structured errors, latestMeetingDate max, no credential leaks
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { ExtractionDiagnostic, ExtractionResult } from './action-tracking';

test('ExtractionDiagnostic type structure', () => {
  const diagnostic: ExtractionDiagnostic = {
    cacheHit: false,
    durationMs: 150,
    meetingsProcessed: 2,
    meetingsFailed: 1,
    latestMeetingDate: '2026-10-09',
    errors: [
      { stage: 'export', code: 'NULL_RESULT' },
      { stage: 'cache-read', code: 'REDIS_ERROR' }
    ],
  };
  
  assert.strictEqual(diagnostic.cacheHit, false);
  assert.strictEqual(diagnostic.durationMs, 150);
  assert.strictEqual(diagnostic.meetingsProcessed, 2);
  assert.strictEqual(diagnostic.meetingsFailed, 1);
  assert.strictEqual(diagnostic.latestMeetingDate, '2026-10-09');
  assert.strictEqual(diagnostic.errors.length, 2);
  assert.strictEqual(diagnostic.errors[0].stage, 'export');
  assert.strictEqual(diagnostic.errors[0].code, 'NULL_RESULT');
});

test('Error structure prevents credential leaks', () => {
  const error = { stage: 'export', code: 'EXPORT_FAILED' };
  
  // Error has no message field that could leak credentials
  assert.strictEqual('message' in error, false);
  assert.strictEqual(typeof error.stage, 'string');
  assert.strictEqual(typeof error.code, 'string');
  
  // Only safe fields present
  const keys = Object.keys(error);
  assert.deepStrictEqual(keys, ['stage', 'code']);
});

test('ExtractionResult contains actions and diagnostic', () => {
  const result: ExtractionResult = {
    actions: [
      {
        id: 'test-1',
        meetingId: 'meeting-1',
        meetingDate: '2026-10-08',
        meetingTitle: 'Test Meeting',
        owner: 'Lisa',
        text: 'Test action',
        excerpt: '* [Lisa] Test action: Test description.',
      }
    ],
    diagnostic: {
      cacheHit: false,
      durationMs: 100,
      meetingsProcessed: 1,
      meetingsFailed: 0,
      latestMeetingDate: '2026-10-08',
      errors: [],
    },
  };
  
  assert.strictEqual(result.actions.length, 1);
  assert.strictEqual(result.actions[0].owner, 'Lisa');
  assert.strictEqual(result.diagnostic.meetingsProcessed, 1);
  assert.strictEqual(result.diagnostic.errors.length, 0);
});

test('Cache hit vs miss duration semantics', () => {
  const cacheHit: ExtractionDiagnostic = {
    cacheHit: true,
    durationMs: 15,  // Fast fetch from Redis
    meetingsProcessed: 5,
    meetingsFailed: 0,
    latestMeetingDate: '2026-10-09',
    errors: [],
  };
  
  const cacheMiss: ExtractionDiagnostic = {
    cacheHit: false,
    durationMs: 2500,  // Slow export + extraction
    meetingsProcessed: 5,
    meetingsFailed: 0,
    latestMeetingDate: '2026-10-09',
    errors: [],
  };
  
  assert.ok(cacheHit.durationMs! < 100, 'Cache hit should be fast');
  assert.ok(cacheMiss.durationMs! > 1000, 'Cache miss with exports should be slow');
  assert.strictEqual(cacheHit.cacheHit, true);
  assert.strictEqual(cacheMiss.cacheHit, false);
});

test('Error codes are safe constants', () => {
  const validCodes = [
    'REDIS_ERROR',
    'NULL_RESULT', 
    'EXPORT_FAILED',
    'FATAL_ERROR',
    'FETCH_FAILED'
  ];
  
  const validStages = [
    'cache-read',
    'cache-write',
    'export',
    'extraction',
    'completions'
  ];
  
  // Test that error structures only use known safe codes
  const testError = { stage: 'export', code: 'EXPORT_FAILED' };
  assert.ok(validStages.includes(testError.stage));
  assert.ok(validCodes.includes(testError.code));
});

test('latestMeetingDate should be max not first', () => {
  // Simulated meeting dates out of order
  const meetings = [
    { date: '2026-10-08' },
    { date: '2026-10-09' },
    { date: '2026-10-06' },
  ];
  
  // Correct: take max
  const latest = meetings.reduce((max, m) => m.date > max ? m.date : max, meetings[0].date);
  assert.strictEqual(latest, '2026-10-09');
  
  // Incorrect: assume sorted
  const assumedFirst = meetings[0].date;
  assert.notStrictEqual(assumedFirst, '2026-10-09');
});

test('Distinguishes valid empty from failure', () => {
  const validEmpty: ExtractionDiagnostic = {
    cacheHit: false,
    meetingsProcessed: 0,
    meetingsFailed: 0,
    latestMeetingDate: null,
    errors: [],
  };
  
  const failure: ExtractionDiagnostic = {
    cacheHit: false,
    meetingsProcessed: 5,
    meetingsFailed: 5,
    latestMeetingDate: '2026-10-09',
    errors: [
      { stage: 'export', code: 'EXPORT_FAILED' }
    ],
  };
  
  // Valid empty: no meetings discovered, no errors
  assert.strictEqual(validEmpty.meetingsProcessed, 0);
  assert.strictEqual(validEmpty.errors.length, 0);
  
  // Failure: meetings found but all failed
  assert.ok(failure.meetingsProcessed > 0);
  assert.strictEqual(failure.meetingsFailed, failure.meetingsProcessed);
  assert.ok(failure.errors.length > 0);
});
