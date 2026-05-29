export function chunkText(text: string, size = 2000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.substring(i, i + size));
  }
  return chunks;
}

// Helper to parse simple inline markdown to Notion rich text
export function parseInlineMarkdown(text: string): any[] {
  const parts: any[] = [];
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|(`)(.*?)\5|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  const addTextNode = (content: string, annotations?: any, linkUrl?: string) => {
    if (!content) return;
    const chunks = chunkText(content, 2000);
    for (const chunk of chunks) {
      const node: any = {
        type: 'text',
        text: {
          content: chunk,
        },
      };
      if (annotations) {
        node.annotations = annotations;
      }
      if (linkUrl) {
        node.text.link = { url: linkUrl };
      }
      parts.push(node);
    }
  };

  while ((match = regex.exec(text)) !== null) {
    const [, , boldText, , italicText, , codeText, linkText, linkUrl] = match;

    // Add preceding plain text
    if (match.index > lastIndex) {
      addTextNode(text.substring(lastIndex, match.index));
    }

    if (boldText) {
      addTextNode(boldText, { bold: true });
    } else if (italicText) {
      addTextNode(italicText, { italic: true });
    } else if (codeText) {
      addTextNode(codeText, { code: true });
    } else if (linkText && linkUrl) {
      addTextNode(linkText, undefined, linkUrl);
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    addTextNode(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: { content: '' } }];
}

// Convert a markdown block/line into a Notion block object
export function markdownLineToNotionBlock(line: string): any {
  const trimmed = line.trim();

  // 1. Check headings level 1 to 6 (map >=3 to heading_3)
  const headingMatch = trimmed.match(/^(#{1,6})\s(.*)/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2];
    const type = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3';
    return {
      object: 'block',
      type: type,
      [type]: {
        rich_text: parseInlineMarkdown(content),
      },
    };
  }

  // 2. Check checkboxes/todo items first (e.g. - [ ], - [x], [ ], [x])
  const checklistMatch = trimmed.match(/^[-*]?\s*\[([ xX])\]\s(.*)/);
  if (checklistMatch) {
    const checked = checklistMatch[1].toLowerCase() === 'x';
    const content = checklistMatch[2];
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: parseInlineMarkdown(content),
        checked: checked,
      },
    };
  }

  // 3. Bullet lists
  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: parseInlineMarkdown(trimmed.substring(2)),
      },
    };
  }

  // 4. Numbered lists
  if (trimmed.match(/^\d+\.\s/)) {
    const content = trimmed.replace(/^\d+\.\s/, '');
    return {
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: parseInlineMarkdown(content),
      },
    };
  }

  // 5. Quote
  if (trimmed.startsWith('> ')) {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: parseInlineMarkdown(trimmed.substring(2)),
      },
    };
  }

  // Default is paragraph
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: parseInlineMarkdown(line),
    },
  };
}

// Convert markdown text to array of Notion blocks
export function parseMarkdownToBlocks(markdownText: string): any[] {
  const lines = markdownText.split('\n');
  const blocks: any[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block (chunked to avoid 2000 character limit)
        const codeChunks = chunkText(codeContent.join('\n'), 2000);
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: codeChunks.map((chunk) => ({
              type: 'text',
              text: { content: chunk },
            })),
            language: codeLanguage || 'javascript',
          },
        });
        inCodeBlock = false;
        codeContent = [];
      } else {
        // Start of code block
        inCodeBlock = true;
        codeLanguage = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Skip empty lines unless they are in code blocks
    if (line.trim() === '') {
      continue;
    }

    blocks.push(markdownLineToNotionBlock(line));
  }

  return blocks;
}
