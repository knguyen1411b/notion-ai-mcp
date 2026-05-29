# Notion AI MCP Server 🚀

[![CI](https://github.com/knguyen1411b/notion-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/knguyen1411b/notion-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

An implementation of the **Model Context Protocol (MCP)** for Notion. This server allows AI assistants (such as Claude Desktop, Cursor, Codex, or other MCP clients) to directly read, write, and restructure content on your Notion pages.

Bản tiếng Việt có ở phía dưới.

---

## English Version

### Features & Tools Exposed

1.  **`notion_test_connection`**
    *   **Description:** Verifies integration credentials and checks connection to a Notion page.
    *   **Arguments:**
        *   `apiKey` (optional, string): Notion integration token. Defaults to `NOTION_API_KEY` env.
        *   `pageId` (optional, string): Notion Page ID or URL. Defaults to `NOTION_PAGE_ID` env.
2.  **`notion_get_page_content`**
    *   **Description:** Recursively fetches child blocks of a Notion page and renders them as Markdown.
    *   **Arguments:**
        *   `apiKey` (optional, string)
        *   `pageId` (optional, string)
3.  **`notion_update_section`**
    *   **Description:** Searches for a heading on a page, deletes its children blocks, and overwrites with new Markdown content.
    *   **Arguments:**
        *   `headerQuery` (required, string): Query string to find the heading (case-insensitive).
        *   `markdownContent` (required, string): New Markdown content to write.
        *   `apiKey` (optional, string)
        *   `pageId` (optional, string)
4.  **`notion_append_content`**
    *   **Description:** Appends Markdown content directly to the end of a Notion page.
    *   **Arguments:**
        *   `markdownContent` (required, string): Markdown content to append.
        *   `apiKey` (optional, string)
        *   `pageId` (optional, string)

### Getting Started

#### Prerequisites
*   **Node.js** (v18+)
*   **pnpm** (preferred) or npm/yarn
*   **Notion Integration Token:** Create one at [Notion Developers](https://www.notion.so/my-integrations).
*   **Notion Page ID:** Ensure you have shared your Notion page with the integration.

#### Installation
1.  Clone this repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Copy `.env.example` to `.env` and fill in your keys:
    ```bash
    cp .env.example .env
    ```
4.  Build the project:
    ```bash
    pnpm build
    ```

#### Configuration for MCP Clients

##### 1. Claude Desktop
Add this to your `claude_desktop_config.json` (found in `%APPDATA%\Claude\claude_desktop_config.json` on Windows):
```json
{
  "mcpServers": {
    "notion-ai-mcp": {
      "command": "node",
      "args": ["D:/WorkSpace/Projects/notion-ai/dist/index.js"],
      "env": {
        "NOTION_API_KEY": "your_notion_api_key",
        "NOTION_PAGE_ID": "your_notion_page_id"
      }
    }
  }
}
```
*(Adjust the path in `args` to match where you cloned the repository).*

##### 2. Cursor
Go to **Settings** > **Features** > **MCP** and click **+ Add New MCP Server**:
*   **Name:** `Notion AI MCP`
*   **Type:** `stdio`
*   **Command:** `node D:/WorkSpace/Projects/notion-ai/dist/index.js`

##### 3. Codex
You can add it via Codex CLI:
```bash
codex mcp add notion-ai-mcp --node D:/WorkSpace/Projects/notion-ai/dist/index.js
```
Or insert this into your `~/.codex/config.toml` config file:
```toml
[mcp.servers.notion-ai-mcp]
command = "node"
args = ["D:/WorkSpace/Projects/notion-ai/dist/index.js"]

[mcp.servers.notion-ai-mcp.env]
NOTION_API_KEY = "your_notion_api_key"
NOTION_PAGE_ID = "your_notion_page_id"
```

---

## Tiếng Việt

Một server cấu hình giao thức **Model Context Protocol (MCP)** cho Notion. Server này cho phép các trợ lý AI (như Claude Desktop, Cursor, Codex, v.v.) trực tiếp đọc, viết và chỉnh sửa nội dung trên trang Notion của bạn.

### Các công cụ (Tools) được cung cấp

1.  **`notion_test_connection`**: Kiểm tra kết nối tới trang Notion và xác minh API token.
2.  **`notion_get_page_content`**: Đọc toàn bộ nội dung các khối con của trang Notion đệ quy và chuyển sang dạng Markdown.
3.  **`notion_update_section`**: Tìm kiếm một tiêu đề (Heading) trên trang, xóa nội dung cũ bên dưới nó, và ghi đè nội dung mới dạng Markdown.
4.  **`notion_append_content`**: Thêm nội dung dạng Markdown vào cuối trang Notion.

### Hướng dẫn Cài đặt

1.  Cài đặt các gói phụ thuộc:
    ```bash
    pnpm install
    ```
2.  Tạo file `.env` từ file mẫu `.env.example` và điền token cũng như Page ID của bạn.
3.  Biên dịch dự án:
    ```bash
    pnpm build
    ```
4.  Cấu hình MCP cho ứng dụng của bạn (Claude Desktop, Cursor hoặc Codex) theo mẫu JSON/TOML phía trên.

### CLI Scripts Phụ trợ
Bạn cũng có thể chạy các kịch bản độc lập trực tiếp từ terminal:
*   **Test kết nối:** `pnpm test-connection`
*   **Đọc trang:** `pnpm read`
*   **Ghi nội dung:** `pnpm write "Tên tiêu đề" "Nội dung Markdown"`
*   **Format code:** `pnpm format`
*   **Lint code:** `pnpm lint`
*   **Type check:** `pnpm typecheck`

---

## Contributing 🤝

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to configure development environments, local tests, Husky hooks, and semantic commits.

---

## License
[MIT](LICENSE)
