'use client'

export default function BirthdayPreviewLink() {
  const button = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    padding: '9px 13px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 13,
    background: '#222',
    color: '#fff',
  }

  return (
    <div style={{padding: 16, borderRadius: 8, background: '#f5f5f5', border: '1px solid rgba(0,0,0,.13)'}}>
      <div style={{fontWeight: 600, fontSize: 14, marginBottom: 8}}>Private birthday preview</div>
      <p style={{fontSize: 12, lineHeight: 1.6, margin: '0 0 12px', color: '#555'}}>
        Open the in-progress birthday website without activating the public homepage. The preview shows your saved
        unpublished draft content. You may be asked for your existing Studio login.
      </p>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
        <a href="/dear-ema" target="_blank" rel="noopener noreferrer" style={button}>Open private preview ↗</a>
        <a href="/dear-ema?intro=1" target="_blank" rel="noopener noreferrer" style={{...button, background: '#fff', color: '#222', border: '1px solid #ccc'}}>
          Preview opening transition ↗
        </a>
      </div>
      <div style={{fontSize: 12, lineHeight: 1.6, color: '#666', marginTop: 10}}>
        Save edits in Studio, then refresh the preview tab. Publish only when you want to update the public site.
      </div>
    </div>
  )
}
