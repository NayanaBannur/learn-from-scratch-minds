import React from 'react'
import SectionBody from './SectionBody.jsx'
import { stripTitleHeading } from '../lib/markdown.js'

// One curriculum section, rendered whole when the slider reaches its level.
export default function Section({ section, topic, numberFor }) {
  // The section head already shows the title; drop a redundant leading `# Title`
  // from the body so it isn't printed twice (and to save vertical space).
  const md = stripTitleHeading(section.markdown, section.title)
  if (!md.trim()) return null

  return (
    <section className="section" id={`sec-${section.id}`}>
      <div className="section-head">
        <h2>{section.title}</h2>
        {section.additionalReading && <span className="extra-badge">Additional reading</span>}
      </div>
      <div className="block">
        <SectionBody md={md} topic={topic} numberFor={numberFor} />
      </div>
    </section>
  )
}
