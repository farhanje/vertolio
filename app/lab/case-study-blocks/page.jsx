import ArtifactExplorer from '../../../components/ArtifactExplorer'
import DataVisualization from '../../../components/DataVisualization'
import {ComparisonBlock, EvidenceGrid, NarrativeSection} from '../../../components/CaseStudyBlocks'

export const metadata = {
  title: 'Case Study Blocks Lab',
  robots: {index: false, follow: false},
}

function screen(title, subtitle, done = []) {
  const rows = ['Identity document', 'Selfie'].map((label, index) => {
    const y = 320 + index * 118
    const complete = done.includes(index)
    return `<rect x="30" y="${y}" width="300" height="90" rx="14" fill="#fff" stroke="#ddd"/><text x="52" y="${y + 37}" font-family="Arial" font-size="15" font-weight="700" fill="#111">${label}</text><text x="52" y="${y + 61}" font-family="Arial" font-size="11" fill="#666">${complete ? 'Saved' : 'Not completed'}</text><circle cx="302" cy="${y + 45}" r="11" fill="${complete ? '#111' : '#eee'}"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="779" viewBox="0 0 360 779"><rect width="360" height="779" fill="#f7f7f7"/><rect width="360" height="86" fill="#fff"/><text x="30" y="54" font-family="Arial" font-size="13" font-weight="700" fill="#111">PRODUCT</text><text x="30" y="170" font-family="Arial" font-size="27" font-weight="700" fill="#111">${title}</text><text x="30" y="205" font-family="Arial" font-size="13" fill="#666">${subtitle}</text>${rows}<rect x="30" y="688" width="300" height="54" rx="10" fill="#111"/><text x="180" y="721" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">Continue</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const prototype = {
  eyebrow: 'Interactive prototype',
  title: 'Inspect resumable task states',
  description: 'A reusable prototype can live inside a tab, or as a standalone case-study block.',
  theme: 'dark',
  device: 'phone',
  steps: [
    {key: 'a', label: 'Nothing saved', caption: 'Tasks begin independently.', src: screen('Review', 'Choose a task to continue.', [])},
    {key: 'b', label: 'One task saved', caption: 'Completed work persists.', src: screen('Review', 'Progress is saved automatically.', [0])},
    {key: 'c', label: 'Ready', caption: 'Both tasks converge before submission.', src: screen('Review', 'Everything is ready to submit.', [0, 1])},
  ],
}

const lineViz = {
  eyebrow: 'Evidence · illustrative',
  title: 'Trend blocks stay native to the portfolio',
  description: 'This playground uses illustrative values only. In Sanity the same block can read manual rows or an uploaded CSV.',
  takeaway: 'The point is not the decorative chart. The block pairs evidence with the interpretation you are actually willing to claim.',
  chartType: 'line',
  evidenceStatus: 'illustrative',
  source: 'Block playground',
  period: '6 periods',
  xLabel: 'Period',
  yLabel: 'Conversion (%)',
  baseline: 30,
  baselineLabel: 'Baseline',
  series: [
    {key: 'baselineSeries', label: 'Baseline', suffix: '%'},
    {key: 'variant', label: 'Variant', suffix: '%'},
  ],
  rows: [
    {label: 'P1', values: [{seriesKey: 'baselineSeries', value: 30}, {seriesKey: 'variant', value: 30.4}]},
    {label: 'P2', values: [{seriesKey: 'baselineSeries', value: 29.8}, {seriesKey: 'variant', value: 31.2}]},
    {label: 'P3', values: [{seriesKey: 'baselineSeries', value: 30.2}, {seriesKey: 'variant', value: 32.6}]},
    {label: 'P4', values: [{seriesKey: 'baselineSeries', value: 30.1}, {seriesKey: 'variant', value: 34.1}]},
    {label: 'P5', values: [{seriesKey: 'baselineSeries', value: 30.3}, {seriesKey: 'variant', value: 33.7}]},
    {label: 'P6', values: [{seriesKey: 'baselineSeries', value: 30}, {seriesKey: 'variant', value: 34.5}]},
  ],
}

const funnelViz = {
  eyebrow: 'Behavior · illustrative',
  title: 'A funnel when the sequence is the evidence',
  chartType: 'funnel',
  evidenceStatus: 'illustrative',
  source: 'Block playground',
  series: [{key: 'users', label: 'Users', suffix: '%'}],
  rows: [
    {label: 'Landing', values: [{seriesKey: 'users', value: 100}]},
    {label: 'Review', values: [{seriesKey: 'users', value: 78}]},
    {label: 'Identity', values: [{seriesKey: 'users', value: 63}]},
    {label: 'Selfie', values: [{seriesKey: 'users', value: 55}]},
    {label: 'Submitted', values: [{seriesKey: 'users', value: 44}]},
  ],
  takeaway: 'Funnel is a distinct portfolio primitive, not a stretched bar-chart screenshot.',
}

const scatterViz = {
  eyebrow: 'Relationship · illustrative',
  title: 'Correlation can be inspectable too',
  description: 'Hover a point to inspect the observation. Method notes can state the boundary of the inference.',
  chartType: 'scatter',
  evidenceStatus: 'derived',
  source: 'Illustrative observations',
  xLabel: 'Input volume',
  yLabel: 'KYC starts',
  series: [{key: 'kyc', label: 'KYC starts'}],
  rows: [
    {label: 'Day 1', x: 32, values: [{seriesKey: 'kyc', value: 28}]},
    {label: 'Day 2', x: 38, values: [{seriesKey: 'kyc', value: 31}]},
    {label: 'Day 3', x: 47, values: [{seriesKey: 'kyc', value: 29}]},
    {label: 'Day 4', x: 52, values: [{seriesKey: 'kyc', value: 35}]},
    {label: 'Day 5', x: 63, values: [{seriesKey: 'kyc', value: 33}]},
    {label: 'Day 6', x: 70, values: [{seriesKey: 'kyc', value: 38}]},
  ],
  methodNote: 'Illustrative only. A correlation block should explicitly distinguish association from causal evidence.',
}

export default function CaseStudyBlocksLab() {
  return (
    <main className="container" style={{padding: '54px 0 100px'}}>
      <div style={{maxWidth: 820, marginBottom: 36}}>
        <div className="kicker"><span className="dot" /> Portfolio system / block playground</div>
        <h1 style={{fontSize: 'clamp(42px, 6vw, 78px)'}}>Narrative, artifact, evidence.</h1>
        <p className="lead">A visual QA page for the new Sanity case-study builder. All numbers on this page are illustrative.</p>
      </div>

      <NarrativeSection
        eyebrow="Narrative block"
        title="Explain the decision before asking someone to inspect it."
        body={[
          {_key: 'p1', _type: 'block', style: 'normal', markDefs: [], children: [{_key: 'c1', _type: 'span', marks: [], text: 'Narrative sections create deliberate editorial hierarchy without forcing every project into one fixed template.'}]},
          {_key: 'p2', _type: 'block', style: 'normal', markDefs: [], children: [{_key: 'c2', _type: 'span', marks: [], text: 'They can sit between normal Portable Text, media, prototypes, comparisons, metrics, and data visualizations.'}]},
        ]}
        callout="Narrative tells the story. Artifact proves it. Evidence bounds the claim."
      />

      <ComparisonBlock
        eyebrow="Comparison block"
        title="Use side-by-side structure when the contrast is the point."
        description="This is for before/after, Flow A/B, first-time/returning, or competing system states."
        left={{label: 'Flow A', title: 'Serial', description: 'Guide → identity → selfie → form. One prescribed sequence.'}}
        right={{label: 'Flow B', title: 'Resumable', description: 'Review → choose task → autosave → return → remaining task.'}}
      />

      <ArtifactExplorer
        eyebrow="Artifact explorer"
        title="Parallel views without a wall of scrolling"
        description="Tabs are for scenarios and evidence views, not for hiding the main narrative."
        tabs={[
          {_key: 'trend', label: 'Trend', title: 'Quantitative outcome', description: 'A DataViz block can live inside the explorer.', kind: 'data', dataViz: lineViz},
          {_key: 'funnel', label: 'Funnel', title: 'Behavioral progression', description: 'Different evidence can be inspected in the same artifact room.', kind: 'data', dataViz: funnelViz},
          {_key: 'prototype', label: 'Prototype', title: 'Product behavior', description: 'The same explorer can switch from evidence to a clickable product artifact.', kind: 'prototype', prototype},
        ]}
      />

      <EvidenceGrid
        eyebrow="Evidence grid · illustrative"
        title="Not every number needs a chart."
        description="Headline metrics should remain legible, factual, and easy to scan."
        columns={3}
        metrics={[
          {_key: 'm1', value: '+11%', label: 'Illustrative uplift', context: 'vs baseline'},
          {_key: 'm2', value: 'N=30', label: 'Illustrative sample', context: '15 / condition'},
          {_key: 'm3', value: '−22%', label: 'Illustrative error change', context: 'after iteration'},
        ]}
      />

      <DataVisualization {...scatterViz} />
    </main>
  )
}
