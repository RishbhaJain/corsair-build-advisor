import { useState } from 'react'
import type { RecommendationResult, ProductRecommendation, BuildSpecs } from '../types'

const CATEGORY_COLORS: Record<string, string> = {
  case: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cooling: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ram: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  psu: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  fans: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  lighting: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  keyboard: 'bg-green-500/20 text-green-300 border-green-500/30',
  mouse: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  headset: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const REFINE_CHIPS = [
  'More RGB',
  'Better cooling',
  'Lower cost',
  'More memory',
  'Quieter',
  'White build',
  'More power',
]

interface Props {
  result: RecommendationResult
  specs: BuildSpecs
  statusMessage: string
  onRefine: (refinement: string) => void
  onBack: () => void
  refineHistory: string[]
}

function ProductCard({ rec }: { rec: ProductRecommendation }) {
  const colorClass = CATEGORY_COLORS[rec.category] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'

  return (
    <div className="bg-corsair-card border border-corsair-border rounded-xl p-5 hover:border-corsair-yellow/30 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border mb-2 ${colorClass}`}>
            {rec.category.toUpperCase()}
          </span>
          <h4 className="text-white font-semibold text-sm leading-snug">{rec.product_name}</h4>
        </div>
        <div className="text-corsair-yellow font-bold text-lg whitespace-nowrap">${rec.price}</div>
      </div>
      <p className="text-corsair-muted text-xs leading-relaxed mb-4">{rec.reason}</p>
      <a
        href={`https://www.corsair.com/us/en/s?searchterm=${encodeURIComponent(rec.product_name)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-corsair-yellow/70 hover:text-corsair-yellow flex items-center gap-1 transition-colors"
      >
        View on Corsair.com
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}

export default function Recommendations({ result, specs, statusMessage, onRefine, onBack, refineHistory }: Props) {
  const [refineInput, setRefineInput] = useState('')

  const handleRefine = (text: string) => {
    if (!text.trim()) return
    onRefine(text.trim())
    setRefineInput('')
  }

  const totalPercent = Math.min(100, (result.total_price / specs.budget) * 100)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Your Corsair Build</h2>
          <p className="text-corsair-muted text-sm">AI-curated recommendations based on your inspiration.</p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-corsair-muted hover:text-white border border-corsair-border hover:border-corsair-muted px-4 py-2 rounded-lg transition-all"
        >
          ← Back to gallery
        </button>
      </div>

      {/* Status message (shown while streaming) */}
      {statusMessage && (
        <div className="mb-6 flex items-center gap-3 text-sm text-corsair-muted bg-corsair-card border border-corsair-border rounded-xl px-4 py-3">
          <span className="inline-block w-4 h-4 border-2 border-corsair-muted border-t-corsair-yellow rounded-full animate-spin flex-shrink-0" />
          {statusMessage}
        </div>
      )}

      {/* Build Story */}
      {result.build_story && (
        <div className="bg-gradient-to-r from-corsair-yellow/10 to-transparent border border-corsair-yellow/20 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-corsair-yellow rounded-full" />
            <h3 className="text-sm font-semibold text-corsair-yellow uppercase tracking-wider">Build Vision</h3>
          </div>
          <p className="text-white/90 leading-relaxed">{result.build_story}</p>
        </div>
      )}

      {/* Budget tracker */}
      {result.total_price > 0 && (
        <div className="bg-corsair-card border border-corsair-border rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-corsair-muted">Budget used</span>
            <span className={`text-sm font-bold ${result.budget_remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${result.total_price} / ${specs.budget}
              {result.budget_remaining >= 0
                ? ` · $${result.budget_remaining} remaining`
                : ` · $${Math.abs(result.budget_remaining)} over budget`}
            </span>
          </div>
          <div className="h-2 bg-corsair-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalPercent > 100 ? 'bg-red-500' : 'bg-corsair-yellow'}`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Product cards grid */}
      {result.recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {result.recommendations.map((rec, i) => (
            <ProductCard key={`${rec.product_id}-${i}`} rec={rec} />
          ))}
        </div>
      )}

      {/* Refinement section */}
      <div className="bg-corsair-card border border-corsair-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Refine your build</h3>
        <p className="text-xs text-corsair-muted mb-4">Tell the AI how to adjust the recommendations.</p>

        {/* Refine history */}
        {refineHistory.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-xs text-corsair-muted overflow-x-auto">
            <span>History:</span>
            {refineHistory.map((r, i) => (
              <span key={i} className="bg-corsair-yellow/10 border border-corsair-yellow/20 text-corsair-yellow px-2 py-0.5 rounded-full whitespace-nowrap">
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {REFINE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleRefine(chip)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-corsair-border text-corsair-muted hover:border-corsair-yellow/40 hover:text-white transition-all"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Free text input */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder='e.g. "I want a quieter build" or "add a white themed case"'
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefine(refineInput)}
            className="flex-1 bg-black border border-corsair-border rounded-xl px-4 py-3 text-sm text-white placeholder-corsair-muted focus:outline-none focus:border-corsair-yellow/50 transition-colors"
          />
          <button
            onClick={() => handleRefine(refineInput)}
            disabled={!refineInput.trim()}
            className="bg-corsair-yellow text-black font-bold px-5 py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          >
            Refine
          </button>
        </div>
      </div>
    </div>
  )
}
