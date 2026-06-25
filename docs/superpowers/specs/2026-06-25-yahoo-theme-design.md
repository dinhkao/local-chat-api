# Yahoo Chat Theme Design

## Goal
Old-school Yahoo/AIM chat room theme — pure text lines, no boxes/bubbles, minimal.

## Approach
CSS-only theme (`themes/yahoo.css`). Zero JS changes. Register in `theme.js` THEMES array.

## Message Style
- No background, no border-radius, no box-shadow on `.msg`
- Thin bottom border separator (`1px solid #ddd`)
- Username bold, inline with message text via flexbox row
- `.msg .author::after` adds `: ` separator
- Avatar hidden (`display:none`)
- Meta (reply/edit/delete/time) hidden (`display:none`)
- Reply quote hidden
- `mine` messages: no special background, username in blue
- Hover: subtle `#f5f5f5` background

## Sidebar + Topbar
- White/light gray, clean 1px borders
- System font, no serif
- Active group: light blue highlight

## Input Area
- Light background, thin top border
- Flat buttons, no outset borders
- System font

## Colors
- Background: `#fff`
- Text: `#222`
- Username (mine): `#0066cc`
- Username (others): `#333`
- Links: `#0066cc`

## Files Changed
- `static/themes/yahoo.css` — new file
- `static/theme.js` — add `"yahoo"` to THEMES array

## Out of Scope
- JS message rendering changes
- Per-user random username colors (future enhancement)
