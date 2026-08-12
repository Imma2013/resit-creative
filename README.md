# Resit Creative

Resit is an open-source creative workspace inspired by Canva, Palmier, Postiz, Open Design, and Penpot.

## Product

- **Design** — canvas-based photo/design editor with a right-side AI mode.
- **Video** — timeline editor with AI operations inspired by Palmier's structured editor tooling.
- **Calendar** — social scheduling and publishing workspace inspired by Postiz.
- **Agent** — Gemini-powered command center that can use design, video, asset, generation, and social tools.
- **Settings** — Firebase auth, Convex state, provider connections, and workspace configuration.

## Stack

- Next.js + TypeScript
- Convex for application state and realtime data
- Firebase Authentication
- Vercel deployment
- Gemini 3 Flash for the agent
- GitHub for source

## Architecture principle

AI does not directly rewrite the editor. The agent calls deterministic application tools (`design.*`, `video.*`, `social.*`, `assets.*`, `generate.*`). Human UI and AI use the same underlying operations.

## Blueprint repositories

- Palmier Pro — video editing / AI video editing reference
- Postiz — social calendar and scheduling reference
- Open Design — AI design architecture reference
- Penpot — design editor architecture reference

See `docs/architecture.md` for the implementation roadmap.
