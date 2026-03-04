// src/seo/seo-config.ts
// Central SEO configuration — all keywords, page meta, and structured data builders

export const SITE = {
  name: 'Draw in the Air',
  url: 'https://drawintheair.com',
  description: 'Draw in the Air — the free, browser-based gesture drawing app for kids. Trace letters A–Z and numbers 0–9, pop bubbles, and learn through hand-tracking. No download needed.',
  twitter: '@drawintheair',
  ogImage: 'https://drawintheair.com/og-default.jpg',
  logo: 'https://drawintheair.com/logo.png',
  appPath: '/play',
};

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const NUMBERS = ['1','2','3','4','5','6','7','8','9','10'];
export const SHAPES = ['circle','triangle','square','star','heart','rectangle','diamond','oval'];

// ─── Phonics map ────────────────────────────────────────────────────────────
export const PHONICS: Record<string, { sound: string; word: string; emoji: string }> = {
  A: { sound: '/æ/', word: 'Apple', emoji: '🍎' },
  B: { sound: '/b/', word: 'Ball', emoji: '⚽' },
  C: { sound: '/k/', word: 'Cat', emoji: '🐱' },
  D: { sound: '/d/', word: 'Dog', emoji: '🐶' },
  E: { sound: '/ɛ/', word: 'Egg', emoji: '🥚' },
  F: { sound: '/f/', word: 'Fish', emoji: '🐟' },
  G: { sound: '/ɡ/', word: 'Goat', emoji: '🐐' },
  H: { sound: '/h/', word: 'Hat', emoji: '🎩' },
  I: { sound: '/ɪ/', word: 'Igloo', emoji: '🏔️' },
  J: { sound: '/dʒ/', word: 'Jam', emoji: '🍓' },
  K: { sound: '/k/', word: 'Kite', emoji: '🪁' },
  L: { sound: '/l/', word: 'Lion', emoji: '🦁' },
  M: { sound: '/m/', word: 'Moon', emoji: '🌙' },
  N: { sound: '/n/', word: 'Nest', emoji: '🪺' },
  O: { sound: '/ɒ/', word: 'Orange', emoji: '🍊' },
  P: { sound: '/p/', word: 'Penguin', emoji: '🐧' },
  Q: { sound: '/kw/', word: 'Queen', emoji: '👑' },
  R: { sound: '/r/', word: 'Rabbit', emoji: '🐰' },
  S: { sound: '/s/', word: 'Sun', emoji: '☀️' },
  T: { sound: '/t/', word: 'Tiger', emoji: '🐯' },
  U: { sound: '/ʌ/', word: 'Umbrella', emoji: '☂️' },
  V: { sound: '/v/', word: 'Van', emoji: '🚐' },
  W: { sound: '/w/', word: 'Water', emoji: '💧' },
  X: { sound: '/ks/', word: 'Fox', emoji: '🦊' },
  Y: { sound: '/j/', word: 'Yellow', emoji: '🌟' },
  Z: { sound: '/z/', word: 'Zebra', emoji: '🦓' },
};

// ─── Shape meta ─────────────────────────────────────────────────────────────
export const SHAPE_META: Record<string, { emoji: string; sides: string; description: string }> = {
  circle:    { emoji: '⭕', sides: 'no corners',       description: 'A perfectly round shape with no corners or sides.' },
  triangle:  { emoji: '🔺', sides: '3 sides, 3 corners', description: 'A shape with three sides and three corners (vertices).' },
  square:    { emoji: '⬛', sides: '4 equal sides',    description: 'A shape with four equal sides and four right-angle corners.' },
  star:      { emoji: '⭐', sides: '5 points',          description: 'A five-pointed shape — a favourite to draw in the air!' },
  heart:     { emoji: '❤️', sides: '2 bumps, 1 point', description: 'A romantic shape with two rounded bumps at the top and a point at the bottom.' },
  rectangle: { emoji: '▬', sides: '4 sides (2 pairs)', description: 'Like a square but with two longer sides and two shorter sides.' },
  diamond:   { emoji: '💎', sides: '4 equal sides',    description: 'A rotated square — four equal sides pointing up, down, left, and right.' },
  oval:      { emoji: '🥚', sides: 'no corners',       description: 'Like a stretched circle — an elongated round shape.' },
};

