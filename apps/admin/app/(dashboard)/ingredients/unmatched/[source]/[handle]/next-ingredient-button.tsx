'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

import { loadNextIngredientNavigationAction } from './actions';

type NextIngredientButtonProps = {
  deferredKeys: string[];
  handle: string;
  isResolved: boolean;
  source: string;
};

type NextIngredientNavigation = {
  nextReviewPath: string | null;
  deferredNextReviewPath: string | null;
};

const EMPTY_NAVIGATION: NextIngredientNavigation = {
  nextReviewPath: null,
  deferredNextReviewPath: null
};

export function NextIngredientButton({ deferredKeys, handle, isResolved, source }: NextIngredientButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [hasResolvedNavigation, setHasResolvedNavigation] = useState(false);
  const [navigation, setNavigation] = useState<NextIngredientNavigation>(EMPTY_NAVIGATION);
  const requestRef = useRef<Promise<NextIngredientNavigation> | null>(null);

  const loadNavigation = () => {
    if (requestRef.current !== null) {
      return requestRef.current;
    }

    const request = loadNextIngredientNavigationAction({
      source,
      handle,
      deferredKeys
    })
      .then((result) => {
        setNavigation(result);
        setHasResolvedNavigation(true);
        return result;
      })
      .catch(() => {
        setNavigation(EMPTY_NAVIGATION);
        setHasResolvedNavigation(true);
        return EMPTY_NAVIGATION;
      })
      .finally(() => {
        requestRef.current = null;
      });

    requestRef.current = request;

    return request;
  };

  useEffect(() => {
    setNavigation(EMPTY_NAVIGATION);
    setHasResolvedNavigation(false);
    requestRef.current = null;
    void loadNavigation();
  }, [source, handle, deferredKeys]);

  const handleClick = () => {
    if (isPending) {
      return;
    }

    if (!isResolved) {
      setIsConfirmOpen(true);
      return;
    }

    startTransition(async () => {
      const nextNavigation = await loadNavigation();

      if (nextNavigation.nextReviewPath) {
        router.push(nextNavigation.nextReviewPath);
      }
    });
  };

  const handleConfirm = () => {
    if (isPending) {
      return;
    }

    setIsConfirmOpen(false);

    startTransition(async () => {
      const nextNavigation = await loadNavigation();

      if (nextNavigation.deferredNextReviewPath) {
        router.push(nextNavigation.deferredNextReviewPath);
      }
    });
  };

  const nextButtonDisabled = isPending || (hasResolvedNavigation && !navigation.nextReviewPath);
  const confirmButtonDisabled = isPending || (hasResolvedNavigation && !navigation.deferredNextReviewPath);

  return (
    <>
      <Button
        className="w-full sm:w-auto"
        disabled={nextButtonDisabled}
        loading={isPending}
        loadingText="Loading next ingredient"
        onClick={handleClick}
        size="lg"
      >
        Next ingredient
      </Button>

      <Modal
        description="This ingredient does not have any linked products or pantry status yet. Moving on now will leave it unresolved in the current linking pass."
        footer={
          <>
            <Button
              disabled={confirmButtonDisabled}
              loading={isPending}
              loadingText="Loading next ingredient"
              onClick={handleConfirm}
              type="button"
            >
              Continue to next ingredient
            </Button>
            <Button disabled={isPending} onClick={() => setIsConfirmOpen(false)} type="button" variant="outline">
              Stay here
            </Button>
          </>
        }
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        title="Move to the next ingredient?"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Use this when you want to skip ahead without creating any product links or pantry status for the current ingredient.
        </p>
      </Modal>
    </>
  );
}