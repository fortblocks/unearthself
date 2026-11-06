# Investigation Evidence: Empty Today Page

## Issue Report (Chris, Nov 5, 2026 6:45 PM)

Lisa's Today page after deploy 3004b27 shows:
1. "No open actions from meetings in last 30 days"
2. Header: "WEDNESDAY 9 SEPTEMBER 2026"

**Expected**: Lisa 7, Tess 6, Christopher 3, Norah 11 actions from last 30 days

---

## Evidence-Based Findings

### Issue 1: Static September Date ✅ IDENTIFIED

**Location**: `src/components/desk/Shell.tsx` line 39

```typescript
const PAGE: Record<string, { kicker: string; title: string }> = {
  "/admin": { kicker: "Wednesday 9 September 2026", title: "Today" },
```

**Fix**: Replace static date with dynamic current date formatted as "WEEKDAY DD MONTH YYYY"

---

### Issue 2: Missing Meetings ✅ IDENTIFIED

**Test Results** (with actual Oct 8/9 source files):

```
DATE FILTER VALIDATION TEST

Today: 2026-11-05
30-day cutoff: 2026-10-06
Expected: 2026-10-06

Oct 8 Meeting (2026-10-08):
  Extracted: 3 actions
  Within window: YES
  After date filter: 3 actions

Oct 9 Meeting (2026-10-09):
  Extracted: 10 actions
  Within window: YES
  After date filter: 10 actions

Lisa actions from Oct 8+9: 2
  From Oct 8: 0
  From Oct 9: 2

Expected Lisa total (all meetings): 7
Missing: Oct 27 (1) + Oct 29 (4) = 5 actions

CONCLUSION: Date filter working correctly.
ISSUE: listMeetings not discovering Oct 27/29 meetings.
```

**Pipeline Validation**:
1. ✅ Extraction: Oct 8/9 plaintext format parsed correctly
2. ✅ Date filter: 2026-10-06 cutoff calculated correctly  
3. ✅ Owner filter: Lisa actions identified correctly
4. ❌ **Meeting discovery**: Oct 27/29 meetings not in list

**Root Cause**: `listMeetings()` not discovering all accessible meetings

**Grounded Source Evidence** (from attached list):
- Oct 29: `1UZGfFdftNCIRpxCK1U-DeG47pfJmfDCKjB4ekwgPi_g` (Lisa 4, Tess 3, Christopher 3, Norah 3)
- Oct 27/28: `199vjpHFed7aWZKxPuFyoVeQID_-c6CMOd82eibzdvuI` (Lisa 1)
- Oct 9: `1T_MtFANUaVcsac7W8k5ya5RVeI_vdJZQvDu8QJSW8kE` (Lisa 2, Tess 2, Norah 6)
- Oct 8: `1_l4TWHQdxkicfvrqHfm7ko10Wi1EMmYVYzwjO0mLmQI` (Tess 1, Norah 2)

---

## Remaining Unknowns ⚠️

### Runtime Service Account Visibility

**Cannot verify without production logs**:
- Does SA have access to Oct 27/29 doc IDs?
- Does recursive folder search reach those docs?
- Does fallback name search find them?

**User says**: "Runtime SA visibility is NOT verified and user OAuth visibility differs"

**Configured parent**: `1C5aG-ilfEtzjJowXEFZCzyNLE4OulL54` (Google Meet parent)
- Meet Recordings: `1xehL5chPhYNNqtXm5jTIu7bOVV77fpXL`
- Oct 29 parent: `1W6H4fauEttK6t2RDyKjcBV9zqwscpDb2` (recurring meeting folder)
- Oct 9 parent: `1N0d-zwVfzOJC-jM_abqEI0wuSs0uNKh4` (recurring meeting folder)

---

## Safe Diagnostic Approach

### Add logging without exposing secrets:

