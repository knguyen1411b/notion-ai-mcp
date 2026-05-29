// Helper to parse simple inline markdown to Notion rich text
export function parseInlineMarkdown(text: string): any[] {
  const parts: any[] = [];
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|(`)(.*?)\5/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [, , boldText, , italicText, , codeText] = match;

    // Add preceding plain text
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: { content: text.substring(lastIndex, match.index) },
      });
    }

    if (boldText) {
      parts.push({
        type: 'text',
        text: { content: boldText },
        annotations: { bold: true },
      });
    } else if (italicText) {
      parts.push({
        type: 'text',
        text: { content: italicText },
        annotations: { italic: true },
      });
    } else if (codeText) {
      parts.push({
        type: 'text',
        text: { content: codeText },
        annotations: { code: true },
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      text: { content: text.substring(lastIndex) },
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: { content: text } }];
}

// Convert a markdown block/line into a Notion block object
export function markdownLineToNotionBlock(line: string): any {
  const trimmed = line.trim();

  if (trimmed.startsWith('# ')) {
    return {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: parseInlineMarkdown(trimmed.substring(2)),
      },
    };
  }

  if (trimmed.startsWith('## ')) {
    return {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: parseInlineMarkdown(trimmed.substring(3)),
      },
    };
  }

  if (trimmed.startsWith('### ')) {
    return {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: parseInlineMarkdown(trimmed.substring(4)),
      },
    };
  }

  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: parseInlineMarkdown(trimmed.substring(2)),
      },
    };
  }

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

  if (trimmed.startsWith('> ')) {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: parseInlineMarkdown(trimmed.substring(2)),
      },
    };
  }

  if (trimmed.startsWith('[ ] ') || trimmed.startsWith('[x] ')) {
    const checked = trimmed.startsWith('[x] ');
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: parseInlineMarkdown(trimmed.substring(4)),
        checked: checked,
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
        // End of code block
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: codeContent.join('\n') } }],
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
