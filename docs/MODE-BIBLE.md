# Mode Bible
## Five Distinct Game Modes for Draw in the Air

---

## Design Principle

> **The Problem:** Multiple modes currently feel like "draw a line with your finger."
>
> **The Solution:** Each mode must have a different goal, feedback loop, success condition, and interaction rule.

---

## Minimum Distinctness Rule

Each mode **must differ in at least 3 of these 6 dimensions:**

| Dimension | Description |
|-----------|-------------|
| **Goal** | What the child is trying to achieve |
| **Success Condition** | How "winning" or "completion" is defined |
| **Constraint Type** | What rules or limitations apply |
| **Feedback Type** | How the system responds to actions |
| **Scoring/Progress** | How advancement is measured |
| **Primary Gesture** | The main interaction mechanic |

---

## Mode Comparison Matrix

| Dimension | Free Paint | Follow Paths | Learn Letters | Magic Shapes | Pop & Collect |
|-----------|------------|--------------|---------------|--------------|---------------|
| **Goal** | Express freely | Navigate maze | Form letters correctly | Draw recognisable shapes | Capture moving targets |
| **Success** | None (expressive) | Reach finish | Correct stroke order | Shape recognised | Targets captured |
| **Constraint** | None | Stay in lane | Follow sequence | Shape properties | Time/movement |
| **Feedback** | Visual trail | Lane warnings | Stroke guidance | Transformation | Capture celebration |
| **Progress** | None | Checkpoints | Strokes → Letters | Shapes → Collection | Score/Gallery |
| **Gesture** | Continuous draw | Navigate without touch | Ordered strokes | Single shape draw | Loop drawing |

✅ Each mode differs in **at least 4 dimensions** from every other mode.

---

## Mode A: Free Paint (Open Creative Studio)

### Core Promise
> **"Make anything, no rules."**

### Overview
| Attribute | Value |
|-----------|-------|
| Primary EYFS Area | Expressive Arts & Design |
| Target Age | 3-7 (universal) |
| Session Length | Unlimited |
| Difficulty | N/A (expressive) |

### Primary Loop
```
Choose Tool → Draw → Admire → Clear → Repeat
```

### Unique Mechanics

#### Tool Switching
| Tool | Behaviour | Visual |
|------|-----------|--------|
| **Felt Tip** (default) | Solid, consistent stroke | Smooth line with slight glow |
| **Stamp Brush** | Places shapes at intervals | Stars, hearts, dots along path |
| **Ribbon Brush** | Flowing, tapered stroke | Calligraphy-style ribbon |
| **Sparkle Brush** | Particle trail | Glitter that fades |

#### Canvas Helpers (Toggles)
| Helper | Purpose | Visual |
|--------|---------|--------|
| **Grid** | Spatial reference | Faint dots at intervals |
| **Symmetry** | Mirror drawing | Vertical axis reflection |

### Success & Failure
| Success | Failure |
|---------|---------|
| None—it's expressive | None—no wrong answers |

### What Makes It Distinct
- ❌ No targets
- ❌ No scoring
- ❌ No constraints
- ✅ Completely child-led
- ✅ Focus on process, not outcome

