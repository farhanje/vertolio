import RecruiterLinkHelper from '../components/RecruiterLinkHelper'

const SOURCE_OPTIONS = [
  {title: 'LinkedIn', value: 'linkedin'},
  {title: 'Email', value: 'email'},
  {title: 'Application form', value: 'application'},
  {title: 'Referral', value: 'referral'},
  {title: 'Other', value: 'other'},
]

function cleanSlug(input = '') {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

export default {
  name: 'recruiterLink',
  title: 'Recruiter Link',
  type: 'document',
  initialValue: {
    active: true,
    showResume: true,
    showAllWork: true,
  },
  fields: [
    {
      name: 'company',
      title: 'Company',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'The role or opportunity this link is tailored for.',
    },
    {
      name: 'recipientNote',
      title: 'Recipient note — private',
      type: 'string',
      description: 'For your reference only. Never shown on the public recruiter page.',
    },
    {
      name: 'source',
      title: 'Where you sent it',
      type: 'string',
      options: {list: SOURCE_OPTIONS, layout: 'dropdown'},
    },
    {
      name: 'linkCode',
      title: 'Link code',
      type: 'slug',
      description: 'Generates the /for/... URL. Keep the random suffix so forwarded links are less guessable.',
      options: {
        source: (doc) => {
          const suffix = Math.random().toString(36).slice(2, 6)
          return `${doc?.company || 'recruiter'}-${suffix}`
        },
        slugify: cleanSlug,
        maxLength: 80,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'linkHelper',
      title: 'Public link & tracking',
      type: 'string',
      readOnly: true,
      components: {input: RecruiterLinkHelper},
    },
    {
      name: 'messageEn',
      title: 'Custom message — English',
      type: 'text',
      rows: 3,
      description: 'Optional. If blank, the page uses a concise default message.',
    },
    {
      name: 'message',
      title: 'Custom message — Indonesian',
      type: 'text',
      rows: 3,
      description: 'Optional Indonesian version if you plan to share the link locally.',
    },
    {
      name: 'selectedProjects',
      title: 'Selected projects',
      type: 'array',
      description: 'Drag to control the order shown to this recruiter.',
      of: [{type: 'reference', to: [{type: 'project'}]}],
      validation: (Rule) => Rule.unique().max(8),
    },
    {
      name: 'showResume',
      title: 'Show Resume shortcut',
      type: 'boolean',
    },
    {
      name: 'showAllWork',
      title: 'Show View all work shortcut',
      type: 'boolean',
    },
    {
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Turn off to make the public link return a 404 without deleting this record.',
    },
    {
      name: 'sentAt',
      title: 'Sent at',
      type: 'datetime',
    },
    {
      name: 'expiresAt',
      title: 'Expires at — optional',
      type: 'datetime',
      description: 'Leave blank to keep the link active until you disable it manually.',
    },
    {
      name: 'notes',
      title: 'Application notes — private',
      type: 'text',
      rows: 4,
      description: 'Application status, follow-up notes, recruiter context, etc. Never shown publicly.',
    },
  ],
  preview: {
    select: {
      company: 'company',
      role: 'role',
      code: 'linkCode.current',
      active: 'active',
    },
    prepare({company, role, code, active}) {
      const status = active === false ? 'Inactive' : 'Active'
      return {
        title: [company || 'Recruiter link', role].filter(Boolean).join(' · '),
        subtitle: `${status} · /for/${code || 'generate-link-code'}`,
      }
    },
  },
}
