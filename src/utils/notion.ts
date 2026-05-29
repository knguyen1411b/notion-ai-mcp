import { Client, isFullBlock } from '@notionhq/client';
import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.NOTION_API_KEY;
const rawPageId = process.env.NOTION_PAGE_ID;

if (!apiKey || !apiKey.startsWith('ntn_')) {
  console.error(
    '❌ Lỗi: NOTION_API_KEY chưa được cấu hình đúng trong file .env (phải bắt đầu bằng ntn_)'
  );
  process.exit(1);
}

if (!rawPageId) {
  console.error('❌ Lỗi: NOTION_PAGE_ID chưa được cấu hình trong file .env');
  process.exit(1);
}

// Clean page ID (remove hyphens or extract from URL if user pasted a full URL)
let cleaned = rawPageId.trim();
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

export const pageId = cleaned;
export const notion = new Client({ auth: apiKey });

/**
 * Fetch all blocks under a parent block recursively (paginated)
 */
export async function getBlocks(blockId: string): Promise<BlockObjectResponse[]> {
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
export async function getChildBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  return getBlocks(blockId);
}

/**
 * Find a heading block that matches a query
 */
export async function findHeadingBlock(
  parentBlockId: string,
  headingTextQuery: string
): Promise<BlockObjectResponse | null> {
  const blocks = await getChildBlocks(parentBlockId);
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