// ─── Number meta ─────────────────────────────────────────────────────────────
export const NUMBER_META: Record<string, { emoji: string; funFact: string; word: string }> = {
  '1':  { emoji: '1️⃣', funFact: 'Number 1 is the first counting number!', word: 'one' },
  '2':  { emoji: '2️⃣', funFact: 'Most animals have 2 eyes!', word: 'two' },
  '3':  { emoji: '3️⃣', funFact: 'A triangle has 3 sides!', word: 'three' },
  '4':  { emoji: '4️⃣', funFact: 'A square has 4 corners!', word: 'four' },
  '5':  { emoji: '5️⃣', funFact: 'You have 5 fingers on each hand!', word: 'five' },
  '6':  { emoji: '6️⃣', funFact: 'A ladybug usually has 6 legs!', word: 'six' },
  '7':  { emoji: '7️⃣', funFact: 'There are 7 days in a week!', word: 'seven' },
  '8':  { emoji: '8️⃣', funFact: 'A spider has 8 legs!', word: 'eight' },
  '9':  { emoji: '9️⃣', funFact: 'Cats are said to have 9 lives!', word: 'nine' },
  '10': { emoji: '🔟', funFact: 'You have 10 fingers and 10 toes!', word: 'ten' },
};

// ─── Page meta ───────────────────────────────────────────────────────────────
export const PAGE_META = {
  home: {
    title: 'Draw in the Air — Free Gesture Drawing App for Kids | No Download',
    description: 'Draw in the Air is a free, browser-based gesture learning platform for kids. Use your finger through the webcam to trace letters, pop bubbles, and draw in the air. No download needed. Ages 3–8.',
    keywords: ['air drawing app for kids','gesture drawing kids','hand tracking drawing','draw in the air with finger','webcam drawing for kids','free kids drawing app browser','letter tracing webcam','preschool learning games'],
    canonical: '/',
  },
  letterTracing: {
    title: 'Letter Tracing A–Z in the Air — Free Alphabet Learning | Draw in the Air',
    description: 'Interactive alphabet tracing using webcam hand detection. Kids trace letters A–Z in the air with their finger, building handwriting skills through gesture. Free, browser-based, no download.',
    keywords: ['letter tracing online free','alphabet tracing kids','air writing letters','trace letters with finger webcam','interactive alphabet learning'],
    canonical: '/letter-tracing',
  },
  freePaint: {
    title: 'Free Paint Mode — Draw Anything in the Air | Draw in the Air',
    description: 'Let your child\'s creativity flow with Free Paint mode. Draw anything in the air using hand tracking — no mouse, no touchscreen needed. 100% browser-based and free.',
    keywords: ['free paint air drawing','kids webcam art','hand tracking art app','gesture painting for kids','browser drawing app no download'],
    canonical: '/free-paint',
  },
  bubblePop: {
    title: 'Bubble Pop Game — Free Hand Tracking Game for Kids | Draw in the Air',
    description: 'Pop bubbles by pointing in the air! A fun, gesture-controlled learning game that builds hand-eye coordination. Free browser game, no app download needed. Ages 3–8.',
    keywords: ['bubble pop game for kids','hand tracking game browser','kids webcam game free','gesture game preschool','hand eye coordination game kids'],
    canonical: '/activities/bubble-pop',
  },
  sortAndPlace: {
    title: 'Sort and Place — Gesture Sorting Game for Kids | Draw in the Air',
    description: 'Sort and place objects by pointing in the air! A hands-free sorting game that develops categorisation and cognitive skills. Perfect for ages 3–7. Free, browser-based, no download.',
    keywords: ['sorting game for kids online','gesture sorting game','preschool categorising game','kids hand tracking sorting','educational sorting game free'],
    canonical: '/activities/sort-and-place',
  },
  forParents: {
    title: 'For Parents — Safe Screen-Smart Gesture Learning | Draw in the Air',
    description: 'Draw in the Air is a screen-smart alternative for curious kids. No ads, no accounts, no downloads. Develops motor skills, letter recognition, and hand-eye coordination through play. Ages 3–8.',
    keywords: ['educational app for kids parents','safe kids learning app','screen-free learning games','motor skills app kids','preschool learning technology parents','kids STEM activity home'],
    canonical: '/for-parents',
  },
  forTeachers: {
    title: 'For Teachers — Classroom Gesture Learning Tool | Draw in the Air',
    description: 'Bring gesture-based learning into the classroom. Draw in the Air works on any device with a webcam — perfect for interactive whiteboards, Chromebooks, computer labs, and remote learning.',
    keywords: ['classroom interactive learning app','gesture learning tool teachers','STEM activity primary school','alphabet tracing classroom tool','kindergarten tech classroom','teacher approved learning games'],
    canonical: '/for-teachers',
  },
  forHomeschool: {
    title: 'Homeschool Activities — Gesture Learning for Kids at Home | Draw in the Air',
    description: 'Perfect for homeschool families! Draw in the Air offers no-download gesture activities for letters, numbers, and creative drawing. Free, safe, and screen-smart for ages 3–8.',
    keywords: ['homeschool activities preschool','homeschool learning games free','home education activities kids','preschool homeschool curriculum','interactive homeschool app'],
    canonical: '/for-homeschool',
  },
  stemLearning: {
    title: 'STEM Games for Kids — AI Hand Tracking Learning | Draw in the Air',
    description: 'Draw in the Air teaches kids technology concepts through play. Using AI-powered hand tracking, children interact with computers in a whole new way — building early STEM foundations.',
    keywords: ['STEM games for kids','AI learning for kids','technology games preschool','hand tracking STEM activity','computer vision for kids','early STEM learning games'],
    canonical: '/stem-learning',
  },
  learnHub: {
    title: 'Learning Hub — Guides for Parents & Teachers | Draw in the Air',
    description: 'Explore parent and teacher guides on gesture-based learning, fine motor skill development, alphabet learning, and early childhood education. All backed by research.',
    keywords: ['kids learning resources','motor skills development guide','alphabet learning for kids','early childhood education tips','gesture learning for children'],
    canonical: '/learn',
  },
  embed: {
    title: 'Embed Draw in the Air on Your Website | Free Widget for Teachers',
    description: 'Add the Draw in the Air gesture learning widget to your classroom website or school blog. Free to embed, no coding required. Copy the code and paste it anywhere.',
    keywords: ['embed kids learning app','classroom website widget','free educational widget embed'],
    canonical: '/embed',
  },
  press: {
    title: 'Press Kit — Draw in the Air | Media Assets & Brand Guide',
    description: 'Download brand assets, screenshots, app descriptions, and contact information for Draw in the Air. For journalists, bloggers, and education media.',
    keywords: ['draw in the air press kit','edtech media kit','gesture learning app press'],
    canonical: '/press',
  },
  freeResources: {
    title: 'Free Printable Worksheets for Kids — Letter & Number Tracing | Draw in the Air',
    description: 'Download free printable tracing worksheets for letters A–Z and numbers 1–10. Perfect companions to the Draw in the Air web app. No login required.',
    keywords: ['free printable letter tracing worksheets','alphabet worksheets for kids','number tracing worksheets free','preschool printable activities'],
    canonical: '/free-resources',
  },
  drawHeart: {
    title: 'Draw a Heart in the Air — Free Challenge | Draw in the Air',
    description: 'Can you draw a perfect heart shape in the air using just your finger? Try this free, webcam-powered air drawing challenge! No download needed.',
    keywords: ['draw heart in air','heart drawing challenge kids','air drawing shapes free'],
    canonical: '/draw-heart-in-air',
  },
  drawStar: {
    title: 'Draw a Star in the Air — Free Webcam Challenge | Draw in the Air',
    description: 'Try the star drawing challenge! Use your finger through the webcam to draw a perfect star shape in the air. Free, instant, no download needed.',
    keywords: ['draw star in air','star drawing challenge','air drawing game free'],
    canonical: '/draw-star-in-air',
  },
  drawAlphabet: {
    title: 'Draw the Alphabet in the Air — A–Z Air Writing Challenge | Draw in the Air',
    description: 'Write every letter of the alphabet in the air using hand tracking! A fun literacy challenge for kids and adults alike. Free, instant browser activity.',
    keywords: ['draw alphabet in air','alphabet challenge kids','air writing ABC free'],
    canonical: '/draw-alphabet-in-air',
  },
  christmas: {
    title: 'Christmas Drawing for Kids — Free Festive Air Drawing | Draw in the Air',
    description: 'Celebrate Christmas with fun air drawing activities! Draw stars, Christmas trees, and festive shapes in the air using just your finger and a webcam. Free, no download.',
    keywords: ['christmas drawing for kids','festive kids activities online','christmas learning game free','draw christmas shapes kids'],
    canonical: '/activities/christmas-drawing',
  },
  halloween: {
    title: 'Halloween Drawing for Kids — Free Spooky Air Activities | Draw in the Air',
    description: 'Get spooky with Halloween air drawing! Draw ghosts, pumpkins, and spooky shapes in the air using your finger and webcam. Free, no download, perfect for Halloween.',
    keywords: ['halloween drawing for kids','halloween kids activities online','spooky drawing game children','halloween learning games free'],
    canonical: '/activities/halloween-drawing',
  },
  backToSchool: {
    title: 'Back to School Activities — Free Digital Learning for Kids | Draw in the Air',
    description: 'Start the school year right with free, browser-based learning activities! Practice letters, numbers, and shapes in the air. No download, no login needed. Perfect for ages 3–8.',
    keywords: ['back to school activities kids','back to school learning games','school readiness activities','kindergarten readiness games online'],
    canonical: '/activities/back-to-school',
  },
  aiForKids: {
    title: 'AI for Kids — How Hand Tracking Works | Draw in the Air Learn',
    description: 'A simple, kid-friendly guide to AI hand tracking technology. Learn how computers can see your hand and what this means for the future of learning and play.',
    keywords: ['AI for kids explained','how does hand tracking work','computer vision for children','AI technology kids guide'],
    canonical: '/learn/ai-for-kids',
  },
  screenTimeAlternatives: {
    title: 'Screen-Time Alternatives for Kids — Active Digital Learning | Draw in the Air',
    description: 'Not all screen time is equal. Discover how active, gesture-based learning engages children\'s bodies and minds — and why Draw in the Air is a screen-smart choice for parents.',
    keywords: ['screen time alternatives kids','active screen time children','healthy screen time preschool','screen smart learning apps'],
    canonical: '/learn/screen-time-alternatives',
  },
};

