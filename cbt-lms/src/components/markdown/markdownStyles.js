const markdownStyles = {
  inlineCode: {
    background: "#0b1220",
    border: "1px solid #1f2a3a",
    padding: "2px 6px",
    borderRadius: 8,
  },
  codeBlock: {
    background: "#0b1220",
    border: "1px solid #1f2a3a",
    padding: "12px 14px",
    borderRadius: 12,
    overflowX: "auto",
  },
  blockquote: {
    margin: "10px 0",
    padding: "8px 12px",
    borderLeft: "4px solid #2b3e63",
    background: "#0b1220",
    borderRadius: 10,
    opacity: 0.95,
  },
  tableWrap: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #1f2a3a",
    borderRadius: 12,
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid #1f2a3a",
    background: "#101a2b",
  },
  td: {
    padding: "8px 10px",
    borderBottom: "1px solid #1f2a3a",
  },
};

export default markdownStyles;
