import { createFileRoute } from "@tanstack/react-router";
import { debugSearchBasecamp } from "@/lib/minutes-archive";

export const Route = createFileRoute("/debug-basecamp")({
  component: DebugBasecampPage,
  loader: async () => {
    const result = await debugSearchBasecamp();
    return { result };
  },
});

function DebugBasecampPage() {
  const { result } = Route.useLoaderData();
  
  if ("error" in result) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Basecamp Search - Error</h1>
        <pre className="bg-red-50 p-4 rounded">{result.error}</pre>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Basecamp Search Results</h1>
      <p className="mb-4">Found {result.count} documents mentioning "Basecamp"</p>
      
      {result.results.map((doc, idx) => (
        <div key={idx} className="mb-8 p-4 border rounded">
          <h2 className="text-xl font-semibold">{doc.name}</h2>
          <p className="text-sm text-gray-600 mb-2">
            ID: {doc.id} | Created: {doc.createdTime.split('T')[0]}
          </p>
          <p className="font-medium mb-2">{doc.mentions.length} mentions found:</p>
          {doc.mentions.map((mention, mIdx) => (
            <pre key={mIdx} className="bg-gray-50 p-3 rounded mb-2 text-sm whitespace-pre-wrap">
              {mention}
            </pre>
          ))}
        </div>
      ))}
    </div>
  );
}
