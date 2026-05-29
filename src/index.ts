import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isFullPage } from '@notionhq/client';
import {
  getNotionClient,
  getDefaultPageId,
  cleanPageId,
  getBlocks,
  getChildBlocks,
  findHeadingBlock,
  renderBlocks,
} from './utils/notion.js';
import { parseMarkdownToBlocks } from './utils/markdown.js';

// Initialize the MCP server
const server = new McpServer({
  name: 'notion-ai-mcp',
  version: '1.0.0',
});

/**
 * Tool: notion_test_connection
 * Verifies integration credentials and accesses a page.
 */
server.registerTool(
  'notion_test_connection',
  {
    description: 'Verify connection to a Notion page and validate integration API credentials',
    inputSchema: z.object({
      apiKey: z
        .string()
        .optional()
        .describe('Notion API Integration Token (defaults to NOTION_API_KEY env)'),
      pageId: z
        .string()
        .optional()
        .describe('Notion Page ID or full page URL (defaults to NOTION_PAGE_ID env)'),
    }),
  },
  async ({ apiKey, pageId }) => {
    try {
      const activeApiKey = apiKey || process.env.NOTION_API_KEY;
      if (!activeApiKey) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Lỗi: NOTION_API_KEY không tồn tại trong môi trường và không được cung cấp làm đối số.',
            },
          ],
        };
      }

      const activePageIdRaw = pageId || getDefaultPageId();
      if (!activePageIdRaw) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Lỗi: NOTION_PAGE_ID không tồn tại trong môi trường và không được cung cấp làm đối số.',
            },
          ],
        };
      }

      const activePageId = cleanPageId(activePageIdRaw);
      const notion = getNotionClient(activeApiKey);
      const page = await notion.pages.retrieve({ page_id: activePageId });

      let title = 'Không có tiêu đề';
      if (isFullPage(page)) {
        const titleProp = page.properties.title;
        if (titleProp && titleProp.type === 'title') {
          title = titleProp.title.map((t) => t.plain_text).join('');
        } else {
          const nameProp = Object.values(page.properties).find((p) => p.type === 'title');
          if (nameProp && nameProp.type === 'title') {
            title = nameProp.title.map((t) => t.plain_text).join('');
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: `✅ Kết nối tới Notion thành công!\n📄 Tiêu đề trang: "${title}"\n🔗 URL: ${page.url}\n🆔 Page ID đã dọn: ${activePageId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Kết nối thành công! (Nhận được thông tin trang tối giản, ID: ${activePageId})`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `❌ Kết nối thất bại: ${error.message}\n\nHướng khắc phục:\n1. Đảm bảo đã thêm kết nối (Connection) của Integration vào trang Notion.\n2. Kiểm tra tính chính xác của Token và Page ID.`,
          },
        ],
      };
    }
  }
);

/**
 * Tool: notion_get_page_content
 * Reads recursive blocks of a page and formats them to Markdown.
 */
server.registerTool(
  'notion_get_page_content',
  {
    description: 'Retrieve all blocks and content on a Notion page, formatted as Markdown',
    inputSchema: z.object({
      apiKey: z.string().optional().describe('Notion API Integration Token (optional)'),
      pageId: z.string().optional().describe('Notion Page ID or full URL (optional)'),
    }),
  },
  async ({ apiKey, pageId }) => {
    try {
      const activeApiKey = apiKey || process.env.NOTION_API_KEY;
      const activePageIdRaw = pageId || getDefaultPageId();
      if (!activeApiKey || !activePageIdRaw) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Lỗi: Thiếu NOTION_API_KEY hoặc NOTION_PAGE_ID.' }],
        };
      }

      const activePageId = cleanPageId(activePageIdRaw);
      const notion = getNotionClient(activeApiKey);
      const blocks = await getBlocks(notion, activePageId);
      const markdown = await renderBlocks(notion, blocks);

      return {
        content: [
          {
            type: 'text',
            text: markdown || '_Trang này hiện không chứa khối nội dung nào._',
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `❌ Lỗi khi đọc nội dung trang: ${error.message}` }],
      };
    }
  }
);

/**
 * Tool: notion_update_section
 * Overwrites contents below a specific heading on a page.
 */
