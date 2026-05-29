import { Client, isFullBlock } from '@notionhq/client';
import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Clean a page ID or extract it from a full Notion URL
 */
export function cleanPageId(id: string): string {
  let cleaned = id.trim();
  if (cleaned.includes('notion.so/')) {
    const parts = cleaned.split('/');
    const lastPart = parts[parts.length - 1];
    const match = lastPart.match(/[a-f0-9]{32}/);
    if (match) {
      cleaned = match[0];
    } else {
      const alphanumeric = lastPart.replace(/[^a-f0-9]/gi, '');
      if (alphanumeric.length >= 32) {
        cleaned = alphanumeric.slice(-32);
      }
    }
  } else {
    cleaned = cleaned.replace(/-/g, '');
  }
  return cleaned;
}

/**
 * Get the default page ID from environment variables
 */
export function getDefaultPageId(): string | null {
  const rawPageId = process.env.NOTION_PAGE_ID;
  if (!rawPageId) return null;
  return cleanPageId(rawPageId);
}

/**
 * Get a Notion client instance
 */
export function getNotionClient(customApiKey?: string): Client {
  const apiKey = customApiKey || process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      'NOTION_API_KEY không tồn tại. Đảm bảo cấu hình trong file .env hoặc truyền vào tham số.'
    );
  }
  return new Client({ auth: apiKey });
}

/**
 * Fetch all blocks under a parent block recursively (paginated)
 */
export async function getBlocks(notion: Client, blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if (isFullBlock(result)) {
        blocks.push(result);
      }
    }

    if (!response.next_cursor) break;
    cursor = response.next_cursor;
  }

  return blocks;
}

/**
 * Fetch all child blocks of a parent block
 */
export async function getChildBlocks(
  notion: Client,
  blockId: string
): Promise<BlockObjectResponse[]> {
  return getBlocks(notion, blockId);
}

/**
 * Find a heading block that matches a query
 */
export async function findHeadingBlock(
  notion: Client,
  parentBlockId: string,
  headingTextQuery: string
): Promise<BlockObjectResponse | null> {
  const blocks = await getChildBlocks(notion, parentBlockId);
  const query = headingTextQuery.toLowerCase().trim();

  for (const block of blocks) {
    const type = block.type;
    const value = (block as any)[type];
    if (value && value.rich_text) {
      const text = value.rich_text
        .map((t: any) => t.plain_text)
        .join('')
        .toLowerCase();
      if (text.includes(query)) {
        return block;
      }
    }
  }
  return null;
}

/**
 * Convert Notion rich text array to simple markdown/text
 */
export function parseRichText(richTextArray: any[]): string {
  return richTextArray
    .map((t) => {
      let text = t.plain_text;
      if (t.annotations.bold) text = `**${text}**`;
      if (t.annotations.italic) text = `*${text}*`;
      if (t.annotations.code) text = `\`${text}\``;
      return text;
    })
    .join('');
}

/**
 * Recursively renders Notion blocks to Markdown format
 */
export async function renderBlocks(
  notion: Client,
  blocks: BlockObjectResponse[],
  indentLevel = 0
): Promise<string> {
  let output = '';
  const indent = '  '.repeat(indentLevel);

  for (const block of blocks) {
    const type = block.type;
    const value = (block as any)[type];

    let text = '';
    if (value && value.rich_text) {
      text = parseRichText(value.rich_text);
    }

    let blockStr = '';
    switch (type) {
      case 'paragraph':
        if (text) blockStr = `${indent}${text}\n\n`;
        break;
      case 'heading_1':
        blockStr = `${indent}# ${text}\n\n`;
        break;
      case 'heading_2':
        blockStr = `${indent}## ${text}\n\n`;
        break;
      case 'heading_3':
        blockStr = `${indent}### ${text}\n\n`;
        break;
      case 'bulleted_list_item':
        blockStr = `${indent}* ${text}\n`;
        break;
      case 'numbered_list_item':
        blockStr = `${indent}1. ${text}\n`;
        break;
      case 'to_do': {
        const checked = value.checked ? '[x]' : '[ ]';
        blockStr = `${indent}${checked} ${text}\n`;
        break;
      }
      case 'quote':
        blockStr = `${indent}> ${text}\n\n`;
        break;
      case 'code':
        blockStr = `${indent}\`\`\`${value.language || ''}\n${indent}${text}\n${indent}\`\`\`\n\n`;
        break;
      default:
        if (text) blockStr = `${indent}${text}\n\n`;
        break;
    }

    output += blockStr;

    if (block.has_children) {
      const children = await getBlocks(notion, block.id);
      output += await renderBlocks(notion, children, indentLevel + 1);
    }
  }
  return output;
}
