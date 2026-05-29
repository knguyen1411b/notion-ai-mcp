import { notion, pageId, getBlocks, parseRichText } from '../utils/notion.js';
import { isFullPage } from '@notionhq/client';
import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';

async function renderBlocks(blocks: BlockObjectResponse[], indentLevel = 0): Promise<string> {
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
      const children = await getBlocks(block.id);
      output += await renderBlocks(children, indentLevel + 1);
    }
  }
  return output;
}

async function main() {
  try {
    console.log('📖 Đang tải nội dung trang Notion...');
    const page = await notion.pages.retrieve({ page_id: pageId });
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
    }

    console.log(`\n=================== ${title.toUpperCase()} ===================\n`);

    const blocks = await getBlocks(pageId);
    const markdown = await renderBlocks(blocks);

    console.log(markdown);
    console.log('================================================================');
  } catch (error: any) {
    console.error('❌ Lỗi khi đọc trang:', error.message);
  }
}

main();
