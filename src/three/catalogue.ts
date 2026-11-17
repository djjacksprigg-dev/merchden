/**
 * Product model registry.
 *
 * To add a product: write a builder that returns { parts, zones } (see
 * three/models/*), then add an entry here. Models are loaded lazily, so a new
 * product only costs bandwidth when a student opens it.
 */
import type { CategoryId, ProductDef, ViewAngle } from './engine/types'
import type { ViewName } from '../lib/types'

const garments = () => import('./models/garments')
const headwear = () => import('./models/headwear')
const gaming = () => import('./models/gaming')
const everyday = () => import('./models/everyday')
const extras = () => import('./models/extras')

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'clothing', name: 'Clothing' },
  { id: 'headwear', name: 'Headwear' },
  { id: 'gaming', name: 'Gaming accessories' },
  { id: 'everyday', name: 'Everyday merchandise' },
]

const MAIN = { id: 'primary', label: 'Main colour' }

const topDown: Partial<Record<ViewName, ViewAngle>> = {
  front: { azimuth: 0, polar: 0.62 },
  back: { azimuth: Math.PI, polar: 0.62 },
  side: { azimuth: Math.PI / 2, polar: 1.15 },
  'three-quarter': { azimuth: Math.PI / 5, polar: 0.9 },
}

export const PRODUCTS: ProductDef[] = [
  /* ---------------- Clothing ---------------- */
  {
    id: 'jersey',
    name: 'Esports jersey',
    shortName: 'Jersey',
    category: 'clothing',
    description: 'Performance knit jersey with V-neck, sleeve, collar and trim colours plus patterns.',
    colorSlots: [
      MAIN,
      { id: 'sleeve', label: 'Sleeves' },
      { id: 'collar', label: 'Collar' },
      { id: 'trim', label: 'Trim (cuffs & side piping)' },
      { id: 'secondary', label: 'Pattern colour' },
      { id: 'accent', label: 'Pattern accent' },
    ],
    defaults: { primary: '#1d3b8f', sleeve: '#1d3b8f', collar: '#f2f4f8', trim: '#f2f4f8', secondary: '#0b1630', accent: '#f2f4f8' },
    patterns: true,
    patternColors: { a: 'secondary', b: 'accent' },
    defaultZone: 'front-chest',
    sideLabels: ['Left sleeve', 'Right sleeve'],
    load: () => garments().then((m) => m.buildJersey),
  },
  {
    id: 'tshirt',
    name: 'T-shirt',
    shortName: 'T-shirt',
    category: 'clothing',
    description: 'Classic crew-neck cotton tee.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Collar & sleeve hems' }],
    defaults: { primary: '#f3f4f6', secondary: '#f3f4f6' },
    defaultZone: 'centre-front',
    load: () => garments().then((m) => m.buildTee),
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    shortName: 'Hoodie',
    category: 'clothing',
    description: 'Heavyweight fleece pullover hoodie with kangaroo pocket.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Cuffs & waistband' }, { id: 'accent', label: 'Hood lining & drawcords' }],
    defaults: { primary: '#23262d', secondary: '#23262d', accent: '#23262d' },
    defaultZone: 'centre-chest',
    load: () => garments().then((m) => m.buildHoodie),
  },
  {
    id: 'zip-hoodie',
    name: 'Zip-up hoodie',
    shortName: 'Zip hoodie',
    category: 'clothing',
    description: 'Full-zip fleece hoodie with split pockets.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Cuffs & waistband' }, { id: 'accent', label: 'Hood lining & drawcords' }],
    defaults: { primary: '#2b3240', secondary: '#2b3240', accent: '#2b3240' },
    defaultZone: 'left-chest',
    load: () => garments().then((m) => m.buildZipHoodie),
  },
  {
    id: 'sweatshirt',
    name: 'Sweatshirt',
    shortName: 'Sweatshirt',
    category: 'clothing',
    description: 'Crew-neck fleece sweatshirt with ribbed trims.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Collar, cuffs & waistband' }],
    defaults: { primary: '#8b93a1', secondary: '#7d8593' },
    defaultZone: 'centre-chest',
    load: () => garments().then((m) => m.buildSweatshirt),
  },
  {
    id: 'polo',
    name: 'Polo shirt',
    shortName: 'Polo',
    category: 'clothing',
    description: 'Piqué polo with fold-down collar and button placket.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Collar & sleeve cuffs' }, { id: 'accent', label: 'Buttons' }],
    defaults: { primary: '#0f172a', secondary: '#0f172a', accent: '#e5e7eb' },
    defaultZone: 'left-chest',
    load: () => garments().then((m) => m.buildPolo),
  },
  {
    id: 'tracksuit-jacket',
    name: 'Tracksuit jacket',
    shortName: 'Track jacket',
    category: 'clothing',
    description: 'Tricot track jacket with stand collar, zip and sleeve stripes.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Sleeve stripes' }, { id: 'trim', label: 'Collar, cuffs & hem' }],
    defaults: { primary: '#111827', secondary: '#3b82f6', trim: '#111827' },
    defaultZone: 'left-chest',
    load: () => garments().then((m) => m.buildJacket),
  },
  {
    id: 'joggers',
    name: 'Joggers / tracksuit bottoms',
    shortName: 'Joggers',
    category: 'clothing',
    description: 'Tapered fleece joggers with ribbed cuffs and leg stripe.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Waistband & cuffs' }, { id: 'accent', label: 'Leg stripe & drawcord' }],
    defaults: { primary: '#1f2430', secondary: '#1f2430', accent: '#3b82f6' },
    defaultZone: 'left-thigh',
    load: () => garments().then((m) => m.buildJoggers),
  },
  {
    id: 'oversized-tee',
    name: 'Oversized T-shirt',
    shortName: 'Oversized tee',
    category: 'clothing',
    description: 'Boxy heavyweight tee with dropped shoulders.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Collar & sleeve hems' }],
    defaults: { primary: '#15171c', secondary: '#15171c' },
    defaultZone: 'centre-front',
    load: () => garments().then((m) => m.buildOversizedTee),
  },
  {
    id: 'varsity-jacket',
    name: 'Varsity jacket',
    shortName: 'Varsity',
    category: 'clothing',
    description: 'Wool-look body, PU leather sleeves, striped rib trims and snap front.',
    colorSlots: [{ id: 'primary', label: 'Body' }, { id: 'sleeve', label: 'Sleeves' }, { id: 'trim', label: 'Rib collar, cuffs & hem' }, { id: 'accent', label: 'Rib stripes' }],
    defaults: { primary: '#14213d', sleeve: '#f1efe9', trim: '#14213d', accent: '#ff7a1a' },
    defaultZone: 'left-chest',
    load: () => garments().then((m) => m.buildVarsity),
  },
  {
    id: 'windbreaker',
    name: 'Windbreaker',
    shortName: 'Windbreaker',
    category: 'clothing',
    description: 'Lightweight nylon shell with hood, full zip and colour-block panels.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Hood, sleeves & shoulder panel' }, { id: 'trim', label: 'Cuffs, hem & cords' }],
    defaults: { primary: '#1b2433', secondary: '#ff7a1a', trim: '#11151d' },
    defaultZone: 'left-chest',
    load: () => garments().then((m) => m.buildWindbreaker),
  },

  /* ---------------- Headwear ---------------- */
  {
    id: 'cap',
    name: 'Baseball cap',
    shortName: 'Cap',
    category: 'headwear',
    description: 'Structured six-panel cap with curved brim.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Brim & strap' }, { id: 'accent', label: 'Button & eyelets' }],
    defaults: { primary: '#111827', secondary: '#111827', accent: '#3b82f6' },
    defaultZone: 'front-panel',
    load: () => headwear().then((m) => m.buildCap),
    views: { 'three-quarter': { azimuth: Math.PI / 4, polar: 1.15 }, front: { azimuth: 0, polar: 1.3 }, back: { azimuth: Math.PI, polar: 1.25 }, side: { azimuth: Math.PI / 2, polar: 1.3 } },
  },
  {
    id: 'beanie',
    name: 'Beanie',
    shortName: 'Beanie',
    category: 'headwear',
    description: 'Rib-knit cuffed beanie with pom-pom.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Cuff' }, { id: 'accent', label: 'Pom-pom' }],
    defaults: { primary: '#1e3a8a', secondary: '#1e3a8a', accent: '#f8fafc' },
    defaultZone: 'cuff-front',
    load: () => headwear().then((m) => m.buildBeanie),
  },
  {
    id: 'bucket-hat',
    name: 'Bucket hat',
    shortName: 'Bucket hat',
    category: 'headwear',
    description: 'Cotton twill bucket hat with stitched brim.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Band' }],
    defaults: { primary: '#e5e1d8', secondary: '#1f2937' },
    defaultZone: 'front',
    load: () => headwear().then((m) => m.buildBucketHat),
    views: { 'three-quarter': { azimuth: Math.PI / 4, polar: 1.2 } },
  },

  /* ---------------- Gaming accessories ---------------- */
  {
    id: 'extended-mousemat',
    name: 'Extended gaming mouse mat',
    shortName: 'XL mouse mat',
    category: 'gaming',
    description: '900 × 400 mm desk mat with stitched edges.',
    colorSlots: [{ id: 'primary', label: 'Surface colour' }, { id: 'trim', label: 'Stitched edge' }],
    defaults: { primary: '#0d1424', trim: '#3b82f6' },
    defaultZone: 'centre',
    load: () => gaming().then((m) => m.buildExtendedMat),
    views: topDown,
    minPolar: 0.05,
    maxPolar: 1.45,
  },
  {
    id: 'mousemat',
    name: 'Mouse mat',
    shortName: 'Mouse mat',
    category: 'gaming',
    description: '360 × 300 mm cloth mouse mat with stitched edges.',
    colorSlots: [{ id: 'primary', label: 'Surface colour' }, { id: 'trim', label: 'Stitched edge' }],
    defaults: { primary: '#111827', trim: '#111827' },
    defaultZone: 'centre',
    load: () => gaming().then((m) => m.buildMouseMat),
    views: topDown,
    minPolar: 0.05,
    maxPolar: 1.45,
  },
  {
    id: 'gaming-chair',
    name: 'Gaming chair',
    shortName: 'Gaming chair',
    category: 'gaming',
    description: 'Racing-style gaming chair with PU upholstery.',
    colorSlots: [{ id: 'primary', label: 'Centre panels' }, { id: 'secondary', label: 'Frame upholstery' }, { id: 'accent', label: 'Cushions' }],
    defaults: { primary: '#2563eb', secondary: '#15171c', accent: '#15171c' },
    defaultZone: 'backrest',
    load: () => gaming().then((m) => m.buildGamingChair),
    views: { 'three-quarter': { azimuth: Math.PI / 4.5, polar: 1.3 } },
  },
  {
    id: 'headset',
    name: 'Headset accessory (ear-cup plates)',
    shortName: 'Headset plates',
    category: 'gaming',
    description: 'Custom magnetic ear-cup plates, shown on a gaming headset.',
    colorSlots: [{ id: 'primary', label: 'Ear-cup plates' }, { id: 'secondary', label: 'Headset shell' }, { id: 'accent', label: 'Cushions' }],
    defaults: { primary: '#2563eb', secondary: '#1a1c21', accent: '#24262c' },
    defaultZone: 'left-plate',
    load: () => gaming().then((m) => m.buildHeadset),
    views: { 'three-quarter': { azimuth: 1.0, polar: 1.4 }, side: { azimuth: Math.PI / 2, polar: Math.PI / 2 } },
  },
  {
    id: 'controller-skin',
    name: 'Controller skin',
    shortName: 'Controller skin',
    category: 'gaming',
    description: 'Printed vinyl skin on a generic gamepad, with cut-outs for sticks and buttons.',
    colorSlots: [{ id: 'primary', label: 'Skin colour' }, { id: 'secondary', label: 'Controller shell' }, { id: 'accent', label: 'Buttons & D-pad' }],
    defaults: { primary: '#1b2433', secondary: '#16181d', accent: '#2a2e36' },
    defaultZone: 'centre',
    load: () => extras().then((m) => m.buildControllerSkin),
    views: { 'three-quarter': { azimuth: 0.5, polar: 1.15 } },
    sideLabel: 'Side',
  },
  {
    id: 'laptop-sleeve',
    name: 'Laptop sleeve',
    shortName: 'Laptop sleeve',
    category: 'gaming',
    description: 'Padded 15" neoprene-style sleeve with wrap-around zip.',
    colorSlots: [{ id: 'primary', label: 'Sleeve colour' }, { id: 'secondary', label: 'Zip' }],
    defaults: { primary: '#1f2430', secondary: '#0f1115' },
    defaultZone: 'front',
    load: () => extras().then((m) => m.buildLaptopSleeve),
    sideLabel: 'Edge',
  },
  {
    id: 'headset-stand',
    name: 'Headset stand',
    shortName: 'Headset stand',
    category: 'gaming',
    description: 'Desk headset stand with a printed upright panel and metal base.',
    colorSlots: [{ id: 'primary', label: 'Upright panel' }, { id: 'secondary', label: 'Base' }, { id: 'accent', label: 'Rest pad' }],
    defaults: { primary: '#15171c', secondary: '#2a2e36', accent: '#15171c' },
    defaultZone: 'upright',
    load: () => extras().then((m) => m.buildHeadsetStand),
    views: { 'three-quarter': { azimuth: Math.PI / 5, polar: 1.25 } },
  },

  /* ---------------- Everyday merchandise ---------------- */
  {
    id: 'water-bottle',
    name: 'Water bottle',
    shortName: 'Bottle',
    category: 'everyday',
    description: 'Powder-coated insulated steel bottle.',
    colorSlots: [{ id: 'primary', label: 'Bottle colour' }, { id: 'secondary', label: 'Lid' }],
    defaults: { primary: '#1d4ed8', secondary: '#111827' },
    defaultZone: 'front',
    load: () => everyday().then((m) => m.buildBottle),
  },
  {
    id: 'mug',
    name: 'Coffee mug',
    shortName: 'Mug',
    category: 'everyday',
    description: '11 oz glossy ceramic mug.',
    colorSlots: [{ id: 'primary', label: 'Outside' }, { id: 'secondary', label: 'Inside & handle' }],
    defaults: { primary: '#f8fafc', secondary: '#1d4ed8' },
    defaultZone: 'front',
    load: () => everyday().then((m) => m.buildMug),
    views: { 'three-quarter': { azimuth: -Math.PI / 5, polar: 1.15 }, front: { azimuth: 0, polar: 1.35 }, back: { azimuth: Math.PI, polar: 1.35 } },
    sideLabel: 'Handle',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    shortName: 'Backpack',
    category: 'everyday',
    description: 'Ripstop nylon backpack with front pocket.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Front pocket' }, { id: 'accent', label: 'Straps & base' }],
    defaults: { primary: '#1f2937', secondary: '#1f2937', accent: '#0b0f17' },
    defaultZone: 'pocket',
    load: () => everyday().then((m) => m.buildBackpack),
  },
  {
    id: 'drawstring-bag',
    name: 'Drawstring bag',
    shortName: 'Drawstring bag',
    category: 'everyday',
    description: 'Lightweight gym sack with cord straps.',
    colorSlots: [MAIN, { id: 'accent', label: 'Cords' }],
    defaults: { primary: '#111827', accent: '#e5e7eb' },
    defaultZone: 'front',
    load: () => everyday().then((m) => m.buildDrawstringBag),
  },
  {
    id: 'tote-bag',
    name: 'Tote bag',
    shortName: 'Tote',
    category: 'everyday',
    description: 'Heavy cotton canvas tote.',
    colorSlots: [MAIN, { id: 'secondary', label: 'Handles' }],
    defaults: { primary: '#ece7dc', secondary: '#ece7dc' },
    defaultZone: 'front',
    load: () => everyday().then((m) => m.buildTote),
  },
  {
    id: 'phone-case',
    name: 'Phone case',
    shortName: 'Phone case',
    category: 'everyday',
    description: 'Gloss phone case (generic phone shape).',
    colorSlots: [{ id: 'primary', label: 'Case colour' }, { id: 'secondary', label: 'Camera surround' }],
    defaults: { primary: '#0f172a', secondary: '#0f172a' },
    defaultZone: 'back-centre',
    load: () => everyday().then((m) => m.buildPhoneCase),
    sideLabel: 'Edge',
  },
  {
    id: 'lanyard',
    name: 'Lanyard',
    shortName: 'Lanyard',
    category: 'everyday',
    description: 'Printed strap lanyard with badge holder.',
    colorSlots: [{ id: 'primary', label: 'Strap colour' }, { id: 'secondary', label: 'Badge card' }],
    defaults: { primary: '#1d4ed8', secondary: '#f8fafc' },
    defaultZone: 'strap',
    extraDefaultZones: ['card'],
    load: () => everyday().then((m) => m.buildLanyard),
  },
  {
    id: 'sticker',
    name: 'Sticker',
    shortName: 'Sticker',
    category: 'everyday',
    description: 'Die-cut vinyl sticker made from your logo.',
    colorSlots: [{ id: 'primary', label: 'Border / backing' }],
    defaults: { primary: '#ffffff' },
    defaultZone: 'sticker',
    load: () => everyday().then((m) => m.buildSticker),
    views: { 'three-quarter': { azimuth: 0.5, polar: 1.25 }, side: { azimuth: Math.PI / 2, polar: 1.3 } },
  },
]