server.registerTool(
  'notion_update_section',
  {
    description:
      'Search for a heading on a Notion page, delete all existing blocks inside this section, and write new Markdown content in its place',
    inputSchema: z.object({
      headerQuery: z
        .string()
        .describe(
          'Text query to find the section heading (e.g. "Câu 1" or "Mục lục"). Matches case-insensitively.'
        ),
      markdownContent: z
        .string()
        .describe('The new content to write under the heading in Markdown format'),
      apiKey: z.string().optional().describe('Notion API Integration Token (optional)'),
      pageId: z.string().optional().describe('Notion Page ID or URL (optional)'),
    }),
  },
  async ({ headerQuery, markdownContent, apiKey, pageId }) => {
    try {
      const activeApiKey = apiKey || process.env.NOTION_API_KEY;
      const activePageIdRaw = pageId || getDefaultPageId();
      if (!activeApiKey || !activePageIdRaw) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Lỗi: Thiếu NOTION_API_KEY hoặc NOTION_PAGE_ID.' }],
        };
      }

      const activePageId = cleanPageId(activePageIdRaw);
      const notion = getNotionClient(activeApiKey);

      const headingBlock = await findHeadingBlock(notion, activePageId, headerQuery);
      if (!headingBlock) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `❌ Không tìm thấy tiêu đề nào chứa cụm từ: "${headerQuery}" trên trang.`,
            },
          ],
        };
      }

      const blockTitle = (headingBlock as any)[headingBlock.type].rich_text
        .map((t: any) => t.plain_text)
        .join('');

      // Fetch and delete old content
      const children = await getChildBlocks(notion, headingBlock.id);
      for (const child of children) {
        await notion.blocks.delete({ block_id: child.id });
      }

      // Convert and append new content
      const newBlocks = parseMarkdownToBlocks(markdownContent);
      const chunkSize = 100;
      for (let i = 0; i < newBlocks.length; i += chunkSize) {
        const chunk = newBlocks.slice(i, i + chunkSize);
        await notion.blocks.children.append({
          block_id: headingBlock.id,
          children: chunk,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Thành công! Đã xóa ${children.length} khối cũ và ghi ${newBlocks.length} khối nội dung mới vào phần "${blockTitle}".`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `❌ Lỗi khi ghi đè phần nội dung: ${error.message}` }],
      };
    }
  }
);

/**
 * Tool: notion_append_content
 * Appends Markdown blocks to the end of a page.
 */
server.registerTool(
  'notion_append_content',
  {
    description: 'Append Markdown content to the end of a Notion page',
    inputSchema: z.object({
      markdownContent: z.string().describe('The Markdown content to append to the page'),
      apiKey: z.string().optional().describe('Notion API Integration Token (optional)'),
      pageId: z.string().optional().describe('Notion Page ID or URL (optional)'),
    }),
  },
  async ({ markdownContent, apiKey, pageId }) => {
    try {
      const activeApiKey = apiKey || process.env.NOTION_API_KEY;
      const activePageIdRaw = pageId || getDefaultPageId();
      if (!activeApiKey || !activePageIdRaw) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Lỗi: Thiếu NOTION_API_KEY hoặc NOTION_PAGE_ID.' }],
        };
      }

      const activePageId = cleanPageId(activePageIdRaw);
      const notion = getNotionClient(activeApiKey);

      const newBlocks = parseMarkdownToBlocks(markdownContent);
      const chunkSize = 100;
      for (let i = 0; i < newBlocks.length; i += chunkSize) {
        const chunk = newBlocks.slice(i, i + chunkSize);
        await notion.blocks.children.append({
          block_id: activePageId,
          children: chunk,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Thành công! Đã thêm ${newBlocks.length} khối nội dung mới vào cuối trang.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `❌ Lỗi khi thêm nội dung: ${error.message}` }],
      };
    }
  }
);

/**
 * Tool: notion_search
 * Search for pages or databases in the workspace.
 */
server.registerTool(
  'notion_search',
  {
    description: 'Search for pages and databases in the Notion workspace by title or keyword',
    inputSchema: z.object({
      query: z.string().describe('The title or keyword to search for'),
      apiKey: z.string().optional().describe('Notion API Integration Token (optional)'),
    }),
  },
  async ({ query, apiKey }) => {
    try {
      const activeApiKey = apiKey || process.env.NOTION_API_KEY;
      if (!activeApiKey) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Lỗi: Thiếu NOTION_API_KEY.' }],
        };
      }

      const notion = getNotionClient(activeApiKey);
      const response = await notion.search({
        query: query,
        page_size: 20,
      });

      const results = response.results.map((item: any) => {
        let title = 'Untitled';
        if (item.object === 'page') {
          if (item.properties && item.properties.title && item.properties.title.title) {
            title = item.properties.title.title.map((t: any) => t.plain_text).join('');
          } else {
            const nameProp = Object.values(item.properties).find((p: any) => p.type === 'title');
            if (nameProp && (nameProp as any).title) {
              title = (nameProp as any).title.map((t: any) => t.plain_text).join('');
            }
          }
        } else if (item.object === 'database') {
          if (item.title) {
            title = item.title.map((t: any) => t.plain_text).join('');
          }
        }

        return `- **[${item.object === 'database' ? '📁 Database' : '📄 Page'}] ${title}**\n  ID: \`${item.id}\`\n  URL: ${item.url || 'N/A'}`;
      });

      const markdown = results.length > 0 
        ? `🔍 Kết quả tìm kiếm cho: "${query}":\n\n${results.join('\n\n')}`
        : `🔍 Không tìm thấy trang hoặc database nào khớp với cụm từ: "${query}".`;

      return {
        content: [{ type: 'text', text: markdown }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `❌ Lỗi khi tìm kiếm: ${error.message}` }],
      };
    }
  }
);

