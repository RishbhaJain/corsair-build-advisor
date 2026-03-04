export interface RedditBuild {
  id: string
  title: string
  permalink: string
  primary_image_url: string
  all_image_urls: string[]
  upvotes: number
  author: string
  selftext: string
  pcpartpicker_url?: string
  flair?: string
  num_comments: number
}

export interface BuildSpecs {
  cpu: string
  gpu: string
  aesthetic: string
  use_case: string
  existing_components: string
  budget: number
  visual_priority: number
  performance_priority: number
  value_priority: number
  form_factor: string
}

export interface ProductRecommendation {
  product_id: string
  product_name: string
  category: string
  price: number
  reason: string
}

export interface RecommendationResult {
  build_story: string
  recommendations: ProductRecommendation[]
  total_price: number
  budget_remaining: number
}

export type AppStep = 'form' | 'gallery' | 'recommendations'
