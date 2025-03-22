import { OpenAI } from "openai";
import type { ChatCompletionTool, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_MODEL = "google/gemini-2.0-flash-001";

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

class MCPClient {
  private mcp: Client;
  private openai: OpenAI;
  private transport: StdioClientTransport | null = null;
  private tools: ChatCompletionTool[] = [];

  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENAI_API_KEY,
    });
    this.mcp = new Client({ name: "tiny-mcp-client", version: "1.0.0" });
  }

  // methods will go here
  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;

      // Client transport for stdio: this will connect to a server by `spawning` 
      // a process and communicating with it over stdin/stdout.
      // This transport is only available in Node.js environments.
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      // Attaches to the given transport, starts it, and starts listening for messages.
      this.mcp.connect(this.transport);

      // client 1:1 server
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }));
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ function: { name } }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    const response = await this.openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      tools: this.tools,
      max_tokens: 5000,
    });

    const finalText: string[] = [];
    const toolResults: any[] = [];

    for (const choice of response.choices) {
      const message = choice.message;

      if (message.content) {
        finalText.push(message.content);
      }

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          const result = await this.mcp.callTool({
            name: toolName,
            arguments: toolArgs,
          });
          toolResults.push(result);
          finalText.push(
            `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
          );

          messages.push({
            role: "assistant",
            content: result.content as string,
          });

          const followUpResponse = await this.openai.chat.completions.create({
            model: CHAT_MODEL,
            messages,
            max_tokens: 5000,
          });

          if (followUpResponse.choices[0].message.content) {
            finalText.push(followUpResponse.choices[0].message.content);
          }
        }
      }
    }

    return finalText.join("\n");
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node index.ts <path_to_server_script>");
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
