import { Fragment, type ReactNode } from "react";

// http(s)://… або www.… до першого пробілу
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;
// Розділові знаки в кінці речення — не частина адреси
const TRAILING = /[.,;:!?'"»”…]+$/;
const MAX_LABEL = 48;

/** Відрізає хвостову пунктуацію і непарну закривну дужку: «(див. https://a.b/c)». */
function trimUrl(raw: string): string {
  let url = raw.replace(TRAILING, "");
  while (url.endsWith(")") && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(TRAILING, "");
  }
  return url;
}

/** Без протоколу й www, довгі адреси обрізаються посередині. */
function shortLabel(url: string): string {
  const label = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  if (label.length <= MAX_LABEL) return label;
  return `${label.slice(0, MAX_LABEL - 16)}…${label.slice(-15)}`;
}

export default function LinkifiedText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    const start = match.index ?? 0;
    if (!url.includes(".")) continue;

    parts.push(<Fragment key={`t${start}`}>{text.slice(last, start)}</Fragment>);
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    parts.push(
      <a
        key={`a${start}`}
        className="text-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={href}
        draggable={false}
      >
        {shortLabel(url)}
      </a>,
    );
    last = start + url.length;
  }

  parts.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}
