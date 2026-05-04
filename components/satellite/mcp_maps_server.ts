// 文件路径: components/satellite/mcp_maps_server.ts
// MCP 地图服务端 — 暴露 view_location 和 directions 工具给 AI 模型

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';

export interface MapParams {
  location?: string;
  origin?: string;
  destination?: string;
}

export async function startMcpGoogleMapServer(
  transport: Transport,
  mapQueryHandler: (params: MapParams) => void,
) {
  const server = new McpServer({
    name: 'MOKE Satellite Link',
    version: '1.0.0',
  });

  server.tool(
    'view_location_google_maps',
    '查看并显示指定的地理位置',
    { query: z.string() },
    async ({ query }) => {
      mapQueryHandler({ location: query });
      return {
        content: [{ type: 'text' as const, text: `导航到: ${query}` }],
      };
    },
  );

  server.tool(
    'directions_on_google_maps',
    '搜索从起点到终点的路线',
    { origin: z.string(), destination: z.string() },
    async ({ origin, destination }) => {
      mapQueryHandler({ origin, destination });
      return {
        content: [
          { type: 'text' as const, text: `从 ${origin} 导航到 ${destination}` },
        ],
      };
    },
  );

  await server.connect(transport);
  console.log('[MOKE Satellite] MCP 服务已启动');
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
