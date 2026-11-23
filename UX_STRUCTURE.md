# GAIA → OpenMausBot: UX structure / information architecture

This document is the **spec** for restructuring OpenMausBot's navigation to follow
GAIA's *information architecture* only. It was verified against GAIA's source
(`apps/mobile/.../chat/components/sidebar/sidebar.tsx`, `.../sidebar-header.tsx`,
`.../sidebar-footer.tsx`, `apps/mobile/src/app/(app)/(tabs)/`, `features/dashboard/`,
and `apps/web/src/components/layout/sidebar/`) as a **reference for structure only**.

**What GAIA actually has:** a left drawer shared across screens. Its header is
brand + new chat + search; main nav order is **Chats, Tasks, Integrations,
Workflows**; Tasks gets a contextual Projects/Priorities/Labels section; chat
history is grouped; the footer profile opens Settings. There is **no bottom tab
bar**. Screens: Home dashboard (greeting/date + Today's tasks, Reminders, Recent
conversations, Unread, Active workflows), Chat, Tasks, Workflows, Notifications,
Settings, Memory, Search, Skills, Tools. Web uses a sidebar with search/new chat
and a contextual right panel.

## Structural mapping (GAIA IA → existing OpenMausBot surface)

| GAIA section | OpenMausBot surface (reused, not rebuilt) | Existing component / state |
| --- | --- | --- |
| Home dashboard | New `GaiaHome` view composed **only** from existing state | `state.bots`, `state.groups`, `state.routines`, `state.notifications`; `botUnreadCount` |
| Chats | Existing bot/thread list | `Sidebar` bot rows / `ChatView`; `showChat` |
| Tasks | Existing routines/tasks list (OpenMausBot's tasks are automations) | `TriggersPage` (`showRoutines`, `view: "list"`, `section: "schedule"`) |
| Integrations | Connected apps / plugins | `PluginsPanel` (`togglePlugins`) |
| Workflows | Automations / routines | `TriggersPage` (`activeView === "routines"`) |
| Notifications | Notification tray | `NotificationsPanel` (`toggleNotifications`) |
| Memory | Per-bot memory editor | `BotSettingsDialog` → `section: "memory"` (`toggleSettings`) |
| Settings | Settings modal | `SettingsModal` (`toggleAppSettings`) |
| Search | Command palette | `CommandPalette` (`openCommandPalette`) |
| Skills / Tools | Existing bot skills & tools surfaces | Bot settings `skills` section / `PluginsPanel` |

The canonical, testable form of this table lives in `src/lib/gaia-ia.ts`
(`GAIA_IA` and `GAIA_MAIN_NAV_ORDER`). All entries are rendered by
`GaiaSidebarNav` in the shared drawer: Home first, then the four main-nav rows
in GAIA order, then a secondary group for Notifications / Memory / Search /
Settings. The nav is inserted directly below the sidebar's search field —
desktop sidebar and the mobile drawer behaviour are otherwise untouched.

Notes on the two converging entries: OpenMausBot models both "tasks" and
"workflows" as routines/automations, so Tasks and Workflows intentionally reuse
the same `TriggersPage`; no new task system is invented. Home is reachable from
the top of the sidebar, never from a bottom tab bar.

## Explicitly NOT copied or changed

- **No GAIA code** is imported, copied, or ported (no React Native / HeroUI / expo code).
- **No visual design changes** to OpenMausBot: no new colours, tokens, themes,
  skins, spacing scale, shadows, radii, animation, or layout language. `GaiaHome`
  and `GaiaSidebarNav` use only existing CSS utility classes / design tokens
  (`bg-app`, `bg-raised`, `text-ink`, `text-ink-secondary`, `border-hairline`, etc.).
- **No branding changes**: no GAIA logo, wordmark, mascot, or product name. OpenMausBot's brand stays.
- **No fonts** are added or changed (existing bundled fonts only).
- **No GAIA icons** are copied; only icons already used by OpenMausBot (`lucide-react`) are reused.
- **No GAIA copy** is reused; new labels are generic IA words added to the existing locale catalog.
- **No bottom tab bar** is added; the left drawer/sidebar remains the single shared nav.
- **No changes** to desktop sidebar behaviour or the mobile drawer open/close logic.
- No deploy, no merge to main.