### UI Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Free Paint 🎨]                              [🔒 Exit]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────┐                                               │
│  │ 🖌️   │        ┌─────────────────────┐               │
│  │ Felt │        │                     │               │
│  │ Tip  │        │                     │               │
│  ├──────┤        │      CANVAS         │    ┌──────┐   │
│  │ ⭐   │        │                     │    │ Grid │   │
│  │Stamp │        │                     │    │ [Off]│   │
│  ├──────┤        │                     │    ├──────┤   │
│  │ 〰️   │        └─────────────────────┘    │Mirror│   │
│  │Ribbon│                                   │ [Off]│   │
│  ├──────┤                                   └──────┘   │
│  │ ✨   │                                               │
│  │Spark │                                               │
│  └──────┘                                               │
│                                                         │
│     [🔴][🔵][🟣][🟡][🟢][⚪]        [Clear 🗑️]         │
└─────────────────────────────────────────────────────────┘
```

---

## Mode B: Follow Paths (Maze Runner Tracing)

### Core Promise
> **"Follow the road without crashing."**

### Overview
| Attribute | Value |
|-----------|-------|
| Primary EYFS Area | Physical Development |
| Target Age | 4-6 |
| Session Length | 2-5 minutes per maze |
| Difficulty | Progressive (narrow lanes) |

### Primary Loop
```
Start Gate → Stay Inside Lane → Pass Checkpoints → Reach Finish
```

### Unique Mechanics

#### Lane System (Not a Line!)
| Element | Description |
|---------|-------------|
| **Corridor** | Wide path with visible walls (not a single trace line) |
| **Width** | Starts wide (easy), narrows in later levels |
| **Walls** | Soft glow boundaries that react to proximity |

#### Speed Zones
| Zone | Behaviour | Visual |
|------|-----------|--------|
| **Normal** | Standard movement | Regular lane colour |
| **Slow Zone** | Requires steadier, slower movement | Yellow tint, wavy lines |
| **Boost Zone** | Rewards confident movement | Green tint, sparkles |

#### Checkpoints
| Feature | Description |
|---------|-------------|
| **Purpose** | Safe rest points, resume points |
| **Behaviour** | Touching checkpoint saves progress |
| **Visual** | Glowing star gate |

### Success & Failure
| Success | Failure |
|---------|---------|
| Reach finish with minimal lane exits | Too many lane exits → gentle reset to last checkpoint |

**Lane Exit Thresholds:**
| Level | Max Exits Allowed |
|-------|-------------------|
| Easy | 10 |
| Medium | 6 |
| Hard | 3 |

### What Makes It Distinct
- ✅ Navigate INSIDE boundaries (not ON a line)
- ✅ Checkpoints for persistence
- ✅ Width as difficulty (not path complexity)
- ❌ Not "trace this exact path"

### Maze Progression
| Level | Corridor Width | Turns | Special |
|-------|----------------|-------|---------|
| 1 | 80px | 2 | Straight sections only |
| 2 | 60px | 4 | Gentle curves |
| 3 | 50px | 6 | One slow zone |
| 4 | 40px | 8 | Multiple slow zones |
| 5 | 30px | 10 | Boost zones reward |

---

## Mode C: Learn Letters (Formation Coach)

### Core Promise
> **"Learn how letters are built."**

### Overview
| Attribute | Value |
|-----------|-------|
| Primary EYFS Area | Literacy |
| Target Age | 4-6 |
| Session Length | 3-5 minutes per letter |
| Difficulty | Progressive (letter complexity) |

### Primary Loop
```
Watch Demo → Trace Stroke 1 → Feedback → Trace Stroke 2 → ... → Letter Complete → Sound Reward
```

### Unique Mechanics

#### Stroke Order Enforcement
| Rule | Description |
|------|-------------|
| **Sequential** | Must complete stroke 1 before stroke 2 appears |
| **Directional** | Arrows show required direction |
| **Corrective** | Wrong direction = "Try again" on that stroke only |

#### Directional Arrows
| State | Arrow Visibility |
|-------|------------------|
| First attempt | Always shown |
| After success | Hidden (earned independence) |
| After failure | Re-shown with emphasis |

#### Phonics Integration
| Event | Audio |
|-------|-------|
| Letter complete | Letter sound (phoneme) |
| Word complete | Example word |
| Perfect formation | Celebration sound |

### Success & Failure
| Success | Failure |
|---------|---------|
| Correct stroke order AND direction with acceptable accuracy | Off-direction triggers "try again" on that stroke only |

**Accuracy Thresholds:**
| Level | Path Tolerance | Direction Tolerance |
|-------|----------------|---------------------|
| Learning | 15% of stroke | 45° |
| Practicing | 10% of stroke | 30° |
| Mastered | 8% of stroke | 20° |

### What Makes It Distinct
- ✅ Sequence learning (stroke 1, 2, 3...)
- ✅ Direction matters (not just path)
- ✅ Sound reward creates phonics link
- ❌ Not free tracing

### Letter Data Structure
```typescript
interface Letter {
  character: string;
  phoneme: string;        // Audio file reference
  exampleWord: string;    // "a is for apple"
  strokes: Stroke[];
}

