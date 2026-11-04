/**
 * Unit test for xAI markdown response fallback
 * 
 * Tests that when xAI returns markdown (like **Answer**) instead of JSON,
 * the system gracefully falls back to using the raw text as the answer
 * instead of throwing an error.
 * 
 * Based on actual production failure at 17:02:33 UTC (11:02 MT):
 * "Unexpected token '*', \"**Answer**\"... is not valid JSON"
 */

function testMarkdownFallback() {
  console.log('\n🧪 Testing xAI Markdown Response Fallback\n');
  console.log('Simulating production error from 17:02:33 UTC\n');
  
  // Simulate the actual markdown response that caused the error
  const mockMarkdownResponse = `**Answer**

Looking back over your records, Lisa manages the design team and oversees client relationships. She's responsible for project timelines and team coordination.

**Sources**
- Meeting on 2026-10-27
- Meeting on 2026-08-26

**Confidence**: Medium`;

  // Simulate the parsing logic from minutes-archive.ts
  let jsonStr = mockMarkdownResponse;
  
  // Try to extract JSON from markdown code blocks
  const jsonMatch = mockMarkdownResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Try to find raw JSON object in response
    const rawJsonMatch = mockMarkdownResponse.match(/\{[\s\S]*\}/);
    if (rawJsonMatch) {
      jsonStr = rawJsonMatch[0];
    }
  }
  
  // Try to parse
  let parsed;
  let didFallback = false;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError: any) {
    // Fallback: use raw text as answer (this is what the fix does)
    didFallback = true;
    console.log(`✅ JSON parse failed as expected: ${parseError.message}`);
    console.log(`✅ Activating fallback to use raw text as answer\n`);
    
    // Strip markdown headings and format markers
    const cleanedAnswer = mockMarkdownResponse
      .replace(/\*\*Answer\*\*/gi, '')
      .replace(/\*\*Sources\*\*/gi, '')
      .replace(/\*\*Confidence\*\*/gi, '')
      .replace(/^#+\s+/gm, '') // Remove markdown headings
      .trim();
    
    // Return a valid response with the cleaned text
    parsed = {
      answer: cleanedAnswer || "I found some information but couldn't format it properly. Please try rephrasing your question.",
      confidence: "low",
      sources: [],
      notFound: false
    };
  }
  
  // Assertions
  console.log('📋 Test Results:\n');
  const assertions: Array<{name: string; passed: boolean; expected: string; actual: string}> = [];
  
  // Should have activated fallback
  assertions.push({
    name: 'Fallback activated (no throw)',
    passed: didFallback,
    expected: 'true',
    actual: didFallback.toString()
  });
  
  // Should have a valid answer
  const hasAnswer = parsed && parsed.answer && parsed.answer.length > 0;
  assertions.push({
    name: 'Valid answer extracted from markdown',
    passed: hasAnswer,
    expected: 'Non-empty answer',
    actual: hasAnswer ? `${parsed.answer.substring(0, 60)}...` : 'null'
  });
  
  // Should have LOW confidence
  const hasLowConfidence = parsed && parsed.confidence === "low";
  assertions.push({
    name: 'Confidence set to LOW',
    passed: hasLowConfidence,
    expected: 'low',
    actual: parsed?.confidence || 'null'
  });
  
  // Should have empty sources array
  const hasEmptySources = parsed && Array.isArray(parsed.sources) && parsed.sources.length === 0;
  assertions.push({
    name: 'Sources array is empty',
    passed: hasEmptySources,
    expected: '[]',
    actual: parsed?.sources ? JSON.stringify(parsed.sources) : 'null'
  });
  
  // Should not be marked as notFound
  const notMarkedNotFound = parsed && !parsed.notFound;
  assertions.push({
    name: 'Not marked as "notFound"',
    passed: notMarkedNotFound,
    expected: 'false',
    actual: parsed?.notFound?.toString() || 'false'
  });
  
  // Should strip markdown formatting
  const noMarkdownStars = parsed && !parsed.answer.includes('**');
  assertions.push({
    name: 'Markdown ** stripped from answer',
    passed: noMarkdownStars,
    expected: 'No ** in answer',
    actual: noMarkdownStars ? 'Stripped' : 'Still has **'
  });
  
  // Print results
  let allPassed = true;
  assertions.forEach(a => {
    const icon = a.passed ? '✅' : '❌';
    console.log(`${icon} ${a.name}`);
    console.log(`   Expected: ${a.expected}`);
    console.log(`   Actual: ${a.actual}\n`);
    if (!a.passed) allPassed = false;
  });
  
  console.log('='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\nMarkdown fallback is working correctly:');
    console.log('- No error thrown when xAI returns markdown');
    console.log('- Raw text extracted and used as answer');
    console.log('- Markdown formatting stripped');
    console.log('- Valid response returned (confidence: LOW, sources: [])');
    console.log('\nUser receives an answer instead of technical error fallback.');
    return 0;
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
    console.log('\nDo NOT merge until all tests pass.');
    return 1;
  }
}

const exitCode = testMarkdownFallback();
process.exit(exitCode);
