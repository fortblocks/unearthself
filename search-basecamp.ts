import { google } from "googleapis";

async function getGoogleDriveClient() {
  const keyJson = process.env.GOOGLE_SA_KEY;
  if (!keyJson) {
    throw new Error("GOOGLE_SA_KEY not found");
  }
  
  const key = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  
  const drive = google.drive({ version: "v3", auth });
  return drive;
}

async function searchBasecampInDocs() {
  console.log("Searching for 'Basecamp' in meeting documents...\n");
  
  const drive = await getGoogleDriveClient();
  
  // Search for docs containing "Basecamp" in the two folders
  const folders = [
    "1xehL5chPhYNNqtXm5jTIu7bOVV77fpXL",  // subfolder (after Aug 25)
    "1C5aG-ilfEtzjJowXEFZCzyNLE4OulL54"   // parent folder
  ];
  
  const allResults: Array<{ id: string; name: string; createdTime: string }> = [];
  
  for (const folderId of folders) {
    console.log(`Searching in folder ${folderId}...`);
    
    const query = `mimeType='application/vnd.google-apps.document' and '${folderId}' in parents and trashed=false and fullText contains 'Basecamp'`;
    
    const response = await drive.files.list({
      q: query,
      fields: "files(id, name, createdTime)",
      pageSize: 100,
    });
    
    const files = response.data.files || [];
    console.log(`Found ${files.length} docs mentioning Basecamp in folder ${folderId}`);
    
    for (const file of files) {
      if (file.id && file.name) {
        allResults.push({
          id: file.id,
          name: file.name,
          createdTime: file.createdTime || "",
        });
      }
    }
  }
  
  if (allResults.length === 0) {
    console.log("\n❌ No documents found containing 'Basecamp'");
    return;
  }
  
  console.log(`\n✅ Found ${allResults.length} total documents mentioning 'Basecamp':\n`);
  
  // Export and search each doc for Basecamp mentions
  for (const file of allResults) {
    console.log(`\n=== ${file.name} (${file.createdTime.split('T')[0]}) ===`);
    console.log(`Doc ID: ${file.id}`);
    
    try {
      const exportResponse = await drive.files.export(
        { fileId: file.id, mimeType: "text/plain" },
        { responseType: "text" }
      );
      
      const fullText = String(exportResponse.data);
      
      // Find lines mentioning Basecamp
      const lines = fullText.split('\n');
      const basecampLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes('basecamp')) {
          // Include context: previous and next 2 lines
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length - 1, i + 2);
          const context = lines.slice(start, end + 1).join('\n');
          basecampLines.push(`Line ${i + 1}:\n${context}\n`);
        }
      }
      
      if (basecampLines.length > 0) {
        console.log(`\nFound ${basecampLines.length} Basecamp mentions:`);
        basecampLines.forEach((mention, idx) => {
          console.log(`\n--- Mention ${idx + 1} ---`);
          console.log(mention);
        });
      } else {
        console.log("(fullText search found it, but text export doesn't contain 'Basecamp' - may be in a different tab)");
      }
      
      // Also search for spa/headquarters context
      const spaContext: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if ((lower.includes('spa') || lower.includes('headquarters') || lower.includes('hq')) && 
            (lower.includes('name') || lower.includes('call') || lower.includes('basecamp'))) {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length - 1, i + 2);
          const context = lines.slice(start, end + 1).join('\n');
          spaContext.push(`Line ${i + 1}:\n${context}\n`);
        }
      }
      
      if (spaContext.length > 0) {
        console.log(`\nSpa/headquarters naming context (${spaContext.length} mentions):`);
        spaContext.slice(0, 3).forEach((mention, idx) => {
          console.log(`\n--- Context ${idx + 1} ---`);
          console.log(mention);
        });
      }
      
    } catch (error) {
      console.error(`Failed to export ${file.id}:`, error);
    }
  }
}

searchBasecampInDocs().catch(err => {
  console.error("Search failed:", err);
  process.exit(1);
});
