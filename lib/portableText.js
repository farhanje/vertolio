import {PortableText} from '@portabletext/react'

export function RichText({value}) {
  if (!value) return null
  return (
    <div className="prose">
      <PortableText value={value} />
    </div>
  )
}
