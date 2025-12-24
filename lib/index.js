import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function debug(compiledGraph, port = 8888) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/graph', (req, res) => {
    const graph = compiledGraph.getGraph();

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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await compiledGraph.stream(
        { messages: [{ role: "user", content: input }] },
        { streamMode: "updates" }
      );

      for await (const chunk of stream) {
        const nodeName = Object.keys(chunk)[0];
        const nodeOutput = chunk[nodeName];
        
        let cleanContent = "";

        if (nodeOutput.messages && nodeOutput.messages.length > 0) {
          const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
          cleanContent = lastMsg.content || 
                         (lastMsg.kwargs && lastMsg.kwargs.content) || 
                         "Processing...";
        }

        res.write(`data: ${JSON.stringify({ [nodeName]: cleanContent })}\n\n`);
      }

      res.write("data: done\n\n");
    } catch (error) {
      console.error("Streaming error:", error);
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
    } finally {
      res.end();
    }
  });

  const uiPath = path.resolve(__dirname, '../dist/ui');
  
  app.use(express.static(uiPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });

  app.listen(port, () => {
    console.log(`🚀 Unified Debugger: http://localhost:${port}`);
  });
}