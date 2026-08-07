# Glotemp Image Assets

## Naming Convention

All image assets follow a consistent naming pattern for responsive delivery.

### City Story Images

`city-<slug>-<width>.<format>`

- `city-kyiv-1200.webp` - WebP format, 1200px width
- `city-kyiv-600.webp` - WebP format, 600px width (mobile)
- `city-kyiv-1200.avif` - AVIF format, 1200px width (next-gen)
- `city-kyiv-600.avif` - AVIF format, 600px width
- `city-kyiv-1200.png` - PNG fallback, 1200px width
- `city-kyiv-600.png` - PNG fallback, 600px width

All city images are rendered in blog cards with a 3:2 aspect ratio using `<picture>` elements with srcset for responsive delivery.

Slugs: kyiv, tokyo, mexico-city, lagos, lisbon, dubai, reykjavik, cairo, medellin, bangkok

### Mood Icons

Mood instrument artwork, 64x64px, pure black background at full opacity.

- `mood-rising.png` - Energized / Rising (bronze)
- `mood-good.png` - Good (brass)
- `mood-neutral.png` - Neutral (silver)
- `mood-low.png` - Low (aged metal)
- `mood-cautious.png` - Cautious (burnished copper)

These are rendered with `mix-blend-mode: lighten` to sit on the leather surface without visible black.

## Technical Specs

- **Aspect Ratios**: City images 3:2, mood icons 1:1
- **Max-width**: City images 1200px desktop / 600px mobile
- **Formats**: AVIF (next-gen), WebP (modern browsers), PNG (fallback)
- **Compression**: Optimized with minimal quality loss
- **Loading**: Lazy loading on city cards (`loading="lazy"`), eager on mood icons

## Missing Image Fallback

If an image is not found, CSS displays a fallback:
- City images: `.card-placeholder` with city name in Plex Mono
- Mood icons: Unicode glyph fallback (▲, ◆, ●, ▼, ◇)
