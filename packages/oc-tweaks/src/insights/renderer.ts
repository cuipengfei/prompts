import { AggregatedData, InsightResults } from "./types"

// Escape HTML but render **bold** as <strong>
function escapeHtml(text: string): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeHtmlWithBold(text: string): string {
  const escaped = escapeHtml(text)
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
}

const SATISFACTION_ORDER = [
  "frustrated",
  "dissatisfied",
  "likely_satisfied",
  "satisfied",
  "happy",
  "unsure",
  "neutral",
  "delighted",
]

const OUTCOME_ORDER = [
  "not_achieved",
  "partially_achieved",
  "mostly_achieved",
  "fully_achieved",
  "unclear_from_transcript",
]

const LABEL_MAP: Record<string, string> = {
  single_task: "Single Task",
  multi_task: "Multi Task",
  iterative_refinement: "Iterative Refinement",
  exploration: "Exploration",
  quick_question: "Quick Question",
}

function generateBarChart(
  data: Record<string, number>,
  color: string,
  maxItems = 6,
  fixedOrder?: string[]
): string {
  let entries: [string, number][]

  if (fixedOrder) {
    entries = fixedOrder
      .filter((key) => key in data && (data[key] ?? 0) > 0)
      .map((key) => [key, data[key] ?? 0] as [string, number])
  } else {
    entries = Object.entries(data || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxItems)
  }

  if (entries.length === 0) return '<p class="empty">No data</p>'

  const maxVal = Math.max(...entries.map((e) => e[1]))
  return entries
    .map(([label, count]) => {
      const pct = (count / maxVal) * 100
      const cleanLabel =
        LABEL_MAP[label] ||
        label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(cleanLabel)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-value">${count}</div>
      </div>`
    })
    .join("\n")
}

function generateResponseTimeHistogram(times: number[]): string {
  if (!times || times.length === 0) return '<p class="empty">No response time data</p>'

  const buckets: Record<string, number> = {
    "2-10s": 0,
    "10-30s": 0,
    "30s-1m": 0,
    "1-2m": 0,
    "2-5m": 0,
    "5-15m": 0,
    ">15m": 0,
  }

  for (const t of times) {
    if (t < 10) buckets["2-10s"] = (buckets["2-10s"] ?? 0) + 1
    else if (t < 30) buckets["10-30s"] = (buckets["10-30s"] ?? 0) + 1
    else if (t < 60) buckets["30s-1m"] = (buckets["30s-1m"] ?? 0) + 1
    else if (t < 120) buckets["1-2m"] = (buckets["1-2m"] ?? 0) + 1
    else if (t < 300) buckets["2-5m"] = (buckets["2-5m"] ?? 0) + 1
    else if (t < 900) buckets["5-15m"] = (buckets["5-15m"] ?? 0) + 1
    else buckets[">15m"] = (buckets[">15m"] ?? 0) + 1
  }

  const maxVal = Math.max(...Object.values(buckets))
  if (maxVal === 0) return '<p class="empty">No response time data</p>'

  return Object.entries(buckets)
    .map(([label, count]) => {
      const pct = (count / maxVal) * 100
      return `<div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#6366f1"></div></div>
        <div class="bar-value">${count}</div>
      </div>`
    })
    .join("\n")
}

function generateTimeOfDayChart(messageHours: number[]): string {
  if (!messageHours || messageHours.length === 0) return '<p class="empty">No time data</p>'

  const periods = [
    { label: "Morning (6-12)", range: [6, 7, 8, 9, 10, 11] },
    { label: "Afternoon (12-18)", range: [12, 13, 14, 15, 16, 17] },
    { label: "Evening (18-24)", range: [18, 19, 20, 21, 22, 23] },
    { label: "Night (0-6)", range: [0, 1, 2, 3, 4, 5] },
  ]

  const hourCounts: Record<number, number> = {}
  for (const h of messageHours) {
    hourCounts[h] = (hourCounts[h] || 0) + 1
  }

  const periodCounts = periods.map((p) => ({
    label: p.label,
    count: p.range.reduce((sum, h) => sum + (hourCounts[h] || 0), 0),
  }))

  const maxVal = Math.max(...periodCounts.map((p) => p.count)) || 1

  const barsHtml = periodCounts
    .map(
      (p) => `
      <div class="bar-row">
        <div class="bar-label">${p.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(p.count / maxVal) * 100}%;background:#8b5cf6"></div></div>
        <div class="bar-value">${p.count}</div>
      </div>`
    )
    .join("\n")

  return `<div id="hour-histogram">${barsHtml}</div>`
}

function getHourCountsJson(messageHours: number[]): string {
  const hourCounts: Record<number, number> = {}
  if (messageHours) {
    for (const h of messageHours) {
      hourCounts[h] = (hourCounts[h] || 0) + 1
    }
  }
  return JSON.stringify(hourCounts)
}

export function generateHtmlReport(
  data: AggregatedData,
  insights: InsightResults
): string {
  const markdownToHtml = (md: string): string => {
    if (!md) return ""
    return md
      .split("\n\n")
      .map((p) => {
        let html = escapeHtml(p)
        html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        html = html.replace(/^- /gm, "• ")
        html = html.replace(/\n/g, "<br>")
        return `<p>${html}</p>`
      })
      .join("\n")
  }

  const atAGlance = insights.at_a_glance
  const atAGlanceHtml = atAGlance
    ? `
    <div id="section-glance" class="at-a-glance">
      <div class="glance-title">At a Glance</div>
      <div class="glance-sections">
        ${atAGlance.whats_working ? `<div class="glance-section"><strong>What's working:</strong> ${escapeHtmlWithBold(atAGlance.whats_working)} <a href="#section-wins" class="see-more">Impressive Things You Did →</a></div>` : ""}
        ${atAGlance.whats_hindering ? `<div class="glance-section"><strong>What's hindering you:</strong> ${escapeHtmlWithBold(atAGlance.whats_hindering)} <a href="#section-friction" class="see-more">Where Things Go Wrong →</a></div>` : ""}
        ${atAGlance.quick_wins ? `<div class="glance-section"><strong>Quick wins to try:</strong> ${escapeHtmlWithBold(atAGlance.quick_wins)} <a href="#section-features" class="see-more">Features to Try →</a></div>` : ""}
        ${atAGlance.ambitious_workflows ? `<div class="glance-section"><strong>Ambitious workflows:</strong> ${escapeHtmlWithBold(atAGlance.ambitious_workflows)} <a href="#section-horizon" class="see-more">On the Horizon →</a></div>` : ""}
      </div>
    </div>
    `
    : `<div id="section-glance" style="display:none;"></div>`

  const projectAreas = insights.project_areas?.areas || []
  const projectAreasHtml =
    projectAreas.length > 0
      ? `
    <h2 id="section-projects">What You Work On</h2>
    <div class="project-areas">
      ${projectAreas
        .map(
          (area) => `
        <div class="project-area">
          <div class="area-header">
            <span class="area-name">${escapeHtml(area.name)}</span>
            <span class="area-count">~${area.session_count} sessions</span>
          </div>
          <div class="area-desc">${escapeHtml(area.description)}</div>
        </div>
      `
        )
        .join("")}
    </div>
    `
      : `<h2 id="section-projects" style="display:none;">What You Work On</h2>`

  const interactionStyle = insights.interaction_style
  const interactionHtml = interactionStyle?.narrative
    ? `
    <h2 id="section-style">How You Use OpenCode</h2>
    <div class="narrative">
      ${markdownToHtml(interactionStyle.narrative)}
      ${interactionStyle.key_pattern ? `<div class="key-insight"><strong>Key pattern:</strong> ${escapeHtml(interactionStyle.key_pattern)}</div>` : ""}
    </div>
    `
    : `<h2 id="section-style" style="display:none;">How You Use OpenCode</h2>`

  const whatWorks = insights.what_works
  const whatWorksHtml =
    whatWorks?.impressive_workflows && whatWorks.impressive_workflows.length > 0
      ? `
    <h2 id="section-wins">Impressive Things You Did</h2>
    ${whatWorks.intro ? `<p class="section-intro">${escapeHtml(whatWorks.intro)}</p>` : ""}
    <div class="big-wins">
      ${whatWorks.impressive_workflows
        .map(
          (wf) => `
        <div class="big-win">
          <div class="big-win-title">${escapeHtml(wf.title || "")}</div>
          <div class="big-win-desc">${escapeHtml(wf.description || "")}</div>
        </div>
      `
        )
        .join("")}
    </div>
    `
      : `<h2 id="section-wins" style="display:none;">Impressive Things You Did</h2>`

  const frictionAnalysis = insights.friction_analysis
  const frictionHtml =
    frictionAnalysis?.categories && frictionAnalysis.categories.length > 0
      ? `
    <h2 id="section-friction">Where Things Go Wrong</h2>
    ${frictionAnalysis.intro ? `<p class="section-intro">${escapeHtml(frictionAnalysis.intro)}</p>` : ""}
    <div class="friction-categories">
      ${frictionAnalysis.categories
        .map(
          (cat) => `
        <div class="friction-category">
          <div class="friction-title">${escapeHtml(cat.category || "")}</div>
          <div class="friction-desc">${escapeHtml(cat.description || "")}</div>
          ${cat.examples ? `<ul class="friction-examples">${cat.examples.map((ex) => `<li>${escapeHtml(ex)}</li>`).join("")}</ul>` : ""}
        </div>
      `
        )
        .join("")}
    </div>
    `
      : `<h2 id="section-friction" style="display:none;">Where Things Go Wrong</h2>`

  const suggestions = insights.suggestions
  const suggestionsHtml = suggestions
    ? `
    ${
      (suggestions.claude_md_additions && suggestions.claude_md_additions.length > 0) ||
      (suggestions.features_to_try && suggestions.features_to_try.length > 0)
        ? `<h2 id="section-features">Features to Try</h2>`
        : `<h2 id="section-features" style="display:none;">Features to Try</h2>`
    }
    ${
      suggestions.claude_md_additions && suggestions.claude_md_additions.length > 0
        ? `
    <div class="claude-md-section">
      <h3>Suggested AGENTS.md Additions</h3>
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Just copy this into OpenCode to add it to your AGENTS.md.</p>
      <div class="claude-md-actions">
        <button class="copy-all-btn" onclick="copyAllCheckedAgentsMd()">Copy All Checked</button>
      </div>
      ${suggestions.claude_md_additions
        .map(
          (add, i) => `
        <div class="claude-md-item">
          <input type="checkbox" id="cmd-${i}" class="cmd-checkbox" checked data-text="${escapeHtml(add.prompt_scaffold || add.where || "Add to AGENTS.md")}\n\n${escapeHtml(add.addition)}">
          <label for="cmd-${i}">
            <code class="cmd-code">${escapeHtml(add.addition)}</code>
            <button class="copy-btn" onclick="copyCmdItem(${i})">Copy</button>
          </label>
          <div class="cmd-why">${escapeHtml(add.why)}</div>
        </div>
      `
        )
        .join("")}
    </div>
    `
        : ""
    }
    ${
      suggestions.features_to_try && suggestions.features_to_try.length > 0
        ? `
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Just copy this into OpenCode and it'll set it up for you.</p>
    <div class="features-section">
      ${suggestions.features_to_try
        .map(
          (feat) => `
        <div class="feature-card">
          <div class="feature-title">${escapeHtml(feat.feature || "")}</div>
          <div class="feature-oneliner">${escapeHtml(feat.one_liner || "")}</div>
          <div class="feature-why"><strong>Why for you:</strong> ${escapeHtml(feat.why_for_you || "")}</div>
          ${
            feat.example_code
              ? `
          <div class="feature-examples">
            <div class="feature-example">
              <div class="example-code-row">
                <code class="example-code">${escapeHtml(feat.example_code)}</code>
                <button class="copy-btn" onclick="copyText(this)">Copy</button>
              </div>
            </div>
          </div>
          `
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
        : ""
    }
    ${
      suggestions.usage_patterns && suggestions.usage_patterns.length > 0
        ? `
    <h2 id="section-patterns">New Ways to Use OpenCode</h2>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Just copy this into OpenCode and it'll walk you through it.</p>
    <div class="patterns-section">
      ${suggestions.usage_patterns
        .map(
          (pat) => `
        <div class="pattern-card">
          <div class="pattern-title">${escapeHtml(pat.title || "")}</div>
          <div class="pattern-summary">${escapeHtml(pat.suggestion || "")}</div>
          ${pat.detail ? `<div class="pattern-detail">${escapeHtml(pat.detail)}</div>` : ""}
          ${
            pat.copyable_prompt
              ? `
          <div class="copyable-prompt-section">
            <div class="prompt-label">Paste into OpenCode:</div>
            <div class="copyable-prompt-row">
              <code class="copyable-prompt">${escapeHtml(pat.copyable_prompt)}</code>
              <button class="copy-btn" onclick="copyText(this)">Copy</button>
            </div>
          </div>
          `
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
        : `<h2 id="section-patterns" style="display:none;">New Ways to Use OpenCode</h2>`
    }
    `
    : `
      <h2 id="section-features" style="display:none;">Features to Try</h2>
      <h2 id="section-patterns" style="display:none;">New Ways to Use OpenCode</h2>
    `

  const horizonData = insights.on_the_horizon
  const horizonHtml =
    horizonData?.opportunities && horizonData.opportunities.length > 0
      ? `
    <h2 id="section-horizon">On the Horizon</h2>
    ${horizonData.intro ? `<p class="section-intro">${escapeHtml(horizonData.intro)}</p>` : ""}
    <div class="horizon-section">
      ${horizonData.opportunities
        .map(
          (opp) => `
        <div class="horizon-card">
          <div class="horizon-title">${escapeHtml(opp.title || "")}</div>
          <div class="horizon-possible">${escapeHtml(opp.whats_possible || "")}</div>
          ${opp.how_to_try ? `<div class="horizon-tip"><strong>Getting started:</strong> ${escapeHtml(opp.how_to_try)}</div>` : ""}
          ${opp.copyable_prompt ? `<div class="pattern-prompt"><div class="prompt-label">Paste into OpenCode:</div><code>${escapeHtml(opp.copyable_prompt)}</code><button class="copy-btn" onclick="copyText(this)">Copy</button></div>` : ""}
        </div>
      `
        )
        .join("")}
    </div>
    `
      : `<h2 id="section-horizon" style="display:none;">On the Horizon</h2>`

  const funEnding = insights.fun_ending
  const funEndingHtml = funEnding?.headline
    ? `
    <h2 id="section-fun" style="display:none;">Fun Ending</h2>
    <div class="fun-ending">
      <div class="fun-headline">"${escapeHtml(funEnding.headline)}"</div>
      ${funEnding.detail ? `<div class="fun-detail">${escapeHtml(funEnding.detail)}</div>` : ""}
    </div>
    `
    : `<div id="section-fun" style="display:none;"></div>`

  const css = `
    :root {
      --bg-color: #f8fafc;
      --text-main: #334155;
      --text-heading: #0f172a;
      --text-muted: #64748b;
      --card-bg: #ffffff;
      --border-color: #e2e8f0;
      
      --nav-bg: #f1f5f9;
      --nav-hover: #e2e8f0;
      
      --glance-bg: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      --glance-border: #f59e0b;
      --glance-title: #92400e;
      --glance-text: #78350f;
      --glance-link: #b45309;
      
      --win-bg: #f0fdf4;
      --win-border: #bbf7d0;
      --win-title: #166534;
      --win-text: #15803d;
      
      --frict-bg: #fef2f2;
      --frict-border: #fca5a5;
      --frict-title: #991b1b;
      --frict-text: #7f1d1d;
      
      --cmd-bg: #eff6ff;
      --cmd-border: #bfdbfe;
      --cmd-title: #1e40af;
      
      --code-bg: #f1f5f9;
      
      --feat-bg: #f0fdf4;
      --feat-border: #86efac;
      
      --pat-bg: #f0f9ff;
      --pat-border: #7dd3fc;
      
      --horiz-bg: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%);
      --horiz-border: #c4b5fd;
      --horiz-title: #5b21b6;
      --horiz-tip-bg: rgba(255,255,255,0.6);
      
      --fun-bg: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      --fun-border: #fbbf24;
      --fun-title: #78350f;
      --fun-text: #92400e;
    }
    body.dark {
      --bg-color: #0f172a;
      --text-main: #cbd5e1;
      --text-heading: #f8fafc;
      --text-muted: #94a3b8;
      --card-bg: #1e293b;
      --border-color: #334155;
      
      --nav-bg: #334155;
      --nav-hover: #475569;
      
      --glance-bg: linear-gradient(135deg, #78350f 0%, #92400e 100%);
      --glance-border: #b45309;
      --glance-title: #fde68a;
      --glance-text: #fef3c7;
      --glance-link: #fcd34d;
      
      --win-bg: #14532d;
      --win-border: #166534;
      --win-title: #bbf7d0;
      --win-text: #dcfce7;
      
      --frict-bg: #7f1d1d;
      --frict-border: #991b1b;
      --frict-title: #fca5a5;
      --frict-text: #fecaca;
      
      --cmd-bg: #1e3a8a;
      --cmd-border: #1e40af;
      --cmd-title: #bfdbfe;
      
      --code-bg: #0f172a;
      
      --feat-bg: #064e3b;
      --feat-border: #065f46;
      
      --pat-bg: #0c4a6e;
      --pat-border: #075985;
      
      --horiz-bg: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
      --horiz-border: #7c3aed;
      --horiz-title: #ddd6fe;
      --horiz-tip-bg: rgba(15,23,42,0.6);
      
      --fun-bg: linear-gradient(135deg, #78350f 0%, #92400e 100%);
      --fun-border: #b45309;
      --fun-title: #fef3c7;
      --fun-text: #fde68a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg-color); color: var(--text-main); line-height: 1.65; padding: 48px 24px; transition: background 0.2s, color 0.2s; }
    .container { max-width: 800px; margin: 0 auto; position: relative; }
    .theme-toggle { position: absolute; top: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    h1 { font-size: 32px; font-weight: 700; color: var(--text-heading); margin-bottom: 8px; }
    h2 { font-size: 20px; font-weight: 600; color: var(--text-heading); margin-top: 48px; margin-bottom: 16px; }
    .subtitle { color: var(--text-muted); font-size: 15px; margin-bottom: 32px; }
    .nav-toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 32px 0; padding: 16px; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color); }
    .nav-toc a { font-size: 12px; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; background: var(--nav-bg); transition: all 0.15s; }
    .nav-toc a:hover { background: var(--nav-hover); color: var(--text-main); }
    .stats-row { display: flex; gap: 24px; margin-bottom: 40px; padding: 20px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: var(--text-heading); }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
    .at-a-glance { background: var(--glance-bg); border: 1px solid var(--glance-border); border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
    .glance-title { font-size: 16px; font-weight: 700; color: var(--glance-title); margin-bottom: 16px; }
    .glance-sections { display: flex; flex-direction: column; gap: 12px; }
    .glance-section { font-size: 14px; color: var(--glance-text); line-height: 1.6; }
    .glance-section strong { color: var(--glance-title); }
    .see-more { color: var(--glance-link); text-decoration: none; font-size: 13px; white-space: nowrap; }
    .see-more:hover { text-decoration: underline; }
    .project-areas { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .project-area { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; }
    .area-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .area-name { font-weight: 600; font-size: 15px; color: var(--text-heading); }
    .area-count { font-size: 12px; color: var(--text-muted); background: var(--nav-bg); padding: 2px 8px; border-radius: 4px; }
    .area-desc { font-size: 14px; color: var(--text-main); line-height: 1.5; }
    .narrative { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .narrative p { margin-bottom: 12px; font-size: 14px; color: var(--text-main); line-height: 1.7; }
    .key-insight { background: var(--win-bg); border: 1px solid var(--win-border); border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 14px; color: var(--win-title); }
    .section-intro { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; }
    .big-wins { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .big-win { background: var(--win-bg); border: 1px solid var(--win-border); border-radius: 8px; padding: 16px; }
    .big-win-title { font-weight: 600; font-size: 15px; color: var(--win-title); margin-bottom: 8px; }
    .big-win-desc { font-size: 14px; color: var(--win-text); line-height: 1.5; }
    .friction-categories { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .friction-category { background: var(--frict-bg); border: 1px solid var(--frict-border); border-radius: 8px; padding: 16px; }
    .friction-title { font-weight: 600; font-size: 15px; color: var(--frict-title); margin-bottom: 6px; }
    .friction-desc { font-size: 13px; color: var(--frict-text); margin-bottom: 10px; }
    .friction-examples { margin: 0 0 0 20px; font-size: 13px; color: var(--text-main); }
    .friction-examples li { margin-bottom: 4px; }
    .claude-md-section { background: var(--cmd-bg); border: 1px solid var(--cmd-border); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .claude-md-section h3 { font-size: 14px; font-weight: 600; color: var(--cmd-title); margin: 0 0 12px 0; }
    .claude-md-actions { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--cmd-border); }
    .copy-all-btn { background: #2563eb; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .copy-all-btn:hover { background: #1d4ed8; }
    .copy-all-btn.copied { background: #16a34a; }
    .claude-md-item { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--cmd-border); }
    .claude-md-item:last-child { border-bottom: none; }
    .cmd-checkbox { margin-top: 2px; }
    .cmd-code { background: var(--card-bg); padding: 8px 12px; border-radius: 4px; font-size: 12px; color: var(--cmd-title); border: 1px solid var(--cmd-border); font-family: monospace; display: block; white-space: pre-wrap; word-break: break-word; flex: 1; }
    .cmd-why { font-size: 12px; color: var(--text-muted); width: 100%; padding-left: 24px; margin-top: 4px; }
    .features-section, .patterns-section { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
    .feature-card { background: var(--feat-bg); border: 1px solid var(--feat-border); border-radius: 8px; padding: 16px; }
    .pattern-card { background: var(--pat-bg); border: 1px solid var(--pat-border); border-radius: 8px; padding: 16px; }
    .feature-title, .pattern-title { font-weight: 600; font-size: 15px; color: var(--text-heading); margin-bottom: 6px; }
    .feature-oneliner, .pattern-summary { font-size: 14px; color: var(--text-main); margin-bottom: 8px; }
    .feature-why, .pattern-detail { font-size: 13px; color: var(--text-main); line-height: 1.5; }
    .feature-examples { margin-top: 12px; }
    .feature-example { padding: 8px 0; border-top: 1px solid var(--feat-border); }
    .feature-example:first-child { border-top: none; }
    .example-code-row, .copyable-prompt-row { display: flex; align-items: flex-start; gap: 8px; }
    .example-code { flex: 1; background: var(--code-bg); padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text-main); overflow-x: auto; white-space: pre-wrap; }
    .copyable-prompt-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); }
    .copyable-prompt { flex: 1; background: var(--card-bg); padding: 10px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text-main); border: 1px solid var(--border-color); white-space: pre-wrap; line-height: 1.5; }
    .pattern-prompt { background: var(--card-bg); padding: 12px; border-radius: 6px; margin-top: 12px; border: 1px solid var(--border-color); }
    .pattern-prompt code { font-family: monospace; font-size: 12px; color: var(--text-main); display: block; white-space: pre-wrap; margin-bottom: 8px; }
    .prompt-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .copy-btn { background: var(--nav-bg); border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: var(--text-muted); flex-shrink: 0; }
    .copy-btn:hover { background: var(--nav-hover); color: var(--text-main); }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
    .chart-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; }
    .chart-title { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; }
    .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
    .bar-label { width: 100px; font-size: 11px; color: var(--text-main); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { flex: 1; height: 6px; background: var(--nav-bg); border-radius: 3px; margin: 0 8px; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .bar-value { width: 28px; font-size: 11px; font-weight: 500; color: var(--text-muted); text-align: right; }
    .empty { color: var(--text-muted); font-size: 13px; }
    .horizon-section { display: flex; flex-direction: column; gap: 16px; }
    .horizon-card { background: var(--horiz-bg); border: 1px solid var(--horiz-border); border-radius: 8px; padding: 16px; }
    .horizon-title { font-weight: 600; font-size: 15px; color: var(--horiz-title); margin-bottom: 8px; }
    .horizon-possible { font-size: 14px; color: var(--text-main); margin-bottom: 10px; line-height: 1.5; }
    .horizon-tip { font-size: 13px; color: var(--horiz-title); background: var(--horiz-tip-bg); padding: 8px 12px; border-radius: 4px; }
    .fun-ending { background: var(--fun-bg); border: 1px solid var(--fun-border); border-radius: 12px; padding: 24px; margin-top: 40px; text-align: center; }
    .fun-headline { font-size: 18px; font-weight: 600; color: var(--fun-title); margin-bottom: 8px; }
    .fun-detail { font-size: 14px; color: var(--fun-text); }
    @media (max-width: 640px) { .charts-row { grid-template-columns: 1fr; } .stats-row { justify-content: center; } }
  `

  const hourCountsJson = getHourCountsJson(data.message_hours)

  const js = `
    function toggleTheme() {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      localStorage.setItem('opencode-insights-theme', isDark ? 'dark' : 'light');
    }
    
    // Check saved theme
    if (localStorage.getItem('opencode-insights-theme') === 'dark') {
      document.body.classList.add('dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('opencode-insights-theme')) {
      document.body.classList.add('dark');
    }

    function copyText(btn) {
      const code = btn.previousElementSibling;
      navigator.clipboard.writeText(code.textContent).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    }
    function copyCmdItem(idx) {
      const checkbox = document.getElementById('cmd-' + idx);
      if (checkbox) {
        const text = checkbox.dataset.text;
        navigator.clipboard.writeText(text).then(() => {
          const btn = checkbox.nextElementSibling.querySelector('.copy-btn');
          if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
        });
      }
    }
    function copyAllCheckedAgentsMd() {
      const checkboxes = document.querySelectorAll('.cmd-checkbox:checked');
      const texts = [];
      checkboxes.forEach(cb => {
        if (cb.dataset.text) { texts.push(cb.dataset.text); }
      });
      const combined = texts.join('\\n');
      const btn = document.querySelector('.copy-all-btn');
      if (btn) {
        navigator.clipboard.writeText(combined).then(() => {
          btn.textContent = 'Copied ' + texts.length + ' items!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy All Checked'; btn.classList.remove('copied'); }, 2000);
        });
      }
    }
    // Timezone selector for time of day chart
    const rawHourCounts = ${hourCountsJson};
    function updateHourHistogram(offsetFromPT) {
      const periods = [
        { label: "Morning (6-12)", range: [6,7,8,9,10,11] },
        { label: "Afternoon (12-18)", range: [12,13,14,15,16,17] },
        { label: "Evening (18-24)", range: [18,19,20,21,22,23] },
        { label: "Night (0-6)", range: [0,1,2,3,4,5] }
      ];
      const adjustedCounts = {};
      for (const [hour, count] of Object.entries(rawHourCounts)) {
        const newHour = (parseInt(hour) + offsetFromPT + 24) % 24;
        adjustedCounts[newHour] = (adjustedCounts[newHour] || 0) + count;
      }
      const periodCounts = periods.map(p => ({
        label: p.label,
        count: p.range.reduce((sum, h) => sum + (adjustedCounts[h] || 0), 0)
      }));
      const maxCount = Math.max(...periodCounts.map(p => p.count)) || 1;
      const container = document.getElementById('hour-histogram');
      container.textContent = '';
      periodCounts.forEach(p => {
        const row = document.createElement('div');
        row.className = 'bar-row';
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = p.label;
        const track = document.createElement('div');
        track.className = 'bar-track';
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.width = (p.count / maxCount) * 100 + '%';
        fill.style.background = '#8b5cf6';
        track.appendChild(fill);
        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = p.count;
        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(value);
        container.appendChild(row);
      });
    }
    document.getElementById('timezone-select').addEventListener('change', function() {
      const customInput = document.getElementById('custom-offset');
      if (this.value === 'custom') {
        customInput.style.display = 'inline-block';
        customInput.focus();
      } else {
        customInput.style.display = 'none';
        updateHourHistogram(parseInt(this.value));
      }
    });
    document.getElementById('custom-offset').addEventListener('change', function() {
      const offset = parseInt(this.value) + 8;
      updateHourHistogram(offset);
    });
  `

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OpenCode Insights</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle Dark Mode">🌓 Theme</button>
    <h1>OpenCode Insights</h1>
    <p class="subtitle">${data.total_messages?.toLocaleString() || 0} messages across ${data.total_sessions || 0} sessions${data.total_sessions_scanned && data.total_sessions_scanned > data.total_sessions ? ` (${data.total_sessions_scanned.toLocaleString()} total)` : ""} | ${data.date_range?.start || ""} to ${data.date_range?.end || ""}</p>

    ${atAGlanceHtml}

    <nav class="nav-toc">
      <a href="#section-glance">At a Glance</a>
      <a href="#section-projects">What You Work On</a>
      <a href="#section-style">How You Use OpenCode</a>
      <a href="#section-wins">Impressive Things</a>
      <a href="#section-friction">Where Things Go Wrong</a>
      <a href="#section-features">Features to Try</a>
      <a href="#section-patterns">New Usage Patterns</a>
      <a href="#section-horizon">On the Horizon</a>
      <a href="#section-fun">Fun Ending</a>
    </nav>

    <div class="stats-row" id="section-stats">
      <div class="stat"><div class="stat-value">${data.total_messages?.toLocaleString() || 0}</div><div class="stat-label">Messages</div></div>
      <div class="stat"><div class="stat-value">+${data.total_lines_added?.toLocaleString() || 0}/-${data.total_lines_removed?.toLocaleString() || 0}</div><div class="stat-label">Lines</div></div>
      <div class="stat"><div class="stat-value">${data.total_files_modified || 0}</div><div class="stat-label">Files</div></div>
      <div class="stat"><div class="stat-value">${data.days_active || 0}</div><div class="stat-label">Days</div></div>
      <div class="stat"><div class="stat-value">${data.messages_per_day || 0}</div><div class="stat-label">Msgs/Day</div></div>
    </div>

    ${projectAreasHtml}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">What You Wanted</div>
        ${generateBarChart(data.goal_categories, "#2563eb")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Top Tools Used</div>
        ${generateBarChart(data.tool_counts, "#0891b2")}
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Languages</div>
        ${generateBarChart(data.languages, "#10b981")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Session Types</div>
        ${generateBarChart(data.session_types || {}, "#8b5cf6")}
      </div>
    </div>

    ${interactionHtml}

    <!-- Response Time Distribution -->
    <div class="chart-card" style="margin: 24px 0;">
      <div class="chart-title">User Response Time Distribution</div>
      ${generateResponseTimeHistogram(data.user_response_times)}
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
        Median: ${data.median_response_time?.toFixed(1) || 0}s &bull; Average: ${data.avg_response_time?.toFixed(1) || 0}s
      </div>
    </div>

    <!-- Multi-clauding Section -->
    <div class="chart-card" style="margin: 24px 0;">
      <div class="chart-title">Multi-Clauding (Parallel Sessions)</div>
      ${
        data.multi_clauding?.overlap_events === 0 || !data.multi_clauding
          ? `
        <p style="font-size: 14px; color: var(--text-muted); padding: 8px 0;">
          No parallel session usage detected. You typically work with one OpenCode session at a time.
        </p>
      `
          : `
        <div style="display: flex; gap: 24px; margin: 12px 0;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${data.multi_clauding.overlap_events}</div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Overlap Events</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${data.multi_clauding.sessions_involved}</div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Sessions Involved</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${data.total_messages > 0 ? Math.round((100 * data.multi_clauding.user_messages_during) / data.total_messages) : 0}%</div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Of Messages</div>
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-main); margin-top: 12px;">
          You run multiple OpenCode sessions simultaneously. Multi-clauding is detected when sessions
          overlap in time, suggesting parallel workflows.
        </p>
      `
      }
    </div>

    <!-- Time of Day & Tool Errors -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title" style="display: flex; align-items: center; gap: 12px;">
          User Messages by Time of Day
          <select id="timezone-select" style="background: var(--card-bg); color: var(--text-main); font-size: 12px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color);">
            <option value="0">PT (UTC-8)</option>
            <option value="3">ET (UTC-5)</option>
            <option value="8">London (UTC)</option>
            <option value="9">CET (UTC+1)</option>
            <option value="17">Tokyo (UTC+9)</option>
            <option value="custom">Custom offset...</option>
          </select>
          <input type="number" id="custom-offset" placeholder="UTC offset" style="display: none; background: var(--card-bg); color: var(--text-main); width: 80px; font-size: 12px; padding: 4px; border-radius: 4px; border: 1px solid var(--border-color);">
        </div>
        ${generateTimeOfDayChart(data.message_hours)}
      </div>
      <div class="chart-card">
        <div class="chart-title">Tool Errors Encountered</div>
        ${data.tool_error_categories && Object.keys(data.tool_error_categories).length > 0 ? generateBarChart(data.tool_error_categories, "#dc2626") : '<p class="empty">No tool errors</p>'}
      </div>
    </div>

    ${whatWorksHtml}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">What Helped Most</div>
        ${generateBarChart(data.success, "#16a34a")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Outcomes</div>
        ${generateBarChart(data.outcomes, "#8b5cf6", 6, OUTCOME_ORDER)}
      </div>
    </div>

    ${frictionHtml}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Primary Friction Types</div>
        ${generateBarChart(data.friction, "#dc2626")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Inferred Satisfaction (model-estimated)</div>
        ${generateBarChart(data.satisfaction, "#eab308", 6, SATISFACTION_ORDER)}
      </div>
    </div>

    ${suggestionsHtml}

    ${horizonHtml}

    ${funEndingHtml}

  </div>
  <script>${js}</script>
</body>
</html>`
}
