interface MarkdownNoteProps {
  markdown: string;
}

function renderInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

export function MarkdownNote({ markdown }: MarkdownNoteProps) {
  if (!markdown.trim()) {
    return <p className="markdown-empty">No notes yet.</p>;
  }

  const lines = markdown.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="markdown-list">
        {listItems.map((item, index) => (
          <li key={index} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();

    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={index}>{trimmed.slice(4)}</h4>);
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={index}>{trimmed.slice(3)}</h3>);
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={index}>{trimmed.slice(2)}</h2>);
      return;
    }

    elements.push(
      <p key={index} dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
    );
  });

  flushList();

  return <div className="markdown-note">{elements}</div>;
}
