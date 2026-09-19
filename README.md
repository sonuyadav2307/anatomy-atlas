# Anatomy Atlas

A local 3D anatomy learning app built with React, TypeScript, Three.js, and Vinext/Vite. It includes 1,774 individually selectable reference structures: 275 skeletal, 683 muscular, 580 nervous, 109 organ, and 127 ligament structures. Counts refer to model meshes, not anatomical organ or bone counts.

## Start locally

Requires Node.js 22.13 or newer and npm. From this project directory:

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:5173/. Dependencies are already installed in the delivered workspace, so `npm ci` is only needed for a clean copy. Keep the terminal running; Ctrl+C stops the foreground server.

On this Mac, run:

```sh
cd /Users/sonu/Documents/Codex/2026-09-19/i
npm run dev -- --hostname 127.0.0.1
```

You can also double-click `outputs/Start Anatomy Atlas.command`. The server is local to your computer. No account or API key is required.

## Build and validate

```sh
npm run typecheck
npm test
npm run build
```

`npm test` verifies every mesh's bounds, triangle indices, byte offsets, unique identity, provenance, and compressed/uncompressed equivalence. The production build writes `dist/client` and `dist/server`. The preview server may need restarting after an interrupted task.

## Explore and study

- Select Skeletal, Muscular, Nervous, Organs, or Ligaments.
- Drag to rotate; scroll/pinch to zoom; right-drag/two-finger drag to pan.
- Click a structure or use Find a structure (Cmd/Ctrl+K).
- Isolate a structure, focus the camera, or restore the full body.
- Adjust opacity and labels; display the skeleton as a reference for other systems.
- Write personal notes and mark structures as studied.
- Practice with five questions per system, including answer explanations and a locally saved best score.
- Keyboard model controls: left/right arrows rotate, +/- zoom, and 0 resets.

Notes and progress are stored only in the current browser's localStorage. They do not sync between browsers, ports, `localhost`, and `127.0.0.1`. Clearing site data removes them. Storage failures fall back to session-only state.

## Anatomy assets and coverage

Geometry is included locally. Systems load on demand and compressed meshes are decoded with the browser's DecompressionStream API; uncompressed fallback files support older browsers. WebGL is required for the 3D view. Search, summaries, notes, and quizzes remain available if WebGL cannot initialize.

The atlas uses Z-Anatomy / BodyParts3D geometry and a single reference anatomy. It includes spinal-cord components and major peripheral nerves. Ligament coverage includes shoulder, elbow, wrist, hand, pelvis, and foot; knee ligament models are not included. Structure-specific learning summaries cover selected common anatomy. Other structures show clearly labeled system context.

These educational assets have not been clinically validated for diagnosis or procedures. A production software build is not clinical validation.

**Licensing:** Read `public/ATTRIBUTION.md` and `public/Z-ANATOMY-LICENSE.txt`. Z-Anatomy uses CC BY-SA 4.0; some upstream components carry non-commercial restrictions. Review those terms before commercial redistribution. Model sources and original names are preserved in `public/models/manifest.json`.

## Validation status

- TypeScript check passed.
- Production build passed.
- Browser checks passed for all five systems, structure isolation, cross-system search, correct/incorrect quiz feedback, and notes and studied progress surviving a reload. Test notes and studied marks were removed afterward.
- Geometry integrity check passed for all 1,774 structures, including compressed data, bounds, and triangle indices (`npm test`). Source title cards are excluded from the anatomy catalog.
- The 390 px phone layout loaded the 3D skeleton with no horizontal page overflow. Desktop system-loading checks produced no browser errors or warnings.
- Local preview permission was granted, and the preview returned HTTP 200. Device testing so far covers the desktop in-app browser and an emulated phone viewport; physical mobile devices and other browsers still need release testing.

## Source map

- `app/page.tsx`: learning interface, search, notes, progress, practice, WebMCP tools.
- `components/anatomy/Viewer.tsx`: WebGL viewer, orbit controls, selection, loading and recovery.
- `lib/anatomy/content.ts`: system context, structure summaries, practice questions.
- `app/globals.css`: responsive visual design.
- `public/models`: all shipped geometry and its catalog.
- `scripts/prepare-z-anatomy.mjs`: conversion from the upstream GLB files documented in the attribution.
- `scripts/verify-models.mjs`: geometry integrity checks.

The optional WebMCP interface exposes `list_anatomy_structures` and `select_anatomy_structure` when supported by the browser.
