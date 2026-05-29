import { getNotionClient, getDefaultPageId } from '../utils/notion.js';
import { isFullPage } from '@notionhq/client';

const pageId = getDefaultPageId() || '';
if (!pageId) {
  console.error('❌ Lỗi: NOTION_PAGE_ID chưa được cấu hình đúng trong file .env');
  process.exit(1);
}

const notion = getNotionClient();

console.log(`🔌 Đang kết nối tới Notion với Page ID: ${pageId}...`);

async function test() {
  try {
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
      console.log('\n✅ Kết nối thành công!');
      console.log(`📄 Tiêu đề trang: "${title}"`);
      console.log(`🔗 URL: ${page.url}`);
    } else {
      console.log('\n✅ Kết nối thành công! (Nhưng trang trả về thông tin tối giản)');
    }
  } catch (error: any) {
    console.error('\n❌ Kết nối thất bại!');
    console.error(`Chi tiết lỗi: ${error.message}`);
    if (error.code === 'object_not_found') {
      console.error('\nGợi ý: ');
      console.error(
        '1. Đảm bảo bạn đã thêm Connection (chọn Integration đã tạo) vào trang Notion này.'
      );
      console.error('2. Đảm bảo Page ID trong file .env chính xác.');
    } else if (error.code === 'unauthorized') {
      console.error('\nGợi ý: Đảm bảo NOTION_API_KEY trong file .env chính xác.');
    }
  }
}

test();
