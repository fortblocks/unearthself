#!/usr/bin/env node
import { searchAndAnswer } from "./src/lib/minutes-archive";

async function test() {
  console.log("Testing Basecamp search fix...\n");
  console.log("Query: 'what was decided name for spa headquarters'\n");
  
  const startTime = Date.now();
  const result = await searchAndAnswer("what was decided name for spa headquarters");
  const duration = Date.now() - startTime;
  
  console.log(`\n=== RESULT (${duration}ms) ===\n`);
  console.log(JSON.stringify(result, null, 2));
  
  if ("error" in result) {
    console.error("\n❌ Search failed with error:", result.error);
    process.exit(1);
  }
  
  const answerLower = result.answer.toLowerCase();
  
  // Check for Basecamp mention
  if (answerLower.includes("basecamp") || answerLower.includes("base camp")) {
    console.log("\n✅ SUCCESS: Answer mentions 'Basecamp'");
  } else {
    console.error("\n❌ FAIL: Answer does not mention 'Basecamp'");
    console.error("Answer:", result.answer);
  }
  
  // Check confidence
  if (result.notFound && result.confidence === "high") {
    console.error("\n❌ FAIL: Has notFound=true with confidence=high (should never happen)");
    process.exit(1);
  }
  
  // Check timing
  if (duration > 8000) {
    console.warn(`\n⚠️  Warning: Duration ${duration}ms exceeds 8s target`);
  } else {
    console.log(`✅ Duration ${duration}ms is within 8s target`);
  }
  
  // Show sources
  console.log(`\n📄 Sources (${result.sources.length}):`);
  result.sources.forEach((src, i) => {
    console.log(`  ${i + 1}. ${src.title} - ${src.date}`);
  });
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