/**
 * Tool: notion_create_page
 * Create a new page under a parent page or database with optional initial content.
 */
server.registerTool(
  'notion_create_page',
  {
    description: 'Create a new page under a parent page or database with optional content',
    inputSchema: z.object({
      title: z.string().describe('Title of the new page'),
      parentId: z.string().optional().describe('Notion Page ID or Database ID to create the page under (defaults to NOTION_PAGE_ID env)'),
      parentType: z.enum(['page', 'database']).optional().default('page').describe('Whether the parent is a page or database'),
      markdownContent: z.string().optional().describe('Optional initial Markdown content of the new page'),
      apiKey: z.string().optional().describe('Notion API Integration Token (optional)'),
    }),
  },
  async ({ title, parentId, parentType, markdownContent, apiKey }) => {
    try {
      const activeApiKey = apiKey || process.env.NOTION_API_KEY;
      const activeParentIdRaw = parentId || getDefaultPageId();
      if (!activeApiKey || !activeParentIdRaw) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Lỗi: Thiếu NOTION_API_KEY hoặc parentId.' }],
        };
      }

      const activeParentId = cleanPageId(activeParentIdRaw);
      const notion = getNotionClient(activeApiKey);

      const parentParam = parentType === 'database' 
        ? { database_id: activeParentId }
        : { page_id: activeParentId };

      const properties: any = {};
      if (parentType === 'database') {
        properties['Name'] = {
          title: [{ type: 'text', text: { content: title } }]
        };
      } else {
        properties['title'] = {
          title: [{ type: 'text', text: { content: title } }]
        };
      }

      const children = markdownContent ? parseMarkdownToBlocks(markdownContent) : undefined;

      let page;
      try {
        page = await notion.pages.create({
          parent: parentParam,
          properties: properties,
          children: children,
        });
      } catch (error: any) {
        if (parentType === 'database' && error.message.includes('properties')) {
          properties['title'] = {
            title: [{ type: 'text', text: { content: title } }]
          };
          delete properties['Name'];
          page = await notion.pages.create({
            parent: parentParam,
            properties: properties,
            children: children,
          });
        } else {
          throw error;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Tạo trang thành công!\n📄 Tiêu đề: "${title}"\n🆔 ID trang mới: ${page.id}\n🔗 URL: ${(page as any).url || 'N/A'}`
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `❌ Lỗi khi tạo trang: ${error.message}` }],
      };
    }
  }
);

// Connect using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log message to stderr since stdout is reserved for MCP JSON-RPC protocol messages
  console.error('🚀 Notion AI MCP Server is running on stdio!');
}

run().catch((error) => {
  console.error('Fatal error running Notion AI MCP Server:', error);
  process.exit(1);
});
