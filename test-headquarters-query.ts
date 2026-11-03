/**
 * End-to-end test script for headquarters query
 * 
 * Prerequisites:
 * 1. Run `vercel env pull .env.local` to get environment variables
 * 2. Install dependencies: `npm install`
 * 3. Run: `npx tsx test-headquarters-query.ts`
 */

import { answerQuestion } from './src/lib/minutes-archive';

async function test() {
  console.log('\n=== Testing Headquarters Query ===\n');
  
  const queries = [
    'what was the name for the headquarters and when was it first agreed or discussed?',
    'what was discussed in October 2026?'
  ];
  
  for (const question of queries) {
    console.log(`\nQuery: "${question}"\n`);
    
    const result = await answerQuestion({ data: { question } });
    
    console.log('Answer:', result.answer);
    console.log('\nConfidence:', result.confidence);
    console.log('Not Found:', result.notFound || false);
    console.log('\nSources:', result.sources.length);
    result.sources.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.documentTitle} (${s.meetingDate})`);
    });
    
    console.log('\nMatched Meetings:', result.matchedMeetings?.length || 0);
    if (result.matchedMeetings && result.matchedMeetings.length > 0) {
      console.log('First 10 matched meetings:');
      result.matchedMeetings.slice(0, 10).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.title} (${m.date})`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  console.log('\n✅ Test complete\n');
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
