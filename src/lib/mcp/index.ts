import { defineMcp } from "@lovable.dev/mcp-js";
import searchServicesTool from "./tools/search-services";
import getServiceTool from "./tools/get-service";
import listOpenProjectsTool from "./tools/list-open-projects";

export default defineMcp({
  name: "sarat-mcp",
  title: "Sarat MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Sarat freelance marketplace. Use `search_services` to find seller services, `get_service` for full details, and `list_open_projects` to see buyer projects open for proposals.",
  tools: [searchServicesTool, getServiceTool, listOpenProjectsTool],
});