# Resit architecture

## Product model

Resit is one workspace with shared projects and assets. Design, video, social scheduling, and the agent operate on the same underlying content.

```text
Workspace
  ├── Projects
  │    ├── Design documents
  │    ├── Video timelines
  │    └── Social campaigns
  ├── Assets
  ├── Agent threads
  └── Connected channels
```

## AI model

Gemini 3 Flash is the first agent model. It should be treated as an intent planner and tool caller, not as the source of truth for editor state.

```text
Gemini
  ↓ tool calls
Resit Tool Registry
  ├── design.*
  ├── video.*
  ├── social.*
  ├── assets.*
  └── generate.*
       ↓
Deterministic domain services
       ↓
Convex state / media storage / provider APIs
```

## Design

Use a normalized document model: pages, layers, elements, assets, styles, and groups. Manual controls and AI calls must mutate the same commands. Open Design and Penpot are architectural references; avoid copying code across incompatible licenses without review.

## Video

Use a normalized timeline: tracks, clips, trims, transitions, effects, keyframes, captions and audio. Follow Palmier's key principle: expose high-level editor operations as tools rather than letting an LLM rewrite raw timeline state.

## Social

Use a provider adapter interface. Each channel implements connect, media upload, create/update/delete draft, publish, schedule and analytics as available. The calendar is provider-agnostic.

Initial providers: X, Instagram, TikTok, YouTube, Facebook, LinkedIn.

## Backend

Convex owns users/workspaces/projects/documents/timelines/posts/agent runs and realtime collaboration state. Large binary media should use object storage rather than Convex documents.

Firebase owns authentication. Vercel hosts the Next.js application. Provider secrets and Gemini keys remain server-side.

## Delivery order

1. Foundation + app shell (current)
2. Design document model + editor primitives
3. Design AI tool executor
4. Video timeline primitives + media pipeline
5. Video AI tool executor
6. Social accounts + calendar + scheduling queue
7. Agent orchestration across all domains
8. Generation providers + asset pipeline
9. Collaboration, permissions, analytics, export polish
