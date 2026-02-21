const normalizeHeadingText = (rawText) =>
  rawText
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();

export const toHeadingSlug = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-\u0E00-\u0E7F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const toHeadingId = (slug, index) => (index <= 1 ? slug : `${slug}-${index}`);

const matchHeading = (line) => line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);

export const parseMarkdownHeadings = (content) => {
  const lines = String(content ?? "").split("\n");
  const headings = [];
  const seenCount = new Map();
  let inFence = false;

  for (const [lineIndex, line] of lines.entries()) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    const match = matchHeading(line);
    if (!match) {
      continue;
    }

    const level = match[1].length;
    const text = normalizeHeadingText(match[2]);
    const slug = toHeadingSlug(text || `heading-${headings.length + 1}`);
    const nextIndex = (seenCount.get(slug) ?? 0) + 1;
    seenCount.set(slug, nextIndex);

    headings.push({
      id: toHeadingId(slug, nextIndex),
      text: text || "หัวข้อ",
      level,
      lineIndex,
    });
  }

  return headings;
};

const swapItems = (items, fromIndex, toIndex) => {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
};

export const parseMarkdownOutline = (content) => {
  const lines = String(content ?? "").split("\n");
  const headings = parseMarkdownHeadings(content).filter((heading) => heading.level <= 3);
  const h1Heading = headings.find((heading) => heading.level === 1);
  const mainHeadings = headings.filter((heading) => heading.level === 2);

  const mainSections = mainHeadings.map((mainHeading, index) => {
    const nextMain = mainHeadings[index + 1];
    const startLine = mainHeading.lineIndex;
    const endLine = nextMain ? nextMain.lineIndex : lines.length;
    const subHeadings = headings.filter(
      (heading) =>
        heading.level === 3 &&
        heading.lineIndex > startLine &&
        heading.lineIndex < endLine,
    );

    const subSections = subHeadings.map((subHeading, subIndex) => ({
      ...subHeading,
      startLine: subHeading.lineIndex,
      endLine: subHeadings[subIndex + 1] ? subHeadings[subIndex + 1].lineIndex : endLine,
    }));

    return {
      ...mainHeading,
      startLine,
      endLine,
      subSections,
    };
  });

  return {
    lines,
    h1Heading,
    mainSections,
  };
};

export const getSubtopicPages = (content, fallbackTitle = "เนื้อหา") => {
  const { lines, h1Heading, mainSections } = parseMarkdownOutline(content);
  const documentTitle = h1Heading?.text || fallbackTitle;
  const pages = [];

  for (const mainSection of mainSections) {
    for (const subSection of mainSection.subSections) {
      const rawBodyLines = lines.slice(subSection.startLine + 1, subSection.endLine);
      const questions = [];
      const bodyLines = [];
      let baseScore = null;

      rawBodyLines.forEach((line) => {
        const scoreMatch = line.match(/^\s*-\s*\[SCORE\]\s*(\d+)\s*$/i);
        if (scoreMatch) {
          baseScore = Number(scoreMatch[1]);
          return;
        }

        const questionMatch = line.match(/^\s*-\s*\[Q\]\s*(.+?)\s*::\s*(.+?)(?:\s*::\s*(\d+))?\s*$/i);
        if (!questionMatch) {
          bodyLines.push(line);
          return;
        }

        questions.push({
          id: `${subSection.id}-q-${questions.length + 1}`,
          question: questionMatch[1].trim(),
          answer: questionMatch[2].trim(),
          points: Number(questionMatch[3] ?? 10),
        });
      });

      const bodyText = bodyLines.join("\n").trim();
      const pageContent = `# ${documentTitle}\n\n## ${mainSection.text}\n\n### ${subSection.text}${
        bodyText ? `\n\n${bodyText}` : ""
      }`;

      pages.push({
        id: subSection.id,
        mainId: mainSection.id,
        mainText: mainSection.text,
        subText: subSection.text,
        content: pageContent,
        questions,
        baseScore,
        bodyMarkdown: rawBodyLines.join("\n").replace(/\n+$/g, ""),
      });
    }
  }

  return pages;
};