// ─── Shared FAQ for homepage ──────────────────────────────────────────────────
export const HOMEPAGE_FAQ = [
  { q: 'What is Draw in the Air?', a: 'Draw in the Air is a free, browser-based learning platform for children that uses webcam hand tracking. Kids can draw in the air, trace alphabet letters A–Z and numbers 1–10, and play interactive games — no download needed.' },
  { q: 'What age group is Draw in the Air for?', a: 'Draw in the Air is designed primarily for children aged 3–8 years old, covering preschool through early primary school. The activities support letter learning, motor skills, and coordination.' },
  { q: 'Is Draw in the Air safe for children?', a: 'Yes. The webcam feed is processed locally in the browser using AI. We never record, store, or transmit your video. No personal data or account is required.' },
  { q: 'Do I need to download anything?', a: 'No. Draw in the Air runs entirely in your web browser. Just visit the site, allow camera access, and start playing. It works on Chrome, Edge, Firefox, and Safari.' },
  { q: 'What devices does Draw in the Air work on?', a: 'Any device with a webcam and modern browser — laptops, desktops, and compatible tablets. Particularly effective on school Chromebooks and interactive whiteboards.' },
  { q: 'Can teachers use Draw in the Air in class?', a: 'Absolutely. No accounts, no logins, no installation — making it ideal for classroom use. Teachers can project it on an interactive whiteboard or use it in computer labs.' },
  { q: 'Is Draw in the Air free?', a: 'Yes, Draw in the Air is completely free. There are no ads, no subscriptions, and no premium tiers.' },
];

