import { getNotionClient, getDefaultPageId, getBlocks, renderBlocks } from '../utils/notion.js';
import { isFullPage } from '@notionhq/client';

const pageId = getDefaultPageId() || '';
if (!pageId) {
  console.error('❌ Lỗi: NOTION_PAGE_ID chưa được cấu hình đúng trong file .env');
  process.exit(1);
}

const notion = getNotionClient();

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

    const blocks = await getBlocks(notion, pageId);
    const markdown = await renderBlocks(notion, blocks);

    console.log(markdown);
    console.log('================================================================');
  } catch (error: any) {
    console.error('❌ Lỗi khi đọc trang:', error.message);
  }
}

main();
