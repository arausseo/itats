"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Vista previa estilo lector (viñetas, separadores, jerarquía clara). */
const components: Partial<Components> = {
  h1: ({ children, ...props }) => (
    <h1
      className="mb-4 mt-10 scroll-mt-4 border-b-2 border-border pb-3 text-2xl font-bold tracking-tight text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-3 mt-9 border-l-4 border-primary/70 pl-3 text-xl font-semibold text-foreground"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-foreground" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-3 text-[0.9375rem] leading-relaxed text-foreground" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="my-4 ml-0 list-outside list-disc space-y-2.5 pl-6 text-[0.9375rem] leading-relaxed marker:text-primary [&_ul]:mt-2 [&_ul]:space-y-1.5"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="my-4 ml-0 list-outside list-decimal space-y-2.5 pl-6 text-[0.9375rem] leading-relaxed marker:font-semibold marker:text-muted-foreground [&_ol]:mt-2"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-1 [&>p]:my-0 [&>p]:inline" {...props}>
      {children}
    </li>
  ),
  hr: (props) => (
    <hr
      className="my-10 border-0 border-t-2 border-dashed border-border/80 bg-transparent"
      {...props}
    />
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  a: ({ children, ...props }) => (
    <a
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 border-l-4 border-muted-foreground/40 bg-muted/50 py-2 pl-4 pr-3 text-[0.9375rem] italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
      <table
        className="w-full min-w-[32rem] border-collapse text-left text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/80 text-foreground" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border-b border-border px-3 py-2 font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-border/80 px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/80 p-4 font-mono text-sm text-foreground"
      {...props}
    >
      {children}
    </pre>
  ),
};

export function CvMarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-5 shadow-sm ring-1 ring-border/40 sm:p-8 dark:bg-muted/10">
      <article className="max-w-none text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
