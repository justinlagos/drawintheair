// src/pages/seo/UseCasePage.tsx
// Six SEO-optimised use-case landing pages in a single data-driven component.
// Routes: /gesture-learning | /classroom-movement-activities | /chromebook-learning-tools
//         /homeschool-movement-learning | /hand-eye-coordination-activities | /ai-learning-tools-for-kids

import { SeoLayout, PageHero, Section, Breadcrumb, FAQItem, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { SITE } from '../../seo/seo-config';

export type UseCaseSlug =
  | 'gesture-learning'
  | 'classroom-movement-activities'
  | 'chromebook-learning-tools'
  | 'homeschool-movement-learning'
  | 'hand-eye-coordination-activities'
  | 'ai-learning-tools-for-kids';

interface InternalLink { label: string; path: string }
interface Step { icon: string; text: string }
interface UseCaseData {
  meta: { title: string; description: string; keywords: string[]; canonical: string };
  badge: string;
  emoji: string;
  heroTitle: string;
  heroSub: string;
  description: string[];
  educationalExplanation: string[];
  classroomExamples: { icon: string; title: string; detail: string }[];
  steps: Step[];
  faq: { q: string; a: string }[];
  internalLinks: InternalLink[];
  relatedLinks: InternalLink[];
}

const DATA: Record<UseCaseSlug, UseCaseData> = {
  'classroom-movement-activities': {
    meta: {
      title: 'Movement Learning Activities for Classrooms — Free Browser-Based | Draw in the Air',
      description: 'Transform your classroom with gesture-controlled movement activities. Students trace letters, sort objects, and learn through physical interaction using just a webcam. Free, browser-based, no download needed.',
      canonical: '/classroom-movement-activities',
      keywords: [
        'classroom movement activities', 'movement learning for kids',
        'active learning classroom activities', 'kinesthetic learning activities primary school',
        'movement breaks for students', 'active learning tools teachers',
        'physical learning activities KS1', 'gesture classroom activities free',
      ],
    },
    badge: 'For Classrooms',
    emoji: '🏫',
    heroTitle: 'Movement Learning Activities That Work on Any Classroom Computer',
    heroSub: 'Turn any laptop with a webcam into a movement-based learning station. No apps to install, no accounts to create — open the browser and go.',
    description: [
      'Draw in the Air brings physical movement into digital learning. Children stand or sit in front of their computer\'s camera, raise a finger, and interact with on-screen activities through natural hand gestures. The platform uses browser-based computer vision to track hand position in real time — no special hardware required.',
      'Unlike passive screen time, every interaction requires deliberate physical movement: extending an arm to trace a letter path, reaching across the camera\'s field of view to sort objects into categories, or pointing at floating bubbles to build hand-eye coordination.',
      'Nine activity modes run directly in Chrome with no installation, no accounts, and no data collection. Works immediately on any Chromebook, school laptop, or desktop with a webcam.',
    ],
    educationalExplanation: [
      'Movement-based learning activates multiple cognitive pathways simultaneously. When a child physically traces the letter A in the air while seeing the letter form on screen, they engage proprioceptive memory, visual processing, and motor planning in a single action. Research in embodied cognition consistently shows that learning tied to physical action produces stronger recall than passive observation.',
      'Draw in the Air activities are designed around three principles: gross motor engagement before fine motor precision (air tracing with the whole arm before pencil tracing on paper); immediate visual feedback that connects movement to outcome; and short activity cycles of 30 seconds to 3 minutes that match early years attention spans.',
    ],
    classroomExamples: [
      { icon: '🌅', title: 'Morning Brain Break', detail: '3-minute Bubble Pop session to transition students from arrival to focused learning.' },
      { icon: '🔤', title: 'Alphabet Warm-Up', detail: 'Trace the day\'s focus letter in the air before handwriting practice — primes the motor pathway.' },
      { icon: '🌦️', title: 'Indoor Recess Alternative', detail: 'Free Paint mode provides active creative expression without needing outdoor space.' },
      { icon: '🔢', title: 'Maths Station Rotation', detail: 'Balloon Math at one computer during centre rotations while other stations run paper activities.' },
      { icon: '👶', title: 'EYFS Physical Development', detail: 'Sort and Place maps directly to fine motor development goals in the EYFS framework.' },
      { icon: '📺', title: 'Whole-Class Demonstration', detail: 'Project onto an interactive whiteboard — one student at a time takes the "hot seat".' },
    ],
    steps: [
      { icon: '1', text: 'Open drawintheair.com on any classroom Chromebook or laptop — no installation needed.' },
      { icon: '2', text: 'Grant camera permission when the browser asks. The feed never leaves the device.' },
      { icon: '3', text: 'A wave-detection screen appears — the student raises their hand to activate tracking.' },
      { icon: '4', text: 'Choose an activity from the illustrated mode selection menu.' },
      { icon: '5', text: 'The student interacts by moving their index finger in front of the camera.' },
      { icon: '6', text: 'Activities run 30 seconds to 3 minutes. The next child steps up when done.' },
    ],
    faq: [
      { q: 'Does it work on low-spec Chromebooks?', a: 'Yes. The platform is optimised for the ARM and Intel Celeron processors common in education-grade Chromebooks like the Lenovo 100e and HP Chromebook 11. Adaptive frame rates maintain smooth interaction on constrained hardware.' },
      { q: 'Do students need accounts or logins?', a: 'No. There are no accounts, no email addresses, and no student data collection of any kind. Open the browser and start immediately.' },
      { q: 'Can I use it with the whole class at once?', a: 'Yes — project it on an interactive whiteboard for one student to demonstrate while others watch, or set up individual stations for simultaneous independent use.' },
      { q: 'Is this suitable for SEN learners?', a: 'Gesture interaction uses gross motor skills (extending an arm, pointing a finger) that children develop earlier than fine motor precision. This makes it more accessible for children who struggle with mouse or touchscreen control.' },
    ],
    internalLinks: [
      { label: 'For Teachers', path: '/for-teachers' },
      { label: 'Chromebook Tools', path: '/chromebook-learning-tools' },
      { label: 'Gesture Learning', path: '/gesture-learning' },
      { label: 'Brain Break: Bubble Pop', path: '/activities/bubble-pop' },
      { label: 'Letter Tracing A–Z', path: '/letter-tracing' },
      { label: 'Free Resources', path: '/free-resources' },
    ],
    relatedLinks: [
      { label: 'Embed on Your Class Website', path: '/embed' },
      { label: 'Hand-Eye Coordination Activities', path: '/hand-eye-coordination-activities' },
      { label: 'AI Learning Tools for Kids', path: '/ai-learning-tools-for-kids' },
    ],
  },

  'gesture-learning': {
    meta: {
      title: 'Gesture-Based Learning Tools for Early Education — Free | Draw in the Air',
      description: 'Gesture-controlled educational activities for children ages 3–8. Trace letters, sort objects, and play learning games using hand movements detected by webcam. No download, no accounts.',
      canonical: '/gesture-learning',
      keywords: [
        'gesture-based learning', 'gesture learning tools',
        'gesture controlled educational games', 'hand gesture learning activities kids',
        'gesture interaction learning', 'embodied learning technology',
        'hand tracking education', 'touchless learning tools',
      ],
    },
    badge: 'Gesture Learning',
    emoji: '✋',
    heroTitle: 'Gesture-Based Learning: Children Learn by Moving, Not Just Watching',
    heroSub: 'Educational activities controlled entirely through natural hand gestures. Built for early years classrooms and home learning. No mouse, no touchscreen, no downloads.',
    description: [
      'Gesture-based learning replaces the mouse, keyboard, and touchscreen with natural hand movement. Draw in the Air uses the camera built into any laptop or Chromebook to detect a child\'s hand position in real time. The child raises their index finger, and the system responds to their movements with on-screen feedback.',
      'This approach removes the fine motor barrier that makes traditional computer interaction difficult for young children. A 4-year-old who cannot yet control a mouse cursor with precision can extend their arm and trace a large letter path through the air. The gesture is natural, intuitive, and requires no instruction beyond "point your finger at the screen."',
      'Nine activity modes cover letter formation (A–Z), number writing (0–10), shape recognition (8 shapes), object categorisation, colour mixing, word finding, mental arithmetic, and creative free drawing. Each mode runs directly in the browser with no software to install and no accounts to create.',
    ],
    educationalExplanation: [
      'Gesture interaction creates a bridge between physical play and screen-based learning. Traditional educational software asks young children to manipulate a mouse or tap a precise screen location — skills that require fine motor development many 3–5 year olds have not yet achieved. Gesture-based interaction uses gross motor skills (extending an arm, pointing a finger) that children master much earlier.',
      'The pedagogical sequence follows a natural progression: air tracing with the whole arm builds the movement pathway in motor memory, then activities like Sort and Place refine spatial reasoning, and printable worksheets transfer the motor memory to paper. This mirrors the developmental progression from gross to fine motor control recommended in the Early Years Foundation Stage framework.',
    ],
    classroomExamples: [
      { icon: '🔤', title: 'Phonics Warm-Up', detail: 'Students trace the day\'s phonics letter in the air while saying the sound aloud — dual-channel encoding.' },
      { icon: '♿', title: 'SEN Support', detail: 'Children with limited fine motor control can participate fully in writing activities through large arm gestures.' },
      { icon: '⏱️', title: 'Transition Activity', detail: '2-minute Bubble Pop between carpet time and table work resets attention without long transitions.' },
      { icon: '📊', title: 'Assessment Support', detail: 'Teacher observes which letter formations students trace confidently versus which need reinforcement.' },
      { icon: '🎨', title: 'Cross-Curricular', detail: 'Colour Builder for art vocabulary, Balloon Math for numeracy, Shape Tracing for geometry foundations.' },
      { icon: '🏠', title: 'Home Learning', detail: 'Same activities available at home — no app installation needed on family computers.' },
    ],
    steps: [
      { icon: '1', text: 'Navigate to drawintheair.com/play on any browser with a webcam.' },
      { icon: '2', text: 'Allow camera access — all processing happens locally. No video is transmitted.' },
      { icon: '3', text: 'Wave a hand in front of the camera to activate hand tracking.' },
      { icon: '4', text: 'Select a gesture activity from the illustrated menu.' },
      { icon: '5', text: 'Interact by moving your hand — pinch to grab, point to select, trace to draw.' },
      { icon: '6', text: 'Real-time visual and audio feedback guides the interaction throughout.' },
    ],
    faq: [
      { q: 'How accurate is the hand tracking?', a: 'The platform uses Google MediaPipe, a production-grade computer vision library that detects 21 hand landmarks at 30 frames per second. It is highly accurate under normal lighting conditions and adapts to different skin tones and hand sizes.' },
      { q: 'What age is gesture learning most effective for?', a: 'The sweet spot is ages 3–8. Younger children benefit from gross motor engagement before pencil skills; older children benefit from the novelty and the STEM exposure to computer vision technology.' },
      { q: 'Does the child need to be right-handed?', a: 'The tracking works with either hand and detects whichever hand is most prominent in the camera view. Left-handed children use it with no adjustment required.' },
      { q: 'What happens if the lighting is poor?', a: 'The system will show a reduced hand tracking confidence indicator. Standard classroom or home lighting works well. Avoid positioning directly in front of a window, as backlighting reduces detection accuracy.' },
    ],
    internalLinks: [
      { label: 'Classroom Movement Activities', path: '/classroom-movement-activities' },
      { label: 'AI Learning Tools for Kids', path: '/ai-learning-tools-for-kids' },
      { label: 'Hand-Eye Coordination Activities', path: '/hand-eye-coordination-activities' },
      { label: 'For Teachers', path: '/for-teachers' },
      { label: 'Letter Tracing A–Z', path: '/letter-tracing' },
      { label: 'Learning Hub', path: '/learn' },
    ],
    relatedLinks: [
      { label: 'Homeschool Movement Learning', path: '/homeschool-movement-learning' },
      { label: 'Chromebook Learning Tools', path: '/chromebook-learning-tools' },
      { label: 'Free Resources', path: '/free-resources' },
    ],
  },

  'chromebook-learning-tools': {
    meta: {
      title: 'Chromebook Classroom Activities — Free Gesture Learning Games | Draw in the Air',
      description: 'Free browser-based learning activities designed for Chromebooks. No app install needed. Students trace letters, sort objects, and play educational games using hand gestures and the built-in webcam.',
      canonical: '/chromebook-learning-tools',
      keywords: [
        'chromebook classroom activities', 'chromebook learning games free',
        'educational chromebook apps', 'chromebook activities for students',
        'chromebook learning tools classroom', 'browser-based learning games chromebook',
        'chromebook webcam activities', 'free chromebook educational games',
      ],
    },
    badge: 'Chromebook Ready',
    emoji: '💻',
    heroTitle: 'Chromebook Learning Activities That Need Nothing But a Browser',
    heroSub: 'Every activity runs in Chrome. No installation, no IT requests, no admin permissions. Open the browser and students are learning within 60 seconds.',
    description: [
      'Chromebook classrooms face a unique constraint: teachers cannot install arbitrary software, and many native apps require IT admin approval that takes weeks. Draw in the Air eliminates this barrier entirely. Every activity runs directly in the Chrome browser, using only the built-in webcam that every Chromebook already has.',
      'A teacher can open drawintheair.com, bookmark it, and students can begin immediately. There are no accounts, no student data collection, no COPPA compliance concerns, and no IT department involvement required. The platform is optimised for the display resolutions and processing capabilities of classroom Chromebooks, including lower-spec models.',
      'Activities span the primary curriculum: letter tracing for phonics and handwriting, number formation for early maths, shape recognition for geometry foundations, sorting for categorisation skills, and creative drawing for expressive arts. Each activity requires students to physically move — raising their hand and tracing gestures in front of the webcam.',
    ],
    educationalExplanation: [
      'Chromebooks dominate the classroom device landscape because of their manageability, but this comes at the cost of reduced software flexibility. Teachers frequently report frustration with the gap between discovering a useful educational tool and getting it onto student devices — a process that can take weeks.',
      'Browser-based tools solve this permanently. Draw in the Air\'s architecture — client-side AI hand tracking via Google\'s MediaPipe running entirely within Chrome — works on any Chromebook with camera access. Performance is optimised for the ARM and Intel Celeron processors common in education-grade Chromebooks, with adaptive frame rates that maintain smooth interaction even on constrained hardware.',
    ],
    classroomExamples: [
      { icon: '🔄', title: 'Station Rotation', detail: 'Students cycle through Draw in the Air at one Chromebook station during literacy or numeracy centres.' },
      { icon: '🔖', title: '1:1 Deployment', detail: 'Bookmark drawintheair.com on every student Chromebook — accessible any time without setup.' },
      { icon: '🧑‍🏫', title: 'Supply Teacher Resource', detail: 'Zero lesson prep required. Students self-direct through activities with no instructions needed.' },
      { icon: '🖥️', title: 'Computer Lab Session', detail: 'Teacher projects on the main display while students follow along on individual Chromebooks.' },
      { icon: '🏠', title: 'Homework Extension', detail: 'Students access the same activities from home Chromebooks — consistent experience across devices.' },
      { icon: '📋', title: 'No IT Request Needed', detail: 'Browser-based architecture means zero installation. Works immediately on managed Chromebooks.' },
    ],
    steps: [
      { icon: '1', text: 'Open Chrome browser on any Chromebook — no installation, no admin approval needed.' },
      { icon: '2', text: 'Navigate to drawintheair.com and click "Try It Free".' },
      { icon: '3', text: 'Allow the camera permission popup — a one-time step per device.' },
      { icon: '4', text: 'Wave at the camera to begin hand tracking.' },
      { icon: '5', text: 'Choose an activity: letters, numbers, shapes, sorting, or free drawing.' },
      { icon: '6', text: 'Interact with the activity using hand gestures for 1–5 minutes per mode.' },
    ],
    faq: [
      { q: 'Does it work without IT approval or installation?', a: 'Yes. Because everything runs in the Chrome browser with no extension or application to install, there is nothing to approve. Open the URL and it works immediately on any managed Chromebook.' },
      { q: 'Will it work on older, lower-spec Chromebooks?', a: 'Yes. The platform uses adaptive rendering to reduce processing load on slower hardware. It has been tested on Celeron N3350 and ARM Cortex-A72 devices common in education-grade Chromebooks.' },
      { q: 'Does it need an internet connection?', a: 'The initial page load requires internet access. Once the AI model has loaded (about 5 seconds), the hand tracking runs entirely offline on the device.' },
      { q: 'Can I embed it directly on my class Google Site?', a: 'Yes. Use the embed code from drawintheair.com/embed to place an activity widget directly on any Google Site. Students interact with it without leaving your class page.' },
    ],
    internalLinks: [
      { label: 'Classroom Movement Activities', path: '/classroom-movement-activities' },
      { label: 'For Teachers', path: '/for-teachers' },
      { label: 'Embed on Your Website', path: '/embed' },
      { label: 'Bubble Pop — Quick Start', path: '/activities/bubble-pop' },
      { label: 'Letter Tracing', path: '/letter-tracing' },
      { label: 'School Information', path: '/schools' },
    ],
    relatedLinks: [
      { label: 'Gesture Learning Explained', path: '/gesture-learning' },
      { label: 'AI Learning Tools for Kids', path: '/ai-learning-tools-for-kids' },
      { label: 'Free Printable Resources', path: '/free-resources' },
    ],
  },

  'homeschool-movement-learning': {
    meta: {
      title: 'Homeschool Movement Learning Games — Free Active Education | Draw in the Air',
      description: 'Active, movement-based learning activities for homeschool families. Children trace letters, numbers, and shapes using hand gestures. Free, browser-based, no downloads. Ages 3–8.',
      canonical: '/homeschool-movement-learning',
      keywords: [
        'homeschool movement activities', 'homeschool learning games free',
        'active homeschool activities', 'kinesthetic homeschool curriculum',
        'homeschool screen time activities', 'movement learning homeschool',
        'homeschool fine motor activities', 'active learning games home education',
      ],
    },
    badge: 'For Homeschool Families',
    emoji: '🏡',
    heroTitle: 'Active Learning Games for Homeschool Families',
    heroSub: 'Replace passive screen time with movement-based education. Your child learns by physically tracing, sorting, and interacting — not just watching a video.',
    description: [
      'Homeschool families constantly balance screen time concerns with the reality that digital tools can be powerful learning aids. Draw in the Air resolves this tension: every interaction requires physical movement. Your child stands or sits in front of the computer, raises their hand, and learns by moving — tracing letter shapes in the air, reaching to sort objects, pointing to pop bubbles.',
      'The platform covers core early years curriculum areas: letter formation for all 26 letters, number writing for 0–10, recognition of 8 geometric shapes, categorisation and sorting, colour theory, early arithmetic, and creative expression through free drawing. Each activity takes 1–3 minutes with immediate visual feedback.',
      'No account creation. No data collection. No ads. No in-app purchases. The camera feed is processed entirely on your computer and is never transmitted anywhere.',
    ],
    educationalExplanation: [
      'Homeschool environments have a unique advantage: the flexibility to integrate physical movement into learning without the constraints of a classroom schedule. Draw in the Air fits naturally into a homeschool day as a transition activity between subjects, a warm-up before handwriting practice, or a brain break after focused reading time.',
      'The progression from gross motor air tracing to fine motor pencil work follows the developmental sequence recommended by occupational therapists for pre-writing skill development. Pair the digital activities with the free printable tracing worksheets available at /free-resources for a complete gross-to-fine motor handwriting preparation programme.',
    ],
    classroomExamples: [
      { icon: '🌅', title: 'Morning Warm-Up', detail: '5 minutes of Bubble Pop and letter tracing before table work activates learning readiness.' },
      { icon: '✏️', title: 'Handwriting Preparation', detail: 'Air-trace today\'s letter 3 times before picking up a pencil — builds motor memory first.' },
      { icon: '🔢', title: 'Maths Integration', detail: 'Balloon Math for number recognition, then paper-based addition practice — digital to physical.' },
      { icon: '🏃', title: 'Rainy Day PE', detail: 'Free Paint requires large arm movements and provides genuine physical activity indoors.' },
      { icon: '👨‍👩‍👧‍👦', title: 'Sibling Activity', detail: 'Multiple children take turns, each at their own developmental level — fully self-paced.' },
      { icon: '📋', title: 'Informal Assessment', detail: 'Parent observes which letters the child traces confidently vs. which need more practice.' },
    ],
    steps: [
      { icon: '1', text: 'Set up a laptop or desktop with a webcam at your child\'s workspace.' },
      { icon: '2', text: 'Open drawintheair.com — no installation or downloads needed.' },
      { icon: '3', text: 'Click "Try It Free" and allow camera access.' },
      { icon: '4', text: 'Help your child wave at the camera to start hand tracking.' },
      { icon: '5', text: 'Choose an age-appropriate activity together from the illustrated menu.' },
      { icon: '6', text: 'Stay nearby for the first few sessions — children self-direct quickly thereafter.' },
    ],
    faq: [
      { q: 'Is this a suitable core curriculum tool?', a: 'Draw in the Air works best as a supplementary physical-digital bridge. It should not replace pencil-and-paper practice, but it is an excellent kinesthetic alternative for practising letter and number formation before committing them to paper.' },
      { q: 'Can a 3-year-old use it independently?', a: 'With 5 minutes of guided introduction, yes. The gesture recognition is forgiving — large arm movements work well. Most children aged 3–4 need a parent nearby for the first few sessions, then quickly become self-directed.' },
      { q: 'Is there a monthly fee or subscription?', a: 'No. The platform is entirely free with no premium tier, no payment wall, and no trial period. Every activity and every letter is available immediately.' },
      { q: 'How does this help with handwriting readiness?', a: 'Air tracing activates the same motor pathways used in pencil writing, building the neural route before fine motor precision is required. Gross-to-fine motor progression is the standard occupational therapy approach to pre-writing readiness.' },
    ],
    internalLinks: [
      { label: 'For Parents', path: '/for-parents' },
      { label: 'For Homeschool', path: '/for-homeschool' },
      { label: 'Free Printable Resources', path: '/free-resources' },
      { label: 'Hand-Eye Coordination Activities', path: '/hand-eye-coordination-activities' },
      { label: 'Letter Tracing A–Z', path: '/letter-tracing' },
      { label: 'Learning Hub', path: '/learn' },
    ],
    relatedLinks: [
      { label: 'Gesture Learning Explained', path: '/gesture-learning' },
      { label: 'Bubble Pop Brain Break', path: '/activities/bubble-pop' },
      { label: 'AI Learning Tools for Kids', path: '/ai-learning-tools-for-kids' },
    ],
  },

  'hand-eye-coordination-activities': {
    meta: {
      title: 'Hand-Eye Coordination Activities for Children — Free Games | Draw in the Air',
      description: 'Fun hand-eye coordination activities for children ages 3–8. Trace letters, pop bubbles, and sort objects using hand gestures. Develops visual-motor skills through play. Free, browser-based.',
      canonical: '/hand-eye-coordination-activities',
      keywords: [
        'hand-eye coordination activities for kids', 'hand-eye coordination games children',
        'fine motor coordination activities', 'visual motor activities for children',
        'hand-eye coordination exercises kids', 'coordination games preschool',
        'motor skills activities early years', 'visual motor integration games',
      ],
    },
    badge: 'Motor Development',
    emoji: '🎯',
    heroTitle: 'Hand-Eye Coordination Activities Children Actually Want to Do',
    heroSub: 'Nine gesture-controlled games that develop visual-motor skills while feeling like play. No setup, no cost, no downloads.',
    description: [
      'Hand-eye coordination is the foundation for handwriting, ball skills, dressing, and dozens of daily activities that children need to master. Draw in the Air provides nine distinct activities designed to develop the connection between what a child sees and how their hand responds.',
      'Bubble Pop builds rapid visual tracking and reaction speed — the child must follow a moving target and point precisely. Letter Tracing develops sustained visual attention and motor planning — the child must follow a path with controlled, deliberate movement. Sort and Place combines spatial reasoning with precise hand positioning — the child pinches to grab and drags to a target zone.',
      'Because the interaction uses the whole arm, children develop coordination starting from the shoulder and working down through elbow, wrist, and fingers — the same proximal-to-distal development sequence that occupational therapists recommend for pre-writing readiness.',
    ],
    educationalExplanation: [
      'Visual-motor integration — the ability to coordinate visual information with physical movement — is a reliable predictor of academic readiness. Children who struggle with visual-motor tasks often face challenges in handwriting speed, letter formation accuracy, and spatial organisation on the page.',
      'Traditional coordination activities require equipment (balls, beads, threading cards) and adult supervision. Draw in the Air provides self-directed coordination practice with built-in visual feedback. When a child\'s traced letter deviates from the path, the visual feedback immediately shows the discrepancy, allowing self-correction without adult intervention.',
      'The platform\'s activities map to specific coordination sub-skills: Bubble Pop targets reactive coordination (responding to a moving stimulus), Letter Tracing targets planned coordination (following a predetermined path), and Sort and Place targets manipulative coordination (grasping and placing with precision).',
    ],
    classroomExamples: [
      { icon: '🩺', title: 'OT Recommendation', detail: 'Therapist recommends daily coordination practice — Bubble Pop provides engaging self-directed repetition.' },
      { icon: '✏️', title: 'Pre-Writing Readiness', detail: 'Letter tracing in the air activates the same motor pathways needed for pencil writing.' },
      { icon: '🔍', title: 'Assessment Screening', detail: 'Teacher observes which coordination sub-skills show strength and which need development.' },
      { icon: '🧠', title: 'Handwriting Warm-Up', detail: '2 minutes of Bubble Pop before handwriting lessons activates hand-eye pathways.' },
      { icon: '🏃', title: 'PE Circuit Station', detail: 'Computer station in a circuit of physical coordination activities — digital and physical combined.' },
      { icon: '⭐', title: 'Confidence Building', detail: 'No wrong answers in Free Paint — builds movement confidence before structured tracing.' },
    ],
    steps: [
      { icon: '1', text: 'Open drawintheair.com on a computer with a webcam — no account needed.' },
      { icon: '2', text: 'Click "Try It Free" and allow camera access.' },
      { icon: '3', text: 'Wave to activate hand tracking.' },
      { icon: '4', text: 'Start with Bubble Pop (reactive coordination) — the simplest entry point.' },
      { icon: '5', text: 'Progress to Letter Tracing (planned coordination) once comfortable.' },
      { icon: '6', text: 'Advance to Sort and Place (manipulative coordination) for precision practice.' },
    ],
    faq: [
      { q: 'Which activity is best for a child with hand-eye coordination difficulties?', a: 'Start with Free Paint — there is no right or wrong outcome, which builds movement confidence. Then introduce Bubble Pop for short, rewarding reactive practice. Letter Tracing is the most demanding and should come after the child is comfortable with the other modes.' },
      { q: 'Is this useful for occupational therapy support at home?', a: 'Many occupational therapists recommend kinesthetic, high-feedback activities for coordination development. Draw in the Air provides immediate visual feedback for every movement, which is the standard OT approach for motor learning.' },
      { q: 'How much daily practice is helpful?', a: 'Even 3–5 minutes of daily practice produces measurable improvement in coordination over 2–4 weeks. Short, consistent sessions are more effective than occasional long ones.' },
      { q: 'At what age can children start using this?', a: 'Children as young as 3 can use the Bubble Pop and Free Paint modes with minimal guidance. Letter and number tracing is more appropriate from age 4 when children begin developing letter recognition.' },
    ],
    internalLinks: [
      { label: 'Bubble Pop Game', path: '/activities/bubble-pop' },
      { label: 'Letter Tracing', path: '/letter-tracing' },
      { label: 'Sort and Place', path: '/activities/sort-and-place' },
      { label: 'Free Paint Mode', path: '/free-paint' },
      { label: 'Classroom Movement Activities', path: '/classroom-movement-activities' },
      { label: 'Free Printable Resources', path: '/free-resources' },
    ],
    relatedLinks: [
      { label: 'Gesture Learning Explained', path: '/gesture-learning' },
      { label: 'For Parents', path: '/for-parents' },
      { label: 'Homeschool Movement Learning', path: '/homeschool-movement-learning' },
    ],
  },

  'ai-learning-tools-for-kids': {
    meta: {
      title: 'AI Learning Tools for Kids — Computer Vision Educational Games | Draw in the Air',
      description: 'Introduce children to AI concepts through play. Draw in the Air uses real-time computer vision to track hand gestures, letting kids interact with learning activities through movement. Free and browser-based.',
      canonical: '/ai-learning-tools-for-kids',
      keywords: [
        'AI learning tools for kids', 'computer vision educational games',
        'AI games for children', 'STEM AI activities kids',
        'machine learning games for kids', 'AI technology for children',
        'computer vision for kids', 'artificial intelligence learning kids',
      ],
    },
    badge: 'AI & STEM',
    emoji: '🤖',
    heroTitle: 'AI That Children Can See, Touch, and Understand',
    heroSub: 'Draw in the Air uses real-time computer vision to turn hand movements into learning interactions. Children experience AI as something that responds to them.',
    description: [
      'Most AI tools for children are text-based chatbots. Draw in the Air takes a fundamentally different approach: children experience artificial intelligence as a visual, physical system that responds to their body movements in real time. When a child raises their hand, the AI detects it. When they move their finger, the AI follows it.',
      'This creates an intuitive understanding of what AI actually does — it perceives, interprets, and responds. A 5-year-old cannot understand the concept of a neural network, but they can understand that the computer is watching their hand and reacting to what they do. This is the foundational STEM concept: computers can be programmed to see and respond to the physical world.',
      'The technology is Google\'s MediaPipe, a production-grade computer vision library that runs entirely in the browser. The AI model processes the webcam feed locally at 30 frames per second, detecting 21 hand landmarks and translating them into on-screen interactions. No video is ever transmitted — all processing happens on the child\'s own device.',
    ],
    educationalExplanation: [
      'STEM education increasingly demands that children understand AI not as magic but as a tool with defined capabilities and limitations. Draw in the Air provides this understanding experientially: children learn that the AI can detect their hand but might lose tracking when their fingers overlap (occlusion). They notice that lighting affects how well the system sees them.',
      'These observations — made naturally during play — build technological literacy. The child develops an intuitive model of how computer vision works: it needs visual input, it processes images, it can make mistakes when conditions are poor, and it improves when conditions are right.',
      'For STEM-focused classrooms or homeschool curricula, Draw in the Air provides a tangible, accessible demonstration of AI that requires zero technical knowledge from the educator.',
    ],
    classroomExamples: [
      { icon: '🔬', title: 'STEM Exploration', detail: '"Today we\'re going to see how a computer can understand hand movements" — zero setup, immediate engagement.' },
      { icon: '💻', title: 'Computing Curriculum', detail: 'Demonstrate input → processing → output using gesture interaction. Tangible and immediate.' },
      { icon: '🧪', title: 'Science Investigation', detail: '"What happens when you cover half your hand? Why does the AI lose tracking?" — real inquiry.' },
      { icon: '💬', title: 'Discussion Starter', detail: '"How does the computer know where your finger is?" — launches rich technology discussions.' },
      { icon: '📚', title: 'Cross-Curricular', detail: 'Use gesture learning for literacy while discussing the technology — computing meets English.' },
      { icon: '🌐', title: 'Future Literacy', detail: '"What else could a computer learn to see?" — plants seeds for AI curiosity and career awareness.' },
    ],
    steps: [
      { icon: '1', text: 'Open drawintheair.com — no accounts or installation.' },
      { icon: '2', text: 'Allow camera access and explain to children that the AI needs to "see" their hand.' },
      { icon: '3', text: 'Wave to activate tracking — point out the hand landmarks appearing on screen.' },
      { icon: '4', text: 'Demonstrate: move slowly (accurate tracking) then quickly (tracking struggles to keep up).' },
      { icon: '5', text: 'Let children explore activities and observe how the AI responds to different movements.' },
      { icon: '6', text: 'Discuss: "What is the computer doing? How does it know where your hand is?"' },
    ],
    faq: [
      { q: 'Is this genuinely using AI, or is it just a game?', a: 'It uses real AI. The hand tracking is powered by Google MediaPipe, the same computer vision technology used in professional applications. The 21 hand landmark detection model runs at 30 FPS in the browser — it is a real-world application of machine learning.' },
      { q: 'How do I explain AI hand tracking to young children?', a: 'Say: "The computer has learned to look at thousands of pictures of hands. Now it can find hands in any picture it sees — including the picture from our camera — and figure out where each finger is." This is accurate and age-appropriate.' },
      { q: 'Is this suitable for a computing lesson?', a: 'Yes. It demonstrates input → processing → output concretely. Children can investigate the system\'s limitations (occlusion, lighting) which is authentic scientific inquiry into AI system behaviour.' },
      { q: 'Does the AI store images of the children?', a: 'No. The AI model runs entirely on the device in the browser. No images, no video, and no data are transmitted to any server. The camera feed is never recorded or stored.' },
    ],
    internalLinks: [
      { label: 'Gesture Learning Explained', path: '/gesture-learning' },
      { label: 'Learning Hub', path: '/learn' },
      { label: 'For Teachers', path: '/for-teachers' },
      { label: 'Classroom Movement Activities', path: '/classroom-movement-activities' },
      { label: 'Chromebook Tools', path: '/chromebook-learning-tools' },
      { label: 'Bubble Pop — AI Starter', path: '/activities/bubble-pop' },
    ],
    relatedLinks: [
      { label: 'Hand-Eye Coordination Activities', path: '/hand-eye-coordination-activities' },
      { label: 'For Homeschool', path: '/for-homeschool' },
      { label: 'Free Resources', path: '/free-resources' },
    ],
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  h2: { color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 } as React.CSSProperties,
  h3: { color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  body: { color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 20 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 } as React.CSSProperties,
  card: { background: '#111629', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: '20px 24px' } as React.CSSProperties,
  linkRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 10 },
};

export default function UseCasePage({ slug }: { slug: UseCaseSlug }) {
  const data = DATA[slug];
  if (!data) return null;

  return (
    <SeoLayout>
      <SEOMeta
        title={data.meta.title}
        description={data.meta.description}
        keywords={data.meta.keywords}
        canonical={data.meta.canonical}
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: data.badge }]} />
      </div>

      <PageHero
        badge={data.badge}
        emoji={data.emoji}
        title={data.heroTitle}
        subtitle={data.heroSub}
        cta={{ label: 'Try It Free ✨', path: SITE.appPath }}
      />

      {/* ── Description ── */}
      <Section>
        <h2 style={styles.h2}>What Is {data.badge}?</h2>
        {data.description.map((p, i) => (
          <p key={i} style={styles.body}>{p}</p>
        ))}
      </Section>

      {/* ── Educational Explanation ── */}
      <Section light>
        <h2 style={styles.h2}>The Educational Case</h2>
        {data.educationalExplanation.map((p, i) => (
          <p key={i} style={styles.body}>{p}</p>
        ))}
      </Section>

      {/* ── Classroom Examples ── */}
      <Section>
        <h2 style={styles.h2}>How Teachers Use It</h2>
        <div style={styles.grid2}>
          {data.classroomExamples.map((ex, i) => (
            <div key={i} style={styles.card}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{ex.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, marginBottom: 6, fontSize: '1rem' }}>{ex.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.55 }}>{ex.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── How to Start ── */}
      <Section light>
        <h2 style={styles.h2}>Getting Started — 6 Steps</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(108,71,255,0.25)',
                border: '1px solid rgba(108,71,255,0.5)', color: '#a78bfa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
              }}>{step.icon}</div>
              <p style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, paddingTop: 4 }}>{step.text}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            onClick={() => navigate(SITE.appPath)}
            style={{ background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', color: 'white', border: 'none', borderRadius: 32, padding: '14px 36px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
          >
            Start Free — No Account Needed ✨
          </button>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section>
        <h2 style={styles.h2}>Common Questions</h2>
        {data.faq.map(item => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </Section>

      {/* ── Internal Links ── */}
      <Section light>
        <h2 style={styles.h2}>Explore Related Activities</h2>
        <h3 style={{ ...styles.h3, color: '#a78bfa', marginBottom: 12 }}>Continue learning</h3>
        <div style={{ ...styles.linkRow, marginBottom: 28 }}>
          {data.internalLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{ background: 'rgba(108,71,255,0.15)', border: '1px solid rgba(108,71,255,0.35)', color: '#c4b5fd', borderRadius: 20, padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {link.label}
            </button>
          ))}
        </div>
        <h3 style={{ ...styles.h3, color: '#22d3ee', marginBottom: 12 }}>Also useful</h3>
        <div style={styles.linkRow}>
          {data.relatedLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#67e8f9', borderRadius: 20, padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </Section>
    </SeoLayout>
  );
}
