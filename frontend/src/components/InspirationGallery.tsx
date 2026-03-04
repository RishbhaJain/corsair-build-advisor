import { useState } from 'react'
import type { RedditBuild } from '../types'

interface Props {
  builds: RedditBuild[]
  onConfirm: (selected: RedditBuild[]) => void
  loading: boolean
}

function BuildCard({
  build,
  selected,
  onClick,
}: {
  build: RedditBuild
  selected: boolean
  onClick: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${
        selected
          ? 'border-corsair-yellow shadow-[0_0_20px_rgba(255,246,0,0.3)]'
          : 'border-corsair-border hover:border-corsair-muted'
      }`}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-corsair-card overflow-hidden">
        {!imgError ? (
          <img
            src={build.primary_image_url}
            alt={build.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-corsair-muted text-xs">
            Image unavailable
          </div>
        )}
      </div>

      {/* Selected overlay */}
      {selected && (
        <div className="absolute inset-0 bg-corsair-yellow/10 pointer-events-none" />
      )}

      {/* Checkmark */}
      <div
        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          selected ? 'bg-corsair-yellow' : 'bg-black/60 border border-white/20'
        }`}
      >
        {selected && (
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* PCPartPicker badge */}
      {build.pcpartpicker_url && (
        <a
          href={build.pcpartpicker_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 bg-black/70 text-xs text-corsair-yellow border border-corsair-yellow/30 px-2 py-0.5 rounded-full hover:bg-corsair-yellow/10 transition-colors"
        >
          View Specs
        </a>
      )}

      {/* Footer info */}
      <div className="p-3 bg-corsair-card">
        <p className="text-xs text-white font-medium line-clamp-2 leading-snug mb-1.5">
          {build.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-corsair-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2l2.39 4.84 5.35.78-3.87 3.77.91 5.32L10 14.14l-4.78 2.57.91-5.32L2.26 7.62l5.35-.78L10 2z" />
            </svg>
            {build.upvotes.toLocaleString()}
          </span>
          <span>·</span>
          <span className="text-corsair-yellow/70">r/{build.flair ?? 'Corsair'}</span>
          {build.num_comments > 0 && (
            <>
              <span>·</span>
              <span>{build.num_comments} comments</span>
            </>
          )}
        </div>
        {build.selftext && (
          <p className="text-xs text-corsair-muted mt-1.5 line-clamp-2 italic">
            {build.selftext.slice(0, 120)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function InspirationGallery({ builds, onConfirm, loading }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectedBuilds = builds.filter((b) => selected.has(b.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Community Inspiration</h2>
          <p className="text-corsair-muted text-sm">
            Select the builds that inspire your vision. Click to choose.
          </p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => onConfirm(selectedBuilds)}
            disabled={loading}
            className="bg-corsair-yellow text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Building...
              </>
            ) : (
              <>Build My Setup → <span className="bg-black/20 rounded-full w-6 h-6 flex items-center justify-center text-sm">{selected.size}</span></>
            )}
          </button>
        )}
      </div>

      {/* Selection hint */}
      {selected.size === 0 && (
        <div className="border border-dashed border-corsair-yellow/20 rounded-xl p-4 mb-6 text-center text-sm text-corsair-muted">
          Click builds to select ones that match your vision →{' '}
          <span className="text-corsair-yellow">then hit "Build My Setup"</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {builds.map((build) => (
          <BuildCard
            key={build.id}
            build={build}
            selected={selected.has(build.id)}
            onClick={() => toggle(build.id)}
          />
        ))}
      </div>

      {/* Floating confirm bar when items selected */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-corsair-card border border-corsair-yellow/30 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-[0_8px_32px_rgba(255,246,0,0.15)] z-50">
          <span className="text-white text-sm">
            <span className="text-corsair-yellow font-bold">{selected.size}</span> build{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => onConfirm(selectedBuilds)}
            disabled={loading}
            className="bg-corsair-yellow text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-all text-sm"
          >
            {loading ? 'Building...' : 'Build My Setup →'}
          </button>
        </div>
      )}
    </div>
  )
}