export const moveMainSection = (content, mainHeadingId, direction) => {
  const outline = parseMarkdownOutline(content);
  if (outline.mainSections.length < 2) {
    return content;
  }

  const currentIndex = outline.mainSections.findIndex((section) => section.id === mainHeadingId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= outline.mainSections.length) {
    return content;
  }

  const firstMainStart = outline.mainSections[0].startLine;
  const prefixLines = outline.lines.slice(0, firstMainStart);
  const reorderedSections = swapItems(outline.mainSections, currentIndex, targetIndex);
  const reorderedLines = reorderedSections.flatMap((section) =>
    outline.lines.slice(section.startLine, section.endLine),
  );

  return [...prefixLines, ...reorderedLines].join("\n");
};

export const moveSubSection = (content, subHeadingId, direction) => {
  const outline = parseMarkdownOutline(content);
  const targetMainSection = outline.mainSections.find((section) =>
    section.subSections.some((subSection) => subSection.id === subHeadingId),
  );
  if (!targetMainSection || targetMainSection.subSections.length < 2) {
    return content;
  }

  const currentIndex = targetMainSection.subSections.findIndex((subSection) => subSection.id === subHeadingId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= targetMainSection.subSections.length) {
    return content;
  }

  const firstSubStart = targetMainSection.subSections[0].startLine;
  const linesBeforeSubs = outline.lines.slice(targetMainSection.startLine, firstSubStart);
  const linesAfterSubs = outline.lines.slice(
    targetMainSection.subSections[targetMainSection.subSections.length - 1].endLine,
    targetMainSection.endLine,
  );

  const reorderedSubSections = swapItems(targetMainSection.subSections, currentIndex, targetIndex);
  const reorderedSubLines = reorderedSubSections.flatMap((subSection) =>
    outline.lines.slice(subSection.startLine, subSection.endLine),
  );

  const rebuiltMainLines = [...linesBeforeSubs, ...reorderedSubLines, ...linesAfterSubs];
  const fullLines = [
    ...outline.lines.slice(0, targetMainSection.startLine),
    ...rebuiltMainLines,
    ...outline.lines.slice(targetMainSection.endLine),
  ];

  return fullLines.join("\n");
};

export const moveMainSectionBefore = (content, sourceMainId, targetMainId) => {
  if (!sourceMainId || !targetMainId || sourceMainId === targetMainId) {
    return content;
  }

  const outline = parseMarkdownOutline(content);
  const sourceIndex = outline.mainSections.findIndex((section) => section.id === sourceMainId);
  const targetIndex = outline.mainSections.findIndex((section) => section.id === targetMainId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return content;
  }

  const firstMainStart = outline.mainSections[0]?.startLine ?? outline.lines.length;
  const prefixLines = outline.lines.slice(0, firstMainStart);
  const reorderedSections = [...outline.mainSections];
  const [moved] = reorderedSections.splice(sourceIndex, 1);
  const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  reorderedSections.splice(insertIndex, 0, moved);
  const reorderedLines = reorderedSections.flatMap((section) =>
    outline.lines.slice(section.startLine, section.endLine),
  );

  return [...prefixLines, ...reorderedLines].join("\n");
};

