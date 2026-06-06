import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, CheckCircle2, Clock3, ListTodo } from 'lucide-react';

import { HeaderStat } from '@/components/layout/header-stat';
import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow
} from '@/components/tables/admin-table';
import { TableCard } from '@/components/tables/table-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getIngredientReviewPath } from '@/server/ingredients/review-path';
import { getRecipeDetail } from '@/server/recipes/list-recipes';

export const dynamic = 'force-dynamic';

function getStatusBadgeVariant(status: 'linked' | 'pantry' | 'unlinked') {
  if (status === 'linked') {
    return 'default';
  }

  if (status === 'pantry') {
    return 'secondary';
  }

  return 'outline';
}

function getStatusLabel(status: 'linked' | 'pantry' | 'unlinked') {
  if (status === 'linked') {
    return 'Linked';
  }

  if (status === 'pantry') {
    return 'Pantry';
  }

  return 'Unlinked';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatIngredientAmount(quantity: number | null, unit: string | null) {
  if (quantity === null && !unit) {
    return 'No quantity';
  }

  if (quantity === null) {
    return unit ?? 'No quantity';
  }

  return unit ? `${quantity} ${unit}` : String(quantity);
}

function formatRecipeCountry(source: string, country: string | null) {
  if (!country) {
    return null;
  }

  if (source === 'everyplate' && country === 'AO') {
    return 'Australia';
  }

  return country;
}

function formatServingSize(source: string, servingSize: number | null) {
  if (servingSize === null) {
    return 'Unknown';
  }

  if (source === 'everyplate') {
    return `${servingSize} g`;
  }

  return String(servingSize);
}

function formatIngredientMeta(ingredient: {
  source: string;
  familyName: string | null;
  ingredientCountry: string | null;
  ingredientSlug: string | null;
  ingredientType: string | null;
  shipped: boolean;
}) {
  return [
    ingredient.ingredientType,
    ingredient.familyName,
    formatRecipeCountry(ingredient.source, ingredient.ingredientCountry),
    ingredient.ingredientSlug ? `slug:${ingredient.ingredientSlug}` : null,
    ingredient.shipped ? 'shipped' : null
  ]
    .filter(Boolean)
    .join(' · ');
}

function StepMediaGallery({
  images,
  videos
}: {
  images: Array<{ url: string; caption: string | null }>;
  videos: Array<{ url: string; caption: string | null }>;
}) {
  if (images.length === 0 && videos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {images.map((image) => (
        <figure className="space-y-2" key={image.url}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted/30">
            <Image alt={image.caption ?? 'Instruction step image'} className="object-cover" fill sizes="(max-width: 768px) 100vw, 33vw" src={image.url} />
          </div>
          {image.caption ? <figcaption className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{image.caption}</figcaption> : null}
        </figure>
      ))}
      {videos.map((video) => (
        <figure className="space-y-2" key={video.url}>
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
            <video className="aspect-[4/3] w-full" controls preload="metadata" src={video.url}>
              <track kind="captions" label="No captions available" srcLang="en" />
            </video>
          </div>
          {video.caption ? <figcaption className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{video.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function RecipeSourceMeta({
  source,
  description,
  servingSize
}: {
  source: string;
  description: string | null;
  servingSize: number | null;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-5 rounded-3xl border border-border bg-muted/20 p-5">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Description</p>
        <p className="text-sm leading-6 text-foreground">{description ?? 'No description captured for this recipe.'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Serving size</p>
          <p className="text-sm text-foreground">{formatServingSize(source, servingSize)}</p>
        </div>
      </div>
    </div>
  );
}

export default async function RecipeDetailPage({
  params
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const result = await getRecipeDetail(recipeId);

  if (result.status === 'ready' && !result.data) {
    notFound();
  }

  const recipe = result.data;

  if (!recipe) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Use this screen to see which ingredients already have linked products and which ones still need linking before the recipe is fully covered."
          eyebrow="Recipes"
          title="Recipe detail"
        />
        <SetupNotice errorMessage={result.errorMessage} status={result.status} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Recipes</p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{recipe.name}</h1>
              <p className="text-sm text-muted-foreground">{recipe.headline ?? 'No headline'}</p>
              <p className="break-all text-sm text-muted-foreground">
                Slug: {recipe.slug ?? 'No slug'}
                {' · '}
                External id: {recipe.externalId}
              </p>
              <p className="text-sm text-muted-foreground">Updated {formatDate(recipe.updatedAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="uppercase" variant="outline">{recipe.source}</Badge>
            <Badge variant="outline">{recipe.servings ?? '-'} servings</Badge>
            <Badge variant="outline">Prep {recipe.prepMinutes ?? '-'} min</Badge>
            <Badge variant="outline">Total {recipe.totalMinutes ?? '-'} min</Badge>
            <Badge variant="outline">Difficulty {recipe.difficulty ?? '-'}</Badge>
            <Badge variant={recipe.coverage.unlinkedIngredients === 0 ? 'default' : 'outline'}>
              {recipe.coverage.unlinkedIngredients === 0 ? 'Fully covered' : 'Coverage gap detected'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <HeaderStat icon={BookOpen} label="Ingredients" value={recipe.coverage.ingredientCount} />
            <HeaderStat icon={CheckCircle2} label="Covered" value={recipe.coverage.linkedIngredients} />
            <HeaderStat icon={Clock3} label="Unlinked" value={recipe.coverage.unlinkedIngredients} />
            <HeaderStat icon={ListTodo} label="Coverage" value={`${recipe.coverage.linkedIngredients}/${recipe.coverage.ingredientCount}`} />
          </div>
        </div>

        <Link
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href="/recipes"
        >
          Back to recipes
        </Link>
      </div>

      <SetupNotice errorMessage={result.errorMessage} status={result.status} />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Recipe details</CardTitle>
              <CardDescription>Created {formatDate(recipe.createdAt)}</CardDescription>
            </div>
            {recipe.websiteUrl ? (
              <Button asChild variant="outline">
                <a href={recipe.websiteUrl} rel="noreferrer" target="_blank">
                  Open recipe source
                </a>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-border bg-muted/30">
                {recipe.imageUrl ? (
                  <Image alt={recipe.name} className="object-cover" fill sizes="160px" src={recipe.imageUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">No image</div>
                )}
              </div>
              <RecipeSourceMeta
                description={recipe.description}
                servingSize={recipe.servingSize}
                source={recipe.source}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instructions</CardTitle>
            <CardDescription>Imported preparation steps stored alongside the recipe record.</CardDescription>
          </CardHeader>
          <CardContent>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No instructions were imported for this recipe.</p>
            ) : (
              <ol className="space-y-3">
                {recipe.steps.map((step) => (
                  <li className="rounded-2xl border border-border bg-muted/20 p-4" key={step.stepNumber}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Step {step.stepNumber}</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{step.instructions}</p>
                      </div>
                      <StepMediaGallery images={step.imageAssets} videos={step.videoAssets} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <TableCard
          description="Each ingredient row shows whether the recipe is covered by a product link, marked as pantry, or still needs linking."
          title="Ingredient coverage"
        >
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableHead>Ingredient</AdminTableHead>
                <AdminTableHead>Amount</AdminTableHead>
                <AdminTableHead>Source metadata</AdminTableHead>
                <AdminTableHead>Linked products</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead className="w-[160px]">Action</AdminTableHead>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {recipe.ingredients.length === 0 ? (
                <AdminTableEmptyState colSpan={6}>No recipe ingredients were found for this row.</AdminTableEmptyState>
              ) : (
                recipe.ingredients.map((ingredient) => (
                  <AdminTableRow key={ingredient.id}>
                    <AdminTableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{ingredient.rawName}</p>
                        <p className="text-xs text-muted-foreground">{ingredient.handle}</p>
                        {ingredient.externalId ? <p className="text-xs text-muted-foreground">External id: {ingredient.externalId}</p> : null}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className="text-sm text-muted-foreground">
                      {formatIngredientAmount(ingredient.quantity, ingredient.unit)}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm text-muted-foreground">
                      {formatIngredientMeta({ ...ingredient, source: recipe.source }) || 'No additional source metadata'}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm text-muted-foreground">
                      {ingredient.linkedProducts.length}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge className="px-2.5" variant={getStatusBadgeVariant(ingredient.status)}>{getStatusLabel(ingredient.status)}</Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <Button asChild size="sm" variant={ingredient.status === 'unlinked' ? 'default' : 'outline'}>
                        <Link href={getIngredientReviewPath({ source: recipe.source, handle: ingredient.handle })}>
                          {ingredient.status === 'linked'
                            ? 'Manage links'
                            : ingredient.status === 'pantry'
                              ? 'Review pantry'
                              : 'Open linking'}
                        </Link>
                      </Button>
                    </AdminTableCell>
                  </AdminTableRow>
                ))
              )}
            </AdminTableBody>
          </AdminTable>
        </TableCard>
      </div>
    </div>
  );
}