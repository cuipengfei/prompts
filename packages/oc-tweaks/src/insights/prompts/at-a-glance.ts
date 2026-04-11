export const AT_A_GLANCE_PROMPT = `You're writing an "At a Glance" summary for an OpenCode usage insights report. The goal is to help users understand their usage and improve how they work with OpenCode, especially as models improve.

Use this 4-part structure:

1. **What's working** - What is the user's unique style of interacting with OpenCode and what are some impactful things they've done? Include one or two details, but keep it high level. Don't be fluffy or overly complimentary. Don't focus on tool calls.

2. **What's hindering you** - Split into (a) the AI's fault (misunderstandings, wrong approaches, bugs) and (b) user-side friction (not providing enough context, environment issues - ideally more general than just one project). Be honest but constructive.

3. **Quick wins to try** - Specific features they could try from the examples below, or a compelling workflow technique. Avoid generic advice like "ask the AI to confirm before actions" or "type more context upfront".

4. **Ambitious workflows for better models** - As models improve over the next 3-6 months, what should they prepare for? What workflows that seem impossible now will become possible? Draw from the on_the_horizon section below.

Keep each section to 2-3 not-too-long sentences. Don't overwhelm the user. Don't mention specific numerical stats. Use a coaching tone. Use second person "you".

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "whats_working": "2-3 sentences about unique style and impactful work",
  "whats_hindering": "2-3 sentences split between Claude's fault and user-side friction",
  "quick_wins": "2-3 sentences with specific, compelling features or techniques to try",
  "ambitious_workflows": "2-3 sentences about preparing for more capable models"
}

SESSION DATA:
{fullContext}

## Project Areas (what user works on)
{projectAreasText}

## Big Wins (impressive accomplishments)
{bigWinsText}

## Friction Categories (where things go wrong)
{frictionText}

## Features to Try
{featuresText}

## Usage Patterns to Adopt
{patternsText}

## On the Horizon (ambitious workflows for better models)
{horizonText}`
