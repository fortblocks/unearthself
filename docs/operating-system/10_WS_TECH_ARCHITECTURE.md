# Workstream — Technical Landscape

**Code:** TECH  
**Status:** Architecture decision record, v1  
**Steward:** systems thread

## Design principles

1. Small team, large company surface area
2. Buy commodity, build only what is ownable (Runes, quests, Echo Mirror, brand)
3. Guest-facing surfaces stay calm; operations surfaces can be dense
4. AI is a worker, not a product feature guests have to look at
5. Every customer event writes to one CRM record
6. Documentation in `docs/operating-system` is part of the stack

## Target landscape (12 months)

```
                    +--------------+
                    |  Guest web   |  unearthself.xyz
                    |  + booking   |
                    +------+-------+
                           |
              +------------+------------+
              v            v            v
        +---------+  +----------+  +----------+
        | Haven & |  | Retreat  |  |  Spa     |
        |  rooms  |  | packages |  |  menu    |
        +----+----+  +----+-----+  +----+-----+
             +------------+-------------+
                          v
                    +----------+
                    |   CRM    |<---- Grok Bots
                    | payments |
                    +----+-----+
                         |
          +--------------+--------------+
          v              v              v
   Trail Quest PWA   Finance        Staff ops
   + Capacitor wrap
```

## Recommended build-vs-buy (November)

| Need | Buy (preferred) | Build |
|---|---|---|
| Trail Quest | — | PWA. Store shells (APP-02) wrap that PWA; they are not a second product. |

## Environments

- `unearthself.xyz` production
- staging on a Vercel preview
- Trail Quest can live at `quest.unearthself.xyz`

## Decision log

- 2026-09-08 — Composable stack chosen over a custom all-in-one. Trail Quest is the only greenfield product app.
- 2026-09-10 — APP-02 requested: Capacitor (or TWA on Play) wraps `/quest`. C05 not closed. iOS upload is Mac + Apple Developer, not the Linux sandbox.
- 2026-09-10 — APP-02 wrap chosen: Capacitor 8 over `/quest`. TWA not used. Landscape otherwise unchanged.
