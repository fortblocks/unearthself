# Unearth Self — Source of Truth

**Repo:** [fortblocks/unearthself](https://github.com/fortblocks/unearthself)  
**Path in repo:** `docs/operating-system/`  
**Status:** Canonical operating library as of 8 September 2026  
**Steward:** four partners. This thread is Christopher’s systems chat, not a title.

This folder is the company operating system. Conversation history is not a source of truth. The 1,248-page Master Index is an archive.

The website in this repository (`src/`) is the public test site. These files do not ship to Vercel. Do not move them into `public/` or `src/`.

## Read first

1. `00_README.md` — index, language lock, colour lock
2. `01_MASTER_VISION.md`
3. `02_GOVERNANCE_AND_DOC_RULES.md`
4. `03_BRAND_SYSTEM.md`
5. The workstream you are reviewing
6. `17_OPEN_DECISIONS.md`

## Pull locally

```bash
cd ~/unearthself
git pull origin main
open docs/operating-system/00_README.md
```

## Team pack (Word + Excel)

Shareable review files live in the project artifacts folder, not in git:

- `Unearth_Self_Partner_Operating_System_Sep2026.docx`
- `Unearth_Self_Master_Roadmap_Sep2026.xlsx`

The roadmap and spawn prompts also exist here as markdown (`18_MASTER_ROADMAP.md`, `16_CHAT_SPAWN_PROMPTS.md`).

## Rule

Specialist chats and humans update only the file that belongs to their workstream, plus a note in `17_OPEN_DECISIONS.md` if they need a partner decision. Do not invent a parallel truth.
