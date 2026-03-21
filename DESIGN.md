# Design System Specification: High-Performance Financial Editorial

## 1. Overview & Creative North Star
### Creative North Star: "The Institutional Architect"
In an industry often cluttered with neon 'AI' glows and high-fluorescence accents, the Stitch Finance design system charts a different course. It is built on the principles of **clarity, authority, and durability**. 

This is not a "futuristic" interface; it is an **institutional** one. It draws inspiration from high-end financial terminals (like Bloomberg or Reuters) and premium editorial layouts (like The Financial Times), emphasizing dense but readable data, strong typographic hierarchies, and a color palette that feels "earned" rather than "synthetic."

---

## 2. Visual Foundation

### 2.1 Color Palette: "Deep Equity Blue"
The core of the system is a sophisticated blue-centric palette designed to look professional in both dark and light contexts (with a current focus on a refined Dark Mode).

*   **Primary Accent:** `#3861FB` (Institutional Blue). A vibrant, trustworthy blue used for primary actions, active states, and key data callouts.
*   **Surface Backgrounds:**
    *   Base: `#0B1326` (Midnight Navy)
    *   Card/Section: `#131B2E` (Stitch Navy)
*   **Typography & Borders:**
    *   Heading 1/Primary: `#FFFFFF`
    *   Secondary/Body: `#B8C3FF` (Soft Sky Blue)
    *   Tertiary/Metadata: `#434655` (Slate Blue)
*   **Semantic Colors:**
    *   Success/Positive: `#4ADE80` (Mint Green - for gains)
    *   Danger/Negative: `#F87171` (Soft Red - for losses)

### 2.2 Typography: "The Manrope Modernist"
We use **Manrope** as the primary typeface. It is a modern geometric sans-serif that excels at numerical legibility—crucial for a financial dashboard.

*   **Headlines:** Semi-Bold to Extra-Bold, tight tracking (`-0.02em`), for an authoritative feel.
*   **Body:** Medium weight, standard tracking, for comfortable reading of financial logs.
*   **Data Points:** Use of tabular numerals (where possible) to ensure columns of figures align perfectly.

### 2.3 Shape & Form
*   **Roundness:** `ROUND_FOUR` (4px - 8px). We avoid the "bubbly" feel of consumer apps. These tighter corners suggest precision and structural integrity.
*   **Borders:** Subtle `1px` borders using `#434655` at low opacity to define containers without adding visual "noise."

---

## 3. Component Philosophy

### 3.1 Data Visualization
Charts must be clean. We favor smooth, high-fidelity lines over jagged edges. 
*   **Gradients:** Use subtle vertical fades under equity curves to add depth without "glow" effects.
*   **Interaction:** Tooltips should be minimal, providing precise data without obscuring the trend line.

### 3.2 Navigation
*   **Top Bar:** Global navigation. Uses high contrast to separate the application shell from the content.
*   **Side Bar:** Contextual navigation. Uses a vertical indicator on the left/right to clearly mark the active state.

---

## 4. Layout & Grid
The system utilizes a **flexible modular grid**. 
*   **Hierarchy:** Primary metrics are always "Above the Fold" in clear, large-format cards.
*   **Density:** We prefer a balanced density—information-rich enough for professional use, but with enough "breathing room" (whitespace) to prevent cognitive overload.

---

## 5. Removing the "AI Feel"
To differentiate from typical "AI wrapper" designs, we have explicitly:
1.  **Eliminated Neon Glows:** No glowing buttons or neon "trails."
2.  **Muted the Saturation:** The blues are deep and professional, not electric.
3.  **Prioritized Text over Icons:** Icons are used as secondary signifiers, never as the primary way to navigate complex data.
4.  **Used Physical Metadata:** Adding labels like "Standard Margin" or "Net Liquidity" anchors the app in real-world financial utility.