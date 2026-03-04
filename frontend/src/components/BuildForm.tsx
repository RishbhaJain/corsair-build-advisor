import { useState } from 'react'
import type { BuildSpecs } from '../types'

interface Props {
  onSubmit: (specs: BuildSpecs) => void
  loading: boolean
}

const AESTHETICS = ['RGB Enthusiast', 'Clean & Minimal', 'Dark Stealth', 'All-White']
const USE_CASES = ['Gaming', 'Streaming & Content', 'Professional Work', 'Silent HTPC']
const FORM_FACTORS = ['Full ATX', 'Compact mATX', 'Mini ITX']

function PrioritySlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-sm font-bold text-corsair-yellow bg-corsair-yellow/10 px-2 py-0.5 rounded">
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, #FFF600 ${(value - 1) * 11.1}%, #222 ${(value - 1) * 11.1}%)`
        }}
      />
      <p className="text-xs text-corsair-muted">{description}</p>
    </div>
  )
}

export default function BuildForm({ onSubmit, loading }: Props) {
  const [specs, setSpecs] = useState<BuildSpecs>({
    cpu: '',
    gpu: '',
    aesthetic: 'RGB Enthusiast',
    use_case: 'Gaming',
    existing_components: '',
    budget: 500,
    visual_priority: 7,
    performance_priority: 7,
    value_priority: 5,
    form_factor: 'Full ATX',
  })

  const set = <K extends keyof BuildSpecs>(key: K, val: BuildSpecs[K]) =>
    setSpecs((s) => ({ ...s, [key]: val }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Your Build</h2>
        <p className="text-corsair-muted text-sm">Tell us what you have and what you're looking for.</p>
      </div>

      <div className="space-y-6">
        {/* Components */}
        <div className="bg-corsair-card border border-corsair-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-corsair-yellow uppercase tracking-wider">
            Current Components
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-corsair-muted mb-1.5">CPU</label>
              <input
                type="text"
                placeholder="e.g. Intel i7-14700K"
                value={specs.cpu}
                onChange={(e) => set('cpu', e.target.value)}
                className="w-full bg-black border border-corsair-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-corsair-muted focus:outline-none focus:border-corsair-yellow/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-corsair-muted mb-1.5">GPU</label>
              <input
                type="text"
                placeholder="e.g. RTX 4080 Super"
                value={specs.gpu}
                onChange={(e) => set('gpu', e.target.value)}
                className="w-full bg-black border border-corsair-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-corsair-muted focus:outline-none focus:border-corsair-yellow/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-corsair-muted mb-1.5">Other existing components (optional)</label>
            <input
              type="text"
              placeholder="e.g. Samsung 980 Pro SSD, already have RAM"
              value={specs.existing_components}
              onChange={(e) => set('existing_components', e.target.value)}
              className="w-full bg-black border border-corsair-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-corsair-muted focus:outline-none focus:border-corsair-yellow/50 transition-colors"
            />
          </div>
        </div>

        {/* Budget */}
        <div className="bg-corsair-card border border-corsair-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-corsair-yellow uppercase tracking-wider mb-4">
            Budget
          </h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={specs.budget}
              onChange={(e) => set('budget', Number(e.target.value))}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, #FFF600 ${((specs.budget - 50) / 1950) * 100}%, #222 ${((specs.budget - 50) / 1950) * 100}%)`
              }}
            />
            <div className="bg-corsair-yellow/10 border border-corsair-yellow/20 rounded-lg px-4 py-2 min-w-[90px] text-center">
              <span className="text-corsair-yellow font-bold text-lg">${specs.budget}</span>
            </div>
          </div>
        </div>

        {/* Priorities */}
        <div className="bg-corsair-card border border-corsair-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-corsair-yellow uppercase tracking-wider">
            What matters to you?
          </h3>
          <PrioritySlider
            label="Visual Appeal"
            description="How important is RGB lighting, aesthetics, and showcase value?"
            value={specs.visual_priority}
            onChange={(v) => set('visual_priority', v)}
          />
          <PrioritySlider
            label="Performance"
            description="Prioritize raw cooling capacity, airflow, and power delivery?"
            value={specs.performance_priority}
            onChange={(v) => set('performance_priority', v)}
          />
          <PrioritySlider
            label="Value"
            description="Maximize bang for your buck within the budget?"
            value={specs.value_priority}
            onChange={(v) => set('value_priority', v)}
          />
        </div>

        {/* Aesthetic + Use Case + Form Factor */}
        <div className="bg-corsair-card border border-corsair-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-corsair-yellow uppercase tracking-wider">
            Preferences
          </h3>

          <div>
            <label className="block text-xs text-corsair-muted mb-2">Aesthetic</label>
            <div className="flex flex-wrap gap-2">
              {AESTHETICS.map((a) => (
                <button
                  key={a}
                  onClick={() => set('aesthetic', a)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    specs.aesthetic === a
                      ? 'bg-corsair-yellow text-black border-corsair-yellow'
                      : 'bg-transparent text-corsair-muted border-corsair-border hover:border-corsair-yellow/40 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-corsair-muted mb-2">Use Case</label>
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((u) => (
                <button
                  key={u}
                  onClick={() => set('use_case', u)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    specs.use_case === u
                      ? 'bg-corsair-yellow text-black border-corsair-yellow'
                      : 'bg-transparent text-corsair-muted border-corsair-border hover:border-corsair-yellow/40 hover:text-white'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-corsair-muted mb-2">Form Factor</label>
            <div className="flex flex-wrap gap-2">
              {FORM_FACTORS.map((f) => (
                <button
                  key={f}
                  onClick={() => set('form_factor', f)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    specs.form_factor === f
                      ? 'bg-corsair-yellow text-black border-corsair-yellow'
                      : 'bg-transparent text-corsair-muted border-corsair-border hover:border-corsair-yellow/40 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => onSubmit(specs)}
          disabled={loading}
          className="w-full bg-corsair-yellow text-black font-bold py-4 rounded-xl text-base hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Finding inspiration...
            </>
          ) : (
            'Find My Inspiration →'
          )}
        </button>
      </div>
    </div>
  )
}
