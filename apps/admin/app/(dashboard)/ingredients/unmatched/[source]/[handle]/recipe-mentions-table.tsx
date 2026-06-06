'use client';

import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow
} from '@/components/tables/admin-table';
import { ServerPagination } from '@/components/tables/server-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IngredientRecipeExample } from '@/server/db/types';

function formatIngredientAmount(quantity: number | null, unit: string | null) {
  if (quantity === null && !unit) {
    return 'No quantity';
  }

  if (quantity === null) {
    return unit ?? 'No quantity';
  }

  return unit ? `${quantity} ${unit}` : String(quantity);
}

export function RecipeMentionsTable({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  nextHref,
  previousHref,
  recipeCount,
  recipeExamples
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextHref: string;
  previousHref: string;
  recipeCount: number;
  recipeExamples: IngredientRecipeExample[];
}) {
  const firstItem = recipeExamples.length === 0 ? 0 : (currentPage - 1) * 10 + 1;
  const lastItem = recipeExamples.length === 0 ? 0 : firstItem + recipeExamples.length - 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recipe mentions</CardTitle>
        <CardDescription>Recipes that still depend on product links for this ingredient.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHead>Recipe</AdminTableHead>
              <AdminTableHead>Ingredient text</AdminTableHead>
              <AdminTableHead>Amount</AdminTableHead>
              <AdminTableHead>Slug</AdminTableHead>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {recipeExamples.length === 0 ? (
              <AdminTableEmptyState colSpan={4}>No recipe mentions were found for this ingredient.</AdminTableEmptyState>
            ) : (
              recipeExamples.map((example) => (
                <AdminTableRow key={example.id}>
                  <AdminTableCell className="font-medium text-foreground">{example.recipeName}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{example.rawName}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">
                    {formatIngredientAmount(example.quantity, example.unit)}
                  </AdminTableCell>
                  <AdminTableCell>
                    {example.recipeSlug ? <Badge variant="outline">{example.recipeSlug}</Badge> : <span className="text-sm text-muted-foreground">No slug</span>}
                  </AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>

        {hasPreviousPage || hasNextPage ? (
          <ServerPagination
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            nextHref={nextHref}
            previousHref={previousHref}
            summary={
              recipeExamples.length === 0
                ? 'No recipe mentions found'
                : `Showing ${firstItem}-${lastItem} of ${recipeCount} recipes`
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}