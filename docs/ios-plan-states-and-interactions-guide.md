# iOS Plan States & Interactions Guide

## Plan Lifecycle States

The lifecycle state is **derived on the client** from the plan's start date — it is NOT stored in the database.

### States

| State | Condition |
|-------|-----------|
| **Draft** | No start date set (`planStartDate` is null) |
| **Scheduled** | Start date is in the future |
| **Active** | Today falls within the 7-day window starting from the start date |
| **Completed** | The 7-day window has passed |

### Field Names by Plan Type

- **Nutrition (Meal Plans)**: `planStartDate`
- **Training (Workout Plans)**: `planStartDate`
- **Wellness (Goal Plans)**: `startDate`

### Generation Status

Plans also have a separate `status` field that tracks AI generation state:
- `generating` — AI is creating the plan
- `pending` — queued for generation
- `ready` — generation complete, plan is usable
- `failed` — generation failed

**Only derive the lifecycle state when `status === "ready"`.**

## Like, Dislike & Regenerate

### Meals
- **Like**: Adds ingredient preferences automatically
- **Dislike**: Triggers an ingredient proposal modal where the user picks which specific ingredients to avoid

### Workout Sessions
- **Like/Dislike**: Simple feedback at the session level (e.g., "Push Day")

### Individual Exercises
- **Like/Dislike**: With an "Avoid" modal on dislike — user chooses "Just Dislike" or "Avoid Completely" (never shows up again)

### Regeneration Budget (Allowances)
- 2 swaps/day for meals
- 1 regen/day for meal days
- 1 regen/day for workout sessions
- 5 total regens per plan lifetime
- 6-hour cooldown after 3 regens within 24 hours

All feedback flows into future AI prompts to make plans progressively more personalized.
