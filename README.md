# Shopper Agent

A LangChain-powered shopping assistant that can help users find products, add them to cart, and complete purchases.

## Features

- Product search functionality
- Shopping cart management
- Payment processing
- Web search integration via Tavily

## Prerequisites

- Node.js v20+
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your OpenAI API key:

```bash
OPENAI_API_KEY=<your_openai_api_key>
```

## Running the Agent

Start the agent with:

```bash
 npx @langchain/langgraph-cli dev  
```
for more information see [LangGraph](https://langchain-ai.github.io/langgraph/cloud/reference/cli)

## Usage
It runs as an agent in Langraph Cloud

## Tools Available

The agent comes with four main tools:
- Product Search: Find products in the store
- Add to Cart: Add items to shopping cart
- Pay Cart: Process payment for cart items
- Web Search: Search the web using Tavily API

## Test modules
```bash
 npm run test:openapi
```

## API Reference

The agent is exposed via LangGraph API. Configuration can be found in `langgraph.json`.

## License

MIT License - See LICENSE file for details