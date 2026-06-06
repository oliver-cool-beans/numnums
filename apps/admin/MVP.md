# Admin Panel MVP

## Goal

The admin panel exists to safely manage recipe ingredient to retailer product matching.

The public app must only use approved mappings. AI or automated matching may suggest matches, but must never approve them automatically.

---

# MVP Scope

The MVP admin panel should support:

1. Viewing imported products
2. Viewing imported recipes
3. Reviewing unmatched ingredients
4. Linking ingredients to products
5. Managing approved links
6. Reviewing suggested matches

---

# Navigation

```txt
Admin
├── Dashboard
├── Products
├── Recipes
├── Ingredient Review
├── Ingredient Links
└── Match Suggestions
```

---

# Dashboard

## Purpose

Show the current health of the import and matching system.

## Required Metrics

```txt
Total products
Available products
Total recipes
Total recipe ingredients
Unmatched ingredients
Approved ingredient links
Pending suggestions
```

## Useful Alerts

```txt
New unmatched ingredients found
Products no longer available
Approved links pointing to unavailable products
Recipes with missing ingredient mappings
```

---

# Products Page

## Purpose

Browse and inspect imported retailer products.

## Table Columns

```txt
Source
Product Name
Brand
Category
Price
Selling Size
Available
Updated At
```

## Filters

```txt
Source
Available / unavailable
Category
Search by name
```

## Product Detail View

Show:

```txt
Product name
Brand
Source
External ID / SKU
Price
Selling size
Category
Image
Availability
Raw JSON
```

## MVP Actions

```txt
View product
Copy product ID
```

No editing required for MVP. Products should be controlled by the import pipeline.

---

# Recipes Page

## Purpose

Browse imported recipes and inspect their ingredients.

## Table Columns

```txt
Source
Recipe Name
Servings
Prep Time
Cook Time
Ingredient Count
Updated At
```

## Filters

```txt
Source
Search by recipe name
Recipes with unmatched ingredients
```

## Recipe Detail View

Show:

```txt
Recipe name
Source
External ID
Image
Website URL
Servings
Prep time
Cook time
Difficulty
Ingredients
Raw JSON
```

## Ingredient List Columns

```txt
Raw Name
Handle
Quantity
Unit
Match Status
Linked Products
```

---

# Ingredient Review Page

## Purpose

This is the most important MVP screen.

It shows recipe ingredients that do not yet have an approved product link.

## Table Columns

```txt
Source
Raw Name
Handle
Recipe Count
Example Recipe
Status
Created At
```

## Filters

```txt
Source
Status
Search by raw name
Search by handle
```

## Review Detail View

Show:

```txt
Raw ingredient name
Generated handle
Source
Number of recipes using this ingredient
Example recipes
Existing links with same handle from other sources
Suggested product matches
```

## Required Actions

```txt
Search products
Link product
Approve link
Reject ingredient
Mark as needs later
```

## Matching Behaviour

When reviewing an ingredient, the admin should be able to search products and create one or more links.

Example:

```txt
Ingredient:
Garlic

Handle:
garlic

Source:
EveryPlate

Selected Product:
ALDI Garlic Pack

Action:
Approve Link
```

Creates:

```txt
ingredient_product_links
ingredient_source = everyplate
ingredient_handle = garlic
product_id = selected product
status = approved
priority = 1
```

---

# Ingredient Links Page

## Purpose

Manage approved ingredient to product links.

## Table Columns

```txt
Source
Ingredient Handle
Product
Retailer
Priority
Status
Updated At
```

## Filters

```txt
Source
Retailer
Status
Search by ingredient handle
Search by product name
```

## Actions

```txt
View link
Change priority
Disable link
Delete link
Add another product
```

## Notes

Multiple products may be linked to the same ingredient handle.

Example:

```txt
milk
→ ALDI Full Cream Milk 1L
→ ALDI Full Cream Milk 2L
→ ALDI Full Cream Milk 3L
```

Priority determines which product is preferred by default.

---

# Match Suggestions Page

## Purpose

Review AI or rule-generated product suggestions.

Suggestions are not used by the public app until approved.

## Table Columns

```txt
Source
Ingredient Handle
Suggested Product
Confidence
Reason
Created At
```

## Filters

```txt
Source
Confidence
Retailer
Search by ingredient
Search by product
```

## Required Actions

```txt
Approve suggestion
Reject suggestion
Open ingredient review
Open product detail
```

## Approval Behaviour

Approving a suggestion creates an approved ingredient product link.

Rejecting a suggestion keeps the ingredient unmatched unless another approved link exists.

---

# Product Search Component

Used inside Ingredient Review and Match Suggestions.

## Search Fields

```txt
Product name
Brand
Category
Retailer source
Available only
```

## Result Columns

```txt
Product image
Name
Brand
Price
Selling size
Retailer
Available
```

## Actions

```txt
Select product
View raw product data
```

---

# Match Safety Rules

## Rule 1

Do not auto approve matches.

```txt
AI suggestion
≠ approved product link
```

## Rule 2

Same handle from same source can reuse approved mappings.

Example:

```txt
EveryPlate garlic
→ already approved
→ use automatically
```

## Rule 3

Same handle from a different source should be suggested, not automatically approved.

Example:

```txt
EveryPlate tomato_sauce
→ approved

HelloFresh tomato_sauce
→ suggest reuse
→ admin approval required
```

## Rule 4

Unavailable products should not be used in public shopping lists.

If an approved link points to an unavailable product, flag it on the dashboard.

---

# MVP User Flows

## Flow 1: Review New Ingredient

```txt
Open Ingredient Review
Select unmatched ingredient
Search products
Select correct product
Approve link
Ingredient is now usable in shopping lists
```

---

## Flow 2: Approve Suggested Match

```txt
Open Match Suggestions
Review ingredient and suggested product
Check product details
Approve
Approved link is created
```

---

## Flow 3: Fix Unavailable Product Link

```txt
Dashboard alert appears
Open affected ingredient link
Search replacement product
Add replacement link
Disable old link
```

---

## Flow 4: Inspect Recipe Matching

```txt
Open Recipes
Open recipe detail
View ingredients
Check which ingredients are matched
Identify missing mappings
Open Ingredient Review
Approve missing mappings
```

---

# MVP Permissions

For MVP, only admin users need access.

```txt
admin
```

No complex roles required initially.

Later roles may include:

```txt
viewer
editor
admin
```

---

# What Not To Build In MVP

Do not build:

```txt
Bulk automatic approval
Complex role management
Manual product editing
Full audit logs
Recipe editing
Product editing
Advanced analytics
Comment threads
```

These can be added later.

The only critical MVP job is making ingredient to product matching safe and fast.

---

# Definition Of Done

The admin panel MVP is complete when:

```txt
Products can be inspected
Recipes can be inspected
Unmatched ingredients can be reviewed
Products can be linked to ingredients
Approved links are reused by the public app
Suggestions can be approved or rejected
Unavailable product links are visible
```