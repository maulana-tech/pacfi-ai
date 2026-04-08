# Pacfi AI - Design References & Inspiration

## Overview

Berikut adalah referensi design dari Dribbble yang akan menginspirasi UI/UX Pacfi AI. Semua design ini menggunakan light mode, clean aesthetic, dan layout yang optimal untuk trading dashboard.

## Design References

### 1. Cryven Dashboard - Light Mode Crypto Trading

**Source:** Musemind (Dribbble)
**File:** `cryven_light_crypto_dashboard.webp`

**Key Features:**
- ✅ Clean light mode interface
- ✅ Soft, luminous aesthetic
- ✅ Clear typography hierarchy
- ✅ Organized data visualization
- ✅ Intuitive wallet integration
- ✅ Trading pair display (BTC/USD)
- ✅ Portfolio balance section
- ✅ Transaction history table
- ✅ Blue accent color for CTAs
- ✅ Minimal color palette

**Design Elements to Adopt:**
- Soft white background (#F8F9FA or similar)
- Blue accent color for primary actions
- Clean card-based layout
- Subtle shadows for depth
- Good spacing and padding
- Clear data hierarchy

**UI Components:**
- Header with navigation tabs
- Price chart with candlestick data
- Buy/Sell panel
- Portfolio summary card
- Transaction history table
- Wallet connection button

---

### 2. Adon - Clean Dashboard Design

**Source:** VALMAX (Dribbble)
**File:** `adon_clean_dashboard_valmax.webp`

**Key Features:**
- ✅ Minimalist design approach
- ✅ Orange accent color
- ✅ Card-based layout
- ✅ Clear data visualization
- ✅ User greeting section
- ✅ Performance metrics
- ✅ Chart integration
- ✅ Sidebar navigation

**Design Elements to Adopt:**
- Minimalist color palette
- Clear section separation
- Card-based components
- Good contrast for readability
- Sidebar for navigation
- Metric cards with icons

**UI Components:**
- Sidebar navigation
- Welcome section
- Performance metrics cards
- Chart section
- Recent activity list

---

### 3. Finance Dashboard - Upnow Studio

**Source:** Upnow Studio (Dribbble)
**File:** `finance_dashboard_upnow.webp`

**Key Features:**
- ✅ Professional finance layout
- ✅ Dark sidebar + light content
- ✅ Multiple metric cards
- ✅ Chart visualization
- ✅ Activity feed
- ✅ User profile section
- ✅ Status indicators
- ✅ Clear information hierarchy

**Design Elements to Adopt:**
- Professional color scheme
- Metric cards with trend indicators
- Activity feed design
- Status badges
- Clear typography
- Organized layout

**UI Components:**
- User greeting with profile
- Key metrics display
- Chart area
- Activity feed
- Notification panel

---

## Design System for Pacfi AI

### Color Palette

**Primary Colors:**
- **Background:** `#FFFFFF` (White)
- **Surface:** `#F8F9FA` (Light Gray)
- **Border:** `#E5E7EB` (Border Gray)

**Accent Colors:**
- **Primary Action:** `#2563EB` (Blue)
- **Success:** `#10B981` (Green)
- **Danger:** `#EF4444` (Red)
- **Warning:** `#F59E0B` (Amber)

**Text Colors:**
- **Primary:** `#1F2937` (Dark Gray)
- **Secondary:** `#6B7280` (Medium Gray)
- **Tertiary:** `#9CA3AF` (Light Gray)

### Typography

**Font Family:** System fonts (for performance)
- `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

**Font Sizes:**
- **H1:** 32px, 700 weight
- **H2:** 24px, 600 weight
- **H3:** 20px, 600 weight
- **Body:** 16px, 400 weight
- **Small:** 14px, 400 weight
- **Tiny:** 12px, 400 weight

### Spacing

**Scale (8px base):**
- `xs: 4px`
- `sm: 8px`
- `md: 16px`
- `lg: 24px`
- `xl: 32px`
- `2xl: 48px`

### Components

#### Cards
```css
background: white;
border: 1px solid #e5e7eb;
border-radius: 8px;
padding: 16px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

#### Buttons
```css
/* Primary */
background: #2563eb;
color: white;
padding: 12px 24px;
border-radius: 6px;
font-weight: 600;
cursor: pointer;

/* Hover */
background: #1d4ed8;

/* Disabled */
background: #d1d5db;
cursor: not-allowed;
```

#### Input Fields
```css
background: white;
border: 1px solid #d1d5db;
border-radius: 6px;
padding: 10px 12px;
font-size: 16px;

/* Focus */
border-color: #2563eb;
box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
```

#### Tables
```css
border-collapse: collapse;
width: 100%;

/* Header */
background: #f3f4f6;
font-weight: 600;
padding: 12px;

/* Rows */
border-bottom: 1px solid #e5e7eb;
padding: 12px;
```

### Layout Grid

**Desktop (1440px+):**
- 12-column grid
- Gutter: 24px
- Max-width: 1400px

**Tablet (768px - 1439px):**
- 8-column grid
- Gutter: 16px

**Mobile (< 768px):**
- 4-column grid
- Gutter: 12px

### Shadows

**Subtle:** `0 1px 2px rgba(0, 0, 0, 0.05)`
**Small:** `0 1px 3px rgba(0, 0, 0, 0.1)`
**Medium:** `0 4px 6px rgba(0, 0, 0, 0.1)`
**Large:** `0 10px 15px rgba(0, 0, 0, 0.1)`

### Border Radius

- **Small:** 4px
- **Medium:** 6px
- **Large:** 8px
- **XL:** 12px

## Implementation Guidelines

### 1. Light Mode Only
- No dark mode for now
- Consistent light backgrounds
- Clear contrast ratios (WCAG AA minimum)

### 2. Performance Focus
- Minimize CSS
- Use semantic HTML
- Lazy load images
- Optimize fonts

### 3. Accessibility
- Proper heading hierarchy
- ARIA labels where needed
- Keyboard navigation support
- Color contrast compliance

### 4. Responsiveness
- Mobile-first approach
- Flexible layouts
- Touch-friendly targets (48px minimum)
- Readable font sizes on all devices

### 5. Consistency
- Use design tokens
- Consistent spacing
- Unified component library
- Predictable interactions

## Inspiration Takeaways

### From Cryven:
- Clean light interface is professional
- Blue accent color works well for crypto
- Card-based layout is scalable
- Data visualization should be clear
- Wallet integration should be prominent

### From Adon:
- Minimalism is powerful
- Sidebar navigation is effective
- Metric cards communicate value
- Orange accent could work as alternative
- Clear typography hierarchy

### From Finance Dashboard:
- Activity feeds are important
- Status indicators help users
- Multiple views (charts, tables, metrics)
- User context matters
- Professional appearance builds trust

## Next Steps

1. ✅ Collect references
2. ⏳ Create design tokens
3. ⏳ Build component library
4. ⏳ Implement dashboard layout
5. ⏳ Add interactive features
6. ⏳ Test performance

## Resources

- **Dribbble:** https://dribbble.com
- **Design System:** Tailwind CSS
- **Icons:** Heroicons or Feather Icons
- **Charts:** Chart.js or Recharts
- **Fonts:** System fonts (no external loading)

---

**Last Updated:** March 19, 2026
**Status:** Ready for implementation