export const moveSubSectionBefore = (content, sourceSubId, targetSubId) => {
  if (!sourceSubId || !targetSubId || sourceSubId === targetSubId) {
    return content;
  }

  const outline = parseMarkdownOutline(content);
  const sourceMainSection = outline.mainSections.find((section) =>
    section.subSections.some((subSection) => subSection.id === sourceSubId),
  );
  const targetMainSection = outline.mainSections.find((section) =>
    section.subSections.some((subSection) => subSection.id === targetSubId),
  );
  if (!sourceMainSection || !targetMainSection) {
    return content;
  }

  const sourceSubSection = sourceMainSection.subSections.find((subSection) => subSection.id === sourceSubId);
  const targetSubSection = targetMainSection.subSections.find((subSection) => subSection.id === targetSubId);
  if (!sourceSubSection || !targetSubSection) {
    return content;
  }

  const sourceLines = outline.lines.slice(sourceSubSection.startLine, sourceSubSection.endLine);
  const linesWithoutSource = [
    ...outline.lines.slice(0, sourceSubSection.startLine),
    ...outline.lines.slice(sourceSubSection.endLine),
  ];
  const removedLength = sourceSubSection.endLine - sourceSubSection.startLine;
  let insertAt = targetSubSection.startLine;
  if (sourceSubSection.startLine < targetSubSection.startLine) {
    insertAt -= removedLength;
  }

  const nextLines = [
    ...linesWithoutSource.slice(0, insertAt),
    ...sourceLines,
    ...linesWithoutSource.slice(insertAt),
  ];

  return nextLines.join("\n");
};

export const updateSubtopicBodyMarkdown = (content, subtopicId, nextBodyMarkdown) => {
  if (!subtopicId) {
    return content;
  }

  const outline = parseMarkdownOutline(content);
  const targetMain = outline.mainSections.find((section) =>
    section.subSections.some((subSection) => subSection.id === subtopicId),
  );
  if (!targetMain) {
    return content;
  }

  const targetSubtopic = targetMain.subSections.find((subSection) => subSection.id === subtopicId);
  if (!targetSubtopic) {
    return content;
  }

  const beforeLines = outline.lines.slice(0, targetSubtopic.startLine + 1);
  const afterLines = outline.lines.slice(targetSubtopic.endLine);
  const bodyLines = String(nextBodyMarkdown ?? "").split("\n");
  const mergedLines = [...beforeLines, ...bodyLines, ...afterLines];

  return mergedLines.join("\n");
};

export const renameHeadingById = (content, headingId, nextTitle) => {
  if (!headingId || !nextTitle?.trim()) {
    return content;
  }

  const lines = String(content ?? "").split("\n");
  const headings = parseMarkdownHeadings(content);
  const targetHeading = headings.find((heading) => heading.id === headingId);
  if (!targetHeading) {
    return content;
  }

  const line = lines[targetHeading.lineIndex] ?? "";
  const leading = (line.match(/^(\s*)/) ?? ["", ""])[1];
  lines[targetHeading.lineIndex] = `${leading}${"#".repeat(targetHeading.level)} ${nextTitle.trim()}`;
  return lines.join("\n");
};

export const deleteHeadingById = (content, headingId) => {
  if (!headingId) {
    return content;
  }

  const outline = parseMarkdownOutline(content);
  const headings = parseMarkdownHeadings(content).filter((heading) => heading.level <= 3);
  const targetHeading = headings.find((heading) => heading.id === headingId);
  if (!targetHeading) {
    return content;
  }

  if (targetHeading.level === 2) {
    const targetMain = outline.mainSections.find((section) => section.id === headingId);
    if (!targetMain) {
      return content;
    }
    const nextLines = [
      ...outline.lines.slice(0, targetMain.startLine),
      ...outline.lines.slice(targetMain.endLine),
    ];
    return nextLines.join("\n");
  }

  if (targetHeading.level === 3) {
    const targetMain = outline.mainSections.find((section) =>
      section.subSections.some((subSection) => subSection.id === headingId),
    );
    const targetSub = targetMain?.subSections.find((subSection) => subSection.id === headingId);
    if (!targetSub) {
      return content;
    }
    const nextLines = [
      ...outline.lines.slice(0, targetSub.startLine),
      ...outline.lines.slice(targetSub.endLine),
    ];
    return nextLines.join("\n");
  }

  return content;
};

export const getPlainText = (children) => {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(getPlainText).join("");
  }
  if (children?.props?.children) {
    return getPlainText(children.props.children);
  }
  return "";
};
