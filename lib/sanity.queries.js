import groq from 'groq'

export const SITE_SETTINGS_QUERY = groq`*[_type=="siteSettings"][0]{
  name,
  tagline,
  heroSubtitle,
  heroTickerWords,
  pageAccents,
  resumePdf{ asset->{url,originalFilename} },
  links[]{label,url},
  footerLinks[]{
    label,
    url,
    icon{..., alt, asset->{url}}
  },
  featuredWork[]->{
    title,slug,summary,tags,accent,
    cardImage{..., alt, ratio},
    organization->{name,slug,logo}
  },
  featuredPosts[]->{
    title,slug,excerpt,tags,publishedAt,accent,
    cardImage{..., alt, ratio}
  }
}`

// Optional alternative: drive homepage featured items via per-doc `featured==true`
export const HOME_FEATURED_PROJECTS_QUERY = groq`*[_type=="project" && featured==true]|order(date desc)[0...4]{
  title,slug,summary,tags,accent,
  cardImage{..., alt, ratio},
  organization->{name,slug,logo}
}`

export const HOME_FEATURED_POSTS_QUERY = groq`*[_type=="post" && featured==true]|order(publishedAt desc)[0...4]{
  title,slug,excerpt,tags,publishedAt,accent,
  cardImage{..., alt, ratio}
}`

export const ORGANIZATIONS_QUERY = groq`*[_type=="organization"]|order(order asc){name,slug,order,logo}`

export const WORK_INDEX_QUERY = groq`*[_type=="project"]|order(date desc){
  title,slug,summary,tags,date,accent,
  cardImage{..., alt, ratio},
  organization->{name,slug,order,logo}
}`

export const PROJECT_BY_SLUG_QUERY = groq`*[_type=="project" && slug.current==$slug][0]{
  title,slug,summary,tags,date,role,timeline,tools,accent,
  cardImage{..., alt, ratio},
  organization->{name,slug,logo},
  body
}`

export const BLOG_INDEX_QUERY = groq`*[_type=="post"]|order(publishedAt desc){
  title,slug,publishedAt,excerpt,tags,accent,
  cardImage{..., alt, ratio}
}`

export const POST_BY_SLUG_QUERY = groq`*[_type=="post" && slug.current==$slug][0]{
  title,slug,publishedAt,excerpt,tags,accent,body
}`
