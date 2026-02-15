import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import markdownStyles from "./markdownStyles";

export default function MarkdownContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code({ inline, className, children, ...props }) {
          if (inline) {
            return (
              <code style={markdownStyles.inlineCode} {...props}>
                {children}
              </code>
            );
          }
          return (
            <pre style={markdownStyles.codeBlock}>
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        },
        blockquote({ children }) {
          return <blockquote style={markdownStyles.blockquote}>{children}</blockquote>;
        },
        table({ children }) {
          return (
            <div style={markdownStyles.tableWrap}>
              <table style={markdownStyles.table}>{children}</table>
            </div>
          );
        },
        th({ children }) {
          return <th style={markdownStyles.th}>{children}</th>;
        },
        td({ children }) {
          return <td style={markdownStyles.td}>{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
