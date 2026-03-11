"use client";

import {useRef, useLayoutEffect} from "react";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";

type YamlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function YamlEditor({
  value,
  onChange,
  placeholder = "# Paste or edit Traefik stack YAML...",
  disabled = false,
  "aria-label": ariaLabel = "Traefik stack YAML",
}: YamlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preWrapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const wrap = preWrapRef.current;
    const ta = textareaRef.current;
    const container = containerRef.current;
    if (!wrap || !ta) return;
    const height = wrap.getBoundingClientRect().height;
    const isNarrow = container ? container.getBoundingClientRect().width < 640 : false;
    const linePx = 14 * 1.5;
    const minLines = isNarrow ? 12 : 18;
    ta.style.height = `${Math.max(height, minLines * linePx)}px`;
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="gateway-yml relative box-border w-full max-w-full min-w-0 overflow-auto rounded-lg border border-gl-edge bg-gl-input-bg scrollbar-thin min-h-[12rem] max-h-[20rem] sm:min-h-[18rem] sm:max-h-[28rem]"
    >
      <div className="relative w-full min-w-0">
        <div ref={preWrapRef} className="w-full min-w-0 px-3 py-2">
          <SyntaxHighlighter
            language="yaml"
            useInlineStyles={false}
            PreTag="div"
            CodeTag="div"
            customStyle={{
              margin: 0,
              padding: 0,
              background: "none",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              wordBreak: "break-all",
              overflowWrap: "break-word",
            }}
            codeTagProps={{
              style: {
                font: "inherit",
                wordBreak: "break-all",
                overflowWrap: "break-word",
              },
            }}
            lineNumberStyle={{display: "none"}}
            showLineNumbers={false}
          >
            {value || " "}
          </SyntaxHighlighter>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          spellCheck={false}
          className="absolute left-0 top-0 w-full min-w-0 resize-none rounded-lg border-0 bg-transparent px-3 py-2 font-mono text-sm placeholder-gl-text-muted focus:outline-none focus:ring-0"
          style={{
            color: "transparent",
            caretColor: "var(--gl-text)",
            lineHeight: 1.5,
            minHeight: "12rem",
            overflow: "hidden",
          }}
        />
      </div>
    </div>
  );
}
