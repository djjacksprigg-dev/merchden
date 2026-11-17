import { useMemo, useState } from 'react'
import {
  Armchair,
  Backpack,
  Coffee,
  CupSoda,
  GraduationCap,
  Headphones,
  IdCard,
  Mouse,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sticker,
  Crown,
  Footprints,
  Briefcase,
  Gamepad2,
  Laptop,
  KeyRound,
  NotebookPen,
  Image as ImageIcon,
  Milk,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORIES, PRODUCTS } from '../../three/catalogue'
import { useStudio } from '../../state/studio'

const ICONS: Record<string, LucideIcon> = {
  jersey: Shirt,
  tshirt: Shirt,
  hoodie: Shirt,
  'zip-hoodie': Shirt,
  sweatshirt: Shirt,
  polo: Shirt,
  'tracksuit-jacket': Shirt,
  joggers: Footprints,
  cap: GraduationCap,
  beanie: Crown,
  'bucket-hat': GraduationCap,
  'extended-mousemat': Mouse,
  mousemat: Mouse,
  'gaming-chair': Armchair,
  headset: Headphones,
  'water-bottle': CupSoda,
  mug: Coffee,
  backpack: Backpack,
  'drawstring-bag': ShoppingBag,
  'tote-bag': Briefcase,
  'phone-case': Smartphone,
  lanyard: IdCard,
  sticker: Sticker,
  'oversized-tee': Shirt,
  'varsity-jacket': Shirt,
  windbreaker: Shirt,
  'controller-skin': Gamepad2,
  'laptop-sleeve': Laptop,
  'headset-stand': Headphones,
  'travel-mug': Coffee,
  'sports-bottle': Milk,
  tumbler: CupSoda,
  keyring: KeyRound,
  notebook: NotebookPen,
  poster: ImageIcon,
}

/** Pre-rendered product thumbnails (generated from the 3D models by scripts/make-thumbs.py). */
const THUMBS = import.meta.glob('../../assets/thumbs/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const thumbFor = (id: string) => THUMBS[`../../assets/thumbs/${id}.webp`]

export function CatalogueSidebar() {
  const current = useStudio((s) => s.design.productId)
  const selectProduct = useStudio((s) => s.selectProduct)
  const drafts = useStudio((s) => s.drafts)
  const saved = useStudio((s) => s.collection)
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(t) || p.category.includes(t)) : PRODUCTS
  }, [q])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/6 p-3">
        <label htmlFor="catalogue-search" className="sr-only">
          Search merchandise
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input id="catalogue-search" className="input pl-9" placeholder={`Search ${PRODUCTS.length} products`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto px-2 pb-4" aria-label="Merchandise catalogue">
        {CATEGORIES.map((cat) => {
          const items = filtered.filter((p) => p.category === cat.id)
          if (!items.length) return null
          return (
            <section key={cat.id} className="pt-4">
              <h2 className="panel-title px-2 pb-2">{cat.name}</h2>
              <ul className="space-y-0.5">
                {items.map((p) => {
                  const Icon = ICONS[p.id] ?? Shirt
                  const active = p.id === current
                  const draft = drafts[p.id]
                  const swatch = (active ? undefined : draft?.colors.primary) ?? p.defaults.primary
                  const savedCount = saved.filter((s) => s.productId === p.id).length
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectProduct(p.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                          active ? 'bg-accent-soft text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {thumbFor(p.id) ? (
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[#e9eaee] ${active ? 'border-accent' : 'border-white/8'}`}>
                            <img src={thumbFor(p.id)} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 object-contain" />
                          </span>
                        ) : (
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${active ? 'border-accent/60 bg-accent/15' : 'border-white/8 bg-navy-800'}`}>
                            <Icon className={`h-5 w-5 ${active ? 'text-accent' : 'text-slate-400 group-hover:text-slate-200'}`} aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="block truncate text-[11px] text-slate-500">{p.description}</span>
                        </span>
                        {savedCount > 0 && (
                          <span className="rounded bg-white/8 px-1.5 text-[10px] font-semibold text-slate-300" title={`${savedCount} saved`}>
                            {savedCount}
                          </span>
                        )}
                        <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: swatch }} aria-hidden />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {!filtered.length && <p className="px-2 pt-6 text-sm text-slate-400">No products match “{q}”.</p>}
      </nav>
    </div>
  )
}
