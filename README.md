# Agent Debug
Pluggable langraph studio like debugger as a npm package.

# Installation
```bash
npm install agent-debug
```

# Usage
```node
import { debug } from 'agent-debug';

import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// define langgraph agent
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

const callModel = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("llm_node", callModel)
  .addEdge(START, "llm_node")
  .addEdge("llm_node", END);

const agent = workflow.compile();

// spin-up agent debug server on port 3001 ( port 8888 by default )
debug(agent, 3001)
```

# UI
![UI](./screenshot.png)

# Local development
```bash 
git clone --recursive git@github.com:sebps/agent-debug-workspace.git
```