// Intro timeline, seconds from the moment the hero's dive starts. The name, kicker and
// plaque wait for the corals to part; the fish only starts once all of them have
// settled, since starting a clip costs a phone a few frames. The entrances are CSS
// animations (styles.css, "Hero intro") timed through the --t-* variables below.
export const INTRO = { logo: 0.95, logoDur: 1.9, kicker: 2.05, header: 2.4, plaque: 2.7, fish: 4.2, hint: 4.4 }

/** The timeline as CSS custom properties: { '--t-kicker': '2.05s', … }. */
export const introVars = Object.fromEntries(Object.entries(INTRO).map(([k, v]) => [`--t-${k}`, `${v}s`]))