PRODUCTS.push(
  {
    id: 'travel-mug',
    name: 'Travel mug',
    shortName: 'Travel mug',
    category: 'everyday',
    description: 'Insulated travel mug with sip lid and grip band.',
    colorSlots: [{ id: 'primary', label: 'Mug colour' }, { id: 'secondary', label: 'Lid & grip' }],
    defaults: { primary: '#ff7a1a', secondary: '#15171c' },
    defaultZone: 'front',
    load: () => extras().then((m) => m.buildTravelMug),
  },
  {
    id: 'sports-bottle',
    name: 'Sports bottle',
    shortName: 'Sports bottle',
    category: 'everyday',
    description: 'Squeezy plastic sports bottle with push-pull cap.',
    colorSlots: [{ id: 'primary', label: 'Bottle colour' }, { id: 'secondary', label: 'Cap' }],
    defaults: { primary: '#f1f3f6', secondary: '#15171c' },
    defaultZone: 'front',
    load: () => extras().then((m) => m.buildSportsBottle),
  },
  {
    id: 'tumbler',
    name: 'Tumbler',
    shortName: 'Tumbler',
    category: 'everyday',
    description: 'Tall insulated tumbler with lid and straw.',
    colorSlots: [{ id: 'primary', label: 'Tumbler colour' }, { id: 'secondary', label: 'Lid' }, { id: 'accent', label: 'Straw' }],
    defaults: { primary: '#1b2433', secondary: '#15171c', accent: '#ff7a1a' },
    defaultZone: 'front',
    load: () => extras().then((m) => m.buildTumbler),
  },
  {
    id: 'keyring',
    name: 'Keyring',
    shortName: 'Keyring',
    category: 'everyday',
    description: 'Printed acrylic keyring with split ring.',
    colorSlots: [{ id: 'primary', label: 'Keyring colour' }],
    defaults: { primary: '#ffffff' },
    defaultZone: 'front',
    load: () => extras().then((m) => m.buildKeyring),
    views: { 'three-quarter': { azimuth: 0.5, polar: 1.35 }, side: { azimuth: Math.PI / 2, polar: 1.4 } },
    sideLabel: 'Edge',
  },
  {
    id: 'notebook',
    name: 'Notebook',
    shortName: 'Notebook',
    category: 'everyday',
    description: 'A5 hardback notebook with elastic band and ribbon marker.',
    colorSlots: [{ id: 'primary', label: 'Cover' }, { id: 'accent', label: 'Band & ribbon' }],
    defaults: { primary: '#15171c', accent: '#ff7a1a' },
    defaultZone: 'cover',
    load: () => extras().then((m) => m.buildNotebook),
    sideLabel: 'Spine',
  },
  {
    id: 'poster',
    name: 'Poster',
    shortName: 'Poster',
    category: 'everyday',
    description: 'A2 satin poster – great for team line-ups and event promotion.',
    colorSlots: [{ id: 'primary', label: 'Background' }],
    defaults: { primary: '#0d111b' },
    defaultZone: 'centre',
    load: () => extras().then((m) => m.buildPoster),
    views: { front: { azimuth: 0, polar: Math.PI / 2 }, 'three-quarter': { azimuth: 0.45, polar: 1.45 }, side: { azimuth: Math.PI / 2, polar: Math.PI / 2 } },
    sideLabel: 'Edge',
  },
)

