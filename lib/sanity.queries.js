import groq from 'groq'

export const SITE_SETTINGS_QUERY = groq`*[_type=="siteSettings"][0]{
  name,
  tagline,
  heroSubtitle,
  links[]{label,url},
  featuredWork[]->{title,slug,summary,tags,organization->{name,slug}}
}`

export const ORGANIZATIONS_QUERY = groq`*[_type=="organization"]|order(order asc){name,slug,order}`

export const WORK_INDEX_QUERY = groq`*[_type=="project"]|order(date desc){
  title,slug,summary,tags,date,
  organization->{name,slug,order}
}`

export const PROJECT_BY_SLUG_QUERY = groq`*[_type=="project" && slug.current==$slug][0]{
  title,slug,summary,tags,date,role,timeline,tools,
  organization->{name,slug},
  body
}`

export const BLOG_INDEX_QUERY = groq`*[_type=="post"]|order(publishedAt desc){title,slug,publishedAt,excerpt,tags}`

export const POST_BY_SLUG_QUERY = groq`*[_type=="post" && slug.current==$slug][0]{
  title,slug,publishedAt,excerpt,tags,body
}`
