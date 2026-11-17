import {RichText} from '../lib/portableText'
import BirthdayAudioPlayer from './BirthdayAudioPlayer'

function photoSource(image) {
  return image?.asset?.url || null
}

export default function BirthdayExperience({experience}) {
  const hero = photoSource(experience?.heroImage)
  const chapters = experience?.chapters || []
  const audioUrl = experience?.soundtrack?.asset?.url || null

  return (
    <article className="birthday-experience notranslate" lang="en">
      <section className="birthday-hero" aria-label="Birthday introduction">
        {hero ? <img src={hero} className="birthday-hero-photo" alt={experience?.heroImage?.alt || 'A birthday portrait'} /> : null}
        <div className="birthday-hero-shade" />
        <div className="birthday-hero-content">
          <div className="birthday-eyebrow">A LITTLE SOMETHING, JUST FOR YOU</div>
          <h1>{experience?.title || 'For Ema, With Love.'}</h1>
          <p>{experience?.heroSubtitle || ''}</p>
          <a href="#birthday-story" className="birthday-entry">{experience?.entryLabel || 'Enter our story'} ↓</a>
        </div>
      </section>
      <div className="birthday-story" id="birthday-story">
        {chapters.map((chapter) => {
          if (chapter._type === 'birthdayStoryChapter') {
            const imageUrl = photoSource(chapter.image)
            return (
              <section className="birthday-chapter" key={chapter._key}>
                {chapter.heading ? <h2>{chapter.heading}</h2> : null}
                {chapter.body?.length ? <div className="birthday-prose"><RichText value={chapter.body} lang="en" /></div> : null}
                {imageUrl ? <figure><img loading="lazy" src={imageUrl} alt={chapter.image?.alt || chapter.heading || 'A memory'} />{chapter.image?.caption ? <figcaption>{chapter.image.caption}</figcaption> : null}</figure> : null}
              </section>
            )
          }
          if (chapter._type === 'birthdayPhotoCollage') {
            return (
              <section className="birthday-chapter" key={chapter._key}>
                {chapter.heading ? <h2>{chapter.heading}</h2> : null}
                <div className="birthday-photo-grid">
                  {(chapter.photos || []).map((photo) => photoSource(photo) ? (
                    <figure key={photo._key}><img loading="lazy" src={photoSource(photo)} alt={photo.alt || 'A shared memory'} />{photo.caption ? <figcaption>{photo.caption}</figcaption> : null}</figure>
                  ) : null)}
                </div>
              </section>
            )
          }
          if (chapter._type === 'birthdayQuote') {
            return (
              <section className="birthday-chapter birthday-note" key={chapter._key}>
                <blockquote>{chapter.quote}</blockquote>
                {chapter.attribution ? <p>— {chapter.attribution}</p> : null}
              </section>
            )
          }
          return null
        })}
        <footer className="birthday-ending">With love, Farhan.</footer>
      </div>
      {audioUrl ? <BirthdayAudioPlayer src={audioUrl} title={experience?.soundtrackTitle || 'Our soundtrack'} /> : null}
    </article>
  )
}
