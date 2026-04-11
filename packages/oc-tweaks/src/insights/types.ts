export type SessionFacets = {
  session_id: string
  underlying_goal: string
  goal_categories: Record<string, number>
  outcome:
    | "fully_achieved"
    | "mostly_achieved"
    | "partially_achieved"
    | "not_achieved"
    | "unclear_from_transcript"
  user_satisfaction_counts: Record<string, number>
  claude_helpfulness:
    | "unhelpful"
    | "slightly_helpful"
    | "moderately_helpful"
    | "very_helpful"
    | "essential"
  session_type:
    | "single_task"
    | "multi_task"
    | "iterative_refinement"
    | "exploration"
    | "quick_question"
  friction_counts: Record<string, number>
  friction_detail: string
  primary_success:
    | "none"
    | "fast_accurate_search"
    | "correct_code_edits"
    | "good_explanations"
    | "proactive_help"
    | "multi_file_changes"
    | "good_debugging"
  brief_summary: string
  user_instructions_to_claude?: string[]
}

export type AggregatedData = {
  total_sessions: number
  total_sessions_scanned?: number
  sessions_with_facets: number
  date_range: { start: string; end: string }
  total_messages: number
  total_duration_hours: number
  total_input_tokens: number
  total_output_tokens: number
  tool_counts: Record<string, number>
  languages: Record<string, number>
  git_commits: number
  git_pushes: number
  projects: Record<string, number>
  goal_categories: Record<string, number>
  outcomes: Record<string, number>
  satisfaction: Record<string, number>
  helpfulness: Record<string, number>
  session_types: Record<string, number>
  friction: Record<string, number>
  success: Record<string, number>
  session_summaries: Array<{
    id: string
    date: string
    summary: string
    goal?: string
  }>
  total_interruptions: number
  total_tool_errors: number
  tool_error_categories: Record<string, number>
  user_response_times: number[]
  median_response_time: number
  avg_response_time: number
  sessions_using_task_agent: number
  sessions_using_mcp: number
  sessions_using_web_search: number
  sessions_using_web_fetch: number
  total_lines_added: number
  total_lines_removed: number
  total_files_modified: number
  days_active: number
  messages_per_day: number
  message_hours: number[]
  multi_clauding: {
    overlap_events: number
    sessions_involved: number
    user_messages_during: number
  }
}

export type InsightResults = {
  at_a_glance?: {
    whats_working?: string
    whats_hindering?: string
    quick_wins?: string
    ambitious_workflows?: string
  }
  project_areas?: {
    areas?: Array<{ name: string; session_count: number; description: string }>
  }
  interaction_style?: {
    narrative?: string
    key_pattern?: string
  }
  what_works?: {
    intro?: string
    impressive_workflows?: Array<{ title: string; description: string }>
  }
  friction_analysis?: {
    intro?: string
    categories?: Array<{
      category: string
      description: string
      examples?: string[]
    }>
  }
  suggestions?: {
    claude_md_additions?: Array<{
      addition: string
      why: string
      where?: string
      prompt_scaffold?: string
    }>
    features_to_try?: Array<{
      feature: string
      one_liner: string
      why_for_you: string
      example_code?: string
    }>
    usage_patterns?: Array<{
      title: string
      suggestion: string
      detail?: string
      copyable_prompt?: string
    }>
  }
  on_the_horizon?: {
    intro?: string
    opportunities?: Array<{
      title: string
      whats_possible: string
      how_to_try?: string
      copyable_prompt?: string
    }>
  }
  fun_ending?: {
    headline?: string
    detail?: string
  }
}

export type SessionMeta = {
  id: string
  project_id: string
  parent_id?: string
  slug: string
  directory: string
  title: string
  version: string
  share_url?: string
  summary_additions: number
  summary_deletions: number
  summary_files: number
  summary_diffs?: string
  time_created: number
  time_updated: number
  time_compacting?: number
  time_archived?: number
  workspace_id?: string
  user_message_count: number
  total_messages: number
  duration_ms: number
  tool_counts: Record<string, number>
  languages: Record<string, number>
  git_commits: number
  git_pushes: number
  input_tokens: number
  output_tokens: number
  user_interruptions: number
  tool_errors: number
  tool_error_categories: Record<string, number>
  user_response_times: number[]
  message_hours: number[]
  lines_added: number
  lines_removed: number
  files_modified: number
  uses_task_agent: boolean
  uses_mcp: boolean
  uses_web_search: boolean
  uses_web_fetch: boolean
  user_message_timestamps: number[]
}

export type InsightsExportMetadata = {
  username: string
  generated_at: string
  opencode_version: string
  date_range: AggregatedData["date_range"]
  session_count: number
}

export type InsightsExport = {
  metadata: InsightsExportMetadata
  aggregated_data: AggregatedData
  insights: InsightResults
  facets_summary: {
    total: number
    goal_categories: Record<string, number>
    outcomes: Record<string, number>
    satisfaction: Record<string, number>
    friction: Record<string, number>
  }
}

export type InsightSection = {
  name:
    | "at_a_glance"
    | "project_areas"
    | "interaction_style"
    | "what_works"
    | "friction_analysis"
      | "suggestions"
      | "on_the_horizon"
      | "fun_ending"
  prompt: string
}
