# Draw in the Air — Growth Distribution Architecture

## Complete System Design for Reaching 10,000 Educators Without Paid Advertising

**Document version:** 1.0
**Date:** 2026-03-07
**Target:** Self-propagating discovery engine for educators, schools, and parents

---

## Table of Contents

1. [Growth Architecture Overview](#1-growth-architecture-overview)
2. [Technical Distribution Infrastructure](#2-technical-distribution-infrastructure)
3. [Content and SEO Engine](#3-content-and-seo-engine)
4. [Educator Resource Library](#4-educator-resource-library)
5. [Embed Distribution System](#5-embed-distribution-system)
6. [Chrome Ecosystem Discovery Optimization](#6-chrome-ecosystem-discovery-optimization)
7. [Creator Amplification System](#7-creator-amplification-system)
8. [Teacher Referral Loops](#8-teacher-referral-loops)
9. [Directory and Ecosystem Submission Assets](#9-directory-and-ecosystem-submission-assets)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Growth Architecture Overview

### System Design

The growth engine operates through five compounding loops that feed into each other:

```
LOOP 1: SEARCH DISCOVERY
Teacher searches "chromebook classroom activities" →
  Finds SEO landing page →
    Tries activity →
      Bookmarks / shares with colleague
        ↓
LOOP 2: EMBED DISTRIBUTION
Teacher embeds activity on class website →
  Parent sees it at home →
    Visits drawintheair.com →
      Tells another parent
        ↓
LOOP 3: CREATOR AMPLIFICATION
Education blogger discovers platform →
  Creates review / demo video →
    Video ranks for "gesture learning" →
      Teachers discover through video
        ↓
LOOP 4: CHROME STORE DISCOVERY
Teacher searches Chrome Web Store for "classroom activities" →
  Installs extension →
    Uses in classroom →
      Leaves review → improves ranking → more teachers find it
        ↓
LOOP 5: REFERRAL LOOP
Teacher shares specific activity with colleague via built-in share →
  Colleague tries it →
    Shares with their team →
      School adopts for pilot
```

### Channel Priority Matrix

| Channel | Effort to Launch | Time to Impact | Compounding Effect | Priority |
|---------|-----------------|----------------|-------------------|----------|
| SEO Landing Pages | Medium | 2-4 months | High | P0 |
| Chrome Web Store | Low | 1-2 months | High | P0 |
| Embed Distribution | Medium | 1-3 months | Very High | P0 |
| Teacher Referral | Medium | Immediate | High | P1 |
| Education Directories | Low | 1-2 months | Medium | P1 |
| Creator Outreach | Medium | 1-3 months | High | P1 |
| Content Engine | Medium | 3-6 months | Very High | P2 |
| Reddit/Community | Low | Immediate | Low | P2 |

### Existing Infrastructure Assessment

The codebase already contains substantial growth infrastructure. Here is what exists and what needs to be built:

**Already Built (leverage these):**
- 495-URL sitemap with letter/number/shape tracing pages
- SEO meta configuration with structured data (JSON-LD, Open Graph, Twitter Cards)
- Dynamic OG image generation via Vercel edge function
- Embed page with copy-paste iframe code at `/embed`
- Press kit page at `/press`
- Free resources page at `/free-resources`
- Education vertical pages (`/for-homeschool`, `/for-preschool`, `/for-kindergarten`)
- Teacher and parent landing pages (`/for-teachers`, `/for-parents`)
- Chrome extension with Manifest V3
- Analytics system with event tracking and session management
- School pilot analytics pipeline to Google Sheets

**Needs to Be Built:**
- Six new SEO-optimized use-case landing pages (Phase 1)
- Ten downloadable classroom activity guide PDFs (Phase 2)
- Scoped embed variants with attribution tracking (Phase 3)
- Chrome Web Store listing copy and review acquisition system (Phase 4)
- Creator outreach pack with video scripts and storyboards (Phase 5)
- Automated weekly content templates (Phase 6)
- Directory submission copy for 10+ directories (Phase 7)
- In-product teacher sharing UI with tracking (Phase 8)
- 20 SEO article outlines with internal linking maps (Phase 9)

---

## 2. Technical Distribution Infrastructure

### 2.1 URL Architecture

**Current structure** (from sitemap.xml analysis):

```
drawintheair.com/
├── /                         ← Main landing (exists)
├── /play                     ← App entry (exists)
├── /for-teachers             ← Teacher hub (exists)
├── /for-parents              ← Parent hub (exists)
├── /for-homeschool           ← Homeschool vertical (exists)
├── /for-preschool            ← Preschool vertical (exists)
├── /for-kindergarten         ← Kindergarten vertical (exists)
├── /schools                  ← School hub (exists)
├── /embed                    ← Embed instructions (exists)
├── /press                    ← Press kit (exists)
├── /free-resources           ← Downloadables (exists)
├── /learn                    ← Learning hub (exists)
├── /learn/*                  ← Blog articles (exists)
├── /activities/bubble-pop    ← Activity page (exists)
├── /activities/sort-and-place← Activity page (exists)
├── /trace-a ... /trace-z     ← Letter tracing (exists)
├── /trace-number-1 ... 10    ← Number tracing (exists)
├── /trace-circle, etc.       ← Shape tracing (exists)
```

**New pages to add:**

```
├── /gesture-learning                        ← NEW: Gesture learning hub
├── /classroom-movement-activities           ← NEW: Movement learning for classrooms
├── /chromebook-learning-tools               ← NEW: Chromebook-specific landing
├── /homeschool-movement-learning            ← NEW: Homeschool movement games
├── /hand-eye-coordination-activities        ← NEW: Hand-eye coordination focus
├── /ai-learning-tools-for-kids              ← NEW: AI/computer vision angle
├── /share                                   ← NEW: Teacher sharing landing
├── /share/:activityId                       ← NEW: Shared activity deep link
├── /resources/guides                        ← NEW: Classroom guide library
├── /resources/guides/:guideSlug             ← NEW: Individual guide page
├── /embed/:activityId                       ← NEW: Scoped embed variants
├── /partners                                ← NEW: Partner/creator landing
```

### 2.2 Analytics Additions for Growth Tracking

Add these events to the existing analytics system in `/src/lib/analytics.ts`:

```typescript
// Growth tracking events — add to existing analytics.ts

// Embed tracking
type: 'embed_load'           // Embed iframe loaded on external site
  data: { referrer: string, activityId: string }

type: 'embed_interaction'    // User interacted with embedded activity
  data: { referrer: string, activityId: string, action: string }

type: 'embed_attribution_click' // "Powered by" link clicked
  data: { referrer: string }

// Share tracking
type: 'share_initiated'      // Teacher clicked share button
  data: { activityId: string, method: 'link' | 'email' | 'qr' }

type: 'share_landing'        // Someone arrived via share link
  data: { activityId: string, shareId: string }

type: 'share_conversion'     // Shared link led to app usage
  data: { activityId: string, shareId: string }

// Chrome store tracking
type: 'extension_install'    // Extension installed (detected via messaging)
type: 'extension_open'       // App opened via extension

// Directory referral tracking
type: 'directory_referral'   // Arrived from known directory
  data: { source: string }   // utm_source from directory listing
```

### 2.3 UTM Parameter System

All external links should use consistent UTM parameters. Add to `seo-config.ts`:

```typescript
export const UTM = {
  // Directory submissions
  directories: {
    commonsense: '?utm_source=commonsense&utm_medium=directory&utm_campaign=listing',
    edsurge: '?utm_source=edsurge&utm_medium=directory&utm_campaign=listing',
    producthunt: '?utm_source=producthunt&utm_medium=directory&utm_campaign=launch',
    alternativeto: '?utm_source=alternativeto&utm_medium=directory&utm_campaign=listing',
  },
  // Creator links
  creators: (name: string) =>
    `?utm_source=creator&utm_medium=referral&utm_campaign=${name}`,
  // Teacher shares
  shares: (shareId: string) =>
    `?utm_source=teacher_share&utm_medium=referral&utm_campaign=${shareId}`,
  // Embed attribution
  embed: (host: string) =>
    `?utm_source=embed&utm_medium=widget&utm_campaign=${host}`,
  // Social posts
  social: (platform: string) =>
    `?utm_source=${platform}&utm_medium=social&utm_campaign=organic`,
};
```

---

## 3. Content and SEO Engine

### 3.1 New Landing Page Structures

Each page follows a consistent template that targets a specific educator search intent.

---

#### PAGE 1: Movement Learning Activities for Classrooms

**URL:** `/classroom-movement-activities`

**Target keywords:** classroom movement activities, movement learning for kids, active learning classroom activities, kinesthetic learning activities primary school

**SEO Metadata:**
```typescript
{
  title: 'Movement Learning Activities for Classrooms — Free Browser-Based | Draw in the Air',
  description: 'Transform your classroom with gesture-controlled movement activities. Students trace letters, sort objects, and learn through physical interaction using just a webcam. Free, browser-based, no download needed.',
  canonical: '/classroom-movement-activities',
  keywords: [
    'classroom movement activities',
    'movement learning for kids',
    'active learning classroom activities',
    'kinesthetic learning activities primary school',
    'movement breaks for students',
    'active learning tools teachers',
    'physical learning activities KS1',
    'gesture classroom activities free'
  ],
}
```

**Page Structure:**

**Headline:** Movement Learning Activities That Work on Any Classroom Computer

**Subheadline:** Turn any laptop with a webcam into a movement-based learning station. No apps to install, no accounts to create.

**Long Description:**
Draw in the Air brings physical movement into digital learning. Children stand or sit in front of their computer's camera, raise a finger, and interact with on-screen learning activities through natural hand gestures. The platform uses browser-based computer vision to track hand position in real time — no special hardware required.

Unlike passive screen time, every interaction requires deliberate physical movement: extending an arm to trace a letter path, reaching across the camera's field of view to sort objects into categories, or pointing at floating bubbles to build hand-eye coordination.

**Educational Explanation:**
Movement-based learning activates multiple cognitive pathways simultaneously. When a child physically traces the letter A in the air while seeing the letter form on screen, they engage proprioceptive memory, visual processing, and motor planning in a single action. Research in embodied cognition consistently shows that learning tied to physical action produces stronger recall than passive observation.

Draw in the Air activities are designed around three educational principles: first, gross motor engagement before fine motor precision (air tracing with the whole arm before pencil tracing on paper); second, immediate visual feedback that connects movement to outcome; third, short activity cycles (30 seconds to 3 minutes) that match early years attention spans.

**Classroom Application Examples:**

- Morning brain break: 3-minute Bubble Pop session to transition students from arrival to focus
- Alphabet warm-up: Trace today's focus letter in the air before handwriting practice
- Indoor recess alternative: Free Paint mode for creative physical expression
- Maths station rotation: Balloon Math at one computer while other stations run paper activities
- EYFS physical development: Sort and Place activities mapped to fine motor development goals
- Whole-class demonstration: Project onto interactive whiteboard, one student at a time

**Step-by-Step Usage Instructions:**

1. Open drawintheair.com on a classroom computer, Chromebook, or laptop
2. Grant camera permission when the browser asks (the camera feed never leaves the device)
3. A wave-detection screen appears — the student raises their hand to activate tracking
4. Choose an activity from the mode selection menu
5. The student interacts by moving their index finger in front of the camera
6. Activities run for 30 seconds to 3 minutes depending on the mode
7. The student finishes and the next child takes a turn

**Internal Links:**
- /for-teachers (Teacher hub)
- /activities/bubble-pop (Brain break activity)
- /letter-tracing (Alphabet warm-up)
- /free-paint (Creative station)
- /activities/sort-and-place (Sorting station)
- /chromebook-learning-tools (Chromebook-specific guide)
- /free-resources (Printable companions)

---

#### PAGE 2: Gesture-Based Learning Tools for Early Education

**URL:** `/gesture-learning`

**Target keywords:** gesture-based learning, gesture learning tools, gesture controlled educational games, hand gesture learning activities for kids

**SEO Metadata:**
```typescript
{
  title: 'Gesture-Based Learning Tools for Early Education — Free | Draw in the Air',
  description: 'Gesture-controlled educational activities for children ages 3-8. Trace letters, sort objects, and play learning games using hand movements and a webcam. No download, no accounts.',
  canonical: '/gesture-learning',
  keywords: [
    'gesture-based learning',
    'gesture learning tools',
    'gesture controlled educational games',
    'hand gesture learning activities kids',
    'gesture interaction learning',
    'embodied learning technology',
    'hand tracking education',
    'touchless learning tools'
  ],
}
```

**Headline:** Gesture-Based Learning: Children Learn by Moving, Not Just Watching

**Subheadline:** Educational activities controlled entirely through natural hand gestures. Built for early years classrooms and home learning.

**Long Description:**
Gesture-based learning replaces the mouse, keyboard, and touchscreen with natural hand movement. Draw in the Air uses the camera built into any laptop or Chromebook to detect a child's hand position in real time. The child raises their index finger, and the system responds to their movements with on-screen feedback.

This approach removes the fine motor barrier that makes traditional computer interaction difficult for young children. A 4-year-old who cannot yet control a mouse cursor with precision can extend their arm and trace a large letter path through the air. The gesture is natural, intuitive, and requires no instruction beyond "point your finger at the screen."

Nine activity modes cover letter formation (A-Z), number writing (0-10), shape recognition (8 shapes), object categorisation, colour mixing, word finding, mental arithmetic, and creative free drawing. Each mode runs directly in the browser — no software to install, no accounts to create, no data collected from children.

**Educational Explanation:**
Gesture interaction creates a bridge between physical play and screen-based learning. Traditional educational software asks young children to manipulate a mouse or tap a precise screen location — skills that require fine motor development many 3-5 year olds have not yet achieved. Gesture-based interaction uses gross motor skills (extending an arm, pointing a finger) that children master much earlier.

The pedagogical sequence follows a progression: air tracing with the whole arm builds the movement pathway, then activities like Sort and Place refine spatial reasoning, and finally printable worksheets transfer the motor memory to paper. This mirrors the developmental progression from gross to fine motor control recommended in the Early Years Foundation Stage framework.

**Classroom Application Examples:**

- Phonics warm-up: Students trace the day's phonics letter in the air while saying the sound
- SEN support: Children with limited fine motor control can participate in writing activities through large arm movements
- Transition activity: 2-minute Bubble Pop between carpet time and table work
- Assessment support: Teacher observes which letter formations students trace accurately
- Cross-curricular: Colour Builder for art vocabulary, Balloon Math for numeracy

**Step-by-Step Usage Instructions:**

1. Navigate to drawintheair.com/play on any browser with a webcam
2. Allow camera access (all processing happens locally — no video is transmitted)
3. Wave a hand in front of the camera to activate hand tracking
4. Select a gesture activity from the illustrated menu
5. The student interacts by moving their hand — pinch to grab, point to select, trace to draw
6. Real-time visual and audio feedback guides the interaction
7. Activities automatically cycle through progressively challenging content

**Internal Links:**
- /classroom-movement-activities (Classroom use guide)
- /for-teachers (Teacher-specific information)
- /ai-learning-tools-for-kids (Technology explanation)
- /hand-eye-coordination-activities (Coordination focus)
- /letter-tracing (Letter activities)
- /learn (Research and guides hub)

---

#### PAGE 3: Chromebook Classroom Learning Activities

**URL:** `/chromebook-learning-tools`

**Target keywords:** chromebook classroom activities, chromebook learning games, educational chromebook apps, chromebook activities for students free

**SEO Metadata:**
```typescript
{
  title: 'Chromebook Classroom Activities — Free Gesture Learning Games | Draw in the Air',
  description: 'Free browser-based learning activities designed for Chromebooks. No app install needed. Students trace letters, sort objects, and play educational games using hand gestures and the built-in webcam.',
  canonical: '/chromebook-learning-tools',
  keywords: [
    'chromebook classroom activities',
    'chromebook learning games free',
    'educational chromebook apps',
    'chromebook activities for students',
    'chromebook learning tools classroom',
    'browser-based learning games chromebook',
    'chromebook webcam activities',
    'free chromebook educational games'
  ],
}
```

**Headline:** Chromebook Learning Activities That Need Nothing But a Browser

**Subheadline:** Every activity runs in Chrome. No installation, no IT requests, no admin permissions required.

**Long Description:**
Chromebook classrooms face a unique constraint: teachers cannot install arbitrary software, and many native apps require admin approval that takes weeks. Draw in the Air eliminates this barrier entirely. Every activity runs directly in the Chrome browser, using only the built-in webcam that every Chromebook already has.

A teacher can open drawintheair.com, bookmark it, and students can begin using it within 60 seconds. There are no accounts, no student data collection, no COPPA compliance concerns, and no IT department involvement required. The platform is pre-optimised for the display resolutions and processing capabilities common to classroom Chromebooks (including lower-spec models like the Lenovo 100e and HP Chromebook 11).

Activities span the primary curriculum: letter tracing for phonics and handwriting, number formation for early maths, shape recognition for geometry foundations, sorting for categorisation skills, and creative drawing for expressive arts. Each activity requires the student to physically move — raising their hand and tracing gestures in front of the webcam.

**Educational Explanation:**
Chromebooks dominate the classroom device landscape because of their manageability, but this comes at the cost of reduced software flexibility. Teachers frequently report frustration with the gap between discovering a useful educational tool and actually getting it available on student devices.

Browser-based tools solve this problem permanently. Draw in the Air's architecture — client-side AI hand tracking via Google's MediaPipe running entirely within Chrome — means the platform works on any Chromebook with camera access. Performance is optimised for the ARM and Intel Celeron processors common in education-grade Chromebooks, with adaptive frame rates that maintain smooth interaction even on constrained hardware.

**Classroom Application Examples:**

- Chromebook cart rotation: Students cycle through Draw in the Air at one station during literacy centres
- 1:1 Chromebook deployment: Bookmark drawintheair.com on every student device
- Substitute teacher resource: Activity requires no lesson prep — students can self-direct
- Computer lab session: Teacher projects activity on the main display, students follow on individual Chromebooks
- Homework extension: Students access the same activities from home Chromebooks

**Step-by-Step Usage Instructions:**

1. Open Chrome browser on any Chromebook
2. Navigate to drawintheair.com
3. Click "Try It Free" — no account creation needed
4. Allow the camera permission popup (one-time per device)
5. Wave at the camera to begin hand tracking
6. Choose an activity: letters, numbers, shapes, sorting, or free drawing
7. Play for 1-5 minutes per activity

**Internal Links:**
- /classroom-movement-activities (General classroom activities)
- /for-teachers (Teacher guide)
- /embed (Add to class website)
- /activities/bubble-pop (Quick start activity)
- /letter-tracing (Curriculum-aligned tracing)
- /schools (School information pack)

---

#### PAGE 4: Homeschool Movement Learning Games

**URL:** `/homeschool-movement-learning`

**Target keywords:** homeschool movement activities, homeschool learning games, active homeschool activities, kinesthetic homeschool curriculum, homeschool screen time activities

**SEO Metadata:**
```typescript
{
  title: 'Homeschool Movement Learning Games — Free Active Education | Draw in the Air',
  description: 'Active, movement-based learning activities for homeschool families. Children trace letters, numbers, and shapes using hand gestures. Free, browser-based, no downloads. Ages 3-8.',
  canonical: '/homeschool-movement-learning',
  keywords: [
    'homeschool movement activities',
    'homeschool learning games free',
    'active homeschool activities',
    'kinesthetic homeschool curriculum',
    'homeschool screen time activities',
    'movement learning homeschool',
    'homeschool fine motor activities',
    'active learning games home education'
  ],
}
```

**Headline:** Active Learning Games for Homeschool Families

**Subheadline:** Replace passive screen time with movement-based education. Your child learns by physically tracing, sorting, and interacting — not just watching.

**Long Description:**
Homeschool families constantly balance screen time concerns with the reality that digital tools can be powerful learning aids. Draw in the Air resolves this tension: every interaction requires physical movement. Your child stands or sits in front of the computer, raises their hand, and learns by physically moving — tracing letter shapes in the air, reaching to sort objects, and pointing to pop bubbles.

The platform covers core early years curriculum areas: letter formation for all 26 letters (uppercase), number writing for 0-10, recognition of 8 geometric shapes, categorisation and sorting, colour theory, early arithmetic, and creative expression through free drawing. Each activity takes 1-3 minutes and provides immediate visual feedback that shows the child exactly how their gesture maps to the learning objective.

No account creation. No data collection. No ads. No in-app purchases. The camera feed is processed entirely on your computer and is never transmitted anywhere.

**Educational Explanation:**
Homeschool environments have a unique advantage: the flexibility to integrate physical movement into learning without the constraints of a classroom schedule. Draw in the Air fits naturally into a homeschool day as a transition activity between subjects, a warm-up before handwriting practice, or a brain break after focused reading time.

The progression from gross motor air tracing to fine motor pencil work follows the developmental sequence recommended by occupational therapists for pre-writing skill development. Pair the digital activities with the free printable tracing worksheets available at /free-resources for a complete gross-to-fine motor handwriting preparation programme.

**Classroom Application Examples:**

- Morning warm-up: 5 minutes of Bubble Pop and letter tracing before table work
- Handwriting preparation: Air-trace today's letter 3 times before picking up a pencil
- Maths integration: Balloon Math for number recognition, then paper-based addition practice
- Rainy day PE substitute: Free Paint requires large arm movements and provides physical activity
- Sibling activity: Multiple children can take turns, each at their developmental level
- Assessment tool: Parent observes which letters the child traces confidently vs. which need more practice

**Step-by-Step Usage Instructions:**

1. Set up a laptop or desktop computer with a webcam at your child's workspace
2. Open drawintheair.com — no installation needed
3. Click "Try It Free" and allow camera access
4. Help your child wave at the camera to start hand tracking
5. Choose an age-appropriate activity together
6. Your child interacts by moving their hand in front of the camera
7. Stay nearby for the first few sessions, then children can self-direct

**Internal Links:**
- /for-parents (Parent information)
- /for-homeschool (Homeschool curriculum overview)
- /free-resources (Printable worksheets to pair with digital activities)
- /hand-eye-coordination-activities (Coordination development)
- /learn (Guides and research)
- /letter-tracing (Full letter tracing library)

---

#### PAGE 5: Hand-Eye Coordination Activities for Children

**URL:** `/hand-eye-coordination-activities`

**Target keywords:** hand-eye coordination activities for kids, hand-eye coordination games, fine motor coordination activities, visual motor activities for children

**SEO Metadata:**
```typescript
{
  title: 'Hand-Eye Coordination Activities for Children — Free Games | Draw in the Air',
  description: 'Fun hand-eye coordination activities for children ages 3-8. Trace letters, pop bubbles, and sort objects using hand gestures. Develops visual-motor skills through play. Free, browser-based.',
  canonical: '/hand-eye-coordination-activities',
  keywords: [
    'hand-eye coordination activities for kids',
    'hand-eye coordination games children',
    'fine motor coordination activities',
    'visual motor activities for children',
    'hand-eye coordination exercises kids',
    'coordination games preschool',
    'motor skills activities early years',
    'visual motor integration games'
  ],
}
```

**Headline:** Hand-Eye Coordination Activities Children Actually Want to Do

**Subheadline:** Nine gesture-controlled games that develop visual-motor skills while feeling like play. No setup, no cost, no downloads.

**Long Description:**
Hand-eye coordination is the foundation for handwriting, ball skills, dressing, and dozens of daily activities that children need to master. Draw in the Air provides nine distinct activities specifically designed to develop the connection between what a child sees and how their hand responds.

Bubble Pop builds rapid visual tracking and reaction speed — the child must follow a moving target and point precisely. Letter Tracing develops sustained visual attention and motor planning — the child must follow a path with controlled, deliberate movement. Sort and Place combines spatial reasoning with precise hand positioning — the child pinches to grab and drags to a target zone. Each activity progressively challenges a different aspect of visual-motor integration.

Because the interaction uses the whole arm (pointing in front of a camera), children develop coordination starting from their shoulder and working down through elbow, wrist, and fingers — the same proximal-to-distal development sequence that occupational therapists recommend for pre-writing readiness.

**Educational Explanation:**
Visual-motor integration — the ability to coordinate visual information with physical movement — is a reliable predictor of academic readiness. Children who struggle with visual-motor tasks often face challenges in handwriting speed, letter formation accuracy, and spatial organisation on the page.

Traditional coordination activities require equipment (balls, beads, threading cards) and adult supervision. Draw in the Air provides self-directed coordination practice with built-in visual feedback. When a child's traced letter deviates from the path, the visual feedback immediately shows the discrepancy, allowing self-correction without adult intervention.

The platform's activities map to specific coordination sub-skills: Bubble Pop targets reactive hand-eye coordination (responding to a moving stimulus), Letter Tracing targets planned hand-eye coordination (following a predetermined path), and Sort and Place targets manipulative hand-eye coordination (grasping and placing with precision).

**Classroom Application Examples:**

- OT recommendation: Therapist recommends daily coordination practice, child uses Bubble Pop at home
- Pre-writing readiness: Letter tracing in the air before pencil-and-paper practice
- Assessment screening: Teacher observes which coordination sub-skills need development
- Warm-up before handwriting lessons: 2 minutes of Bubble Pop to activate hand-eye pathways
- PE/movement station: Computer station in a circuit of physical coordination activities

**Step-by-Step Usage Instructions:**

1. Open drawintheair.com on a computer with a webcam
2. Click "Try It Free" and allow camera access
3. Wave to activate hand tracking
4. Start with Bubble Pop (reactive coordination) — the simplest entry point
5. Progress to Letter Tracing (planned coordination) once comfortable
6. Advance to Sort and Place (manipulative coordination) for precision work
7. Use Free Paint for creative coordination practice with no right/wrong answers

**Internal Links:**
- /activities/bubble-pop (Reactive coordination starter)
- /letter-tracing (Planned coordination practice)
- /activities/sort-and-place (Manipulative coordination)
- /free-paint (Creative coordination)
- /classroom-movement-activities (Teacher guide for classroom use)
- /for-parents (Parent coordination development guide)
- /free-resources (Printable fine motor worksheets)

---

#### PAGE 6: AI and Computer Vision Learning Tools for Kids

**URL:** `/ai-learning-tools-for-kids`

**Target keywords:** AI learning tools for kids, computer vision educational games, AI games for children, STEM AI activities kids

**SEO Metadata:**
```typescript
{
  title: 'AI Learning Tools for Kids — Computer Vision Educational Games | Draw in the Air',
  description: 'Introduce children to AI concepts through play. Draw in the Air uses real-time computer vision to track hand gestures, letting kids interact with learning activities through movement. Free and browser-based.',
  canonical: '/ai-learning-tools-for-kids',
  keywords: [
    'AI learning tools for kids',
    'computer vision educational games',
    'AI games for children',
    'STEM AI activities kids',
    'machine learning games for kids',
    'AI technology for children',
    'computer vision for kids',
    'artificial intelligence learning kids'
  ],
}
```

**Headline:** AI That Children Can See, Touch, and Understand

**Subheadline:** Draw in the Air uses real-time computer vision to turn hand movements into learning interactions. Children experience AI as something that responds to them — not something behind a screen.

**Long Description:**
Most AI tools for children are text-based chatbots. Draw in the Air takes a fundamentally different approach: children experience artificial intelligence as a visual, physical system that responds to their body movements in real time. When a child raises their hand, the AI detects it. When they move their finger, the AI follows it. When they trace a letter, the AI evaluates it.

This creates an intuitive understanding of what AI actually does — it perceives, interprets, and responds. A 5-year-old cannot understand the concept of a neural network, but they can understand that the computer is watching their hand and reacting to what they do. This is the foundational STEM concept: computers can be programmed to see and respond to the physical world.

The technology behind it is Google's MediaPipe, a production-grade computer vision library that runs entirely in the browser. The AI model processes the webcam feed locally on the device at 30 frames per second, detecting 21 hand landmarks (finger joints, palm, wrist) and translating them into on-screen interactions. No video is ever transmitted — all processing happens on the child's own computer.

**Educational Explanation:**
STEM education increasingly demands that children understand AI not as magic but as a tool with defined capabilities and limitations. Draw in the Air provides this understanding experientially: children learn that the AI can detect their hand but might lose tracking when their fingers overlap (occlusion). They discover that moving slowly produces more accurate traces than moving quickly. They notice that lighting affects how well the system sees their hand.

These observations — made naturally during play — build technological literacy. The child develops an intuitive model of how computer vision works: it needs visual input (light), it processes images (tracking), it can make mistakes (when conditions are poor), and it improves when conditions are right (good lighting, clear hand position).

For STEM-focused classrooms or homeschool curricula, Draw in the Air provides a tangible, accessible demonstration of AI that requires zero technical knowledge from the educator.

**Classroom Application Examples:**

- STEM exploration lesson: "Today we're going to see how a computer can understand hand movements"
- Computing curriculum: Demonstrate input → processing → output using gesture interaction
- Science investigation: "What happens when you cover half your hand? Why does the AI lose tracking?"
- Technology discussion starter: "How does the computer know where your finger is?"
- Cross-curricular: Use gesture learning for literacy (letter tracing) while discussing the technology (computing)

**Step-by-Step Usage Instructions:**

1. Open drawintheair.com — no installation or accounts
2. Allow camera access (explain to children that the AI needs to "see" their hand)
3. Wave to activate hand tracking — point out the hand landmarks appearing on screen
4. Demonstrate: move your hand slowly (accurate tracking) then quickly (tracking struggles)
5. Let children explore different activities and observe how the AI responds
6. Discuss: "What is the computer doing? How does it know where your hand is?"
7. Extension: "What other things could a computer learn to see?" (faces, objects, animals)

**Internal Links:**
- /gesture-learning (Gesture learning explanation)
- /learn (Research articles on learning technology)
- /for-teachers (STEM curriculum integration)
- /classroom-movement-activities (Classroom setup)
- /chromebook-learning-tools (Device-specific guide)
- /activities/bubble-pop (Simple AI interaction starter)

---

### 3.2 Page Component Template

All six pages should use the existing `SeoLayout` component. Here is the implementation pattern:

```typescript
// src/pages/seo/UseCasePage.tsx
// Reusable component for all six new landing pages

import { SeoLayout, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

interface UseCasePageData {
  seo: {
    title: string;
    description: string;
    canonical: string;
    keywords: string[];
  };
  hero: {
    badge: string;
    emoji: string;
    title: string;
    subtitle: string;
  };
  longDescription: string[];     // Array of paragraphs
  educationalExplanation: string[];
  classroomExamples: string[];
  steps: string[];
  internalLinks: { label: string; href: string }[];
}

// Page data map — keyed by route slug
const USE_CASE_PAGES: Record<string, UseCasePageData> = {
  'classroom-movement-activities': {
    seo: { /* metadata from section 3.1 above */ },
    hero: {
      badge: 'For Classrooms',
      emoji: '🏫',
      title: 'Movement Learning Activities That Work on Any Classroom Computer',
      subtitle: 'Turn any laptop with a webcam into a movement-based learning station...',
    },
    // ... full data for each page
  },
  'gesture-learning': { /* ... */ },
  'chromebook-learning-tools': { /* ... */ },
  'homeschool-movement-learning': { /* ... */ },
  'hand-eye-coordination-activities': { /* ... */ },
  'ai-learning-tools-for-kids': { /* ... */ },
};
```

### 3.3 Sitemap Additions

Add to `public/sitemap.xml`:

```xml
<url>
  <loc>https://drawintheair.com/gesture-learning</loc>
  <lastmod>2026-03-07</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>https://drawintheair.com/classroom-movement-activities</loc>
  <lastmod>2026-03-07</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>https://drawintheair.com/chromebook-learning-tools</loc>
  <lastmod>2026-03-07</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>https://drawintheair.com/homeschool-movement-learning</loc>
  <lastmod>2026-03-07</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>https://drawintheair.com/hand-eye-coordination-activities</loc>
  <lastmod>2026-03-07</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>https://drawintheair.com/ai-learning-tools-for-kids</loc>
  <lastmod>2026-03-07</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
```

### 3.4 Internal Linking Architecture

Every new page must link to at least 4 existing pages and be linked from at least 3 existing pages. Here is the linking map:

```
classroom-movement-activities
  ← linked FROM: /for-teachers, /schools, /chromebook-learning-tools, /gesture-learning
  → links TO: /for-teachers, /activities/bubble-pop, /letter-tracing, /chromebook-learning-tools, /free-resources, /embed

gesture-learning
  ← linked FROM: /for-teachers, /for-parents, /ai-learning-tools-for-kids, /learn
  → links TO: /classroom-movement-activities, /for-teachers, /ai-learning-tools-for-kids, /hand-eye-coordination-activities, /letter-tracing

chromebook-learning-tools
  ← linked FROM: /for-teachers, /schools, /classroom-movement-activities, home page
  → links TO: /classroom-movement-activities, /for-teachers, /embed, /activities/bubble-pop, /letter-tracing, /schools

homeschool-movement-learning
  ← linked FROM: /for-parents, /for-homeschool, /hand-eye-coordination-activities, /learn
  → links TO: /for-parents, /for-homeschool, /free-resources, /hand-eye-coordination-activities, /letter-tracing

hand-eye-coordination-activities
  ← linked FROM: /for-parents, /for-teachers, /gesture-learning, /learn
  → links TO: /activities/bubble-pop, /letter-tracing, /activities/sort-and-place, /free-paint, /classroom-movement-activities, /free-resources

ai-learning-tools-for-kids
  ← linked FROM: /gesture-learning, /learn, /for-teachers, home page
  → links TO: /gesture-learning, /learn, /for-teachers, /classroom-movement-activities, /chromebook-learning-tools, /activities/bubble-pop
```

---

## 4. Educator Resource Library

### 4.1 Guide Overview

Ten downloadable PDF classroom activity guides. Each guide is 1-2 pages, designed for teachers to print and pin to their planning board.

All guides should be generated as styled PDFs using the brand colours (primary: #6c47ff, accent: #22d3ee, dark background: #0a0e1a) and stored at `/public/guides/` for direct download. The `/free-resources` page should be updated to link to all guides.

---

### Guide 1: Alphabet Gesture Challenge

**Activity Title:** Alphabet Gesture Challenge
**Learning Objective:** Children will practise letter formation for all 26 uppercase letters using gross motor arm movements, developing handwriting readiness through embodied learning.
**Recommended Age Group:** 4-6 years (Reception / Kindergarten)
**Duration:** 10-15 minutes

**Classroom Setup Instructions:**
1. Position a laptop or Chromebook at a clear workspace with 1 metre of space in front of the camera
2. Ensure the room is well-lit (overhead lighting or natural light — avoid backlit positions near windows)
3. Open drawintheair.com/play on the browser
4. Set the activity to letter tracing mode
5. Prepare a list of 5-8 target letters for the session (focus on the current phonics group)

**Teacher Explanation:**
"Today we're going to practise writing our letters, but instead of using a pencil, we're going to write them in the air using our finger. The computer can see our hand and will show us how we're doing. Let's see if we can trace each letter really carefully, following the path on the screen."

**Activity Steps:**
1. Teacher demonstrates with the first letter, narrating the stroke direction ("Start at the top, go down, then a bump to the right...")
2. Each student takes a 2-minute turn tracing 3-4 letters
3. After each letter, the student says the letter name and its phonics sound
4. If the student struggles with formation, the teacher guides: "Try starting from the dot at the top"
5. After all students have had a turn, review: "Which letter was the trickiest to trace?"

**Extension Activity Ideas:**
- After air tracing, students practise the same letters on paper using the printable worksheets from drawintheair.com/free-resources
- Challenge: "Can you trace the letter with your eyes closed after doing it in the air?"
- Pair work: One student traces while the other guesses the letter from the movement alone
- Write a sentence using only the letters practised today

**Link to Draw in the Air Activity:**
drawintheair.com/letter-tracing — select any letter A-Z

---

### Guide 2: Five-Minute Movement Break Activity

**Activity Title:** Five-Minute Movement Break
**Learning Objective:** Children will engage in a structured physical activity break using hand-eye coordination games, resetting attention and focus for the next learning period.
**Recommended Age Group:** 4-8 years (Reception to Year 3 / Kindergarten to Grade 2)
**Duration:** 5 minutes exactly

**Classroom Setup Instructions:**
1. One computer station with webcam — or project onto interactive whiteboard for whole-class participation
2. Open drawintheair.com/play
3. Select Bubble Pop mode (30-second rounds)
4. Timer visible to students (use a classroom timer or the built-in activity timer)

**Teacher Explanation:**
"Time for a brain break! We're going to play Bubble Pop. You need to point at the bubbles as they appear — use your whole arm, reach up high and down low. Let's see how many you can pop in 30 seconds!"

**Activity Steps:**
1. First student stands in front of the camera (or comes to the whiteboard)
2. Bubble Pop runs for 30 seconds — the student points at bubbles to pop them
3. Announce the score: "You popped 15 bubbles!"
4. Next student takes a turn (rotate 5-6 students in 5 minutes)
5. Keep a running tally on the board — "Can the next person beat 15?"

**Extension Activity Ideas:**
- Left hand only challenge: "Can you pop bubbles using just your left hand?"
- Slow motion round: "Try to pop every single bubble, even if you have to move slowly"
- Call out colours as they pop: "Red! Blue! Yellow!" (if bubble colours are visible)
- After the break: "Did that help your brain feel ready to learn? Why do you think moving helps us think?"

**Link to Draw in the Air Activity:**
drawintheair.com/play → Bubble Pop mode

---

### Guide 3: Shape Drawing Warm-Up Exercise

**Activity Title:** Shape Drawing Warm-Up
**Learning Objective:** Children will trace geometric shapes (circle, triangle, square, star, heart, rectangle, diamond, oval) in the air, reinforcing shape recognition and developing spatial awareness.
**Recommended Age Group:** 3-6 years (Nursery to Year 1 / Pre-K to Grade 1)
**Duration:** 8-10 minutes

**Classroom Setup Instructions:**
1. Computer with webcam at a dedicated shape station, or projected for group use
2. Open drawintheair.com and navigate to shape tracing
3. Prepare a set of physical shape cards (cut-outs or flashcards) as a cross-reference
4. Clear floor space if students will also trace shapes with their feet

**Teacher Explanation:**
"Before we start our maths today, we're going to warm up with shapes. I'll show you a shape card, you tell me the name, and then you'll trace that shape in the air using the computer. The computer will show you the path to follow — try to stay on the line!"

**Activity Steps:**
1. Hold up a shape flashcard — students name the shape together
2. Count the sides and corners together: "A triangle has... 3 sides!"
3. One student traces the shape in the air using Draw in the Air
4. Class observes and gives feedback: "You traced it really smoothly!"
5. Move to the next shape, progressing from simple (circle) to complex (star)

**Extension Activity Ideas:**
- Shape hunt: After tracing, find 3 objects in the classroom that match each shape
- Shape patterns: Trace circle, square, circle, square — "What comes next?"
- Body shapes: Can you make a triangle shape with your arms? A circle with your whole body?
- Cross-curricular art: Draw a picture using only the shapes you traced today

**Link to Draw in the Air Activity:**
drawintheair.com/trace-circle, /trace-triangle, /trace-square, /trace-star, /trace-heart

---

### Guide 4: Hand-Eye Coordination Practice

**Activity Title:** Coordination Station
**Learning Objective:** Children will develop hand-eye coordination through a structured progression of three gesture activities, each targeting a different coordination sub-skill.
**Recommended Age Group:** 4-7 years (Reception to Year 2 / Kindergarten to Grade 1)
**Duration:** 12-15 minutes

**Classroom Setup Instructions:**
1. Ideally 3 computer stations, each set to a different activity (if only 1 computer, rotate through sequentially)
2. Station A: Bubble Pop (reactive coordination)
3. Station B: Letter Tracing — choose 3 simple letters like C, O, L (planned coordination)
4. Station C: Sort and Place (manipulative coordination)
5. Print the coordination checklist from this guide for teacher observation notes

**Teacher Explanation:**
"Today we have three coordination stations. At each one, you'll use your hand in a different way. At the Bubble Pop station, you need quick reactions. At the Letter station, you need slow, careful control. At the Sorting station, you need to grab and place precisely. Let's see which one is easiest and which is the biggest challenge!"

**Activity Steps:**
1. Divide students into 3 groups (or use a rotation timer)
2. Each group spends 4 minutes at each station
3. Teacher circulates, noting observations on the checklist:
   - Can the student track and point at a moving target? (Bubble Pop)
   - Can the student follow a static path with controlled movement? (Tracing)
   - Can the student pinch, drag, and release at a target? (Sort and Place)
4. After all rotations, whole-class discussion: "Which station was hardest? Why?"

**Extension Activity Ideas:**
- Repeat weekly and track improvement over time
- Add a fourth station: Free Paint for creative coordination
- Challenge students to use their non-dominant hand
- Create a "Coordination Champion" certificate for students who complete all three

**Link to Draw in the Air Activity:**
drawintheair.com/play → Bubble Pop, Letter Tracing, Sort and Place

---

### Guide 5: Alphabet Reaction Game

**Activity Title:** Alphabet Reaction Game
**Learning Objective:** Children will demonstrate letter recognition speed and accuracy by identifying and pointing at target letters as they appear on screen, combining phonics knowledge with reaction time.
**Recommended Age Group:** 5-7 years (Year 1 to Year 2 / Kindergarten to Grade 1)
**Duration:** 8-10 minutes

**Classroom Setup Instructions:**
1. Computer with webcam, ideally projected onto a large display
2. Open Draw in the Air and select Bubble Pop mode
3. Prepare alphabet flashcards for the warm-up
4. Have a whiteboard ready to record scores

**Teacher Explanation:**
"Today we're going to test how quickly you can find letters! First, we'll warm up by going through our flashcards, then you'll play the reaction game. When you see a bubble, point at it as fast as you can. After each round, tell me the first letter of three words that start with the sound we're learning this week."

**Activity Steps:**
1. Quick flashcard warm-up: Show 10 letters, students call out the sound
2. First student plays Bubble Pop (30-second round) — record the score
3. After the round: "Give me three words that start with the sound /b/"
4. Next student plays — can they beat the previous score?
5. After all students: review the highest score and celebrate effort

**Extension Activity Ideas:**
- Letter tracing follow-up: The student must trace the letter they struggled with most
- Word building: Use Gesture Spelling mode for older students
- Dictation: Teacher says a word, student finds the first letter in Balloon Math mode
- Homework: "Play Bubble Pop at home and tell us your best score tomorrow"

**Link to Draw in the Air Activity:**
drawintheair.com/play → Bubble Pop and Letter Tracing modes

---

### Guide 6: Colour Mixing Discovery

**Activity Title:** Colour Mixing Discovery
**Learning Objective:** Children will explore colour theory through interactive colour building activities, learning primary and secondary colour relationships through gesture-based experimentation.
**Recommended Age Group:** 4-7 years
**Duration:** 10-12 minutes

**Classroom Setup Instructions:**
1. Computer with webcam running Colour Builder mode
2. Physical paint/crayon samples for cross-reference
3. A colour wheel poster visible in the room

**Teacher Explanation:**
"Today we're going to be colour scientists! Using the computer, you'll mix colours together by moving your hands. Can you predict what happens when you mix blue and yellow?"

**Activity Steps:**
1. Class prediction: "What colour do you get when you mix red and blue?"
2. First student uses Colour Builder to test the prediction
3. Record results on the board: Red + Blue = Purple
4. Continue with all primary colour combinations
5. Discuss: "Were your predictions correct?"

**Extension Activity Ideas:**
- Physical paint mixing alongside the digital activity for multi-sensory learning
- Create a classroom colour chart based on discoveries
- Art project: Paint a picture using only the colours mixed today
- Science link: Discuss how light colours mix differently from paint colours

**Link to Draw in the Air Activity:**
drawintheair.com/play → Colour Builder mode

---

### Guide 7: Number Formation Practice

**Activity Title:** Number Formation Practice
**Learning Objective:** Children will practise correct number formation (0-10) through air tracing, building the motor pathways needed for written number work.
**Recommended Age Group:** 4-6 years
**Duration:** 10 minutes

**Classroom Setup Instructions:**
1. Computer with webcam running number tracing mode
2. Number line visible on the wall for reference
3. Prepare whiteboards and markers for follow-up writing

**Teacher Explanation:**
"We're going to practise writing our numbers in the air. Watch the screen carefully — it will show you exactly where to start and which direction to move. Remember: some numbers start at the top, and some have curves. Let's get our air-writing muscles ready!"

**Activity Steps:**
1. Start with numbers the class is currently learning (e.g., 6, 7, 8)
2. Each student traces 3 numbers, spending about 30 seconds per number
3. After air tracing, students immediately write the same number on their whiteboard
4. Compare: "Does your whiteboard number look like the one you traced in the air?"
5. Focus on common formation errors: reversed 3s, bottom-starting 5s

**Extension Activity Ideas:**
- Number hunt: Find the number in the classroom environment
- Estimation: "How many pencils are on this table?" then trace that number
- Skip counting: Trace only even numbers, or only odd numbers
- Partner quiz: "Air-trace a number. Can your partner guess which one?"

**Link to Draw in the Air Activity:**
drawintheair.com/trace-number-1 through /trace-number-10

---

### Guide 8: Indoor Recess Activity Station

**Activity Title:** Indoor Recess Learning Station
**Learning Objective:** Provide a structured, engaging activity for indoor recess that combines physical movement with learning, reducing behaviour management challenges during unstructured indoor time.
**Recommended Age Group:** 4-8 years
**Duration:** 15-20 minutes (full indoor recess period)

**Classroom Setup Instructions:**
1. Set up 1-3 computer stations around the room
2. Each station runs a different Draw in the Air mode:
   - Station 1: Free Paint (creative, low-pressure)
   - Station 2: Bubble Pop (energetic, competitive)
   - Station 3: Word Search or Balloon Math (cognitive challenge)
3. Create a simple rotation chart — students move stations every 5 minutes
4. Post a visual instruction card at each station

**Teacher Explanation:**
"Today is an indoor recess day, so we have three activity stations set up. At each one, you'll use your hands to play a different learning game. You don't need to touch the computer — just point and move in front of the camera. Rotate when you hear the timer!"

**Activity Steps:**
1. Assign students to starting stations
2. Brief 30-second demo at each station (or let experienced students demonstrate)
3. Start the rotation timer (5 minutes per station)
4. Students self-manage at each station
5. Teacher supervises but does not need to actively instruct

**Extension Activity Ideas:**
- Free Paint gallery: Save/screenshot the best drawings and display them
- Bubble Pop tournament: Track scores across the recess period
- Student choice: After experiencing all three, students vote on their favourite
- Peer teaching: Experienced students help newcomers at each station

**Link to Draw in the Air Activity:**
drawintheair.com/play → Free Paint, Bubble Pop, Word Search modes

---

### Guide 9: Sorting and Categorisation Lesson

**Activity Title:** Sort It Out!
**Learning Objective:** Children will develop categorisation and logical thinking skills by sorting objects into groups based on defined criteria (colour, size, type), with progressive difficulty.
**Recommended Age Group:** 4-7 years
**Duration:** 10-12 minutes

**Classroom Setup Instructions:**
1. Computer with webcam running Sort and Place mode
2. Physical sorting materials (buttons, blocks, toys) for paired activity
3. Whiteboard for recording sorting criteria

**Teacher Explanation:**
"Today we're going to be sorting experts! You'll use the computer to sort objects into the right groups by picking them up with a pinch gesture and placing them in the correct box. Pay attention to the sorting rule — it changes each round!"

**Activity Steps:**
1. Discuss: "What does it mean to sort? Can you sort these blocks by colour?"
2. Physical warm-up: Sort 10 physical objects on the table by colour
3. Transition to digital: Students take turns on Sort and Place (3 rounds each)
4. Round 1: Sort by colour (easiest)
5. Round 2: Sort by category (medium)
6. Round 3: Sort by a new rule (hardest — students must discover the rule)

**Extension Activity Ideas:**
- Create your own sorting rule for a classmate to discover
- Venn diagram: Draw two overlapping circles and sort objects that belong in both
- Real-world sorting: Sort the class library by genre, or the art supplies by type
- Data collection: "How many red objects? How many blue?" — create a bar chart

**Link to Draw in the Air Activity:**
drawintheair.com/play → Sort and Place mode

---

### Guide 10: Creative Drawing Expression Session

**Activity Title:** Draw Your Imagination
**Learning Objective:** Children will use the Free Paint mode for creative self-expression, developing artistic confidence and fine motor control through unrestricted gesture-based drawing.
**Recommended Age Group:** 3-8 years
**Duration:** 10-15 minutes

**Classroom Setup Instructions:**
1. Computer with webcam running Free Paint mode
2. Inspiring prompt cards (e.g., "Draw your favourite animal", "Draw what makes you happy", "Draw your dream house")
3. Background music (optional) for a calm creative atmosphere

**Teacher Explanation:**
"Today you're going to be artists! You can draw anything you like using your finger in the air. The computer will turn your movements into a colourful picture. There's no right or wrong — just move your hand and see what you create. You can change colours and even start over if you want."

**Activity Steps:**
1. Draw a prompt card or let students choose their own subject
2. Each student gets 3-4 minutes of drawing time
3. Demonstrate: show how to change colours, how pinch-and-draw works, how to use the eraser
4. Students create their artwork
5. Class gallery: Display finished artworks and each student explains their drawing

**Extension Activity Ideas:**
- Symmetry challenge: Draw only half a butterfly, then try to mirror it
- Story illustration: Draw a scene from the book you read today
- Collaborative art: Each student adds one element to a shared drawing
- Comparison: Draw the same subject on paper and in the air — how do they differ?

**Link to Draw in the Air Activity:**
drawintheair.com/play → Free Paint mode

---

### 4.2 PDF Layout Specification

Each guide PDF should follow this structure:

**Page 1 (Front):**
- Draw in the Air logo (top left)
- Guide number and title (large heading)
- Learning objective (highlighted box)
- Age group and duration badges
- Classroom setup instructions
- Teacher explanation (in a speech bubble or callout box)

**Page 2 (Back):**
- Activity steps (numbered, with clear spacing)
- Extension activity ideas (bullet list)
- QR code linking to the specific Draw in the Air activity
- "More guides at drawintheair.com/free-resources" footer
- "Powered by Draw in the Air" branding

**Colour scheme:**
- Primary: #6c47ff (purple)
- Accent: #22d3ee (cyan)
- Text: #1e293b (dark slate)
- Background: #ffffff (white)
- Highlight boxes: #f0f0ff (light purple tint)

**Font:** System sans-serif (Arial or Inter) for maximum compatibility

**File naming convention:**
```
/public/guides/01-alphabet-gesture-challenge.pdf
/public/guides/02-five-minute-movement-break.pdf
/public/guides/03-shape-drawing-warm-up.pdf
/public/guides/04-hand-eye-coordination-practice.pdf
/public/guides/05-alphabet-reaction-game.pdf
/public/guides/06-colour-mixing-discovery.pdf
/public/guides/07-number-formation-practice.pdf
/public/guides/08-indoor-recess-station.pdf
/public/guides/09-sorting-categorisation-lesson.pdf
/public/guides/10-creative-drawing-expression.pdf
```

---

## 5. Embed Distribution System

### 5.1 Current State

The embed system already exists at `/embed` with a single iframe code that loads the full app. This needs to be extended with:

1. Activity-specific embed variants
2. Attribution tracking
3. Partner documentation
4. Scoped embed mode (limited activities in the embed, with CTA to full platform)

### 5.2 Scoped Embed Variants

Create activity-specific embed URLs that load directly into a specific mode:

```
/app?embed=true&mode=calibration   → Bubble Pop only
/app?embed=true&mode=pre-writing   → Letter Tracing only
/app?embed=true&mode=free          → Free Paint only
/app?embed=true&mode=sort-and-place→ Sort and Place only
/app?embed=true                    → Full menu (default)
```

**Implementation in App.tsx:**

```typescript
// Detect embed mode from URL params
const params = new URLSearchParams(window.location.search);
const isEmbed = params.get('embed') === 'true';
const forcedMode = params.get('mode') as GameMode | null;

// In embed mode:
// 1. Skip onboarding if possible (go straight to wave-to-wake)
// 2. If forcedMode is set, skip menu and go directly to the activity
// 3. Show "Powered by Draw in the Air" attribution bar at the bottom
// 4. After activity completion, show CTA: "Want more activities? Visit drawintheair.com"
// 5. Track embed_load and embed_interaction analytics events
```

### 5.3 Embed Code Variants

Update the `/embed` page to offer multiple embed options:

**Full Platform Embed:**
```html
<iframe
  src="https://drawintheair.com/app?embed=true"
  width="100%"
  height="600"
  style="border:2px solid #6c47ff;border-radius:12px;"
  allow="camera"
  title="Draw in the Air — Gesture Learning Activities">
</iframe>
<p style="text-align:center;font-size:14px;margin-top:8px;">
  Powered by <a href="https://drawintheair.com?utm_source=embed" target="_blank" rel="noopener">Draw in the Air</a>
</p>
```

**Bubble Pop Only (Brain Break Widget):**
```html
<iframe
  src="https://drawintheair.com/app?embed=true&mode=calibration"
  width="100%"
  height="500"
  style="border:2px solid #22d3ee;border-radius:12px;"
  allow="camera"
  title="Bubble Pop — Hand-Eye Coordination Game">
</iframe>
<p style="text-align:center;font-size:14px;margin-top:8px;">
  Powered by <a href="https://drawintheair.com?utm_source=embed" target="_blank" rel="noopener">Draw in the Air</a>
</p>
```

**Letter Tracing Widget:**
```html
<iframe
  src="https://drawintheair.com/app?embed=true&mode=pre-writing"
  width="100%"
  height="600"
  style="border:2px solid #6c47ff;border-radius:12px;"
  allow="camera"
  title="Letter Tracing — Air Writing Practice">
</iframe>
<p style="text-align:center;font-size:14px;margin-top:8px;">
  Powered by <a href="https://drawintheair.com?utm_source=embed" target="_blank" rel="noopener">Draw in the Air</a>
</p>
```

### 5.4 Embed Partner Documentation

Create a `/partners` page with the following content:

**Headline:** Add Gesture Learning to Your Website

**For education bloggers:** Embed a single activity on a blog post about classroom technology. Use the Bubble Pop widget on an article about "movement breaks" or the Letter Tracing widget on a phonics resource post.

**For school websites:** Add the full platform embed to your class page or student portal. Students can access activities directly without navigating away from the school site.

**For LMS platforms (Google Classroom, Canvas, Seesaw):** Paste the iframe code into an assignment or resource page. Students interact directly within the LMS.

**For teacher resource sites (TpT, Twinkl):** Create a free resource that pairs a printable worksheet with an embedded Draw in the Air activity. Link the digital component using the embed code.

**Technical requirements:**
- The embedding page must allow `camera` in the iframe permissions policy
- The embed works on any modern browser (Chrome, Edge, Firefox, Safari)
- Minimum iframe height: 500px for optimal interaction
- The embed is responsive and works on all screen sizes

### 5.5 Attribution Tracking

When the embed loads, detect the parent page's domain and log it:

```typescript
// In the app entry point, when embed=true
if (isEmbed) {
  const referrer = document.referrer || 'unknown';
  const referrerDomain = referrer ? new URL(referrer).hostname : 'direct';

  analytics.track('embed_load', {
    referrer: referrerDomain,
    mode: forcedMode || 'full',
    timestamp: Date.now(),
  });
}
```

This data feeds the growth dashboard: you can see which websites are embedding the platform and driving the most usage.

---

## 6. Chrome Ecosystem Discovery Optimization

### 6.1 Chrome Web Store Listing

**Store Listing Title:**
Draw in the Air — Gesture Learning for Kids | Free Hand Tracking Activities

**Short Description (132 characters max):**
Free gesture learning activities for kids ages 3-8. Trace letters, pop bubbles, and learn through hand tracking. No download needed.

**Long Description:**

Draw in the Air turns your webcam into a learning tool. Children use hand gestures to trace letters, pop bubbles, sort objects, and explore numbers — all through natural hand movement detected by AI.

HOW IT WORKS
Open the app, allow camera access, and wave your hand. The AI detects your hand position in real time and turns your movements into on-screen interactions. Point to pop bubbles. Trace to form letters. Pinch and drag to sort objects.

NINE LEARNING ACTIVITIES
- Letter Tracing (A-Z): Build handwriting readiness through gross motor air tracing
- Number Tracing (0-10): Practise correct number formation
- Shape Tracing (8 shapes): Learn geometric shapes by drawing them in the air
- Bubble Pop: Fast-paced hand-eye coordination game
- Sort and Place: Drag-and-drop categorisation challenges
- Colour Builder: Mix and match colours
- Balloon Math: Pop the right numbers for early arithmetic
- Rainbow Bridge: Colour matching and recognition
- Spelling Stars: Spell words through gesture

BUILT FOR CLASSROOMS
- Works on Chromebooks, laptops, and desktops
- No installation needed — runs in the browser
- No student accounts or logins required
- No data collection — camera processing happens locally on the device
- No ads, no in-app purchases

PERFECT FOR
- Morning brain breaks and movement breaks
- Handwriting preparation activities
- Literacy and numeracy warm-ups
- Indoor recess alternatives
- SEN and fine motor development support
- Homeschool learning stations
- STEM exploration (children interact with AI directly)

PRIVACY FIRST
The webcam feed is processed entirely on the device using Google MediaPipe. No video is recorded, transmitted, or stored. No personal data is collected. No accounts are created.

FREE TO USE
Every activity is completely free. No premium tier, no payment wall, no trial period.

**Feature Bullet List:**
1. Nine gesture-controlled learning activities for ages 3-8
2. Works instantly on Chromebooks — no installation needed
3. AI hand tracking via webcam — no mouse or touchscreen required
4. No student accounts, no data collection, no ads
5. Covers letters A-Z, numbers 0-10, shapes, colours, and maths

### 6.2 Screenshot Captions

Prepare 5 screenshots (1280×800 or 640×400) with these captions:

**Screenshot 1 Caption:** Tracing Letters Using Hand Tracking — A child traces the letter A by moving their finger in front of the webcam

**Screenshot 2 Caption:** Bubble Pop Learning Game — Point at bubbles to build hand-eye coordination

**Screenshot 3 Caption:** Sort and Place Activity — Pinch, drag, and sort objects into categories

**Screenshot 4 Caption:** Works on Any Chromebook — Browser-based, no installation required

**Screenshot 5 Caption:** Nine Learning Activities — Letters, numbers, shapes, sorting, colours, maths, spelling, and creative drawing

### 6.3 Review Acquisition System

Implement a non-intrusive, event-triggered review prompt:

**Trigger conditions (all must be met):**
1. User has completed at least 5 activity sessions across 2+ different days
2. User has not previously dismissed the review prompt
3. User arrived via the Chrome extension (not direct browser)
4. At least 7 days have passed since first use

**Implementation:**

```typescript
// In App.tsx or a dedicated ReviewPrompt component

interface ReviewState {
  sessionsCompleted: number;
  uniqueDays: Set<string>;
  firstUseDate: string;
  dismissed: boolean;
  reviewed: boolean;
}

// Store in localStorage
const REVIEW_KEY = 'dita_review_state';

function shouldShowReviewPrompt(): boolean {
  const state = getReviewState();
  if (state.dismissed || state.reviewed) return false;
  if (state.sessionsCompleted < 5) return false;
  if (state.uniqueDays.size < 2) return false;

  const daysSinceFirst = daysBetween(state.firstUseDate, new Date());
  if (daysSinceFirst < 7) return false;

  return true;
}
```

**Review prompt UI (appears after activity completion):**

```
┌─────────────────────────────────────────────┐
│                                             │
│  ⭐ Enjoying Draw in the Air?              │
│                                             │
│  You've completed [X] activities!           │
│  If this has been useful in your classroom, │
│  a quick review helps other teachers        │
│  discover it.                               │
│                                             │
│  [Leave a Review]     [Maybe Later]         │
│                                             │
└─────────────────────────────────────────────┘
```

**"Leave a Review" action:** Opens the Chrome Web Store review page in a new tab:
```
https://chrome.google.com/webstore/detail/[extension-id]/reviews
```

**"Maybe Later" action:** Sets `dismissed: true` with a 30-day cooldown, then shows again.

---

## 7. Creator Amplification System

### 7.1 Creator Outreach Pack

A downloadable ZIP file at `/press` containing:

**Contents:**
```
draw-in-the-air-creator-pack/
├── README.txt                    ← Quick start guide
├── brand/
│   ├── logo-primary.png          ← Full colour logo
│   ├── logo-white.png            ← White logo for dark backgrounds
│   ├── logo-icon.png             ← Square icon
│   └── brand-colours.txt         ← Hex codes and usage
├── screenshots/
│   ├── letter-tracing.png        ← 1920x1080 screenshot
│   ├── bubble-pop.png
│   ├── sort-and-place.png
│   ├── free-paint.png
│   ├── mode-selection.png
│   └── landing-page.png
├── copy/
│   ├── platform-overview.md      ← 200-word description
│   ├── key-facts.md              ← Bullet point fact sheet
│   ├── founder-bio.md            ← Founder story
│   └── talking-points.md         ← 10 key messages for reviewers
├── video-scripts/
│   ├── youtube-review-script.md  ← 5-minute review script
│   ├── tiktok-demo-script.md     ← 60-second demo script
│   └── short-storyboard.md       ← Visual storyboard for demos
└── embed-codes/
    └── embed-examples.html       ← Copy-paste embed codes
```

### 7.2 Platform Overview (for copy/platform-overview.md)

Draw in the Air is a free, browser-based educational platform that uses computer vision hand tracking to create gesture-controlled learning activities for children ages 3-8.

Children sit in front of any laptop webcam and interact with on-screen activities by moving their hands in the air. They trace letters A-Z, numbers 0-10, and geometric shapes. They pop bubbles for hand-eye coordination. They pinch and drag to sort objects into categories. They mix colours, solve maths problems, and draw freely.

The AI hand tracking runs entirely in the browser — no video is recorded, transmitted, or stored. No accounts, no downloads, no ads, no payment.

Nine activity modes cover literacy, numeracy, fine motor development, and creative expression. The platform works on Chromebooks, school laptops, and home computers. Teachers use it for brain breaks, handwriting warm-ups, indoor recess, and learning stations.

### 7.3 Key Talking Points (for copy/talking-points.md)

1. Every interaction requires physical movement — this is active learning, not passive screen time
2. Works on any computer with a webcam — including classroom Chromebooks
3. No installation, no accounts, no student data collection
4. Camera feed stays on the device — 100% privacy-first design
5. Nine activities covering letters, numbers, shapes, colours, maths, sorting, and spelling
6. Free with no premium tier, no ads, no in-app purchases
7. Built for teachers: quick to start, requires no lesson prep, works as a station activity
8. Develops hand-eye coordination, fine motor skills, and handwriting readiness
9. Uses Google MediaPipe AI — children interact with real computer vision
10. Suitable for SEN: gross motor interaction accessible to children who struggle with mouse/touchscreen

### 7.4 YouTube Review Script (5-minute format)

```
YOUTUBE REVIEW SCRIPT: Draw in the Air
Duration: 4-5 minutes
Format: Screen recording + webcam overlay

[0:00 - 0:30] HOOK
"What if I told you there's a free classroom app where kids learn by
waving their hands in the air? No download, no accounts, no data
collection. Let me show you."
[Show: drawintheair.com landing page]

[0:30 - 1:30] DEMO: LETTER TRACING
"I'm going to open it right now in my browser. I just go to
drawintheair.com, click Try It Free, and allow camera access."
[Show: wave to activate, select letter tracing]
"Watch — I point my finger, and the AI tracks it. I'm going to
trace the letter A by following the path on screen."
[Show: tracing a letter live]
"See how it follows my hand in real time? That's AI computer vision
running right in the browser."

[1:30 - 2:30] DEMO: BUBBLE POP
"Now let me show you the brain break activity — Bubble Pop."
[Show: playing Bubble Pop]
"Kids love this. You just point at the bubbles to pop them.
30 seconds, great for a quick movement break between lessons."

[2:30 - 3:30] TEACHER VALUE
"Here's why this matters for teachers:
Number one — it works on Chromebooks. Just open the browser.
Number two — no accounts, no logins, no IT requests.
Number three — it's genuinely free. No premium features locked
behind a paywall.
And number four — privacy. The camera feed never leaves the device.
Nothing is recorded. Nothing is transmitted."

[3:30 - 4:15] USE CASES
"I'd use this for morning brain breaks, handwriting warm-ups before
literacy, and indoor recess days. You could also set it up as a
station activity during centre rotations."
[Show: Free Paint mode briefly]
"There's also a free drawing mode which is great for creative
expression."

[4:15 - 4:45] CLOSING
"Draw in the Air — free, browser-based, runs on Chromebooks, no
accounts needed. Link is in the description."
[Show: URL on screen]
```

### 7.5 TikTok/Shorts Demo Script (60-second format)

```
TIKTOK DEMO SCRIPT: Draw in the Air
Duration: 45-60 seconds
Format: Phone-recorded screen or webcam view

[0:00 - 0:05] HOOK (text overlay)
"POV: You found a free classroom app where kids learn by moving
their hands in the air"

[0:05 - 0:15] WAVE ACTIVATION
[Show hand waving at camera, app activating]
Text overlay: "Just wave at the webcam"

[0:15 - 0:30] LETTER TRACING
[Show tracing a letter in the air]
Text overlay: "Trace letters A-Z using hand gestures"

[0:30 - 0:40] BUBBLE POP
[Show popping bubbles]
Text overlay: "Brain break in 30 seconds"

[0:40 - 0:50] VALUE PROPS
Text overlay sequence:
"Free" → "No download" → "No accounts" → "Works on Chromebooks"

[0:50 - 0:60] CTA
Text overlay: "drawintheair.com — link in bio"
Audio: "Your students will literally thank you for this one."
```

### 7.6 Short Video Storyboard

```
STORYBOARD: 90-Second Classroom Demo

FRAME 1 [0:00-0:05]: Wide shot — empty classroom with Chromebooks on desks
Text: "This free app uses AI to turn any webcam into a learning tool"

FRAME 2 [0:05-0:15]: Close-up — teacher opens drawintheair.com on a Chromebook
Text: "No installation. No accounts. Just open the browser."

FRAME 3 [0:15-0:25]: Medium shot — child waves at camera, hand tracking activates
Text: "Wave to start. The AI detects the hand instantly."

FRAME 4 [0:25-0:40]: Close-up — child traces letter S in the air, screen shows the path
Text: "Trace letters in the air for handwriting practice"

FRAME 5 [0:40-0:55]: Medium shot — child playing Bubble Pop, physically reaching and pointing
Text: "Build hand-eye coordination through play"

FRAME 6 [0:55-1:10]: Wide shot — 3 children at different Chromebooks, each doing a different activity
Text: "Perfect for station rotations"

FRAME 7 [1:10-1:20]: Close-up — child smiling, giving thumbs up
Text: "Free. Private. Runs on Chromebooks."

FRAME 8 [1:20-1:30]: URL card
Text: "drawintheair.com"
Logo in corner
```

---

## 8. Teacher Referral Loops

### 8.1 In-Product Share Feature

Add a share button to the activity completion screen and the mode selection menu.

**Share UI — Post-Activity Completion:**

```
┌─────────────────────────────────────────────┐
│                                             │
│  ✨ Great job! Activity complete.           │
│                                             │
│  [Play Again]  [Choose Activity]            │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📤 Share this activity with a colleague    │
│                                             │
│  [Copy Link]  [Email]  [QR Code]           │
│                                             │
└─────────────────────────────────────────────┘
```

**Share UI — Mode Selection Menu (persistent, non-intrusive):**

A small share icon in the top-right corner of each activity card. Tapping it opens:

```
┌───────────────────────────────────────┐
│  Share Letter Tracing                 │
│                                       │
│  📋 Copy Link                        │
│  drawintheair.com/letter-tracing      │
│                                       │
│  ✉️  Email to a Colleague             │
│  Pre-filled subject: "Try this       │
│  gesture learning activity"           │
│                                       │
│  📱 Show QR Code                      │
│  (Students or teachers can scan)      │
│                                       │
└───────────────────────────────────────┘
```

### 8.2 Share Link Format

```
https://drawintheair.com/share/{activitySlug}?ref={shareId}
```

Example:
```
https://drawintheair.com/share/letter-tracing?ref=ts_abc123
```

The `/share/{activitySlug}` route renders a landing page specific to the shared activity with:
- Activity description and screenshot
- "Try This Activity" CTA button that goes to `/play` with the mode pre-selected
- "Shared by a fellow teacher" badge
- Attribution: "Discover more activities at drawintheair.com"

The `ref` parameter tracks share virality:
- `ts_` prefix = teacher share
- The ID links back to the original sharer (anonymised)
- Analytics event: `share_landing` logged with activityId and shareId

### 8.3 Email Share Template

When "Email to a Colleague" is clicked, open the default mail client with:

```
Subject: Try this gesture learning activity — Draw in the Air

Body:
I've been using this free browser-based activity with my class and thought you might like it.

It's called Draw in the Air — children trace letters, pop bubbles, and sort objects using hand gestures through the webcam. Works on Chromebooks, no installation needed.

Try it here: https://drawintheair.com/share/{activitySlug}?ref={shareId}

No accounts or setup — just open the link and wave at the camera.
```

### 8.4 QR Code Generation

Generate a QR code on the client side using a lightweight library:

```typescript
// QR code generation (use qrcode library or canvas-based generator)
// The QR code encodes: https://drawintheair.com/share/{activitySlug}?ref={shareId}
```

Teachers can display the QR code:
- On their interactive whiteboard for students to scan at home
- On a printed handout for parents
- At a staff meeting to share with colleagues

### 8.5 Share Analytics

Track the full share funnel:

```
share_initiated → share_landing → share_conversion
```

- `share_initiated`: Teacher clicked the share button (tracks method: link/email/qr)
- `share_landing`: Someone arrived via a share link
- `share_conversion`: The person who arrived via share completed an activity

This data shows which activities generate the most referrals and which share methods work best.

---

## 9. Directory and Ecosystem Submission Assets

### 9.1 Common Sense Education

**Product Name:** Draw in the Air
**Website:** https://drawintheair.com
**Category:** Early Learning, Literacy, STEM
**Age Range:** 3-8
**Platform:** Web browser (Chrome, Edge, Firefox, Safari), Chromebook compatible
**Price:** Free
**Requires Account:** No

**Description for Submission:**
Draw in the Air is a free, browser-based learning platform that uses AI hand tracking to create gesture-controlled educational activities. Children interact with learning content by moving their hands in front of a standard webcam — no touchscreen, mouse, or special hardware needed. Activities include letter tracing (A-Z), number formation (0-10), shape recognition, categorisation and sorting, colour theory, early arithmetic, and creative drawing. All camera processing happens locally on the device; no video is recorded, transmitted, or stored. No accounts, no ads, no data collection from children.

**Learning Rating Justification:**
The platform supports embodied cognition research: children who physically engage with learning content through movement show improved retention compared to passive screen interaction. Activities are mapped to early years curriculum objectives (EYFS, Common Core K-2) for letter formation, number sense, shape recognition, and fine motor development.

**Privacy Statement:**
No student data is collected. No accounts are created. Camera processing runs entirely on the client device using Google MediaPipe. No video is transmitted to any server. The platform complies with COPPA requirements through its zero-data-collection architecture.

---

### 9.2 EdSurge

**Product Name:** Draw in the Air
**Category:** EdTech Tool — Early Childhood / Literacy / STEM
**Tagline:** Gesture-controlled learning activities powered by AI hand tracking

**Description:**
Draw in the Air makes screen time active. Children learn letters, numbers, and shapes by physically moving their hands in front of a webcam. The browser-based AI tracks hand gestures in real time and provides interactive feedback. Nine activity modes cover literacy, numeracy, fine motor development, and creative expression. Works on Chromebooks, school laptops, and home computers with zero installation. Privacy-first: no data collection, no accounts, no video storage.

**Key Differentiator:**
Unlike traditional educational software that requires fine motor precision (mouse clicks, screen taps), Draw in the Air uses gross motor gestures accessible to children as young as 3. This makes it particularly effective for pre-writing development and suitable for children with limited fine motor control.

---

### 9.3 Product Hunt

**Tagline:** AI hand tracking turns any webcam into a learning tool for kids

**Description:**
Draw in the Air is a free, browser-based educational platform that uses computer vision to track hand gestures in real time. Children ages 3-8 interact with learning activities by moving their hands in front of any standard webcam.

Nine activities cover letter tracing (A-Z), number formation (0-10), shape recognition, object sorting, colour mixing, early maths, word finding, and creative drawing.

Built with Google MediaPipe running entirely client-side. No video is recorded or transmitted. No accounts, no downloads, no ads. Works on Chromebooks, school laptops, and home computers.

**Topics:** Education, Artificial Intelligence, Developer Tools

**Maker Comment:**
"I built Draw in the Air because I noticed that young children struggle with mouse and touchscreen precision. They can extend their arm and point — so I built learning activities around natural hand gestures. The AI runs entirely in the browser, so it works on classroom Chromebooks without any IT setup. Everything is free because I believe educational tools should be accessible to every classroom."

---

### 9.4 AlternativeTo

**Software Name:** Draw in the Air
**Category:** Education > Learning Platforms
**Alternative To:** ABCmouse, Starfall, PBS Kids Games, Khan Academy Kids

**Description:**
Free browser-based learning platform using AI hand tracking for gesture-controlled educational activities. Children ages 3-8 trace letters, numbers, and shapes by moving their hands in front of a webcam. No download, no accounts, no ads.

**Tags:** education, kids, learning, hand-tracking, gesture, AI, computer-vision, browser-based, free, chromebook, classroom

**Key Features:**
- Gesture-based interaction (no mouse/touchscreen needed)
- AI-powered hand tracking via Google MediaPipe
- 9 learning activities (letters, numbers, shapes, sorting, colours, maths, spelling, drawing)
- Privacy-first (no video recording, no data collection)
- Works on Chromebooks and school laptops
- No account required

---

### 9.5 AI Tool Directories

Submit to: There's An AI For That, Futurepedia, AI Tool Directory, ToolPilot.ai, TopAI.tools

**Consistent Listing Copy:**

**Name:** Draw in the Air
**Category:** AI Education / Computer Vision
**Pricing:** Free

**Description:**
Browser-based educational platform using real-time AI hand tracking to create gesture-controlled learning activities for children. Built on Google MediaPipe, the system detects 21 hand landmarks at 30 FPS entirely client-side. Children interact with educational content through natural hand movements — no mouse, touchscreen, or special hardware required. Nine activity modes covering literacy, numeracy, and motor development. Zero data collection. Runs on any device with a webcam and modern browser.

**Use Case:** Early childhood education, classroom learning activities, handwriting preparation, hand-eye coordination development, STEM demonstration of computer vision

---

### 9.6 Additional Directories

**TeachersPayTeachers (TpT) — Free Resource Listing:**
Create a free product listing that bundles the printable worksheets from `/free-resources` with a link to the digital platform. Title: "Free Gesture Learning Activities — Letter Tracing A-Z (Digital + Printable)". This drives TpT's existing teacher audience to discover Draw in the Air.

**Twinkl Partner Application:**
Contact Twinkl's partner team (partners@twinkl.co.uk) with the creator pack. Position Draw in the Air as a complementary digital resource for their existing printable letter formation materials.

**ClassDojo Resource Sharing:**
Create a ClassDojo post (text + screenshot) recommending Draw in the Air as a brain break tool. Post in the ClassDojo Community feed.

**Google for Education Partner Directory:**
Apply at edu.google.com/partners with Chromebook compatibility emphasis. The zero-installation, browser-based architecture is a strong fit for Google's education ecosystem.

---

## 10. Implementation Roadmap

### 10.1 Phase Sequencing

```
WEEK 1-2: Foundation
├── Create 6 new SEO landing page components (Section 3)
├── Add routes to main.tsx for new pages
├── Update sitemap.xml with new URLs
├── Update internal linking on existing pages
└── Implement share analytics events

WEEK 3-4: Chrome + Embed
├── Finalise Chrome Web Store listing copy
├── Prepare 5 store screenshots with captions
├── Submit Chrome extension to Web Store
├── Implement scoped embed variants (?embed=true&mode=X)
├── Build embed attribution tracking
├── Update /embed page with activity-specific embed codes
└── Create /partners page

WEEK 5-6: Resources + Referral
├── Generate 10 classroom guide PDFs
├── Upload guides to /public/guides/
├── Update /free-resources page to list all guides
├── Build teacher share UI component
├── Implement share link routing (/share/:activitySlug)
├── Implement email share template
├── Implement QR code generation
└── Build review acquisition prompt system

WEEK 7-8: Creator + Directories
├── Assemble creator outreach pack ZIP
├── Update /press page with download link
├── Submit to Common Sense Education
├── Submit to EdSurge product directory
├── Prepare and submit Product Hunt launch
├── Submit to AlternativeTo
├── Submit to 3-5 AI tool directories
├── Create free TpT listing
└── Contact Twinkl partnerships

WEEK 9-10: Content Engine
├── Publish first 5 blog articles at /learn/*
├── Create social media content templates
├── Set up weekly content workflow
├── Begin Reddit community engagement (r/Teachers, r/edtech, r/homeschool)
└── Begin LinkedIn educator posting

ONGOING (Week 11+):
├── Publish 2 blog articles per week
├── Post social content weekly
├── Monitor Chrome Web Store reviews and ranking
├── Track embed adoption across websites
├── Monitor share virality metrics
├── Respond to directory reviews
└── Outreach to 2-3 education creators per month
```

### 10.2 Site Architecture Summary

```
drawintheair.com/
├── / (Landing)
├── /play (App)
│
├── AUDIENCE HUBS
│   ├── /for-teachers
│   ├── /for-parents
│   ├── /schools
│   ├── /for-homeschool
│   ├── /for-preschool
│   └── /for-kindergarten
│
├── USE CASE LANDING PAGES (NEW)
│   ├── /gesture-learning
│   ├── /classroom-movement-activities
│   ├── /chromebook-learning-tools
│   ├── /homeschool-movement-learning
│   ├── /hand-eye-coordination-activities
│   └── /ai-learning-tools-for-kids
│
├── ACTIVITY PAGES
│   ├── /letter-tracing
│   ├── /trace-a ... /trace-z (26 pages)
│   ├── /trace-number-1 ... /trace-number-10 (10 pages)
│   ├── /trace-circle ... /trace-oval (8 pages)
│   ├── /activities/bubble-pop
│   ├── /activities/sort-and-place
│   ├── /free-paint
│   └── /draw-number-in-air, /air-drawing-challenge, /draw-circle-in-air (viral)
│
├── CONTENT HUB
│   ├── /learn (Hub page)
│   └── /learn/* (20+ articles)
│
├── RESOURCES
│   ├── /free-resources (Printables + guides)
│   └── /resources/guides/:slug (Individual guide pages)
│
├── DISTRIBUTION
│   ├── /embed (Embed instructions)
│   ├── /embed/:activityId (Scoped embed entries)
│   ├── /partners (Partner/creator documentation)
│   ├── /press (Press kit + creator pack)
│   └── /share/:activitySlug (Teacher share landing)
│
├── TRUST
│   ├── /faq
│   ├── /privacy
│   ├── /terms
│   ├── /cookies
│   ├── /safeguarding
│   └── /accessibility
│
└── ADMIN
    ├── /admin (Dashboard)
    └── /school (Pilot access)
```

### 10.3 SEO Article Topics (20 Articles)

Each article lives at `/learn/{slug}` and naturally links to Draw in the Air activities.

| # | Article Title | Target Keywords | Links To |
|---|--------------|----------------|----------|
| 1 | Why Movement Helps Children Learn: The Science of Embodied Cognition | embodied cognition children, movement learning research | /gesture-learning, /classroom-movement-activities |
| 2 | 10 Movement Break Activities for Primary Classrooms | movement breaks classroom, brain break activities | /activities/bubble-pop, /free-paint |
| 3 | How Gesture-Based Learning Supports Handwriting Development | gesture learning handwriting, pre-writing activities | /letter-tracing, /hand-eye-coordination-activities |
| 4 | The Best Free Chromebook Activities for Classroom Learning | chromebook activities free, chromebook learning tools | /chromebook-learning-tools, /for-teachers |
| 5 | Hand-Eye Coordination in Early Years: Why It Matters | hand-eye coordination early years, visual motor development | /hand-eye-coordination-activities, /activities/bubble-pop |
| 6 | How AI Hand Tracking Works: A Teacher's Guide | AI hand tracking explained, computer vision education | /ai-learning-tools-for-kids, /gesture-learning |
| 7 | 5 Active Learning Strategies for Kinesthetic Learners | kinesthetic learning strategies, active learning primary | /classroom-movement-activities, /gesture-learning |
| 8 | Gross Motor to Fine Motor: The Pre-Writing Progression | gross motor pre-writing, fine motor development stages | /letter-tracing, /free-resources |
| 9 | Screen Time That Isn't Passive: Active Digital Learning | active screen time kids, productive screen time education | /for-parents, /gesture-learning |
| 10 | Setting Up Movement Stations in Your Classroom | movement stations classroom, learning station rotation | /classroom-movement-activities, /for-teachers |
| 11 | Homeschool Movement Activities That Teach Literacy | homeschool literacy activities, active homeschool curriculum | /homeschool-movement-learning, /for-homeschool |
| 12 | Why Chromebooks Are Ideal for Gesture-Based Learning | chromebook gesture learning, chromebook webcam activities | /chromebook-learning-tools |
| 13 | Indoor Recess Activities That Are Actually Educational | indoor recess ideas, educational indoor recess activities | /classroom-movement-activities |
| 14 | EYFS Physical Development Through Digital Play | EYFS physical development, early years physical activities | /for-teachers, /hand-eye-coordination-activities |
| 15 | How Sorting Activities Build Cognitive Skills in Early Years | sorting activities early years, categorisation skills children | /activities/sort-and-place |
| 16 | Teaching Shapes Through Movement and Play | teaching shapes early years, shape activities preschool | /trace-circle, /trace-triangle, /trace-square |
| 17 | The Role of Immediate Feedback in Early Learning | immediate feedback learning, visual feedback education | /letter-tracing, /activities/bubble-pop |
| 18 | Free STEM Activities for Primary Classrooms | free STEM activities primary, STEM games KS1 | /ai-learning-tools-for-kids |
| 19 | Supporting SEN Learners with Gesture-Based Technology | SEN learning technology, inclusive classroom activities | /gesture-learning, /for-teachers |
| 20 | Number Formation Activities for Reception and Year 1 | number formation activities, number writing practice | /trace-number-1 through /trace-number-10 |

### 10.4 Weekly Automated Content Engine

**Weekly content production cycle (can be templated and batch-produced monthly):**

**Monday — LinkedIn Post (educator audience)**
Format: 3-4 paragraphs, no hashtag spam, end with a question
Topic rotation: Classroom tip → Research insight → Activity spotlight → Teacher story
Example:
"Last week a Year 1 teacher told me her students now ask for 'air writing time' every morning. They spend 3 minutes tracing that day's focus letter using their webcam before picking up a pencil. She said the handwriting improvement was visible within two weeks. The bridge between gross motor movement and fine motor writing is well-documented in occupational therapy research, but it's rarely applied in classroom technology. That's what we built Draw in the Air to address. What's your morning warm-up routine?"

**Tuesday — Twitter/X Post (education community)**
Format: 1-2 sentences, direct, conversational
Example: "A 4-year-old can't control a mouse, but they can point at a screen. That's the whole premise of gesture-based learning. drawintheair.com"

**Wednesday — Reddit Discussion Post (r/Teachers, r/edtech, r/homeschool)**
Format: Genuine discussion question, not promotional. Mention Draw in the Air only if directly relevant.
Example post in r/Teachers: "Teachers who use movement breaks — what's your go-to? I've been testing out gesture-based activities where kids trace letters using their webcam and it's been surprisingly effective for engagement. Curious what movement strategies work in your classroom."

**Thursday — YouTube Short Concept**
Format: 30-60 second demo of one specific activity
This week's focus: Letter Tracing showing a child tracing "S" — the most satisfying letter to watch
Caption: "AI watches her hand and turns it into a letter. Free, no download, runs on Chromebooks."

**Friday — TikTok Demo Concept**
Format: 15-45 second visual hook
This week's concept: Split-screen of child air-tracing on the left, on-screen result on the right
Text overlay: "When the AI follows your finger in real time"
Sound: trending classroom sound or lo-fi study music

### 10.5 Critical Implementation Files

Files to create or modify to implement this growth architecture:

**New files:**
```
src/pages/seo/UseCasePage.tsx                  ← 6 new landing pages (single component)
src/components/share/ShareButton.tsx            ← Share UI component
src/components/share/ShareModal.tsx             ← Share modal (link/email/QR)
src/components/share/QRGenerator.tsx            ← QR code generator
src/components/review/ReviewPrompt.tsx          ← Chrome store review prompt
src/pages/seo/ShareLandingPage.tsx             ← /share/:activitySlug landing
src/pages/seo/PartnersPage.tsx                 ← /partners documentation
public/guides/01-alphabet-gesture-challenge.pdf ← 10 guide PDFs
public/guides/02-five-minute-movement-break.pdf
... (8 more)
public/creator-pack.zip                         ← Creator outreach pack
```

**Modified files:**
```
src/main.tsx                    ← Add routes for new pages
src/seo/seo-config.ts          ← Add metadata for all new pages
src/App.tsx                     ← Add embed mode detection, share button, review prompt
src/lib/analytics.ts            ← Add growth tracking events
src/components/landing/Footer.tsx ← Add links to new pages
public/sitemap.xml              ← Add all new URLs
```

### 10.6 Success Metrics

Track these metrics weekly to measure growth system performance:

| Metric | Target (Month 3) | Target (Month 6) | Target (Month 12) |
|--------|------------------|------------------|-------------------|
| Monthly unique visitors | 2,000 | 5,000 | 15,000 |
| Chrome store installs | 200 | 800 | 3,000 |
| Embed sites (unique domains) | 10 | 50 | 200 |
| Teacher shares initiated | 100 | 500 | 2,000 |
| Share-to-usage conversion rate | 30% | 35% | 40% |
| Directory listings live | 5 | 10 | 15 |
| Blog articles published | 10 | 25 | 50+ |
| Creator reviews/demos | 3 | 10 | 25 |
| Chrome store rating | 4.5+ | 4.5+ | 4.5+ |
| Organic search sessions (monthly) | 500 | 3,000 | 10,000 |

### 10.7 Growth Flywheel Summary

```
SEO pages rank → teachers discover platform → teachers try activities
        ↓
Teachers embed on class websites → parents discover at home
        ↓
Parents search for the platform → more SEO signals
        ↓
Teachers share with colleagues → new teachers arrive
        ↓
Chrome store installs increase → store ranking improves
        ↓
Creators review the product → videos rank in search
        ↓
More teachers discover via video → more embeds, more shares
        ↓
Each new user amplifies the signal → compounding growth
```

This system does not require the founder to perform daily marketing work. Once the infrastructure is deployed — landing pages, embed system, share feature, Chrome listing, directory submissions — the growth loops operate through teacher behaviour: searching, sharing, embedding, and reviewing.

The founder's ongoing time investment reduces to approximately 2-3 hours per week: reviewing analytics, publishing pre-produced content, and responding to partnership inquiries.

---

*End of Growth Distribution Architecture Document*