**In `listMeetings()` after collection**:
```typescript
console.log(`[listMeetings] Discovered ${files.length} total docs`);
console.log(`[listMeetings] From folder search: ${folderCount}`);
console.log(`[listMeetings] From name search: ${searchCount}`);
console.log(`[listMeetings] Latest meeting date: ${latestDate}`);
console.log(`[listMeetings] Meetings in last 30 days: ${recentCount}`);
```

**In `extractAllActions()` after processing**:
```typescript
console.log(`[extractAllActions] Processed ${meetings.length} meetings`);
console.log(`[extractAllActions] Extracted ${allActions.length} total actions`);
const partnerCounts = {
  Lisa: allActions.filter(a => a.owner === 'Lisa').length,
  Tess: allActions.filter(a => a.owner === 'Tess').length,
  Christopher: allActions.filter(a => a.owner === 'Christopher').length,
  Norah: allActions.filter(a => a.owner === 'Norah').length,
};
console.log(`[extractAllActions] Partner counts:`, partnerCounts);
```

**In Today page loader after filtering**:
```typescript
console.log(`[Today/${normalizedPartner}] Total actions: ${allActions.length}`);
console.log(`[Today/${normalizedPartner}] After date filter: ${inWindow}`);
console.log(`[Today/${normalizedPartner}] After completions: ${myOpenActions.length}`);
```

---

## Proposed Fixes

### Fix 1: Dynamic Date Header ✅ READY

Replace static "Wednesday 9 September 2026" with:
```typescript
const today = new Date();
const formatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Edmonton'
});
const dateStr = formatter.format(today).replace(/,/g, '');
```

### Fix 2: Meeting Discovery Diagnostics ✅ READY

Add safe logging (no secrets, no full transcripts) to:
1. `listMeetings()` - meeting count, latest date, folder vs search breakdown
2. `extractAllActions()` - partner action counts
3. Today page loader - filtering stages

### Fix 3: Potential SA Access Issue ⚠️ CANNOT FIX

If SA doesn't have access to Oct 27/29 docs:
- Cannot grant permissions (requires manual Drive sharing)
- Cannot verify without production logs
- **Blocker**: Need production runtime evidence

---

## Test Coverage ✅ COMPLETE

All tests pass with actual Oct 8/9 source files:
- ✅ Plaintext format parsing (no checkboxes)
- ✅ Owner extraction ([Lisa], [Chris] → Christopher, [Norah Bird Hamilton])
- ✅ Multi-owner fanout ([Tess, Christopher Mair])
- ✅ Non-partner exclusion ([The group], [Interlocutor])
- ✅ Date filter calculation (2026-10-06 cutoff)
- ✅ Transcript leak prevention
- ✅ Section boundary detection

**Missing**: Cannot test Oct 27/29 discovery without runtime SA access

---

## Verification Plan

### After deploying diagnostics:

1. **Check production logs** for:
   ```
   [listMeetings] Discovered X total docs
   [listMeetings] Latest meeting date: YYYY-MM-DD
   [listMeetings] Meetings in last 30 days: X
   ```

2. **Verify SA access** to Oct 27/29:
   - If logs show < 4 meetings in last 30 days: SA cannot see Oct 27/29
   - If logs show >= 4 meetings: Extraction or filtering issue

3. **Check partner counts**:
   ```
   [extractAllActions] Partner counts: {Lisa: X, Tess: Y, ...}
   ```
   - Compare to expected: Lisa 7, Tess 6, Christopher 3, Norah 11

4. **Check Today filtering**:
   ```
   [Today/Lisa] Total actions: X
   [Today/Lisa] After date filter: Y
   [Today/Lisa] After completions: Z
   ```

---

## DO NOT MERGE Until:

1. ✅ Static date fix tested locally
2. ✅ Diagnostics added (no secrets exposed)
3. ⚠️ Production logs reviewed
4. ⚠️ SA access confirmed or blocked documented
5. ⚠️ Actual partner counts match expectations

**No speculative fixes**. Evidence-based only.