interface Stroke {
  order: number;
  points: Point[];        // Path to follow
  direction: 'forward' | 'backward';  // Which way to trace
  type: 'line' | 'curve' | 'loop';
}
```

### Letter Introduction Order
| Group | Letters | Skills Introduced |
|-------|---------|-------------------|
| 1 | l, t, i | Vertical lines, dots |
| 2 | c, o, a | Curves, closed shapes |
| 3 | s, e | S-curves, loops |
| 4 | n, m, h | Arches, repeated strokes |
| 5 | r, b, d, p | Combinations |

---

## Mode D: Magic Shapes (Shape Builder & Recogniser)

### Core Promise
> **"Draw a rough shape, it becomes something magical."**

### Overview
| Attribute | Value |
|-----------|-------|
| Primary EYFS Area | Mathematics |
| Target Age | 3-5 |
| Session Length | 5-10 minutes (open-ended) |
| Difficulty | Adaptive (recognition tolerance) |

### Primary Loop
```
Draw Shape → Recognition → Transform Animation → Magical Object Appears → Celebrate
```

### Unique Mechanics

#### Shape Recognition
| Shape | Essential Properties | Tolerance |
|-------|---------------------|-----------|
| Circle | Closed, roundish, no corners | High (forgiving) |
| Square | Closed, 4 corners, ~equal sides | Medium |
| Triangle | Closed, 3 corners | Medium |
| Rectangle | Closed, 4 corners, 2 long sides | Medium |
| Star | 5 points outward | Lower |

#### Transform Animation
| Child Draws | System Creates | Animation |
|-------------|----------------|-----------|
| Rough circle | Perfect circle → Sun/Planet/Ball | Smooths, grows, adds details |
| Rough square | Perfect square → House/Present/Robot | Snaps to shape, decorates |
| Rough triangle | Perfect triangle → Mountain/Tree/Sail | Adds texture, context |

#### Creative Reveal
| Element | Description |
|---------|-------------|
| Shape Snap | Child's rough shape morphs into perfect version |
| Object Transform | Perfect shape becomes themed object |
| Background React | Stars burst, scene changes colour |
| Sound | Magical transformation whoosh |

### Success & Failure
| Success | Failure |
|---------|---------|
| Recognised shape triggers transformation | Mis-recognition → gentle hint: "Try making it rounder!" |

**Recognition Confidence:**
| Confidence | Result |
|------------|--------|
| >80% | Instant transform |
| 50-80% | "Is this a [shape]?" confirmation |
| <50% | "Hmm, try again! Make it more [hint]" |

### What Makes It Distinct
- ✅ Recognition + transformation (not path following)
- ✅ Child's imperfect input → polished output
- ✅ Creative surprise element
- ❌ Not about accuracy—about properties

### Shape Collection
```typescript
interface ShapeCollection {
  circles: TransformedObject[];   // Sun, Moon, Ball, Cookie...
  squares: TransformedObject[];   // House, Present, Robot, Window...
  triangles: TransformedObject[]; // Mountain, Tree, Sail, Pizza slice...
}
```

---

## Mode E: Pop and Collect (Action Game with Drawing as Tool)

### Core Promise
> **"Use your trail to catch moving things."**

### Overview
| Attribute | Value |
|-----------|-------|
| Primary EYFS Area | Physical Development |
| Target Age | 5-7 |
| Session Length | 3-5 minutes per round |
| Difficulty | Progressive (target speed) |

### Primary Loop
```
Targets Appear → Draw Loop Around Target → Capture → Collect → Gallery Grows
```

### Unique Mechanics

#### Moving Targets
| Target Type | Movement | Speed |
|-------------|----------|-------|
| Butterfly | Floating, random | Slow |
| Star | Drifting, predictable | Medium |
| Comet | Linear, fast | Fast |
| Rainbow Fish | Sine wave | Variable |

#### Loop Capture Mechanic
| Rule | Description |
|------|-------------|
| **Must Enclose** | Drawing must form closed loop around target |
| **Minimum Size** | Loop must be at least 1.5x target size |
| **Time Limit** | Must close loop within 2 seconds of starting |

```
  ✗ Just touching          ✓ Enclosing loop
  
     ★                         ╭──────╮
    /                          │  ★   │
   /                           ╰──────╯
```

#### Collectible Gallery
| Feature | Description |
|---------|-------------|
| **Gallery View** | All captured creatures displayed |
| **Categories** | Grouped by type |
| **Achievements** | "Catch 5 butterflies" badges |

### Success & Failure
| Success | Failure |
|---------|---------|
| Capture count increases | Target escapes—no penalty, just try again |

**No Negative Consequences:**
- Escaped targets don't subtract points
- No "game over" state
- Always encouraging to try again

### What Makes It Distinct
- ✅ Drawing is a TOOL for gameplay (not the activity itself)
- ✅ Moving targets add timing challenge
- ✅ Loop mechanic (not just touching)
- ❌ Not about making pretty pictures

### Difficulty Progression
| Level | Target Count | Speed | Special |
|-------|--------------|-------|---------|
| 1 | 1 at a time | Slow | Stationary targets |
| 2 | 2 at a time | Slow | Gentle drift |
| 3 | 3 at a time | Medium | Mixed speeds |
| 4 | 4 at a time | Medium | Some evade cursor |
| 5 | 5 at a time | Fast | Combo bonuses |

---

## Implementation Priority

### MVP (Phase 1)
| Mode | Status | Priority |
|------|--------|----------|
| Free Paint | ✅ Exists | Enhance with tools |
| Follow Paths | 🆕 New | High - distinct from tracing |
| Pre-Writing | ✅ Exists | Refactor or merge into Follow Paths |

### Phase 2
| Mode | Status | Priority |
|------|--------|----------|
| Learn Letters | 🆕 New | High - literacy focus |
| Magic Shapes | 🆕 New | Medium - math + creative |

### Phase 3
| Mode | Status | Priority |
|------|--------|----------|
| Pop and Collect | 🆕 New | Medium - gamification |

---

## Shared Infrastructure

All modes share:
- Hand tracking core
- Stroke rendering engine
- Cursor display
- Adult gate
- Session analytics

Mode-specific:
- Logic callback (per-frame processing)
- UI components
- Progress/scoring system
- Assets (sounds, graphics)

---

*This Mode Bible ensures each activity offers a meaningfully different experience while maintaining consistent quality and educational alignment.*

