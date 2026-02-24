# iOS Like/Dislike, Regeneration & Preferences Guide

## Meal Feedback System

### Fingerprint Generation
Meals are identified by a "fingerprint" composed of: `slugified-name|slugified-cuisine|first-key-ingredient`

```typescript
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function computeMealFingerprint(name: string, cuisineTag?: string, ingredients?: any[]): string {
  const slugName = slugify(name);
  const slugCuisine = cuisineTag ? slugify(cuisineTag) : "";
  let firstIngredient = "";
  if (Array.isArray(ingredients) && ingredients.length > 0) {
    const raw = typeof ingredients[0] === "string" ? ingredients[0] : ingredients[0]?.item || "";
    firstIngredient = slugify(raw);
  }
  return [slugName, slugCuisine, firstIngredient].filter(Boolean).join("|");
}
```

### Like Flow
1. Compute fingerprint
2. POST `/api/feedback/meal` with `{ fingerprint, feedback: "like", mealName, cuisineTag }`
3. Backend automatically saves ingredient preferences (e.g., "prefer chicken")

### Dislike Flow
1. Compute fingerprint
2. POST `/api/feedback/meal` with `{ fingerprint, feedback: "dislike", mealName, cuisineTag }`
3. Response includes `{ proposalId, ingredients: string[] }`
4. Show modal: "Which ingredients didn't you like?" with checkboxes
5. Resolve: POST `/api/ingredient-proposals/:proposalId/resolve` with `{ selectedIngredients: string[] }`

## Exercise Feedback System

### Key Generation
Exercise names are converted to underscored keys:
```typescript
function toExerciseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
// "Barbell Back Squat" → "barbell_back_squat"
```

### Like Flow
1. POST `/api/preferences/exercise` with `{ key, exerciseName, feedback: "like" }`
2. Toggle off (un-like): DELETE `/api/preferences/exercise/key/:key`

### Dislike Flow
1. Show modal with two options:
   - "Just Dislike" → `{ key, exerciseName, feedback: "dislike", avoid: false }`
   - "Avoid Completely" → `{ key, exerciseName, feedback: "dislike", avoid: true }`
2. POST `/api/preferences/exercise` with chosen option
3. Toggle off (un-dislike): DELETE `/api/preferences/exercise/key/:key`

## Regeneration Budget

| Resource | Allowance |
|----------|-----------|
| Meal swaps | 2/day |
| Meal day regens | 1/day |
| Workout session regens | 1/day |
| Plan regens | 5/plan lifetime |
| Cooldown | 6 hours after 3 regens in 24h |

## Preferences Pages

### Meal Preferences
- GET `/api/preferences` → `{ likedMeals, dislikedMeals, avoidIngredients, preferIngredients }`
- DELETE `/api/preferences/meal/:id`
- DELETE `/api/preferences/ingredient/:id`

### Exercise Preferences
- GET `/api/preferences/exercise` → `{ liked, disliked, avoided }`
- DELETE `/api/preferences/exercise/:id`
- DELETE `/api/preferences/exercise/key/:key`

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/feedback/meal` | POST | Submit meal like/dislike with fingerprint |
| `/api/ingredient-proposals/:id/resolve` | POST | Resolve ingredient proposal from dislike |
| `/api/preferences/exercise` | POST | Submit exercise like/dislike |
| `/api/preferences/exercise/key/:key` | DELETE | Remove exercise preference by key |
| `/api/preferences` | GET | Fetch all meal preferences |
| `/api/preferences/exercise` | GET | Fetch all exercise preferences |
| `/api/preferences/meal/:id` | DELETE | Remove meal preference by ID |
| `/api/preferences/ingredient/:id` | DELETE | Remove ingredient preference by ID |
| `/api/preferences/exercise/:id` | DELETE | Remove exercise preference by ID |
