import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const API_BASE = "https://www.findrepo.work";
// Create server instance
const server = new McpServer({
    name: "findrepo",
    version: "1.0.0",
});
// Register tools
server.tool("get-today-trends", "Get today's github trends", {}, async () => {
    let url = `${API_BASE}/api/get-today-trends`;
    try {
        const response = await fetch(url);
        const body = await response.json();
        const list = body?.data || [];
        return {
            content: [
                {
                    type: "text",
                    text: list.map((item) => `${item.repo_name}: ${item.repo_url}`).join("\n"),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: "Failed to retrieve trends data" }],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Findrepo MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
