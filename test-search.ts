/**
 * Test script to verify the search fix works
 * Run with: tsx test-search.ts
 */

async function testSearch(query: string, deployUrl: string) {
  console.log(`\n=== Testing query: "${query}" ===\n`);
  
  try {
    // Call the answerQuestion server function
    const response = await fetch(`${deployUrl}/_serverFn/e33f0dfe067e00dd99ef7698566291bf36a9b9d3e75b5ce536ff8afbe53c7923`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          question: query,
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    
    console.log('ANSWER:');
    console.log(result.answer || result.data?.answer || 'No answer');
    console.log('\nCONFIDENCE:', result.confidence || result.data?.confidence || 'unknown');
    console.log('\nSOURCES:', result.sources?.length || result.data?.sources?.length || 0);
    
    if (result.sources || result.data?.sources) {
      const sources = result.sources || result.data?.sources;
      sources.forEach((s: any, i: number) => {
        console.log(`\nSource ${i + 1}:`);
        console.log(`  Document: ${s.documentTitle}`);
        console.log(`  Date: ${s.meetingDate}`);
        console.log(`  Excerpt: ${s.excerpt?.substring(0, 150)}...`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  }
}

const PREVIEW_URL = 'https://unearthself-ag69p8530-christopher-mairs-projects-3b5c1820.vercel.app';

async function main() {
  console.log('Testing preview deploy:', PREVIEW_URL);
  
  // Test 1: The headquarters query that was failing
  await testSearch(
    'what was the agreed name for the headquarters and when was it first agreed or discussed?',
    PREVIEW_URL
  );
  
  // Test 2: An Oct query to verify Sep/Oct results work
  await testSearch(
    'what was discussed in October about the building',
    PREVIEW_URL
  );
  
  console.log('\n=== Tests complete ===\n');
}

main().catch(console.error);
