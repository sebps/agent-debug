import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function debug(compiledGraph, port = 8888) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/graph', (req, res) => {
    const graph = compiledGraph.getGraph();

    // Correctly handling nodes as an object to map for the UI
    const nodesArray = Object.entries(graph.nodes).map(([id, value]) => ({
      id,
      ...value
    }));
    
    res.json({ 
      nodes: nodesArray, 
      edges: graph.edges 
    });
  });

  app.post('/chat', async (req, res) => {
    const { input } = req.body;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Initialize stream with the user input
      const stream = await compiledGraph.stream(
        { messages: [{ role: "user", content: input }] },
        { streamMode: "updates" }
      );

      for await (const chunk of stream) {
        // chunk is an object where keys are node names: { thinker: { messages: [...] } }
        const nodeName = Object.keys(chunk)[0];
        const nodeOutput = chunk[nodeName];
        
        let cleanContent = "";

        // Extract the content from the last message in the node's output
        if (nodeOutput.messages && nodeOutput.messages.length > 0) {
          const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
          
          // Handle LangChain message objects or raw strings
          cleanContent = lastMsg.content || 
                         (lastMsg.kwargs && lastMsg.kwargs.content) || 
                         "Processing...";
        }

        // Send the formatted data back to the frontend
        res.write(`data: ${JSON.stringify({ [nodeName]: cleanContent })}\n\n`);
      }

      // Signal completion
      res.write("data: done\n\n");
    } catch (error) {
      console.error("Streaming error:", error);
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
    } finally {
      res.end();
    }
  });

  // CENTRALIZED UI SERVING
  const uiPath = path.resolve(__dirname, '../dist/ui');
  
  app.use(express.static(uiPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });

  app.listen(port, () => {
    console.log(`🚀 Unified Debugger: http://localhost:${port}`);
  });
}

export default { debug };