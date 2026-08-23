import groq from 'groq'

export const SITE_SETTINGS_QUERY = groq`*[_type=="siteSettings"][0]{
  name,
  tagline,
  taglineEn,
  heroSubtitle,
  heroSubtitleEn,
  brandLogo{..., alt, altEn, asset->{url}},
  favicon{..., alt, asset->{url}},
  heroTickerWords,
  heroTickerWordsEn,
  heroPortraitDesktop{..., alt, altEn, asset->{url}},
  heroPortraitMobile{..., alt, altEn, asset->{url}},
  about{
    kicker,
    kickerEn,
    title,
    titleEn,
    lead,
    leadEn,
    buttons[]{label,labelEn,url,style},
    body,
    bodyEn,
    images[]{caption,captionEn, image{..., alt, altEn, asset->{url}}}
  },
  seo{
    siteTitle,
    siteTitleEn,
    siteDescription,
    siteDescriptionEn,
    ogImage{..., alt, altEn, asset->{url}},
    commentsRepo
  },
  pageAccents,
  resumePdf{ asset->{url,originalFilename} },
  links[]{label,labelEn,url},
  footerLinks[]{
    label,
    labelEn,
    url,
    icon{..., alt, altEn, asset->{url}}
  },
  featuredWork[]->{
    title,titleEn,slug,summary,summaryEn,tags,tagsEn,accent,workOrder,
    cardStat{value,label,labelEn},
    cardImage{..., alt, altEn, ratio},
    organization->{name,slug,logo}
  },
  featuredPosts[]->{
    title,titleEn,slug,excerpt,excerptEn,tags,tagsEn,publishedAt,accent,
    cardImage{..., alt, altEn, ratio}
  }
}`

// Optional alternative: drive homepage featured items via per-doc `featured==true`
export const HOME_FEATURED_PROJECTS_QUERY = groq`*[_type=="project" && featured==true]|order(date desc)[0...4]{
  title,titleEn,slug,summary,summaryEn,tags,tagsEn,accent,workOrder,
  cardStat{value,label,labelEn},
  cardImage{..., alt, altEn, ratio},
  organization->{name,slug,logo}
}`

export const HOME_FEATURED_POSTS_QUERY = groq`*[_type=="post" && featured==true]|order(publishedAt desc)[0...4]{
  title,titleEn,slug,excerpt,excerptEn,tags,tagsEn,publishedAt,accent,
  cardImage{..., alt, altEn, ratio}
}`

export const ORGANIZATIONS_QUERY = groq`*[_type=="organization"]|order(order asc){name,slug,order,logo}`

export const WORK_INDEX_QUERY = groq`*[_type=="project"]|order(date desc){
  title,titleEn,slug,summary,summaryEn,tags,tagsEn,date,accent,workOrder,
  cardStat{value,label,labelEn},
  cardImage{..., alt, altEn, ratio},
  organization->{name,slug,order,logo}
}`

export const PROJECT_BY_SLUG_QUERY = groq`*[_type=="project" && slug.current==$slug][0]{
  title,titleEn,slug,summary,summaryEn,tags,tagsEn,date,
  role,roleEn,timeline,timelineEn,tools,accent,
  cardImage{..., alt, altEn, ratio},
  organization->{name,slug,logo},
  body,
  bodyEn
}`

export const RECRUITER_LINK_BY_CODE_QUERY = groq`*[
  _type=="recruiterLink" &&
  linkCode.current==$code &&
  active==true &&
  (!defined(expiresAt) || expiresAt > now())
][0]{
  _id,
  company,
  role,
  linkCode,
  message,
  messageEn,
  showResume,
  showAllWork,
  sentAt,
  selectedProjects[]->{
    _id,
    title,titleEn,slug,summary,summaryEn,tags,tagsEn,date,accent,workOrder,
    cardStat{value,label,labelEn},
    cardImage{..., alt, altEn, ratio},
    organization->{name,slug,logo}
  }
}`

export const BLOG_INDEX_QUERY = groq`*[_type=="post"]|order(publishedAt desc){
  title,titleEn,slug,publishedAt,excerpt,excerptEn,tags,tagsEn,accent,
  cardImage{..., alt, altEn, ratio}
}`

export const POST_BY_SLUG_QUERY = groq`*[_type=="post" && slug.current==$slug][0]{
  title,titleEn,slug,publishedAt,excerpt,excerptEn,tags,tagsEn,accent,body,bodyEn
}`
