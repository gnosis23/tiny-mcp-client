# Tiny Mcp Client

This is a client implementation based on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), 
which rewrites the original [example](https://modelcontextprotocol.io/quickstart/client) from Anthropic SDK to OpenAI SDK.

## Features

- Uses OpenAI API instead of Anthropic API
- Fully compatible with MCP protocol
- Supports real-time communication with MCP server
- Simple and easy-to-use interface

## Requirements

- Node.js 16.x or higher
- pnpm package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tiny-mcp-client
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm run build
```

## Configuration

1. Create a `.env` file in the project root:
```bash
echo "OPENAI_API_KEY=<your-key>" > .env
```

2. Replace `<your-key>` with your OpenAI API key

## Usage

Run the client:
```bash
node build/index.js <path-to-mcp-server>
```

Where `<path-to-mcp-server>` is the address of your MCP server.

## Contributing

Pull Requests and Issues are welcome!

## License

MIT License
