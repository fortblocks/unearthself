import { answerQuestion } from "./src/lib/minutes-archive";

async function test() {
  console.log("Testing search for spa headquarters naming decision...\n");
  
  const startTime = Date.now();
  const result = await answerQuestion({ 
    data: { question: "what was decided name for spa headquarters" } 
  });
  const duration = Date.now() - startTime;
  
  console.log(`Duration: ${duration}ms`);
  console.log(`Result:`, JSON.stringify(result, null, 2));
  
  if ("error" in result) {
    console.error("\n❌ Search failed with error:", result.error);
    process.exit(1);
  }
  
  if (result.notFound) {
    console.error("\n❌ AI returned notFound");
    process.exit(1);
  }
  
  const answerText = result.answer.toLowerCase();
  if (answerText.includes("basecamp")) {
    console.log("\n✅ SUCCESS: Answer mentions 'Basecamp'");
  } else {
    console.error("\n❌ FAIL: Answer does not mention 'Basecamp'");
    console.error("Answer text:", result.answer);
    process.exit(1);
  }
  
  if (duration > 8000) {
    console.warn(`\n⚠️  Warning: Duration ${duration}ms exceeds 8s target`);
  } else {
    console.log(`✅ Duration ${duration}ms is within 8s target`);
  }
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
