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
export const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const SHAPES = ['circle', 'triangle', 'square', 'star', 'heart', 'rectangle', 'diamond', 'oval'];

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
  circle: { emoji: '⭕', sides: 'no corners', description: 'A perfectly round shape with no corners or sides.' },
  triangle: { emoji: '🔺', sides: '3 sides, 3 corners', description: 'A shape with three sides and three corners (vertices).' },
  square: { emoji: '⬛', sides: '4 equal sides', description: 'A shape with four equal sides and four right-angle corners.' },
  star: { emoji: '⭐', sides: '5 points', description: 'A five-pointed shape — a favourite to draw in the air!' },
  heart: { emoji: '❤️', sides: '2 bumps, 1 point', description: 'A romantic shape with two rounded bumps at the top and a point at the bottom.' },
  rectangle: { emoji: '▬', sides: '4 sides (2 pairs)', description: 'Like a square but with two longer sides and two shorter sides.' },
  diamond: { emoji: '💎', sides: '4 equal sides', description: 'A rotated square — four equal sides pointing up, down, left, and right.' },
  oval: { emoji: '🥚', sides: 'no corners', description: 'Like a stretched circle — an elongated round shape.' },
};

// ─── Number meta ─────────────────────────────────────────────────────────────
export const NUMBER_META: Record<string, { emoji: string; funFact: string; word: string }> = {
  '1': { emoji: '1️⃣', funFact: 'Number 1 is the first counting number!', word: 'one' },
  '2': { emoji: '2️⃣', funFact: 'Most animals have 2 eyes!', word: 'two' },
  '3': { emoji: '3️⃣', funFact: 'A triangle has 3 sides!', word: 'three' },
  '4': { emoji: '4️⃣', funFact: 'A square has 4 corners!', word: 'four' },
  '5': { emoji: '5️⃣', funFact: 'You have 5 fingers on each hand!', word: 'five' },
  '6': { emoji: '6️⃣', funFact: 'A ladybug usually has 6 legs!', word: 'six' },
  '7': { emoji: '7️⃣', funFact: 'There are 7 days in a week!', word: 'seven' },
  '8': { emoji: '8️⃣', funFact: 'A spider has 8 legs!', word: 'eight' },
  '9': { emoji: '9️⃣', funFact: 'Cats are said to have 9 lives!', word: 'nine' },
  '10': { emoji: '🔟', funFact: 'You have 10 fingers and 10 toes!', word: 'ten' },
};

