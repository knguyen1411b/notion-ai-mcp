import {
  getNotionClient,
  getDefaultPageId,
  getChildBlocks,
  findHeadingBlock,
} from '../utils/notion.js';
import { parseMarkdownToBlocks } from '../utils/markdown.js';
import fs from 'fs';

const pageId = getDefaultPageId() || '';
if (!pageId) {
  console.error('❌ Lỗi: NOTION_PAGE_ID chưa được cấu hình đúng trong file .env');
  process.exit(1);
}

const notion = getNotionClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('❌ Lỗi: Thiếu tham số.');
    console.log(
      'Cách dùng: pnpm write "<Tên câu/Tiêu đề cần sửa>" "<Nội dung markdown hoặc đường dẫn file markdown>"'
    );
    process.exit(1);
  }

  const headingQuery = args[0];
  let markdownContent = args[1].replace(/\\n/g, '\n');

  // Check if content is a file path or direct string
  if (markdownContent.endsWith('.md')) {
    try {
      if (fs.existsSync(markdownContent)) {
        markdownContent = fs.readFileSync(markdownContent, 'utf-8');
      }
    } catch {
      // Treat as direct string if file check fails
    }
  }

  try {
    console.log(`🔍 Đang tìm tiêu đề chứa cụm từ: "${headingQuery}"...`);
    const headingBlock = await findHeadingBlock(notion, pageId, headingQuery);

    if (!headingBlock) {
      console.error(`❌ Không tìm thấy tiêu đề nào chứa cụm từ: "${headingQuery}" trên trang.`);
      process.exit(1);
    }

    const blockTitle = (headingBlock as any)[headingBlock.type].rich_text
      .map((t: any) => t.plain_text)
      .join('');
    console.log(`🎯 Đã tìm thấy khối: "${blockTitle}" (ID: ${headingBlock.id})`);

    // Fetch existing children of this block
    console.log('🗑️  Đang kiểm tra và xóa nội dung cũ của phần này...');
    const children = await getChildBlocks(notion, headingBlock.id);
    for (const child of children) {
      await notion.blocks.delete({ block_id: child.id });
    }
    if (children.length > 0) {
      console.log(`   Đã xóa ${children.length} khối nội dung cũ.`);
    }

    // Parse markdown to Notion blocks
    console.log('✍️  Đang biên dịch nội dung mới và ghi vào Notion......');
    const newBlocks = parseMarkdownToBlocks(markdownContent);

    // Notion API allows appending max 100 blocks at once
    const chunkSize = 100;
    for (let i = 0; i < newBlocks.length; i += chunkSize) {
      const chunk = newBlocks.slice(i, i + chunkSize);
      await notion.blocks.children.append({
        block_id: headingBlock.id,
        children: chunk,
      });
    }

    console.log(
      `\n✅ Thành công! Đã ghi ${newBlocks.length} khối nội dung vào phần "${blockTitle}".`
    );
  } catch (error: any) {
    console.error('❌ Lỗi khi ghi nội dung:', error.message);
  }
}

main();
