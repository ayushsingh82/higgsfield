# Higgsfield AI — Recon Notes

Go through every flow end-to-end, signed in. For each section: what you did, what you saw, what surprised you. Reference screenshots by filename.

## Signup / onboarding
- Generation is gated behind a signup modal ("Welcome to Higgsfield — sign up and generate for free"). Google/Apple/Microsoft/email options, ToS+age checkbox, dangles "50 credits for business email." Background shows a rotating preview of flagship outputs (Seedance 2.0 4K, Nano Banana Pro, Higgsfield Soul, Cinematic App).

## Home / dashboard
- Logged-out nav (mega-menu): Create tools / Video Models / Image Models / Studios / Soul / Platform / Company / Resources / Community — full site map.
- Logged-in nav is different and changes by section: Cinema Studio, Contests, Marketing Studio, Supercomputer, 3D Jutsu (New), Edit, Academy, Community, Plugins, Canvas, Originals, Assets, notifications, avatar.
- Logged-in "Assets" is the real home: sidebar splits by type (Image/Video/Audio, each with a count) plus user-created folders/workspaces. Empty state: "Your generations will appear here. Use folders to keep your work organized."

## Core generation flow (prompt/image → output)
- One shared generation-bar pattern reused everywhere: reference uploads + auto-settings (film setup/camera/color/lighting) + prompt field (@ to tag characters/locations) + model/resolution/aspect/duration/sound/batch controls + credit-costed Generate button.
- Cinema Studio is the flagship/free-form version of this bar (60 credits/gen, discounted from 80).
- 3D Jutsu is a simplified variant: block out props/cameras in a 3D scene, then prompt it into video (prompt + model + duration + aspect only, no camera/lighting controls).
- Genjutsu (motion transfer): upload a 4-30s reference video to extract motion, then re-cast it onto your own characters/products/clothes (up to 30 images) or swap objects — "Turn one video into many." Has its own History/Motion Library tabs and Higgsfield-vs-Community source toggle.

## Effects / templates gallery
- Distinct from Marketing Studio: named one-click presets (e.g. "Floating Fall") with fixed input slots (Character/Location/Products, all optional except base image) — no free-form settings needed.
- Has a "Use free gens" toggle and a "Try in ChatGPT" deep link. Generate button shows remaining free uses ("1 FREE LEFT") — free-tier gating is per-effect, not just a global credit balance.
- Marketing Studio has its own separate template gallery, tagged by use-case (Product shot/UGC/Motion/Ads/Posters/Marketplace), with dedicated Avatar/Product upload slots instead of generic references.

## Model / options picker
- Two raw model families exposed directly: Video Models (Seedance 2.5/2.0, Kling 3.0, Sora 2, Veo 3.1, WAN 2.6, Grok Imagine 1.5, Gemini Omni Flash) and Image Models (Nano Banana, Flux 2, Seedream 5, GPT Image 2).
- Audio is a fully separate tool (Text to Speech / Voice Change / Translate tabs): pick or clone a named voice preset, or type a natural-language voice description; model picker (Seed Audio 1.0), speed/pitch/volume sliders, batch size, 5-credit generate.
- MCP integration: Higgsfield exposes itself as an MCP server (mcp.higgsfield.ai/mcp) so Claude/ChatGPT/Claude Code/CLI can generate directly, plus a preset "skill" marketplace (e.g. `/destruction-studio`, an 11-workflow bundle) tagged by use-case.

## Character / consistency (if any)
- "Soul" is the identity-consistency product line (Soul 2.0, Soul ID Character, Soul Cinema) — seen only in the nav, not opened yet.
- Effects/Genjutsu both support attaching "Character" reference images (PNG/JPG) as a first-class input slot, separate from generic references.

## Credits / billing
- 3 plan tiers (annual pricing shown): Basic $9/mo (120 credits ≈ 60 Nano Banana Pro gens, ~7 Seedance 2.0 Fast videos), Pro $23/mo discounted from $29 (600 credits, slider to 900), Max $59/mo discounted from $79, "Best value" (1800 credits, slider to 3600/5400).
- Individual vs Business plan toggle; aggressive time-limited discount banners site-wide (e.g. countdown timer "Offer expires in 02h 58m").
- In-app: navbar shows account avatar/notifications but balance wasn't directly visible in these screenshots — need to check.

## History / library
- Assets page: sidebar by type (Image/Video/Audio) + folders, empty state prompts "Generate."
- Public profile/community layer: every account gets a profile (handle, followers/following, views/likes) with tabs All works/Projects/Blogs/Generations, and a "Publish" flow ("Launch your projects and get noticed by millions"). This is a social/creator layer on top of pure generation, matching "Community"/"Creator Hub" in the nav.

## Anything else notable
- Product is really 3 layers: (1) generation surfaces — Cinema Studio, Marketing Studio, Effects, Genjutsu, 3D Jutsu, Audio, plus raw Image/Video/Face Swap tools; (2) asset management — folders/library; (3) social/publishing — profiles, feed, followers, blogs/projects. A 24h build can't cover all three; pick one generation surface + minimal asset storage, cut the social layer entirely.
- Free-tier gating happens at multiple levels: global credit balance AND per-effect free-use counters.
