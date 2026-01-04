# Draw in the Air - Documentation Index

## Product Documentation Suite

This directory contains comprehensive product and technical documentation for the Draw in the Air application.

---

## Document Overview

| Document | Purpose | Audience |
|----------|---------|----------|
| [EYFS-TRACEABILITY-MATRIX.md](./EYFS-TRACEABILITY-MATRIX.md) | Educational alignment with Early Years Foundation Stage | Educators, Partners, Product |
| [MODE-BIBLE.md](./MODE-BIBLE.md) | Detailed specifications for all 5 game modes | Design, Engineering |
| [STROKE-QUALITY-SPEC.md](./STROKE-QUALITY-SPEC.md) | Rendering pipeline and quality requirements | Engineering, QA |
| [ONBOARDING-SPEC.md](./ONBOARDING-SPEC.md) | Parent setup and child tutorial flows | Design, Engineering |
| [ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md) | Feature-by-feature definition of done | Engineering, QA |
| [PEN-STATE-UX.md](./PEN-STATE-UX.md) | Pinch-to-draw interaction model | Design, Engineering |
| [COORDINATE-SYSTEM.md](./COORDINATE-SYSTEM.md) | Mirroring and coordinate space handling | Engineering |

---

## Quick Links by Role

### For Product Managers
- Start with [EYFS-TRACEABILITY-MATRIX.md](./EYFS-TRACEABILITY-MATRIX.md) for educational alignment
- Review [MODE-BIBLE.md](./MODE-BIBLE.md) for feature differentiation
- See [../PRD.md](../PRD.md) for overall product requirements

### For Designers
- [MODE-BIBLE.md](./MODE-BIBLE.md) defines each mode's unique mechanics
- [ONBOARDING-SPEC.md](./ONBOARDING-SPEC.md) covers user flows
- [PEN-STATE-UX.md](./PEN-STATE-UX.md) defines the core interaction model

### For Engineers
- [STROKE-QUALITY-SPEC.md](./STROKE-QUALITY-SPEC.md) has the rendering pipeline
- [COORDINATE-SYSTEM.md](./COORDINATE-SYSTEM.md) explains mirroring
- [ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md) defines "done"

### For QA
- [ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md) has all test criteria
- [STROKE-QUALITY-SPEC.md](./STROKE-QUALITY-SPEC.md) includes visual QA checklist

### For Educators/Partners
- [EYFS-TRACEABILITY-MATRIX.md](./EYFS-TRACEABILITY-MATRIX.md) shows educational intent
- [MODE-BIBLE.md](./MODE-BIBLE.md) explains each activity's learning goals

---

## Document Summaries

### 1. EYFS Traceability Matrix
Maps every feature to specific Early Years Foundation Stage outcomes:
- Child actions and what they develop
- Observable evidence for assessment
- Measurement methods for tracking progress

**Key Insight:** EYFS is a lens for intentional play, not a checklist.

### 2. Mode Bible
Defines 5 distinct game modes that share tracking but differ in:
- **Free Paint** - Open creative expression, no rules
- **Follow Paths** - Navigate corridors without touching walls
- **Learn Letters** - Stroke-order letter formation
- **Magic Shapes** - Draw rough shapes that transform
- **Pop & Collect** - Draw loops to capture moving targets

**Key Insight:** Each mode must differ in at least 3 of 6 dimensions.

### 3. Stroke Quality Specification
Defines measurable quality targets for stroke rendering:
- Smoothness, consistency, latency, stability
- 6-stage stabiliser pipeline
- Acceptance tests (functional, performance, visual)
- QA debug scene specification

**Key Insight:** Use One Euro Filter for adaptive smoothing.

### 4. Onboarding Specification
Two distinct flows:
- **Parent Setup** (first launch): Permissions, environment, calibration, age band
- **Kid Micro-Tutorial** (every session): 5 steps in 20-40 seconds

**Key Insight:** No reading required—voice + icons only.

### 5. Acceptance Criteria
Feature-by-feature "done" definitions:
- Entry conditions
- Success criteria
- Failure handling
- Edge cases
- Instrumentation

**Key Insight:** A feature is not complete until all criteria pass.

### 6. Pen State UX
Solves "drawing while paused" with pinch-to-draw model:
- Pinch = pen down (drawing)
- Open = pen up (paused)
- Visual and audio feedback
- Alternative hover-to-arm for younger children

**Key Insight:** Intentional control prevents frustration.

### 7. Coordinate System
Explains and solves the mirroring problem:
- Camera coordinates vs screen coordinates
- Transform once, use everywhere
- Common bugs and fixes

**Key Insight:** Pick one approach (transform or CSS) and use consistently.

---

## Implementation Priority

### Phase 1: Core Quality (Current)
1. ✅ Basic hand tracking
2. ✅ Free paint mode
3. ✅ Pre-writing tracing
4. 🔄 Stroke quality improvements
5. 🔄 Pen state (pinch-to-draw)
6. 🔄 Coordinate system fix

### Phase 2: Full Mode Set
1. Follow Paths (maze mode)
2. Learn Letters (with stroke order)
3. Magic Shapes (recognition)
4. Pop & Collect (action game)

### Phase 3: Polish
1. Parent setup onboarding
2. Kid micro-tutorial
3. Audio/voice integration
4. Analytics implementation

---

## Maintenance

These documents should be updated when:
- Feature requirements change
- User research reveals new insights
- Technical implementation differs from spec
- New features are added

**Owner:** Product team  
**Review Cadence:** Monthly or with each major release

---

*For questions about this documentation, contact the product team.*

