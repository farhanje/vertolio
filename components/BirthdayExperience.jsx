import {RichText} from '../lib/portableText'
import {urlFor} from '../lib/sanity.image'
import BirthdayAudioPlayer from './BirthdayAudioPlayer'
import BirthdayMotion from './BirthdayMotion'

function imageUrl(image, width = 1400) {
  if (!image?.asset) return null
  try {
    const builder = urlFor(image)
    return builder ? builder.width(width).quality(83).auto('format').url() : image.asset.url || null
  } catch (_) {
    return image.asset.url || null
  }
}

function imagePosition(image) {
  const x = image?.hotspot?.x
  const y = image?.hotspot?.y
  return Number.isFinite(x) && Number.isFinite(y)
    ? {objectPosition: (x * 100).toFixed(1) + '% ' + (y * 100).toFixed(1) + '%'}
    : undefined
}

function indexLabel(index) {
  return String(index + 1).padStart(2, '0')
}

function EditorialPicture({image, label, className = '', eager = false}) {
  const src = imageUrl(image, eager ? 1600 : 1400)
  if (!src) return null
  return (
    <figure className={'birthday-picture ' + className} data-birthday-reveal data-birthday-parallax>
      <div className="birthday-picture-frame">
        <img
          src={src}
          alt={image.alt || label || 'A memory'}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
          style={imagePosition(image)}
        />
      </div>
      <figcaption>
        <span>{label}</span>
        {image.caption ? <span>{image.caption}</span> : null}
      </figcaption>
    </figure>
  )
}