// ─── Structured data builders ────────────────────────────────────────────────
export function buildSoftwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['SoftwareApplication', 'EducationalApplication'],
    name: 'Draw in the Air',
    url: SITE.url,
    description: SITE.description,
    applicationCategory: 'EducationalApplication',
    educationalLevel: ['Preschool', 'Kindergarten', 'Primary School'],
    audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Children' },
    operatingSystem: 'Any (Browser-based)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    featureList: ['Free Paint Mode','Letter Tracing A–Z','Number Tracing 1–10','Shape Tracing','Bubble Pop Game','Sort and Place Game','Webcam hand tracking','No download required'],
    screenshot: SITE.ogImage,
    creator: { '@type': 'Organization', name: 'Draw in the Air', url: SITE.url },
  };
}

export function buildFAQSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function buildBreadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(({ name, path }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE.url}${path}`,
    })),
  };
}

export function buildLearningResourceSchema(name: string, description: string, url: string, teaches: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name,
    description,
    learningResourceType: 'Interactive',
    educationalLevel: ['Preschool', 'Kindergarten'],
    teaches,
    url: `${SITE.url}${url}`,
    provider: { '@type': 'Organization', name: 'Draw in the Air', url: SITE.url },
    isAccessibleForFree: true,
  };
}

export function buildHowToSchema(steps: { name: string; text: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Use Draw in the Air',
    description: 'Get started with Draw in the Air in under 60 seconds — no downloads, no accounts.',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export const HOW_TO_STEPS = [
  { name: 'Visit drawintheair.com', text: 'Open your browser and go to drawintheair.com. No download or account is required.' },
  { name: 'Allow webcam access', text: 'When prompted, click Allow to give the app access to your webcam. Your video is never recorded or uploaded.' },
  { name: 'Choose an activity', text: 'Select Free Paint, Letter Tracing, Bubble Pop, or Sort and Place from the home screen.' },
  { name: 'Raise your index finger', text: 'Hold up your index finger and point it at the screen. The app will detect your hand automatically.' },
  { name: 'Start drawing or playing', text: 'Pinch your thumb and index finger together to draw, open your hand to pause. Move your hand to create in the air!' },
];
