import { useState } from 'react'
import BuildForm from './components/BuildForm'
import InspirationGallery from './components/InspirationGallery'
import Recommendations from './components/Recommendations'
import { searchBuilds, streamRecommendations, streamRefine } from './api'
import type { AppStep, BuildSpecs, RedditBuild, RecommendationResult } from './types'

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'form', label: 'Your Build' },
  { key: 'gallery', label: 'Inspiration' },
  { key: 'recommendations', label: 'Recommendations' },
]

export default function App() {
  const [step, setStep] = useState<AppStep>('form')
  const [specs, setSpecs] = useState<BuildSpecs | null>(null)
  const [builds, setBuilds] = useState<RedditBuild[]>([])
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [refineHistory, setRefineHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFormSubmit = async (s: BuildSpecs) => {
    setSpecs(s)
    setError(null)
    setLoading(true)
    try {
      const results = await searchBuilds(s)
      setBuilds(results)
      setStep('gallery')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch builds')
    } finally {
      setLoading(false)
    }
  }

  const handleGalleryConfirm = async (selected: RedditBuild[]) => {
    if (!specs) return
    setError(null)
    setLoading(true)
    setStatusMessage('Analyzing your inspiration...')
    setStep('recommendations')
    setResult(null)
    setRefineHistory([])

    try {
      await streamRecommendations(
        selected,
        specs,
        (msg) => setStatusMessage(msg),
        (r) => { setResult(r); setStatusMessage('') },
        (err) => { setError(err); setStatusMessage('') },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recommendation failed')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  const handleRefine = async (refinement: string) => {
    if (!specs || !result) return
    setError(null)
    setLoading(true)
    setStatusMessage(`Applying: "${refinement}"...`)
    setRefineHistory((h) => [...h, refinement])

    try {
      await streamRefine(
        result.recommendations,
        refinement,
        specs,
        (msg) => setStatusMessage(msg),
        (r) => { setResult(r); setStatusMessage('') },
        (err) => { setError(err); setStatusMessage('') },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refine failed')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="min-h-screen bg-corsair-dark">
      {/* Header */}
      <header className="border-b border-corsair-border bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-corsair-yellow rounded-sm flex items-center justify-center">
              <span className="text-black font-black text-xs">C</span>
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">CORSAIR</span>
              <span className="text-corsair-muted text-sm ml-2">Build Advisor</span>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === currentStepIndex
                    ? 'bg-corsair-yellow/20 text-corsair-yellow border border-corsair-yellow/30'
                    : i < currentStepIndex
                    ? 'text-white/50'
                    : 'text-corsair-muted'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    i < currentStepIndex ? 'text-corsair-yellow' : ''
                  }`}>
                    {i < currentStepIndex ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${i < currentStepIndex ? 'bg-corsair-yellow/30' : 'bg-corsair-border'}`} />
                )}
              </div>
            ))}
          </div>

          {step !== 'form' && (
            <button
              onClick={() => { setStep('form'); setBuilds([]); setResult(null); setRefineHistory([]) }}
              className="text-xs text-corsair-muted hover:text-white transition-colors"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
          </div>
        )}

        {step === 'form' && (
          <BuildForm onSubmit={handleFormSubmit} loading={loading} />
        )}

        {step === 'gallery' && (
          <InspirationGallery
            builds={builds}
            onConfirm={handleGalleryConfirm}
            loading={loading}
          />
        )}

        {step === 'recommendations' && specs && (
          <Recommendations
            result={result ?? { build_story: '', recommendations: [], total_price: 0, budget_remaining: specs.budget }}
            specs={specs}
            statusMessage={statusMessage}
            onRefine={handleRefine}
            onBack={() => setStep('gallery')}
            refineHistory={refineHistory}
          />
        )}
      </main>
    </div>
  )
}