export default function BirthdayExperience({experience, preview = false}) {
  const hero = imageUrl(experience?.heroImage, 1900)
  const chapters = experience?.chapters || []
  const audioUrl = experience?.soundtrack?.asset?.url || null

  return (
    <article className="birthday-experience notranslate" lang="en">
      <BirthdayMotion>
        <section className="birthday-hero" aria-label="Birthday introduction">
          <div className="birthday-masthead">
            <span>FARHANJE.COM <span className="birthday-divider-slash">/</span> A PERSONAL EDITION</span>
            <span>01 — FOR EMA</span>
          </div>

          <div className="birthday-hero-grid">
            <div className="birthday-hero-content">
              <p className="birthday-kicker"><span className="birthday-kicker-dot" />AN EXCEPTION TO THE USUAL PORTFOLIO</p>
              <h1>{experience?.title || 'For Ema, With Love.'}</h1>
              <p className="birthday-subtitle">{experience?.heroSubtitle || 'A little corner of the internet, just for you.'}</p>
              <a href="#birthday-story" className="birthday-entry">
                {experience?.entryLabel || 'Enter our story'}
                <span aria-hidden="true">↘</span>
              </a>
            </div>

            <div className="birthday-hero-visual" data-birthday-parallax>
              {hero ? (
                <div className="birthday-hero-image-wrap">
                  <img src={hero} alt={experience?.heroImage?.alt || 'Portrait of Ema'} fetchPriority="high" decoding="async" style={imagePosition(experience?.heroImage)} />
                </div>
              ) : (
                <div className="birthday-image-placeholder" role="note">
                  <span>IMAGE 01 / HERO PORTRAIT</span>
                  <span className="birthday-placeholder-cross" aria-hidden="true">+</span>
                  <span>Awaiting your photograph</span>
                </div>
              )}
              <div className="birthday-hero-caption">
                <span>FIG. 01 / A VERY SPECIAL PERSON</span>
                <span>{hero && experience?.heroImage?.caption ? experience.heroImage.caption : 'A STORY IN THE MAKING'}</span>
              </div>
            </div>
          </div>

          <div className="birthday-hero-bottom">
            <span>NOT A CASE STUDY. JUST A STORY ABOUT YOU.</span>
            <span>SCROLL TO CONTINUE <span aria-hidden="true">↓</span></span>
          </div>
        </section>

        <main id="birthday-story" className="birthday-story">
          <div className="birthday-story-heading" data-birthday-reveal>
            <span>THE STORY / AN OPEN LETTER</span>
            <span>{String(chapters.length).padStart(2, '0')} SECTIONS</span>
          </div>

          {chapters.length === 0 && preview ? (
            <section className="birthday-empty-chapter" data-birthday-reveal>
              <div className="birthday-chapter-number"><span>01 / WORK IN PROGRESS</span><span>YOUR STORY GOES HERE</span></div>
              <div className="birthday-empty-grid">
                <h2>A story still being written<span aria-hidden="true">.</span></h2>
                <div>
                  <p>The page, typography, transitions and animations are ready. Add your first chapter, photographs or a short note in Sanity to fill this space.</p>
                  <span>NO PLACEHOLDER MEMORIES. JUST YOURS.</span>
                </div>
              </div>
            </section>
          ) : null}

          {chapters.map((chapter, index) => {
            const no = indexLabel(index)
            const isAlternate = index % 2 === 1
            if (chapter._type === 'birthdayStoryChapter') {
              return (
                <section className="birthday-chapter birthday-written-section" data-align={isAlternate ? 'reverse' : 'normal'} key={chapter._key || no}>
                  <div className="birthday-chapter-number" data-birthday-reveal>
                    <span>{no} / THE WRITTEN WORD</span>
                    <span>FOR YOU, ALWAYS</span>
                  </div>
                  <div className="birthday-written-grid">
                    <div className="birthday-written-copy">
                      {chapter.heading ? <h2 data-birthday-reveal>{chapter.heading}</h2> : null}
                      {chapter.body?.length ? <div className="birthday-prose" data-birthday-reveal><RichText value={chapter.body} lang="en" /></div> : null}
                    </div>
                    {chapter.image?.asset ? (
                      <EditorialPicture image={chapter.image} label={'FIG. ' + no + ' / A MEMORY'} className="birthday-written-photo" />
                    ) : null}
                  </div>
                </section>
              )
            }
            if (chapter._type === 'birthdayPhotoCollage') {
              return (
                <section className="birthday-chapter birthday-gallery-section" key={chapter._key || no}>
                  <div className="birthday-chapter-number" data-birthday-reveal>
                    <span>{no} / THE LITTLE THINGS</span>
                    <span>COLLECTED MOMENTS</span>
                  </div>
                  {chapter.heading ? <h2 data-birthday-reveal>{chapter.heading}</h2> : null}
                  <div className="birthday-photo-grid">
                    {(chapter.photos || []).map((photo, photoIndex) => (
                      <EditorialPicture
                        key={photo._key || String(photoIndex)}
                        image={photo}
                        label={'FIG. ' + no + '.' + String(photoIndex + 1).padStart(2, '0')}
                        className="birthday-gallery-photo"
                      />
                    ))}
                  </div>
                </section>
              )
            }
            if (chapter._type === 'birthdayQuote') {
              return (
                <section className="birthday-chapter birthday-note" key={chapter._key || no}>
                  <div className="birthday-chapter-number" data-birthday-reveal>
                    <span>{no} / AN EXTRA THOUGHT</span>
                    <span>JUST BETWEEN US</span>
                  </div>
                  <div className="birthday-note-content" data-birthday-reveal>
                    <span aria-hidden="true" className="birthday-opening-quote">“</span>
                    <blockquote>{chapter.quote}</blockquote>
                    {chapter.attribution ? <p>— {chapter.attribution}</p> : null}
                  </div>
                </section>
              )
            }
            return null
          })}

          <footer className="birthday-ending" data-birthday-reveal>
            <span>END OF ISSUE 01 — NOT THE END OF THE STORY</span>
            <h2>With love,<br />Farhan<span aria-hidden="true">.</span></h2>
            <div className="birthday-ending-rule" />
            <span>MADE WITH ALL MY HEART.</span>
          </footer>
        </main>
      </BirthdayMotion>
      {audioUrl ? <BirthdayAudioPlayer src={audioUrl} title={experience?.soundtrackTitle || 'Our soundtrack'} /> : null}
    </article>
  )
}
