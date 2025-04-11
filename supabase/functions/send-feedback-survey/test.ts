// This is a simple test script to test the send-feedback-survey function
// Run using the Deno CLI: deno run --allow-env --allow-net test.ts

// Import fetch API if needed (for Deno versions before 1.9)
// import { fetch } from "https://deno.land/x/fetch/mod.ts";

// Configuration
const LOCAL_URL = "http://localhost:54321/functions/v1/send-feedback-survey";
const TEST_PHONE = "+916239521161"; // From the .env file
const SUPABASE_URL = "https://lnnfolrzonnnuazlhvwo.supabase.co";

// Get authorization token from command line argument or environment
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || 
  Deno.args[0] || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubmZvbHJ6b25ubnVhemxodndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMDExOTksImV4cCI6MjA1MTc3NzE5OX0.FvWYjm3g_3LRMePQum8CqYapsqju4fADK3AXpa-uCsc";

console.log("Testing the send-feedback-survey function...");
console.log(`Sending to: ${TEST_PHONE}`);

// Send request to the function
async function testFunction() {
  try {
    const response = await fetch(LOCAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        phone: TEST_PHONE,
        businessName: "PKEP Test Store",
        location: "Local Test",
        visitDate: new Date().toLocaleDateString(),
        surveyLink: "https://example.com/test-feedback",
      }),
    });

    // Get the response
    const result = await response.json();
    
    // Show the response
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log("✅ Test completed successfully!");
    } else {
      console.error("❌ Test failed!");
    }
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run the test
testFunction(); 