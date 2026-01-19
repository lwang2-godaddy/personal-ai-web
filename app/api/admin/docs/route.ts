import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Simple markdown to HTML converter
 * Handles common markdown syntax without external dependencies
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="language-${lang || 'text'}"><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Images (restore < and > for img tags)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full" />');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');
  html = html.replace(/^\*\*\*$/gm, '<hr />');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    const isHeader = cells.every((cell: string) => /^-+$/.test(cell));
    if (isHeader) return ''; // Skip separator row
    const cellTag = 'td';
    const cellsHtml = cells.map((cell: string) => `<${cellTag}>${cell}</${cellTag}>`).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  // Wrap tables
  const tableRegex = /(<tr>[\s\S]*?<\/tr>)+/g;
  html = html.replace(tableRegex, (match) => {
    // Convert first row to header
    const firstRowMatch = match.match(/<tr>(.*?)<\/tr>/);
    if (firstRowMatch) {
      const headerRow = firstRowMatch[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
      const bodyRows = match.replace(firstRowMatch[0], '');
      return `<table class="border-collapse border border-gray-300"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
    }
    return `<table class="border-collapse border border-gray-300"><tbody>${match}</tbody></table>`;
  });

  // Unordered lists
  html = html.replace(/^(\s*)[-*]\s+(.*)$/gm, (_, indent, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li data-level="${level}">${content}</li>`;
  });

  // Ordered lists
  html = html.replace(/^(\s*)\d+\.\s+(.*)$/gm, (_, indent, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li data-level="${level}" data-ordered="true">${content}</li>`;
  });

  // Wrap consecutive list items
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = 'ul';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isListItem = line.startsWith('<li');
    const isOrdered = line.includes('data-ordered="true"');

    if (isListItem && !inList) {
      inList = true;
      listType = isOrdered ? 'ol' : 'ul';
      result.push(`<${listType}>`);
    } else if (!isListItem && inList) {
      inList = false;
      result.push(`</${listType}>`);
    }

    result.push(line.replace(/ data-level="\d+"| data-ordered="true"/g, ''));
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  html = result.join('\n');

  // Blockquotes
  html = html.replace(/^&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  // Paragraphs (wrap standalone lines)
  html = html
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (
        !trimmed ||
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<hr')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n\n');

  return html;
}

/**
 * GET /api/admin/docs
 * Fetch documentation file content
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Get the doc path from query params
    const { searchParams } = new URL(request.url);
    const docPath = searchParams.get('path');

    if (!docPath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Security: Validate path to prevent directory traversal
    const normalizedPath = path.normalize(docPath);
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // Determine base directory based on path prefix
    let basePath: string;
    let filePath: string;

    if (normalizedPath.startsWith('mobile/')) {
      // Mobile docs are in the web app's docs/mobile directory
      basePath = path.join(process.cwd(), 'docs');
      filePath = path.join(basePath, normalizedPath);
    } else {
      // Web docs
      basePath = path.join(process.cwd(), 'docs');
      filePath = path.join(basePath, normalizedPath);
    }

    // Verify the file is within the docs directory
    if (!filePath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // Read the markdown file
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      return NextResponse.json(
        { error: 'Documentation file not found' },
        { status: 404 }
      );
    }

    // Convert markdown to HTML
    const html = markdownToHtml(content);

    return NextResponse.json({
      content: html,
      path: normalizedPath,
    });
  } catch (error) {
    console.error('Error fetching documentation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documentation' },
      { status: 500 }
    );
  }
}