// Every product except the lanyard (logo-print strap) and sticker (logo artwork)
// can be printed with a pattern.
for (const p of PRODUCTS) if (p.id !== 'lanyard' && p.id !== 'sticker') p.patterns = true

function luminance(hex: string) {
  const n = parseInt((hex || '#000000').replace('#', ''), 16)
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Default pattern colours chosen to stand out clearly against the main colour. */
export function defaultPatternColors(primary: string, preferred?: string): { pattern: string; pattern2: string } {
  const base = primary || '#000000'
  const candidates = [preferred, '#2f8cff', '#ffffff', '#0b0f17', '#facc15'].filter((c): c is string => !!c && c.toLowerCase() !== base.toLowerCase())
  // first candidate with comfortable contrast, else the most contrasting one
  const pattern = candidates.find((c) => contrast(c, base) >= 2.6) ?? candidates.sort((x, y) => contrast(y, base) - contrast(x, base))[0]
  const rest = ['#ffffff', '#0b0f17', '#2f8cff'].filter((c) => c !== pattern)
  const pattern2 = rest.sort((x, y) => contrast(y, base) - contrast(x, base))[0]
  return { pattern, pattern2 }
}

/** Resolves the two pattern colours for a design (with fallbacks for older saves). */
export function patternColorsOf(def: ProductDef, colors: Record<string, string>) {
  const fallback = defaultPatternColors(colors.primary ?? def.defaults.primary)
  if (def.patternColors) {
    return { a: colors[def.patternColors.a] ?? fallback.pattern, b: colors[def.patternColors.b] ?? fallback.pattern2 }
  }
  return { a: colors.pattern ?? fallback.pattern, b: colors.pattern2 ?? fallback.pattern2 }
}

export const PRODUCT_MAP: Record<string, ProductDef> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]))

export const DEFAULT_VIEWS: Record<ViewName, ViewAngle> = {
  front: { azimuth: 0, polar: 1.48 },
  back: { azimuth: Math.PI, polar: 1.48 },
  side: { azimuth: Math.PI / 2, polar: 1.48 },
  right: { azimuth: -Math.PI / 2, polar: 1.48 },
  'three-quarter': { azimuth: Math.PI / 4.5, polar: 1.3 },
}

export function viewFor(def: ProductDef, view: ViewName): ViewAngle {
  const own = def.views?.[view]
  if (own) return own
  // the right view mirrors a product's custom side view
  if (view === 'right' && def.views?.side) return { ...def.views.side, azimuth: -def.views.side.azimuth }
  return DEFAULT_VIEWS[view]
}

/** Cache of built models per product id (built once, reused). */
const builders = new Map<string, Promise<() => import('./engine/types').ProductModel>>()
export function loadBuilder(def: ProductDef) {
  let p = builders.get(def.id)
  if (!p) {
    p = def.load()
    builders.set(def.id, p)
    p.catch(() => builders.delete(def.id))
  }
  return p
}
