import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import markdownStyles from "./markdownStyles";
import { getPlainText, toHeadingId, toHeadingSlug } from "./headingUtils";

const VIDEO_PREFIX = "video:";

const buildYoutubeEmbedUrl = (url) => {
  const host = url.hostname.toLowerCase();
  let videoId = "";

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (host.includes("youtube.com")) {
    if (url.pathname.startsWith("/watch")) {
      videoId = url.searchParams.get("v") || "";
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2] || "";
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] || "";
    }
  }

  if (!videoId) {
    return null;
  }

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  const start = url.searchParams.get("t") || url.searchParams.get("start");
  if (start) {
    embedUrl.searchParams.set("start", start.replace(/[^0-9]/g, ""));
  }
  return embedUrl.toString();
};

const toEmbedVideoUrl = (href) => {
  if (!href) {
    return null;
  }

  try {
    const parsedUrl = new URL(href);
    return buildYoutubeEmbedUrl(parsedUrl);
  } catch {
    return null;
  }
};

export default function MarkdownContent({ content }) {
  const headingSeenCount = {};
  const renderHeading = (Tag) =>
    function Heading({ children }) {
      const text = getPlainText(children).trim();
      const slug = toHeadingSlug(text || "heading");
      headingSeenCount[slug] = (headingSeenCount[slug] ?? 0) + 1;
      const id = toHeadingId(slug, headingSeenCount[slug]);

      return (
        <Tag id={id} data-heading-id={id}>
          {children}
        </Tag>
      );
    };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        h1: renderHeading("h1"),
        h2: renderHeading("h2"),
        h3: renderHeading("h3"),
        h4: renderHeading("h4"),
        h5: renderHeading("h5"),
        h6: renderHeading("h6"),
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
        a({ href, children }) {
          const label = getPlainText(children).trim().toLowerCase();
          const isVideoLabel = label.startsWith(VIDEO_PREFIX);
          const embedUrl = isVideoLabel ? toEmbedVideoUrl(href) : null;

          if (embedUrl) {
            return (
              <div style={markdownStyles.videoWrap}>
                <iframe
                  title={getPlainText(children).replace(VIDEO_PREFIX, "").trim() || "embedded video"}
                  src={embedUrl}
                  style={markdownStyles.videoFrame}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            );
          }

          return (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
