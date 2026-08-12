# Resit Creative architecture

Resit is one creative workspace with five surfaces: Design, Video, Calendar, Agent, Settings.

## Stack
- Next.js + TypeScript
- Supabase Postgres + Storage for application data and assets
- Firebase Authentication
- Vercel deployment
- Gemini 3 Flash for the user-facing agent

## Agent principle
The model does not rewrite editor state. It calls deterministic tools that mutate the same document/timeline/social models used by the manual UI.

Namespaces:
- design.* — canvas operations
- video.* — timeline operations
- social.* — scheduling and publishing
- assets.* — media library
- generate.* — media generation

## Data model
Supabase stores workspaces, projects, assets, design documents, video projects, social accounts/posts, and agent threads/messages. Large binary assets belong in Supabase Storage; Postgres stores metadata and references.

## Reference projects
Palmier Pro informs video timeline + agent tool architecture. Postiz informs social scheduling/calendar/provider separation. Open Design and Penpot inform the design document model and editor UX. We implement Resit's own code instead of blindly combining their repositories, with license boundaries documented before any code reuse.
