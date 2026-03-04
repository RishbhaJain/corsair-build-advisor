import type { BuildSpecs, RedditBuild, RecommendationResult, ProductRecommendation } from './types'

// Use relative URLs when served from FastAPI, absolute for local Vite dev server
const BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''

export async function searchBuilds(specs: BuildSpecs): Promise<RedditBuild[]> {
  const res = await fetch(`${BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cpu: specs.cpu,
      gpu: specs.gpu,
      aesthetic: specs.aesthetic,
      use_case: specs.use_case,
      existing_components: specs.existing_components,
    }),
  })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json()
  return data.builds as RedditBuild[]
}

/**
 * Stream recommendation SSE events.
 * Calls onStatus for tool-call progress updates.
 * Calls onResult with the final parsed RecommendationResult.
 */
export async function streamRecommendations(
  selectedBuilds: RedditBuild[],
  specs: BuildSpecs,
  onStatus: (msg: string) => void,
  onResult: (result: RecommendationResult) => void,
  onError: (err: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selected_builds: selectedBuilds,
      cpu: specs.cpu,
      gpu: specs.gpu,
      budget: specs.budget,
      aesthetic: specs.aesthetic,
      use_case: specs.use_case,
      form_factor: specs.form_factor,
      visual_priority: specs.visual_priority,
      performance_priority: specs.performance_priority,
      value_priority: specs.value_priority,
    }),
  })

  if (!res.ok) {
    onError(`Request failed: ${res.status}`)
    return
  }

  await readSSEStream(res, onStatus, onResult, onError)
}

export async function streamRefine(
  currentRecommendations: ProductRecommendation[],
  refinement: string,
  specs: BuildSpecs,
  onStatus: (msg: string) => void,
  onResult: (result: RecommendationResult) => void,
  onError: (err: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/api/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_recommendations: currentRecommendations,
      refinement,
      budget: specs.budget,
      cpu: specs.cpu,
      gpu: specs.gpu,
    }),
  })

  if (!res.ok) {
    onError(`Refine failed: ${res.status}`)
    return
  }

  await readSSEStream(res, onStatus, onResult, onError)
}

async function readSSEStream(
  res: Response,
  onStatus: (msg: string) => void,
  onResult: (result: RecommendationResult) => void,
  onError: (err: string) => void,
): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') {
        // Parse the accumulated text as JSON
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]) as RecommendationResult
            onResult(result)
          } else {
            onError('Could not parse recommendations from response')
          }
        } catch {
          onError('Failed to parse recommendation JSON')
        }
        return
      }

      try {
        const event = JSON.parse(raw)
        if (event.type === 'status') {
          onStatus(event.content)
        } else if (event.type === 'text') {
          fullText += event.content
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