// ─── Page meta ───────────────────────────────────────────────────────────────
export const PAGE_META = {
  home: {
    title: 'Draw in the Air — Free Gesture Drawing App for Kids | No Download',
    description: 'Draw in the Air is a free, browser-based gesture learning platform for kids. Use your finger through the webcam to trace letters, pop bubbles, and draw in the air. No download needed. Ages 3–8.',
    keywords: ['air drawing app for kids', 'gesture drawing kids', 'hand tracking drawing', 'draw in the air with finger', 'webcam drawing for kids', 'free kids drawing app browser', 'letter tracing webcam', 'preschool learning games'],
    canonical: '/',
  },
  letterTracing: {
    title: 'Letter Tracing A–Z in the Air — Free Alphabet Learning | Draw in the Air',
    description: 'Interactive alphabet tracing using webcam hand detection. Kids trace letters A–Z in the air with their finger, building handwriting skills through gesture. Free, browser-based, no download.',
    keywords: ['letter tracing online free', 'alphabet tracing kids', 'air writing letters', 'trace letters with finger webcam', 'interactive alphabet learning'],
    canonical: '/letter-tracing',
  },
  freePaint: {
    title: 'Free Paint Mode — Draw Anything in the Air | Draw in the Air',
    description: 'Let your child\'s creativity flow with Free Paint mode. Draw anything in the air using hand tracking — no mouse, no touchscreen needed. 100% browser-based and free.',
    keywords: ['free paint air drawing', 'kids webcam art', 'hand tracking art app', 'gesture painting for kids', 'browser drawing app no download'],
    canonical: '/free-paint',
  },
  bubblePop: {
    title: 'Bubble Pop Game — Free Hand Tracking Game for Kids | Draw in the Air',
    description: 'Pop bubbles by pointing in the air! A fun, gesture-controlled learning game that builds hand-eye coordination. Free browser game, no app download needed. Ages 3–8.',
    keywords: ['bubble pop game for kids', 'hand tracking game browser', 'kids webcam game free', 'gesture game preschool', 'hand eye coordination game kids'],
    canonical: '/activities/bubble-pop',
  },
  sortAndPlace: {
    title: 'Sort and Place — Gesture Sorting Game for Kids | Draw in the Air',
    description: 'Sort and place objects by pointing in the air! A hands-free sorting game that develops categorisation and cognitive skills. Perfect for ages 3–7. Free, browser-based, no download.',
    keywords: ['sorting game for kids online', 'gesture sorting game', 'preschool categorising game', 'kids hand tracking sorting', 'educational sorting game free'],
    canonical: '/activities/sort-and-place',
  },
  forParents: {
    title: 'For Parents — Safe Screen-Smart Gesture Learning | Draw in the Air',
    description: 'Draw in the Air is a screen-smart alternative for curious kids. No ads, no accounts, no downloads. Develops motor skills, letter recognition, and hand-eye coordination through play. Ages 3–8.',
    keywords: ['educational app for kids parents', 'safe kids learning app', 'screen-free learning games', 'motor skills app kids', 'preschool learning technology parents', 'kids STEM activity home'],
    canonical: '/for-parents',
  },
  forTeachers: {
    title: 'For Teachers — Classroom Gesture Learning Tool | Draw in the Air',
    description: 'Bring gesture-based learning into the classroom. Draw in the Air works on any device with a webcam — perfect for interactive whiteboards, Chromebooks, computer labs, and remote learning.',
    keywords: ['classroom interactive learning app', 'gesture learning tool teachers', 'STEM activity primary school', 'alphabet tracing classroom tool', 'kindergarten tech classroom', 'teacher approved learning games'],
    canonical: '/for-teachers',
  },
  forHomeschool: {
    title: 'Homeschool Activities — Gesture Learning for Kids at Home | Draw in the Air',
    description: 'Perfect for homeschool families! Draw in the Air offers no-download gesture activities for letters, numbers, and creative drawing. Free, safe, and screen-smart for ages 3–8.',
    keywords: ['homeschool activities preschool', 'homeschool learning games free', 'home education activities kids', 'preschool homeschool curriculum', 'interactive homeschool app'],
    canonical: '/for-homeschool',
  },
  stemLearning: {
    title: 'STEM Games for Kids — AI Hand Tracking Learning | Draw in the Air',
    description: 'Draw in the Air teaches kids technology concepts through play. Using AI-powered hand tracking, children interact with computers in a whole new way — building early STEM foundations.',
    keywords: ['STEM games for kids', 'AI learning for kids', 'technology games preschool', 'hand tracking STEM activity', 'computer vision for kids', 'early STEM learning games'],
    canonical: '/stem-learning',
  },
  learnHub: {
    title: 'Learning Hub — Guides for Parents & Teachers | Draw in the Air',
    description: 'Explore parent and teacher guides on gesture-based learning, fine motor skill development, alphabet learning, and early childhood education. All backed by research.',
    keywords: ['kids learning resources', 'motor skills development guide', 'alphabet learning for kids', 'early childhood education tips', 'gesture learning for children'],
    canonical: '/learn',
  },
  embed: {
    title: 'Embed Draw in the Air on Your Website | Free Widget for Teachers',
    description: 'Add the Draw in the Air gesture learning widget to your classroom website or school blog. Free to embed, no coding required. Copy the code and paste it anywhere.',
    keywords: ['embed kids learning app', 'classroom website widget', 'free educational widget embed'],
    canonical: '/embed',
  },
  press: {
    title: 'Press Kit — Draw in the Air | Media Assets & Brand Guide',
    description: 'Download brand assets, screenshots, app descriptions, and contact information for Draw in the Air. For journalists, bloggers, and education media.',
    keywords: ['draw in the air press kit', 'edtech media kit', 'gesture learning app press'],
    canonical: '/press',
  },
  freeResources: {
    title: 'Free Printable Worksheets for Kids — Letter & Number Tracing | Draw in the Air',
    description: 'Download free printable tracing worksheets for letters A–Z and numbers 1–10. Perfect companions to the Draw in the Air web app. No login required.',
    keywords: ['free printable letter tracing worksheets', 'alphabet worksheets for kids', 'number tracing worksheets free', 'preschool printable activities'],
    canonical: '/free-resources',
  },
  // ── Phase 1 Growth Engine — Use-Case Landing Pages ──
  gestureLearning: {
    title: 'Gesture-Based Learning Tools for Early Education — Free | Draw in the Air',
    description: 'Gesture-controlled educational activities for children ages 3–8. Trace letters, sort objects, and play learning games using hand movements detected by webcam. No download, no accounts.',
    keywords: ['gesture-based learning', 'gesture learning tools', 'gesture controlled educational games', 'hand gesture learning activities kids', 'embodied learning technology', 'hand tracking education'],
    canonical: '/gesture-learning',
  },
  classroomMovement: {
    title: 'Movement Learning Activities for Classrooms — Free Browser-Based | Draw in the Air',
    description: 'Transform your classroom with gesture-controlled movement activities. Students trace letters, sort objects, and learn through physical interaction using just a webcam. Free, no download needed.',
    keywords: ['classroom movement activities', 'movement learning for kids', 'active learning classroom activities', 'kinesthetic learning activities primary school', 'movement breaks for students', 'gesture classroom activities free'],
    canonical: '/classroom-movement-activities',
  },
  chromebookTools: {
    title: 'Chromebook Classroom Activities — Free Gesture Learning Games | Draw in the Air',
    description: 'Free browser-based learning activities designed for Chromebooks. No app install needed. Students trace letters and play educational games using hand gestures and the built-in webcam.',
    keywords: ['chromebook classroom activities', 'chromebook learning games free', 'educational chromebook apps', 'chromebook activities for students', 'browser-based learning games chromebook', 'free chromebook educational games'],
    canonical: '/chromebook-learning-tools',
  },
  homeschoolMovement: {
    title: 'Homeschool Movement Learning Games — Free Active Education | Draw in the Air',
    description: 'Active, movement-based learning activities for homeschool families. Children trace letters, numbers, and shapes using hand gestures. Free, browser-based, no downloads. Ages 3–8.',
    keywords: ['homeschool movement activities', 'homeschool learning games free', 'active homeschool activities', 'kinesthetic homeschool curriculum', 'movement learning homeschool', 'active learning games home education'],
    canonical: '/homeschool-movement-learning',
  },
  handEyeCoordination: {
    title: 'Hand-Eye Coordination Activities for Children — Free Games | Draw in the Air',
    description: 'Fun hand-eye coordination activities for children ages 3–8. Trace letters, pop bubbles, and sort objects using hand gestures. Develops visual-motor skills through play. Free, browser-based.',
    keywords: ['hand-eye coordination activities for kids', 'hand-eye coordination games children', 'fine motor coordination activities', 'visual motor activities for children', 'coordination games preschool', 'motor skills activities early years'],
    canonical: '/hand-eye-coordination-activities',
  },
  aiLearningKids: {
    title: 'AI Learning Tools for Kids — Computer Vision Educational Games | Draw in the Air',
    description: 'Introduce children to AI concepts through play. Draw in the Air uses real-time computer vision to track hand gestures, letting kids interact with learning activities through movement. Free.',
    keywords: ['AI learning tools for kids', 'computer vision educational games', 'AI games for children', 'STEM AI activities kids', 'computer vision for kids', 'artificial intelligence learning kids'],
    canonical: '/ai-learning-tools-for-kids',
  },
  drawHeart: {
    title: 'Draw a Heart in the Air — Free Challenge | Draw in the Air',
    description: 'Can you draw a perfect heart shape in the air using just your finger? Try this free, webcam-powered air drawing challenge! No download needed.',
    keywords: ['draw heart in air', 'heart drawing challenge kids', 'air drawing shapes free'],
    canonical: '/draw-heart-in-air',
  },
  drawStar: {
    title: 'Draw a Star in the Air — Free Webcam Challenge | Draw in the Air',
    description: 'Try the star drawing challenge! Use your finger through the webcam to draw a perfect star shape in the air. Free, instant, no download needed.',
    keywords: ['draw star in air', 'star drawing challenge', 'air drawing game free'],
    canonical: '/draw-star-in-air',
  },
  drawAlphabet: {
    title: 'Draw the Alphabet in the Air — A–Z Air Writing Challenge | Draw in the Air',
    description: 'Write every letter of the alphabet in the air using hand tracking! A fun literacy challenge for kids and adults alike. Free, instant browser activity.',
    keywords: ['draw alphabet in air', 'alphabet challenge kids', 'air writing ABC free'],
    canonical: '/draw-alphabet-in-air',
  },
  christmas: {
    title: 'Christmas Drawing for Kids — Free Festive Air Drawing | Draw in the Air',
    description: 'Celebrate Christmas with fun air drawing activities! Draw stars, Christmas trees, and festive shapes in the air using just your finger and a webcam. Free, no download.',
    keywords: ['christmas drawing for kids', 'festive kids activities online', 'christmas learning game free', 'draw christmas shapes kids'],
    canonical: '/activities/christmas-drawing',
  },
  halloween: {
    title: 'Halloween Drawing for Kids — Free Spooky Air Activities | Draw in the Air',
    description: 'Get spooky with Halloween air drawing! Draw ghosts, pumpkins, and spooky shapes in the air using your finger and webcam. Free, no download, perfect for Halloween.',
    keywords: ['halloween drawing for kids', 'halloween kids activities online', 'spooky drawing game children', 'halloween learning games free'],
    canonical: '/activities/halloween-drawing',
  },
  backToSchool: {
    title: 'Back to School Activities — Free Digital Learning for Kids | Draw in the Air',
    description: 'Start the school year right with free, browser-based learning activities! Practice letters, numbers, and shapes in the air. No download, no login needed. Perfect for ages 3–8.',
    keywords: ['back to school activities kids', 'back to school learning games', 'school readiness activities', 'kindergarten readiness games online'],
    canonical: '/activities/back-to-school',
  },
  aiForKids: {
    title: 'AI for Kids — How Hand Tracking Works | Draw in the Air Learn',
    description: 'A simple, kid-friendly guide to AI hand tracking technology. Learn how computers can see your hand and what this means for the future of learning and play.',
    keywords: ['AI for kids explained', 'how does hand tracking work', 'computer vision for children', 'AI technology kids guide'],
    canonical: '/learn/ai-for-kids',
  },
  screenTimeAlternatives: {
    title: 'Screen-Time Alternatives for Kids — Active Digital Learning | Draw in the Air',
    description: 'Not all screen time is equal. Discover how active, gesture-based learning engages children\'s bodies and minds — and why Draw in the Air is a screen-smart choice for parents.',
    keywords: ['screen time alternatives kids', 'active screen time children', 'healthy screen time preschool', 'screen smart learning apps'],
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
    featureList: ['Free Paint Mode', 'Letter Tracing A–Z', 'Number Tracing 1–10', 'Shape Tracing', 'Bubble Pop Game', 'Sort and Place Game', 'Webcam hand tracking', 'No download required'],
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

// ─── Rich per-letter content (unique educational copy for each page) ──────────
export const LETTER_CONTENT: Record<string, {
  formation: string;   // How the letter is physically formed
  exampleSentence: string;
  similarLetters: string;
  parentTip: string;
  funFact: string;
}> = {
  A: { formation: 'Start at the top and draw two diagonal lines downward — like a tent peak — then add a crossbar in the middle.', exampleSentence: '"Apple, ant, and axe all start with the letter A."', similarLetters: 'Children sometimes confuse A with H — remind them that A has the crossbar in the middle while H has it higher.', parentTip: 'Practise A by drawing a mountain shape, then adding a belt across it. Singing the alphabet song while tracing helps reinforce the sound.', funFact: 'A is the first letter of the English alphabet and appears in more than 8% of all written English words — making it one of the most used letters.' },
  B: { formation: 'Draw a vertical line downward, then add two bumps on the right — one on the top half, one on the bottom half.', exampleSentence: '"Ball, bear, and bubble all start with the letter B."', similarLetters: 'B is often confused with D — remember that B has bumps on the right and D has a belly on the right.', parentTip: 'Help your child remember B by calling it "a bat and two balls" — the stick is the bat and the bumps are the balls sitting next to it.', funFact: 'The letter B comes from an ancient symbol meaning "house" — you can still see the house-like shape in its two rounded bumps.' },
  C: { formation: 'Start near the top right and sweep anti-clockwise in a large open curve, stopping before completing the full circle.', exampleSentence: '"Cat, car, and cookie all start with the letter C."', similarLetters: 'C and G look similar — G has an extra horizontal line inside the curve. O is a full circle where C is not.', parentTip: 'C is one of the easiest letters to trace — encourage children to practise it by drawing "almost circles". Pair it with the K sound (cat) and the S sound (city) to build phonics awareness.', funFact: 'C is special because it can make two different sounds — a hard K sound as in "cat" and a soft S sound as in "city" — depending on the vowel that follows it.' },
  D: { formation: 'Draw a straight vertical line, then attach a large rightward curve from the top of the line down to the bottom.', exampleSentence: '"Dog, drum, and door start with the letter D."', similarLetters: 'D and B are mirror images of each other — B has bumps on the right, D has its belly on the right.', parentTip: 'A fun memory trick: D looks like a drum standing upright. The straight line is the rim and the bulge is the drum body.', funFact: 'D is the 4th letter of the alphabet and represents the /d/ sound — one of the first consonant sounds babies learn to make, which is why "dada" is often among first words.' },
  E: { formation: 'Draw a vertical line downward, then add three horizontal lines to the right — one at the top, one in the middle, and one at the bottom.', exampleSentence: '"Egg, elephant, and engine start with the letter E."', similarLetters: 'E and F look similar — E has three prongs while F only has two (E keeps the bottom bar, F does not).', parentTip: 'Think of E as a comb lying on its side. Three teeth stick out — top, middle, bottom. Tracing E helps children understand horizontal and vertical lines.', funFact: 'E is the most common letter in the English language, appearing in about 13% of all text — more than any other letter.' },
  F: { formation: 'Draw a vertical line downward, then a horizontal line at the top and another horizontal line halfway down — no bottom bar.', exampleSentence: '"Fish, frog, and flower start with the letter F."', similarLetters: 'F and E look alike — the key difference is that F has only two prongs and stops at the middle, with no bottom bar.', parentTip: 'Remember F as "E with its bottom line chopped off". Practising F alongside E helps children understand the difference between the two visually similar letters.', funFact: 'In many languages, F represents a sound that does not even exist — it is very specific to Germanic and Romance languages. In English, it makes two sounds: /f/ as in "fish" and /v/ as in "of".' },
  G: { formation: 'Start like a C — sweep anti-clockwise — then add a short horizontal bar pointing inward at the midpoint of the curve.', exampleSentence: '"Goat, grapes, and gift start with the letter G."', similarLetters: 'G is like C with a small shelf added inside. Compare them together when practising to show the one extra stroke.', parentTip: 'G can be tricky because it is not fully closed. Encourage children to draw a C first, then add the "little bench" on the right side.', funFact: 'G was added to the Latin alphabet specifically to distinguish the /g/ sound from /k/ — before that, C did both jobs. A Roman teacher named Spurius Carvilius Ruga is often credited with creating G.' },
  H: { formation: 'Draw two vertical lines, then connect them with a horizontal crossbar exactly in the middle.', exampleSentence: '"Hat, horse, and house all start with H."', similarLetters: 'H and A can confuse young learners — the crossbar on H sits at the midpoint, while on A it is below the middle.', parentTip: 'Think of H as a ladder bridge between two tall posts. Children who visualise it as a playground ladder find it very easy to remember.', funFact: 'H is one of the few letters in English that is sometimes silent — as in "hour" and "honest" — a quirk that can puzzle early readers.' },
  I: { formation: 'Draw a straight vertical line, with a short horizontal cap at the top and bottom.', exampleSentence: '"Ice cream, igloo, and insect start with the letter I."', similarLetters: 'Lowercase i can be confused with l (lowercase L) and the number 1 — print fonts often look very similar.', parentTip: 'Uppercase I looks like a capital H with no middle bar — or like a trophy. Tracing I is a great warm-up because it is mostly straight lines.', funFact: 'The letter I is the only single-letter word used as a pronoun in English, and it is always capitalised — a rule unique to English among all languages.' },
  J: { formation: 'Draw a vertical line downward, then curve it gently to the left at the bottom like a fishhook.', exampleSentence: '"Jam, jungle, and jellyfish start with J."', similarLetters: 'J looks like i without the dot, or like a fishhook. It can be confused with a mirrored 7.', parentTip: 'J is a great letter for teaching curves — guide your child to draw the straight part first, then the hook. Real jam jars often have a J shape on the drip!', funFact: 'J is one of the rarest letters in English — it accounts for less than 0.2% of all text. It is also one of the newest additions to the alphabet, not common in its current form until the 17th century.' },
  K: { formation: 'Draw a vertical line, then two diagonal strokes meeting at the middle of that line — one angled up-right and one angled down-right.', exampleSentence: '"Kite, kitten, and key start with K."', similarLetters: 'K and X can look similar — K has a vertical line on the left where X has two crossing diagonals.', parentTip: 'Think of K as a person kicking a football — the upright body (vertical line) and one leg kicking out in two directions.', funFact: 'K and C often make the same /k/ sound, which confuses many young writers. Generally, K is used before E, I, and Y (like "kitten", "keep"), while C is used before A, O, and U.' },
  L: { formation: 'Draw a long vertical line downward, then pivot and draw a shorter horizontal line to the right at the bottom.', exampleSentence: '"Lion, lemon, and leaf start with L."', similarLetters: 'Lowercase l (L) is easily confused with capital I and the number 1 — uppercase L is more distinct with its obvious foot.', parentTip: 'L is the simplest letter to trace after I — it is just two lines. Practise it by asking children to draw a corner then "put a floor under a wall".', funFact: 'The letter L is believed to come from an ancient symbol for an ox goad — a long stick used to guide cattle. The symbol slowly rotated and simplified over millennia into the L we know today.' },
  M: { formation: 'Start at the bottom-left, go straight up, diagonally down to the centre, diagonally back up, then straight back down to the bottom-right.', exampleSentence: '"Moon, mouse, and mango start with M."', similarLetters: 'M and W are mirror images of each other — M points up (like mountains) and W points down (like waves).', parentTip: 'M looks like two mountains. Draw two triangles side by side and connect the outer bottoms — then trace the outline. The M = Mountains mnemonic is highly effective for children.', funFact: 'M is one of the oldest letters and is believed to represent water in ancient pictographic systems — its wavy shape at the top originally showed rippling waves.' },
  N: { formation: 'Start at the bottom-left, go straight up, then diagonally down to the bottom-right, then straight up again.', exampleSentence: '"Nest, nose, and night start with N."', similarLetters: 'N and M look related — N has one diagonal where M has two. H has a horizontal crossbar where N has a diagonal.', parentTip: 'N is like M with one mountain removed. Once children master M, N follows naturally. Compare the two side by side.', funFact: 'The letter N in English can represent two sounds: the regular /n/ sound as in "no", and the /ŋ/ sound as in "sing" — one of the few letters with a nasal variant.' },
  O: { formation: 'Draw a smooth, complete oval or circle — start at the top and sweep clockwise or anti-clockwise all the way around.', exampleSentence: '"Orange, owl, and ocean start with O."', similarLetters: 'O and C share the same starting shape — O completes the circle where C leaves an opening. O and Q also look alike — Q has a tail.', parentTip: 'O is essentially a perfect circle — practising circles before letters is great preparation. Children enjoy drawing O as "a bouncy ball" or "a planet".', funFact: 'O is the second most common vowel in English and appears in about 7.5% of all text. It also has the most spellings of any vowel — compare "cold", "moon", "love", and "more".' },
  P: { formation: 'Draw a vertical line downward, then attach a half-circle (a bump) on the upper-right side only — like a D on just the top half.', exampleSentence: '"Penguin, pizza, and paint start with P."', similarLetters: 'P and B look similar — check which half has the bump. P has it on top, B has bumps on both halves, and D has a full belly.', parentTip: 'P has a long tail that hangs below the bump. Think of a lollipop — the stick hangs below the ball. This visual helps children avoid writing it upside down.', funFact: 'P is silent in many common English words that come from Greek — such as "psychology", "pneumonia", and "pterodactyl". This surprises most early readers.' },
  Q: { formation: 'Draw a complete circle (like O), then add a small diagonal tail at the bottom-right extending outward.', exampleSentence: '"Queen, quiet, and question start with Q."', similarLetters: 'Q and O are nearly identical — Q’s only difference is the small tail. Q is one of the least used letters of the alphabet.', parentTip: 'Q loves U — in English, Q is almost always followed by the letter U (queen, quick, quiz). Teaching this rule early saves children a lot of confusion.', funFact: 'Q is the second rarest letter in English, appearing in just 0.1% of text. It almost never appears without U following it — an unusual partnership.' },
  R: { formation: 'Draw a vertical line, then a half-circle bump at the top-right, then a diagonal leg kicking down-right from the base of the bump.', exampleSentence: '"Rabbit, rainbow, and rocket start with R."', similarLetters: 'R and P look similar at the top — the difference is R has a diagonal leg at the bottom right that P does not.', parentTip: 'Think of R as P doing a dance move with one leg kicked out. Once children master P, add the kicking leg to make R.', funFact: 'R was called "littera canina" (the dog\'s letter) in ancient Rome because the rolling sound /r/ was thought to sound like a growling dog.' },
  S: { formation: 'Start at the top-right, curve anti-clockwise for the upper half, then reverse and curve clockwise for the lower half — like two connected C shapes.', exampleSentence: '"Sun, snake, and star start with S."', similarLetters: 'S and 5 are frequently confused by young writers — S has no straight lines, while 5 has a flat top.', parentTip: 'S is one of the trickier letters because it changes direction mid-stroke. Try drawing it slowly and clearly: "go left, curve down, go right". Tracing in the air is very helpful for building muscle memory.', funFact: 'S can make three different sounds in English: the hissing /s/ as in "sun", the buzzing /z/ as in "is", and the /ʃ/ sound as in "sure". This versatility makes it the 8th most common letter.' },
  T: { formation: 'Draw a long vertical line downward, then add a horizontal crossbar at the very top — like a cross or a plus sign on a tall pole.', exampleSentence: '"Tiger, tree, and turtle start with T."', similarLetters: 'T and F look alike — T has a full crossbar at the top but no middle bar, F loses the bottom but keeps the middle bar.', parentTip: 'T is one of the most recognisable letters and among the first children learn to write. Point out T shapes in everyday life — telephone poles, table legs, and t-shirt designs all feature T angles.', funFact: 'T is the second most common letter in English, appearing in about 9% of all text. Words like "the", "to", "that", and "this" are among the most used words in the language — all starting with T.' },
  U: { formation: 'Draw two parallel downward lines connected by a curved bottom — like a deep bucket or the letter U itself.', exampleSentence: '"Umbrella, unicorn, and under start with U."', similarLetters: 'U and V look similar — U has a curved bottom while V has a sharp point at the bottom.', parentTip: 'U is like a cup — curved at the bottom so it can hold liquid. Comparing U (curved) with V (pointed) is a great visual lesson for children. Try asking which shape could hold more water!', funFact: 'U and V were once the same letter in the ancient Latin alphabet. The two distinct shapes only split apart in the Middle Ages — which is why many old texts show V where we would write U today.' },
  V: { formation: 'Two diagonal lines starting from the top — one angled down-left and one angled down-right — meeting at a sharp point at the bottom.', exampleSentence: '"Van, volcano, and violin start with V."', similarLetters: 'V and U differ in the bottom — V is pointed and V sounds like a vibration made with teeth on lip. U is rounded.', parentTip: 'V is shaped like a checkmark or a bird dipping in flight. Children often love V because it is simple to draw and they can feel the direction change at the sharp point.', funFact: 'The victory sign (two fingers raised in a V) became globally famous in World War II. Before that, the letter V had been a symbol of victory in Latin: "Victoria".' },
  W: { formation: 'Four diagonal strokes: down-right, up-right, down-right, up-right — like two Vs joined side by side.', exampleSentence: '"Water, whale, and wizard start with W."', similarLetters: 'W is literally M turned upside down — M is for Mountains pointing up, W is for Waves pointing down.', parentTip: 'W is Double-U — its name literally means two U letters side by side, which is visible in its shape. Saying "double-u, double-u" while tracing helps children remember it.', funFact: 'W is the only letter in the English alphabet whose name has more than one syllable: "double-u". Its name describes its appearance — it was originally written as "VV" or "UU" and literally is a doubled letter.' },
  X: { formation: 'Two diagonal lines crossing exactly in the middle — one from top-left to bottom-right, one from top-right to bottom-left.', exampleSentence: '"X-ray and xylophone are famous X words."', similarLetters: 'X and K can be confused — K has a vertical line on the left side, while X crosses in the middle with no vertical.', parentTip: 'X marks the spot — like on a treasure map! This mnemonic is universally loved by children. X is also a perfect letter for teaching diagonal lines.', funFact: 'X is one of the rarest letters in English text, but it has outsized cultural significance: it represents kisses, unknown quantities in algebra, and incorrectness (an X on an answer). In Roman numerals, X means 10.' },
  Y: { formation: 'Two short diagonal lines converge to a point in the middle, then one long vertical line continues downward from that point.', exampleSentence: '"Yellow, yak, and yoghurt start with Y."', similarLetters: 'Y and V share the upper shape — Y continues downward where V ends at the point.', parentTip: 'Y is a fork in the road — two paths from the top join into one path going down. Use the fork-in-the-road image when teaching children to trace Y.', funFact: 'Y is the only letter that regularly functions as both a vowel (as in "gym" or "rhythm") and a consonant (as in "yes" or "year") — making it one of the most flexible letters in the alphabet.' },
  Z: { formation: 'A horizontal line at the top, a diagonal line from top-right down to bottom-left, then a horizontal line at the bottom — three strokes forming a zigzag.', exampleSentence: '"Zebra, zero, and zigzag start with Z."', similarLetters: 'Z and N both have a diagonal stroke — in Z the diagonal goes from top-right to bottom-left, in N it goes from top-left to bottom-right.', parentTip: 'Z is the last letter and one of the rarest — but it is also one of the most fun to draw! The diagonal slash between two flat lines feels very satisfying to trace.', funFact: 'Z is the least used letter in English, appearing in barely 0.07% of text. Despite its rarity, it ends the alphabet — and begins words like "zero" and "zoom" that feel full of energy.' },
};

// ─── Rich per-number content ──────────────────────────────────────────────────
export const NUMBER_CONTENT: Record<string, {
  realWorld: string;
  mathConnection: string;
  formation: string;
  parentTip: string;
}> = {
  '1': { realWorld: 'The number 1 is all around us — one sun in the sky, one nose on a face, one Earth in our solar system. It represents singularity and is the building block of all other numbers.', mathConnection: 'One is the identity element in multiplication — any number multiplied by 1 stays the same. It is neither prime nor composite, a unique property that makes it special in mathematics.', formation: 'Number 1 is a single vertical stroke — the simplest numeral to trace. Start at the top and draw straight down. Some styles add a small diagonal to the upper-left.', parentTip: 'Practise number 1 alongside the letter I — they share the same basic stroke. Pairing them shows children how letters and numbers share forms.' },
  '2': { realWorld: 'Two appears everywhere in nature — two eyes, two ears, two wings on a bird, two sides to a coin. The concept of "pairing" is one of the first mathematical ideas children develop naturally.', mathConnection: 'Two is the only even prime number — a mathematical oddity that surprises many people. It is also the base of the binary system that powers every computer and smartphone.', formation: 'Draw a curve from the upper-left sweeping to the right, then curve downward and sweep left to a flat bottom line. Two is essentially a swan and a flat bed.', parentTip: 'Show your child that 2 looks like a swan bending its neck. Counting pairs of objects at home (shoes, socks, eyes) reinforces the concept before and after tracing.' },
  '3': { realWorld: 'Three is deeply embedded in culture — three wishes in fairy tales, three legs on a tripod, three primary colours, three meals a day. The human brain naturally groups things in threes.', mathConnection: 'Three is the second prime number. Any number whose digits add up to three (or a multiple of three) is divisible by three — a divisibility rule children can practise from an early age.', formation: 'Two bumps to the right — one on the top half and one on the bottom half. Start like a 2 but instead of sweeping to a flat base, curve inward in the middle then outward again.', parentTip: 'Point out the two bumps on 3 — just like the letter B, which also has two bumps. Comparing shapes across letters and numbers builds strong visual pattern recognition.' },
  '4': { realWorld: 'Four corners on a square, four legs on a dog, four wheels on a car, four seasons in a year. The number 4 is one of the first multiples children encounter in everyday life.', mathConnection: 'Four is 2 × 2 — the first perfect square after 1. Counting in fours is a key step toward understanding multiplication tables and grouping.', formation: 'Draw a vertical line down on the right side, cross it with a horizontal line about halfway down, then draw a short vertical lines above-left to meet the crossbar — forming the angled top of the 4.', parentTip: 'Four can be tricky to write because it has both diagonal and straight strokes. Practise it slowly — say "down, across, then down through" as you trace.' },
  '5': { realWorld: 'Five fingers on a hand, five toes on a foot, five petals on many flowers, five senses that help us navigate the world. Five is deeply connected to human anatomy and is the basis of our base-10 counting system.', mathConnection: 'Five is prime and is a factor of every number ending in 5 or 0. The five times table is one of the easiest to learn — answers always end in 0 or 5.', formation: 'A flat horizontal line at the top, then a vertical stroke downward halfway, then curve right and around to close a half-circle at the bottom. Five looks like a flag post with a rounded sail.', parentTip: 'Hold up one hand with all fingers spread — that is five! Connecting the numeral to the child\'s hand makes the number concept tangible and memorable.' },
  '6': { realWorld: 'Six sides on a snowflake or honeycomb cell, six legs on insects, six faces on a cube, six strings on a guitar. The hexagon\'s efficiency is so high that nature and engineering both rely on it.', mathConnection: 'Six is the first perfect number — meaning its factors (1 + 2 + 3) add up to itself. It is also the product of the first three positive integers: 1 × 2 × 3 = 6.', formation: 'Start at the top-right and curve anti-clockwise all the way down, then loop inward and close a full circle at the bottom — like a curled tail that forms a ball at the base.', parentTip: 'Six and nine look like each other flipped — drawing them side by side and comparing helps children remember which is which. Six has the loop at the bottom, nine at the top.' },
  '7': { realWorld: 'Seven days in a week, seven colours in a rainbow, seven continents, seven notes in a musical scale. Seven is culturally considered the luckiest number across many civilisations.', mathConnection: 'Seven is prime. The seven times table is often considered the hardest to memorise — making early recognition of the numeral that much more important as a foundation.', formation: 'A horizontal line at the top, then a diagonal stroke sweeping down to the lower-left. European style adds a small horizontal crossbar through the middle of the diagonal.', parentTip: 'Seven looks like a boomerang or a roof with one side. Some children enjoy drawing the crossbar through the middle (European style) — it makes 7 easier to distinguish from 1.' },
  '8': { realWorld: 'Eight legs on a spider, eight tentacles on an octopus, eight planets in the solar system, eight notes in a musical octave. Eight is also the number of bits in a byte in computing.', mathConnection: 'Eight is 2³ (two cubed) — a perfect power of two. The figure-eight shape (∞) is the universal symbol for infinity when turned on its side.', formation: 'Draw two circles stacked vertically — or draw a continuous S-shape and close both ends. Starting from the top-centre, loop right and around, then reverse direction and close the lower circle.', parentTip: 'Eight looks like two circles stacked on top of each other. Some children find it helpful to draw a 0, then add another 0 on top, then connect them — a simple two-step shortcut.' },
  '9': { realWorld: 'Nine planets were once counted in our solar system, nine players on a baseball team, nine lives famously belonging to cats. Nine is the highest single-digit number before we return to zero.', mathConnection: 'Nine has a special property: the digits of any multiple of 9 always add up to 9 (or a multiple of 9). For example, 9 × 7 = 63, and 6 + 3 = 9. This makes checking multiplication fast.', formation: 'Draw a full circle at the top, then extend a vertical tail downward from the bottom-right of the circle — the mirror image of 6.', parentTip: 'Nine and six are mirrors of each other in both shape and tracing direction. Practising six and nine together is efficient and naturally shows the relationship between them.' },
  '10': { realWorld: 'Ten fingers, ten toes, ten items in a decade of years, ten commandments in biblical tradition. Ten is the foundation of our entire number system — without it, counting beyond nine would look completely different.', mathConnection: 'Ten is the base of our decimal (base-10) number system. Place value — the foundation of all arithmetic — is built entirely on understanding what it means when a digit moves from the ones column to the tens column.', formation: 'Number 10 combines two numerals: a 1 on the left and a 0 on the right. Draw the 1 first, then the oval 0 beside it — two separate strokes that together make one two-digit number.', parentTip: 'Ten is a milestone — the first two-digit number! Celebrate it by counting ten objects, then grouping them as "one ten and zero ones" to introduce place value in a playful, concrete way.' },
};

// ─── Rich per-shape content ───────────────────────────────────────────────────
export const SHAPE_CONTENT: Record<string, {
  realWorldExamples: string;
  geometryFact: string;
  drawingTip: string;
  comparison: string;
  parentTip: string;
}> = {
  circle: { realWorldExamples: 'Circles are everywhere — the sun, the moon, coins, wheels, plates, bubbles, and clock faces. The circle is the most common shape in both nature and human design.', geometryFact: 'A circle has no corners and no straight sides. Every point on its edge is exactly the same distance from its centre — that distance is called the radius. The full distance across is the diameter.', drawingTip: 'To draw a smooth circle in the air, use your whole arm rather than just your wrist. Shoulder-guided arm circles produce a more even curve than wrist motion alone.', comparison: 'A circle is a special type of oval where the width and height are equal. An oval stretches the circle in one direction.', parentTip: 'Practise circles before any other shape — they are the foundation of letters like C, G, O, and Q, and of numerals like 0, 6, 8, and 9. A strong circle stroke unlocks many future letters.' },
  triangle: { realWorldExamples: 'Triangles appear in rooftops, mountains, pyramids, slices of pizza, signage, and the letter A itself. They are the strongest structural shape in engineering, used in bridges and towers.', geometryFact: 'A triangle has 3 sides and 3 corners (called vertices). The three interior angles always add up to exactly 180 degrees — a rule that holds true for every triangle ever drawn.', drawingTip: 'Start at a point at the top, draw down to the bottom-left, across to the bottom-right, then close back up to the top. Three clear strokes — three sides.', comparison: 'Unlike squares and rectangles, triangle sides do not need to be equal. An equilateral triangle has all sides equal; a right-angle triangle has one square corner.', parentTip: 'Point out triangles in the home and on walks — roof peaks, slices of toast, yield signs. Connecting abstract shapes to real objects cements geometric recognition.' },
  square: { realWorldExamples: 'Squares appear on chessboards, window panes, floor tiles, sticky notes, bread slices, and computer icons. The square\'s equal sides make it a symbol of balance and fairness.', geometryFact: 'A square has 4 equal sides and 4 right-angle corners (90 degrees each). It is a special type of rectangle where all four sides are equal in length.', drawingTip: 'Start at the top-left, draw right, then down, then left, then up to close — four equal strokes at right angles. Keep your arm movements sharp and equal for a precise square.', comparison: 'A square is a rectangle where all sides are the same length. A rhombus has equal sides but no right angles — a tilted square is called a rhombus or diamond.', parentTip: 'Squares are perfect for counting — count each side as you draw. Children who count the sides while tracing quickly secure the concept of "four equal sides" deeply in memory.' },
  star: { realWorldExamples: 'Stars decorate national flags, street signs, rating systems, report cards, Christmas trees, and night skies. The five-pointed star is one of the most universally recognised symbols in human history.', geometryFact: 'A five-pointed star has 5 outer points and 5 inner corners — 10 vertices total. Connecting every second vertex of a regular pentagon creates a perfect pentagram.', drawingTip: 'The classic trick is to draw a 5-pointed star in one continuous stroke without lifting: go up, down-right, left, right, down-left, back to start. Tracing teaches this sequence beautifully.', comparison: 'Stars look like multiple triangles sharing a centre point. Each of the five triangular points is an isoceles triangle with a narrow tip angle.', parentTip: 'Star tracing is slightly advanced but hugely motivating — children love the shape. Celebrate a completed star trace enthusiastically; the winding path builds patience and motor precision.' },
  heart: { realWorldExamples: 'The heart shape appears on Valentine\'s cards, playing cards, emojis, clothing, and jewellery worldwide. Although it does not resemble a real anatomical heart, the shape has represented love and emotion for centuries.', geometryFact: 'The heart shape is formed by two semi-circles at the top and two straight (or slightly curved) lines that meet at a point at the bottom. It has a vertical line of symmetry down the middle.', drawingTip: 'Start at the top-centre, curve left and down in a semi-circle to the centre-bottom point, then mirror that curve from the centre back up to the top-right. Two arcs meeting in a V.', comparison: 'A heart is like two letter D shapes placed back-to-back and rotated — or like a circle squashed at the top and pulled to a point at the bottom.', parentTip: 'Children adore the heart shape and find it deeply motivating. Use heart tracing as a reward activity or to celebrate milestones. Drawing hearts on paper alongside digital tracing reinforces the motor pattern.' },
  rectangle: { realWorldExamples: 'Rectangles dominate our built environment — doors, windows, picture frames, books, mobile phone screens, rooms, and bricks are all rectangular. The rectangle\'s ratio of sides is optimised for how humans read and view content.', geometryFact: 'A rectangle has 4 right-angle corners and 2 pairs of equal parallel sides. It is similar to a square but with two longer sides and two shorter sides.', drawingTip: 'Draw the longer top side first, then two equal shorter sides downward, then close with the bottom longer side. Keeping the parallel sides equal in length is the real challenge.', comparison: 'A square is a special rectangle where all four sides are equal. An oblong is any rectangle that is not a square — most rectangles we use day to day are oblongs.', parentTip: 'Rectangles are everywhere in everyday life — point them out at home. The cereal box, the door, the tablet screen. Identifying rectangles in the environment pairs powerfully with tracing practice.' },
  diamond: { realWorldExamples: 'Diamond shapes appear on playing cards, baseball fields, road warning signs, gem carvings, and decorative patterns. The tilted-square shape conveys dynamism and sparkle.', geometryFact: 'A diamond (properly called a rhombus) has 4 equal sides and opposite angles that are equal. Unlike a square, its corners are not right angles — two angles are sharp and two are wide.', drawingTip: 'Start at the top point, draw diagonally to the right, then down to the bottom point, then diagonally left and back up to the top. Four equal diagonal strokes.', comparison: 'A diamond is a square rotated 45 degrees. If you stand a square on its corner, it becomes a diamond — the same shape, just oriented differently.', parentTip: 'The diamond links directly to the Sort & Place game in Draw in the Air, where diamond shapes appear as items. Connecting tracing practice to the games children already know builds enthusiasm.' },
  oval: { realWorldExamples: 'Ovals appear in eggs, rugby balls, racetracks, face shapes, mirrors, spoons, and the planet Saturn\'s shadow. The oval (or ellipse) is the path that planets travel around the sun.', geometryFact: 'An oval is a stretched circle. In precise geometry, an ellipse has two focal points, and every point on the curve has the same total distance to both focal points — the basis of planetary orbits.', drawingTip: 'Begin at the top, sweep rightward and curve gently downward, then continue around the bottom and back up — like a circle but wider than it is tall (or taller than it is wide).', comparison: 'A circle is a perfect oval where height and width are equal. Stretch a circle horizontally or vertically and it becomes an oval. Eggs are classic ovals — taller than they are wide.', parentTip: 'Oval is the shape for number 0 — drawing ovals carefully is the foundation for beautiful zeros. Also great preparation for the letter O and for drawing faces, where the head is usually an oval.' },
};

