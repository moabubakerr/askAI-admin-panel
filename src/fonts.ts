/**
 * Fonts are bundled from node_modules and served from this origin. There are no
 * Google Fonts links and no remote stylesheets anywhere in the shipped HTML —
 * the VM has no guaranteed egress, so anything fetched at runtime would fail.
 *
 * Only the weights the panel actually uses are imported; each one is a separate
 * woff2 in the build output.
 */

/* UI — IBM Plex Sans */
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'

/* Arabic content — IBM Plex Sans Arabic */
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'

/* Ids, digests, codes and enum values — IBM Plex Mono */
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
