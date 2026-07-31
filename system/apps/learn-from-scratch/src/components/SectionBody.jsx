import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import Diagram from './Diagram.jsx'
import { applyCitations } from '../lib/markdown.js'

// Renders one Markdown block: GFM (tables, etc.), citation superscripts, and
// ```diagram fences dispatched to the Diagram component.
export default function SectionBody({ md, topic, numberFor }) {
  const withCites = applyCitations(md, numberFor)

  const components = {
    // Pass code fences through; intercept language-diagram to render a Diagram.
    // react-markdown v9 dropped the `inline` prop, so we treat a `language-*`
    // class as a fenced block and everything else as inline code.
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children, ...props }) => {
      const lang = /language-(\w+)/.exec(className || '')?.[1]
      if (lang === 'diagram') {
        try {
          const spec = JSON.parse(String(children))
          return <Diagram spec={spec} topic={topic} />
        } catch (e) {
          return <pre className="diagram-error">Invalid diagram JSON: {String(e.message)}</pre>
        }
      }
      if (lang) {
        return (
          <pre className="code-block">
            <code className={className}>{children}</code>
          </pre>
        )
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={components}
    >
      {withCites}
    </ReactMarkdown>
  )
}
