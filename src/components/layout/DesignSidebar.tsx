import { BadgeCheck, Mountain, Download, Image as ImageIcon, Palette, Type } from 'lucide-react'
import { TextPanel } from '../text/TextPanel'
import { useStudio, type RightTab } from '../../state/studio'
import { LogoUploader } from '../logo/LogoUploader'
import { PlacementPanel } from '../placement/PlacementPanel'
import { ColourPanel } from '../colour/ColourPanel'
import { ScenePanel } from '../scene/ScenePanel'
import { BrandKitPanel } from '../project/BrandKitPanel'
import { LayersPanel } from '../placement/LayersPanel'
import { KitBuilder } from '../placement/KitBuilder'
import { PRODUCT_MAP } from '../../three/catalogue'
import { ExportPanel } from '../export/ExportPanel'

const TABS: { id: RightTab; label: string; icon: typeof Palette }[] = [
  { id: 'brand', label: 'Brand Kit', icon: BadgeCheck },
  { id: 'logo', label: 'Graphics', icon: ImageIcon },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'colour', label: 'Colours', icon: Palette },
  { id: 'scene', label: 'Scene', icon: Mountain },
  { id: 'export', label: 'Export', icon: Download },
]

export function DesignSidebar() {
  const tab = useStudio((s) => s.rightTab)
  const setTab = useStudio((s) => s.setRightTab)
  const category = useStudio((s) => PRODUCT_MAP[s.design.productId]?.category)
  const isJersey = useStudio((s) => s.design.productId === 'jersey')
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-6 gap-0.5 border-b border-white/6 p-1.5" role="tablist" aria-label="Design controls">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              const i = TABS.findIndex((x) => x.id === tab)
              if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].id)
              if (e.key === 'ArrowLeft') setTab(TABS[(i + TABS.length - 1) % TABS.length].id)
            }}
            className={`flex min-w-0 flex-col items-center gap-1 whitespace-nowrap rounded-lg px-0.5 py-2 text-[10px] font-medium tracking-tight transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              tab === t.id ? 'bg-accent-soft text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <t.icon className={`h-4 w-4 ${tab === t.id ? 'text-accent' : ''}`} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="scroll-thin flex-1 overflow-y-auto">
        {tab === 'logo' && (
          <>
            <section className="section" aria-label="Upload logos and images">
              <h2 className="panel-title mb-3">Logos &amp; images</h2>
              <LogoUploader />
            </section>
            {category === 'clothing' && (
              <section className={`section ${isJersey ? 'bg-accent-soft/40' : ''}`} aria-label="Team kit builder">
                <h2 className="panel-title mb-3">{isJersey ? 'Jersey designer – team kit' : 'Team kit'}</h2>
                <KitBuilder />
              </section>
            )}
            <section className="section" aria-label="Layers">
              <h2 className="panel-title mb-3">Layers</h2>
              <LayersPanel />
            </section>
            <section className="section" aria-label="Logo placement">
              <h2 className="panel-title mb-3">Placement</h2>
              <PlacementPanel />
            </section>
          </>
        )}
        {tab === 'text' && (
          <section className="section">
            <h2 className="panel-title mb-3">Text</h2>
            <TextPanel />
          </section>
        )}
        {tab === 'colour' && (
          <section className="section">
            <h2 className="panel-title mb-3">Colours</h2>
            <ColourPanel />
          </section>
        )}
        {tab === 'brand' && (
          <section className="section">
            <h2 className="panel-title mb-3">Brand Kit</h2>
            <BrandKitPanel />
          </section>
        )}
        {tab === 'scene' && (
          <section className="section">
            <h2 className="panel-title mb-3">Background &amp; scene</h2>
            <ScenePanel />
          </section>
        )}
        {tab === 'export' && (
          <section className="section">
            <h2 className="panel-title mb-3">Download</h2>
            <ExportPanel />
          </section>
        )}
      </div>
    </div>
  )
}
