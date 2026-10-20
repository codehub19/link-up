/*
 * Internship profiles. Each one is a template for the offer letter, completion
 * letter and certificate. The text is copied into every document when it is
 * issued, so editing it here never changes documents already issued.
 * Keep the keys and titles in sync with INTERN_TRACKS in src/services/interns.ts.
 */

export type InternTrack = {
  key: string
  title: string
  department: string
  /** Offer letter: what the role is about (one sentence, follows "You will…"). */
  summary: string
  responsibilities: string[]
  learning: string[]
  /** Completion letter: "During the internship, {first} …" */
  completion: string
}

export const INTERN_TRACKS: Record<string, InternTrack> = {
  business_development: {
    key: 'business_development',
    title: 'Business Development Intern',
    department: 'Growth & Partnerships',
    summary: 'help us grow among college students by building partnerships with clubs, societies, fest teams and colleges, and by bringing new students onto the platform',
    responsibilities: [
      'Identify and reach out to college clubs, societies, fest teams and student bodies for partnerships.',
      'Pitch the platform to student communities and convert interest into sign-ups using your personal invite link.',
      'Plan and run on-campus and online campaigns: stalls, posters, events and social media drives.',
      'Track your outreach and results, and share structured feedback from students with the team.',
      'Complete assigned tasks and log your work in the intern portal every week.',
    ],
    learning: ['Partnership outreach and negotiation', 'Pitching and communication', 'Campaign planning and execution', 'Working with growth metrics'],
    completion: 'worked with our Growth & Partnerships team on building partnerships with student communities, pitching the platform to students and running outreach campaigns on campus and online',
  },
  campus_ambassador: {
    key: 'campus_ambassador',
    title: 'Campus Ambassador',
    department: 'Community',
    summary: 'represent us on your campus, introduce the platform to fellow students and build an active community around it',
    responsibilities: [
      'Represent the company on your campus and introduce the platform to students across years and branches.',
      'Share your personal invite link and QR code through student groups, hostels, clubs and social media.',
      'Organise or support small on-campus activities such as stalls, meetups and poster drives.',
      'Collect honest feedback from students and share it with the team.',
      'Complete assigned tasks and log your work in the intern portal every week.',
    ],
    learning: ['Community building', 'Public speaking and networking', 'Grassroots marketing', 'Ownership and self-management'],
    completion: 'represented the company on campus, introducing the platform to fellow students, building a community around it and organising promotional activities',
  },
  marketing: {
    key: 'marketing',
    title: 'Marketing & Social Media Intern',
    department: 'Marketing',
    summary: 'plan and run our marketing on social media and help grow our brand among college students',
    responsibilities: [
      'Plan and publish content for Instagram, LinkedIn and other channels in line with the content calendar.',
      'Write captions, campaign copy and short-form video ideas aimed at college students.',
      'Run campaigns and collaborations with student pages, creators and clubs.',
      'Track reach, engagement and sign-ups, and suggest improvements based on the numbers.',
      'Complete assigned tasks and log your work in the intern portal every week.',
    ],
    learning: ['Social media strategy', 'Copywriting and storytelling', 'Campaign analytics', 'Brand building'],
    completion: 'worked with our Marketing team on social media content, campaigns and collaborations, and on tracking and improving campaign performance',
  },
  content_design: {
    key: 'content_design',
    title: 'Content & Graphic Design Intern',
    department: 'Brand & Design',
    summary: 'create the visual and written content that represents our brand, from social media creatives to posters and short videos',
    responsibilities: [
      'Design social media creatives, posters, banners and event material in line with the brand guidelines.',
      'Edit short-form videos and reels for social media.',
      'Write clear, engaging copy for posts, campaigns and in-app announcements.',
      'Maintain a library of reusable templates and brand assets.',
      'Complete assigned tasks and log your work in the intern portal every week.',
    ],
    learning: ['Visual and brand design', 'Video editing', 'Content writing', 'Design for real campaigns'],
    completion: 'worked with our Brand & Design team on social media creatives, posters, short-form videos and campaign copy',
  },
  software: {
    key: 'software',
    title: 'Software Development Intern',
    department: 'Engineering',
    summary: 'build and improve features of our web application and backend alongside the founding team',
    responsibilities: [
      'Build and improve features in the web application (React, TypeScript) and backend services (Firebase, Node.js).',
      'Fix bugs, write tests and improve the performance and reliability of the platform.',
      'Take part in code reviews and follow the team’s security and privacy practices.',
      'Document your work clearly so others can build on it.',
      'Complete assigned tasks and log your work in the intern portal every week.',
    ],
    learning: ['Full-stack web development', 'Shipping production features', 'Security and privacy practices', 'Code review and collaboration'],
    completion: 'worked with our Engineering team on building and improving features of the web application and backend services, fixing issues and improving reliability',
  },
  operations: {
    key: 'operations',
    title: 'Operations & Community Intern',
    department: 'Operations',
    summary: 'keep our community running smoothly, from supporting users and moderating content to coordinating events and groups',
    responsibilities: [
      'Respond to user queries and support requests in a timely and friendly manner.',
      'Help moderate reports and content in line with the Community Guidelines.',
      'Coordinate events, interest groups and campus activities with the team.',
      'Maintain trackers and prepare short reports on community activity.',
      'Complete assigned tasks and log your work in the intern portal every week.',
    ],
    learning: ['Operations and process management', 'User support', 'Trust and safety basics', 'Event coordination'],
    completion: 'worked with our Operations team on user support, community moderation and the coordination of events and interest groups',
  },
}

export const DEFAULT_TRACK = 'business_development'
export const trackFor = (key?: string | null) => INTERN_TRACKS[key || ''] || INTERN_TRACKS[DEFAULT_TRACK]
