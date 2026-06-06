# Numnums Wavy Background Text

## Goal

Add a subtle branded background treatment to Numnums screens using real DOM text, not SVG or PNG.

The background should show oversized, soft, wavy `numnumnum` text sitting behind the dashboard cards.

This is a decorative brand layer only. It must not affect layout, clicks, scrolling, or accessibility.

---

# Why DOM Text

Use DOM text so the background uses the actual loaded Numnums font.

Do not use:

* PNG backgrounds
* SVG text
* embedded raster images
* food silhouette patterns
* graffiti effects

The goal is clean, soft, fashion/streetwear-inspired background typography.

---

# Visual Direction

The background should feel like:

* subtle streetwear print
* soft branded wrapping paper
* playful but premium
* on-brand for Numnums
* almost invisible until noticed

It should not feel like:

* graffiti
* wallpaper
* a pattern pack
* noisy decoration
* a feature section

---

# Typography

Use the existing Numnums font:

```css
font-family: var(--font-display);
```

This should resolve to Fredoka.

Font weight:

```css
700
```

Tracking:

```css
-0.08em
```

Text:

```text
numnumnum
```

Use lowercase only.

---

# Colour

Use the existing border/line colour:

```css
#EADFCE
```

or token:

```css
var(--numnums-line)
```

Opacity should be low:

```css
0.45 - 0.7
```

The cards should remain clearly readable.

---

# Placement

The background layer sits inside the page root.

It must be:

```tsx
absolute inset-0
pointer-events-none
overflow-hidden
```

The dashboard content must sit above it using:

```tsx
relative z-10
```

Example structure:

```tsx
<main className="relative min-h-screen overflow-hidden bg-background">
  <NumnumsBackground />

  <div className="relative z-10">
    {/* dashboard content */}
  </div>
</main>
```

---

# Component: NumnumsBackground

Create a reusable component:

```tsx
export function NumnumsBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -left-20 top-24 rotate-[-8deg]">
        <WavyWord text="numnumnum" />
      </div>

      <div className="absolute left-8 top-[380px] rotate-[6deg]">
        <WavyWord text="numnum" />
      </div>

      <div className="absolute -left-24 top-[670px] rotate-[-7deg]">
        <WavyWord text="numnumnum" />
      </div>
    </div>
  )
}
```

---

# Component: WavyWord

Create a reusable `WavyWord` component that renders each letter as its own span.

Each character should be vertically offset using a sine wave.

```tsx
type WavyWordProps = {
  text: string
}

function WavyWord({ text }: WavyWordProps) {
  return (
    <div className="flex text-[76px] font-bold tracking-[-0.08em] text-[#EADFCE]/65">
      {text.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="inline-block"
          style={{
            transform: `translateY(${Math.sin(index * 0.9) * 10}px)`,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}
```

---

# Responsive Behaviour

For mobile, use:

```css
font-size: 72px - 82px
```

For tablet and desktop, scale up:

```css
font-size: 110px - 160px
```

The text should remain partially off-screen in places.

It should look intentionally placed, not centred.

---

# Dashboard Use

On the dashboard, the wavy background should sit behind:

* greeting block
* current recipe card
* week preview
* shopping list card
* next up card
* bottom navigation

Do not move any dashboard blocks.

Do not change the content hierarchy.

Do not add new cards.

This is purely a background treatment.

---

# Accessibility

The decorative text must be ignored by screen readers.

Use:

```tsx
aria-hidden="true"
```

The wrapper must use:

```tsx
pointer-events-none
```

Do not make the background selectable.

Optional CSS:

```css
.user-select-none {
  user-select: none;
}
```

---

# Final Feel

The user should see a calm Numnums dashboard with soft oversized branded text in the background.

The dashboard should still feel simple and practical.

The background should add personality without making the app feel busy.
