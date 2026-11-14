# Ghumo AI V0.1: design system

*Warm Tangerine Glass — the design system used across all traveller pages.*

- **Code:** `client/src/design/` (components), `client/src/scenes/` (illustrations) and `client/src/index.css` (tokens).
- **Motion:** see `V0_1_MOTION_GUIDELINES.md`.
- **Note:** The `/v01` prototype that previously showcased this system has been removed (issue #20).

## 1. Principles

| Principle | In practice |
| --- | --- |
| **Distinctive** | Original illustrated scenes, one colour mood per city, and the flight cursor. No stock SaaS dashboard look |
| **Editorial** | Large tight headlines, generous whitespace, chapters with eyebrow labels, and long-form intros labelled "Ghumo guide" |
| **Playful and colourful** | The colour comes from the illustrations and city palettes. The UI chrome stays ivory, ink and tangerine |
| **Premium but approachable** | Soft 24–32px radii, quiet shadows, plain-language copy, prices shown in full |
| **Travel-first** | Every chapter ends in trips. Search sits in the navbar on every screen |
| **Honest** | Sample labels, "Not stated by organiser", seat counts in words, and no fake urgency |

## 2. Tokens

The tokens are defined once in `client/src/index.css` (`@theme`) and used through Tailwind names.

| Token | Value | Use |
| --- | --- | --- |
| `brand` | `#F26A2E` | Primary actions, highlights, focus ring |
| `brand-hover` | `#DC571F` | Hover and pressed state of primary actions |
| `brand-ink` | `#B4461A` | Orange **text** on light surfaces (AA) |
| `peach` | `#FFE5D2` | Soft fills, selected chips, eyebrow pills |
| `ivory` | `#FFF7EF` | Page background |
| `sand` | `#F9F0E8` | Secondary surface, skeletons |
| `ink` | `#241F1B` | Text, dark buttons, toasts |
| `muted` / `subtle` | `#81766D` / `#6B6058` | Secondary text. Use `subtle` below 18px |
| `line` | `#EDE1D6` | Borders and dividers |
| `success`, `warning`, `danger` (plus `-bg` pairs) | | Availability and state badges, always paired with text and an icon |

**Rules:**
- Never hard-code hex values in components.
- The palettes for cities and landscapes come from content data (`theme.palette`, `palette`). They are used for illustrations, chapter backgrounds and small swatches, **never for UI controls**.
- Text on a palette background uses that palette's `ink`.
- Never put coloured text on a palette background. Use `ink` with a coloured swatch beside it.

**Type:**
- Manrope 400–800.
- Display sizes: hero 42/60/76px with tracking -0.035em; chapter titles 32–64px; section titles 28–40px.
- Body 15–17px. Prices use the `num` utility (tabular figures).
- Eyebrows: 11–12px, extra-bold, uppercase, tracking 0.14–0.16em.

**Shape and depth:**
- Corner radius: cards 24px; panels and scenes 28–32px; chips and buttons fully rounded.
- Shadows: `shadow-soft` at rest, `shadow-lift` for hover and floating panels.
- The `glass` utility is used only over artwork (scrolled navbar, duration chip on photos).

## 3. Layout

- Container: `max-w-7xl` with a 16/24/32px gutter.
- Breakpoints: Tailwind defaults. Designed at **360px first**, then `sm` 640, `md` 768 (desktop navigation and full motion), and `lg` 1024 (sidebars and sticky scenes).
- Section rhythm: 80–112px between home sections and chapters.
- Horizontal rails use snap scrolling with peek, so the next item is half visible.
- Tap targets are at least 44px (chips are `min-h-11`).

## 4. Components (`client/src/design/`)

| Component | File | Purpose and rules |
| --- | --- | --- |
| **Navbar** | `Navbar.jsx` | Sticky, and turns to glass once scrolled. Links: Explore India, Trips, Help me decide. A search button opens the search dialog, and the mobile menu is a drawer. Never hidden by animation |
| **Search** | `SearchBox.jsx` | ARIA combobox over places (name, alias, state). Arrow keys, Enter and Escape work. Picking a place opens its page; Enter with free text goes to `/trips?q=`. Comes in `lg` (hero) and `md` (dialog, results) sizes |
| **Buttons** | `components/ui.jsx` `Button` (reused) | Variants: `primary`, `dark`, `secondary`, `ghost`, `soft`, `danger`. Sizes `sm`, `md`, `lg`. Renders a link with `to` or `href`. One primary action per region |
| **Destination card** | `Cards.jsx` `DestinationCard` | City or destination tile with its palette and art, state, theme name and an honest trip count ("No trips listed yet") |
| **Landscape tile** | `Cards.jsx` `LandscapeTile` | Entry into a landscape chapter, with the scene thumbnail and a solid label panel |
| **Trip card** | `Cards.jsx` `TripCard` | Photo or place art, a **Sample** badge, duration, destination, title (a whole-card link), organiser, departure city, next date, **availability**, **price** and a Compare toggle. Optional `reason` list for matches |
| **Price label** | `Booking.jsx` `PriceLabel` | "From ₹X per person". A missing price reads "Price not listed yet"; it never disappears |
| **Availability indicator** | `Booking.jsx` `AvailabilityBadge` | Words, icon and colour: *N seats left*, *Only N seats left* (5 or fewer, from real counts), *Sold out*, *Booking closed*, *Not taking bookings*, *Cancelled*, *No open departures* |
| **Filters** | `Inputs.jsx` `FilterSelect`, `ActiveFilters` + `PreferenceSelector` | A desktop sidebar, or a mobile `Drawer` with "Show N trips". Active filters show as removable chips with "Clear all". Filter state lives in the URL, so it can be shared |
| **Dialogs and drawers** | `Dialog.jsx` | Portal, focus trap, initial focus, Escape, return focus to the opener, scroll lock. A dialog is a bottom sheet on phones; a drawer is a bottom sheet on phones and a side sheet from `sm` up |
| **AI input** | `Inputs.jsx` `AIInput` | One prompt with a character counter, suggestion chips and a note on what the assistant can see. Enter sends, Shift+Enter adds a new line. **Not a chat thread** |
| **Preference selectors** | `Inputs.jsx` `PreferenceSelector` | Chip groups built on native radio or checkbox inputs inside a `fieldset` and `legend`. Single-select chips can be cleared by clicking again |
| **Comparison table** | `ComparisonTable.jsx` | A real `<table>` with row headers and a sticky first column. Scrolls sideways in a focusable region. "Not stated by organiser" for gaps. No AI |
| **Compare tray** | `Compare.jsx` | Up to 3 trips, kept in `sessionStorage`, shown as a floating ink pill. Opens `/compare` once 2 or more are selected |
| **Loading skeletons** | `Feedback.jsx` `Bone`, `TripCardSkeleton`, `DestinationCardSkeleton`, `GridSkeleton` | Shaped like the final layout, `role="status"` with a hidden label. The pulse stops under reduced motion |
| **Empty and error states** | `Feedback.jsx` `EmptyState`, `ErrorState` | An empty state always offers a next step. An error state uses `role="alert"` and offers "Try again" |
| **Labels** | `Feedback.jsx` `SampleBadge`, `GuideLabel`, `NotStated` | Sample data, editorial content and missing values are always labelled |

## 5. Illustration system (`client/src/scenes/`)

- **Format:** inline SVG, a 1600×900 viewBox, and `preserveAspectRatio="xMidYMax slice"`, so scenes crop gracefully to any frame (4:3 on phones, 16:9 or wider on desktop).
- **Layers:** `<g data-depth="0..1">`, from the sky (0) to the foreground (about 0.9). Ambient layers are tagged `data-drift`, `data-wave` or `data-bob`; special effects use `data-draw`, `data-sun` and `data-rise`.
- **Scenes:**
  - **Landscapes:** Himalayas (winding road, snow peaks, pines), Rivers & valleys (river ribbon and boat), Desert (dunes, hill fort, caravan, changing sunlight), Coast (lighthouse, boats, palms), Northeast (mist, waterfall, living root bridge), Culture & heritage (domed monument, arcades, kites).
  - **Cities:**
    - **Jaipur:** Hawa Mahal's honeycomb façade, Amber Fort on the Aravallis, kites.
    - **Varanasi:** shikhara temples, ghat steps, diyas, boats on the Ganga.
    - **Delhi:** Qutub Minar, Humayun's Tomb, India Gate.
    - **Mumbai:** Gateway of India, the Marine Drive skyline and lights, harbour boats.
- **Fallback art:** `PlaceArt` draws the palette gradient plus a silhouette chosen by place type, for every place without a dedicated scene.
- **Rules:**
  - Original artwork only.
  - Simplified, but true to each landmark's recognisable form.
  - No sacred symbols used as decoration.
  - Scenes are `aria-hidden` unless they carry meaning, in which case they get a descriptive `aria-label`.
  - Trip photos are used only when they show the trip's own destination; otherwise the place art stands in, labelled "no trip photo provided".
- **Weight:** the scenes are a few KB each, gzipped inside the lazy-loaded page chunks. There are no image requests for artwork.

## 6. Content and voice

- Plain, warm and specific: "No organiser lists a trip here yet", not "Nothing to see here".
- Prices are always in ₹ per person. Dates are short ("12 Dec"). Seat counts come from listing data.
- Editorial copy is labelled **Ghumo guide** and comes from `server/src/content/india.js`. It contains no distances, travel times, seasons or superlatives.
- "Nearby" is explained as "often visited together, not by distance".

## 7. Accessibility checklist (applies to every component)

- A skip link to `#main`. On route change, focus moves to `<main>` and `document.title` updates.
- Every interactive element is a native element (or follows the matching ARIA pattern), with a visible `:focus-visible` ring.
- No information is carried by colour alone (availability, selected chips with a check icon, Sample badges).
- Text over artwork always sits on a solid or glass panel.
- Works at 360px with no horizontal page scroll; the comparison table scrolls inside its own region.
- Reduced motion turns off all scroll and ambient motion. The pages stay complete.
