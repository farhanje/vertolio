# Responsive Case Study System

This document is the default behavior contract for reusable portfolio artifacts.

## Viewport classes

- Desktop: 1024px and above
- Tablet: 641px to 1023px
- Phone: 640px and below

Container queries and ResizeObserver measurements may switch earlier when a block is nested inside a narrower Artifact Explorer panel. The component width is more important than the browser width.

## Artifact Explorer

Horizontal tabs stay horizontal on all viewports and become touch-scrollable when they do not fit.

Vertical tabs are desktop-only as a visual layout. Below roughly 860px of component width they become a horizontal tab strip. Keyboard direction and aria-orientation must change with the visual layout.

## Interactive Prototype

Desktop uses a two-column artifact room when enough width is available. The copy and step index sit beside the interactive surface.

Tablet and narrower embedding contexts stack the explanation above the viewer. The viewer comes before the step index so the actual product surface keeps visual priority. Tablet may use a horizontal scroll strip for the step index when there is enough room.

Phone always keeps the viewer before navigation. The step index becomes a full-width vertical list below the prototype so long labels remain readable and the product screen is never squeezed by navigation.

Device ratios are explicit and should match the product surface rather than being treated as interchangeable mockups:

- Phone: 9:19.5
- Landscape device: 4:3
- Browser / desktop: 16:10 with browser chrome

Use the Landscape device for tablet, kiosk, touch-screen, dashboard, or other product surfaces where a physical landscape frame is part of the presentation. Use Browser / desktop for web products where browser chrome is meaningful.

On phone, all three device modes remain inside the content rail. Landscape and browser frames scale to the available width instead of widening the document.

Controls are at least 44px where possible. Hotspots receive a visible affordance on coarse-pointer devices because hover is unavailable.

Use `/lab/interactive-prototype-landscape` to QA the dedicated 4:3 landscape mode.

## Flowchart

A Basic Horizontal flow automatically becomes vertical when its component is narrower than roughly 820px. Stage order is preserved and branch rows become branch columns.

An authored Vertical Basic flow remains vertical at every width.

Swimlanes do not auto-rotate because actor ownership can change meaning when lanes are rotated. Horizontal swimlanes remain horizontal and use touch scrolling with sticky lane labels. Vertical swimlanes retain actor columns and horizontally scroll when the set of actors cannot fit safely.

Node and lane dimensions reduce at compact widths without collapsing text into unreadable cards.

## Journey and Service Blueprint

The matrix remains a matrix on all viewports because cross-stage comparison is the evidence. Tablet and phone reduce cell width and use touch scrolling. The lane-name column stays sticky.

Phone uses a narrower lane column and scroll snapping between stage headers.

## Data Visualization

Desktop charts use the available width.

Tablet reduces metadata density and allows the SVG to become slightly wider than the panel when labels need room.

Phone uses controlled horizontal chart scrolling rather than shrinking labels until they become unreadable. Bars, points, funnel rows, and composition segments are keyboard-focusable or tappable. Touch tooltips render as a bottom card with an explicit close action.

Tables remain horizontally scrollable.

## Comparison and Evidence Grid

Comparisons stay two-up through tablet where possible and stack below roughly 620px of component width.

Metric grids reduce to two columns at tablet-like component widths and one column on narrow phones.

## Carousel

Desktop and tablet use arrows and dots.

Phone keeps large touch controls and also supports horizontal swipe. Vertical page scrolling must not be blocked by the swipe gesture.

## Narrative

Narrative blocks keep normal editorial width on desktop and tablet. Phone uses the project content rail with smaller padding and type scaling. It must not widen the document.

## QA

Use `/lab/responsive-case-study` before introducing a new reusable case-study pattern.

The route renders `/lab/case-study-blocks` and real-case canaries inside exact 1440px, 768px, and 390px iframe viewports. This allows media queries, container queries, ResizeObserver logic, touch-sized layout, overflow, and responsive navigation to be checked against three stable viewport classes.
