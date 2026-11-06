/**
 * REAL runtime tests for production extraction pipeline
 * Tests ACTUAL src/lib/action-extraction-pipeline.ts with mocked external dependencies
 * NO copied implementation - imports and tests production code
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { runExtractionPipeline, type PipelineDependencies } from './action-extraction-pipeline.ts';
import type { ActionItem } from './action-tracking.ts';

// Test listMeetings error swallowing behavior documented in src/lib/minutes.ts:440-447
// Production listMeetings() catches all errors and returns empty array
// This means outer try/catch in pipeline does NOT catch discovery failures
// Pipeline must handle empty array as "unknown" status (could be empty or failed)

test('Auth failure during pipeline execution returns FATAL_ERROR', async () => {
  // Auth failures in dependencies should be caught by outer try/catch
  const deps: PipelineDependencies = {
    listMeetings: async () => { throw new Error('Drive API auth failed'); },
    getMeetingMinutes: async () => null,
    extractExplicitActions: async () => [],
    getRedisClient: async () => null,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.actions.length, 0);
  assert.strictEqual(result.diagnostic.errors.length, 1);
  assert.strictEqual(result.diagnostic.errors[0].stage, 'discovery');
  assert.strictEqual(result.diagnostic.errors[0].code, 'LIST_FAILED');
});

test('Valid empty meetings list (no errors)', async () => {
  const deps: PipelineDependencies = {
    listMeetings: async () => [],
    getMeetingMinutes: async () => null,
    extractExplicitActions: async () => [],
    getRedisClient: async () => null,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.actions.length, 0);
  assert.strictEqual(result.diagnostic.meetingsProcessed, 0);
  assert.strictEqual(result.diagnostic.meetingsFailed, 0);
  assert.strictEqual(result.diagnostic.latestMeetingDate, null);
  assert.strictEqual(result.diagnostic.errors.length, 0);
  assert.strictEqual(result.diagnostic.cacheHit, false);
});

test('Successful extraction with real cache key generation', async () => {
  const mockMeeting = {
    id: 'doc-123',
    title: 'Badlander Dev - 2026/10/08',
    date: '2026-10-08',
    time: '10:00',
    createdTime: '2026-10-08T10:00:00Z',
    modifiedTime: '2026-10-08T11:00:00Z',
  };
  
  const mockAction: ActionItem = {
    id: 'doc-123-action-1',
    meetingId: 'doc-123',
    meetingDate: '2026-10-08',
    meetingTitle: 'Badlander Dev - 2026/10/08',
    owner: 'Lisa',
    text: 'Fix authentication',
    excerpt: '* [Lisa] Fix authentication: Add requireStaffSession to all endpoints',
  };
  
  let cacheKey: string | undefined;
  const mockRedis = {
    get: async (key: string) => {
      cacheKey = key;
      return null; // Cache miss
    },
    set: async (key: string, value: any, options: { ex: number }) => {
      cacheKey = key;
      assert.strictEqual(options.ex, 300); // 5 minutes
      assert.ok(Array.isArray(value));
    },
  };
  
  const deps: PipelineDependencies = {
    listMeetings: async () => [mockMeeting],
    getMeetingMinutes: async (id) => ({
      meeting: mockMeeting,
      fullText: '* [Lisa] Fix authentication: Add requireStaffSession to all endpoints',
      actions: [],
    }),
    extractExplicitActions: async () => [mockAction],
    getRedisClient: async () => mockRedis,
    hashString: (s) => `hash-${s.length}`, // Simplified hash
  };
  
  const result = await runExtractionPipeline(deps);
  
  // Verify extraction
  assert.strictEqual(result.actions.length, 1);
  assert.strictEqual(result.actions[0].owner, 'Lisa');
  
  // Verify diagnostic
  assert.strictEqual(result.diagnostic.meetingsProcessed, 1);
  assert.strictEqual(result.diagnostic.meetingsFailed, 0);
  assert.strictEqual(result.diagnostic.latestMeetingDate, '2026-10-08');
  assert.strictEqual(result.diagnostic.cacheHit, false);
  assert.ok(result.diagnostic.durationMs !== undefined);
  
  // Verify cache key format
  assert.ok(cacheKey);
  assert.ok(cacheKey.includes('actions-cache:v2-plaintext:'));
  assert.ok(cacheKey.includes('hash-')); // Our mock hash
});

test('Export failure tracked with NULL_RESULT', async () => {
  const deps: PipelineDependencies = {
    listMeetings: async () => [{
      id: 'failing-doc',
      title: 'Test',
      date: '2026-10-08',
      time: '10:00',
      createdTime: '',
      modifiedTime: '',
    }],
    getMeetingMinutes: async () => null, // Export returns null
    extractExplicitActions: async () => [],
    getRedisClient: async () => null,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.actions.length, 0);
  assert.strictEqual(result.diagnostic.meetingsProcessed, 1);
  assert.strictEqual(result.diagnostic.meetingsFailed, 1);
  assert.strictEqual(result.diagnostic.errors.length, 1);
  assert.strictEqual(result.diagnostic.errors[0].stage, 'export');
  assert.strictEqual(result.diagnostic.errors[0].code, 'NULL_RESULT');
});

test('Export exception tracked with EXPORT_FAILED', async () => {
  const deps: PipelineDependencies = {
    listMeetings: async () => [{
      id: 'throwing-doc',
      title: 'Test',
      date: '2026-10-08',
      time: '10:00',
      createdTime: '',
      modifiedTime: '',
    }],
    getMeetingMinutes: async () => {
      throw new Error('Drive API timeout');
    },
    extractExplicitActions: async () => [],
    getRedisClient: async () => null,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.actions.length, 0);
  assert.strictEqual(result.diagnostic.meetingsProcessed, 1);
  assert.strictEqual(result.diagnostic.meetingsFailed, 1);
  assert.strictEqual(result.diagnostic.errors.length, 1);
  assert.strictEqual(result.diagnostic.errors[0].stage, 'export');
  assert.strictEqual(result.diagnostic.errors[0].code, 'EXPORT_FAILED');
});

test('Partial failure: one success, one fail', async () => {
  const successAction: ActionItem = {
    id: 'doc1-action',
    meetingId: 'doc-1',
    meetingDate: '2026-10-08',
    meetingTitle: 'Meeting 1',
    owner: 'Tess',
    text: 'Action 1',
    excerpt: '* [Tess] Action 1',
  };
  
  let callCount = 0;
  const deps: PipelineDependencies = {
    listMeetings: async () => [
      { id: 'doc-1', title: 'M1', date: '2026-10-08', time: '10:00', createdTime: '', modifiedTime: '' },
      { id: 'doc-2', title: 'M2', date: '2026-10-09', time: '11:00', createdTime: '', modifiedTime: '' },
    ],
    getMeetingMinutes: async (id) => {
      callCount++;
      if (id === 'doc-1') {
        return { meeting: {}, fullText: 'content', actions: [] };
      }
      return null; // doc-2 fails
    },
    extractExplicitActions: async (id) => {
      return id === 'doc-1' ? [successAction] : [];
    },
    getRedisClient: async () => null,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.actions.length, 1);
  assert.strictEqual(result.actions[0].owner, 'Tess');
  assert.strictEqual(result.diagnostic.meetingsProcessed, 2);
  assert.strictEqual(result.diagnostic.meetingsFailed, 1);
  assert.strictEqual(result.diagnostic.latestMeetingDate, '2026-10-09'); // Max not first
  assert.strictEqual(result.diagnostic.errors.length, 1);
});

test('Cache hit returns cached actions with metadata', async () => {
  const cachedActions: ActionItem[] = [{
    id: 'cached-action',
    meetingId: 'cached-meeting',
    meetingDate: '2026-10-05',
    meetingTitle: 'Cached',
    owner: 'Christopher',
    text: 'Cached task',
    excerpt: '* [Christopher] Cached task',
  }];
  
  let getMeetingsCalled = false;
  const mockRedis = {
    get: async (key: string) => {
      return cachedActions; // Cache hit
    },
    set: async () => {
      throw new Error('Should not write on cache hit');
    },
  };
  
  const deps: PipelineDependencies = {
    listMeetings: async () => {
      getMeetingsCalled = true;
      return [{ id: 'doc-1', title: 'M1', date: '2026-10-08', time: '10:00', createdTime: '', modifiedTime: '' }];
    },
    getMeetingMinutes: async () => {
      throw new Error('Should not be called on cache hit');
    },
    extractExplicitActions: async () => {
      throw new Error('Should not be called on cache hit');
    },
    getRedisClient: async () => mockRedis,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  // Verify cache hit
  assert.strictEqual(result.actions.length, 1);
  assert.strictEqual(result.actions[0].owner, 'Christopher');
  assert.strictEqual(result.diagnostic.cacheHit, true);
  assert.strictEqual(result.diagnostic.meetingsProcessed, 1); // Still discovered
  assert.strictEqual(result.diagnostic.meetingsFailed, undefined, 'Exports not attempted on cache hit');
  assert.ok(result.diagnostic.durationMs! < 100, 'Cache hit should be fast');
  assert.ok(getMeetingsCalled, 'listMeetings should be called to generate cache key');
});

test('Latest meeting date computed from max, not first', async () => {
  const deps: PipelineDependencies = {
    listMeetings: async () => [
      { id: '1', title: 'M1', date: '2026-10-08', time: '10:00', createdTime: '', modifiedTime: 'v1' },
      { id: '2', title: 'M2', date: '2026-10-09', time: '10:00', createdTime: '', modifiedTime: 'v2' }, // Latest
      { id: '3', title: 'M3', date: '2026-10-06', time: '10:00', createdTime: '', modifiedTime: 'v3' },
    ],
    getMeetingMinutes: async () => ({ meeting: {}, fullText: '', actions: [] }),
    extractExplicitActions: async () => [],
    getRedisClient: async () => null,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.diagnostic.latestMeetingDate, '2026-10-09');
  assert.strictEqual(result.diagnostic.meetingsProcessed, 3);
});

test('Cache write skipped on partial failure', async () => {
  let cacheWritten = false;
  const mockRedis = {
    get: async () => null,
    set: async () => {
      cacheWritten = true;
    },
  };
  
  const deps: PipelineDependencies = {
    listMeetings: async () => [
      { id: '1', title: 'M1', date: '2026-10-08', time: '10:00', createdTime: '', modifiedTime: '' },
    ],
    getMeetingMinutes: async () => null, // Fail
    extractExplicitActions: async () => [],
    getRedisClient: async () => mockRedis,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  assert.strictEqual(result.diagnostic.meetingsFailed, 1);
  assert.strictEqual(cacheWritten, false, 'Cache should not be written when meetings fail');
});

test('Redis cache error tracked but continues', async () => {
  const mockRedis = {
    get: async () => {
      throw new Error('Redis connection failed');
    },
    set: async () => {
      throw new Error('Redis write failed');
    },
  };
  
  const deps: PipelineDependencies = {
    listMeetings: async () => [
      { id: '1', title: 'M1', date: '2026-10-08', time: '10:00', createdTime: '', modifiedTime: '' },
    ],
    getMeetingMinutes: async () => ({ meeting: {}, fullText: '', actions: [] }),
    extractExplicitActions: async () => [],
    getRedisClient: async () => mockRedis,
    hashString: (s) => s,
  };
  
  const result = await runExtractionPipeline(deps);
  
  // Should continue despite cache errors
  assert.strictEqual(result.diagnostic.meetingsProcessed, 1);
  assert.ok(result.diagnostic.errors.some(e => e.stage === 'cache-read' && e.code === 'REDIS_ERROR'));
});
