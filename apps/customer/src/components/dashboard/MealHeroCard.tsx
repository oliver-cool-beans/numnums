"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

type MealHeroCardAvatar = {
  label: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
};

type MealHeroCardProps = {
  imageUrl: string | null;
  title: string;
  eyebrow: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  meta?: ReactNode;
  avatar?: MealHeroCardAvatar;
  footer?: ReactNode;
  imageHeightClassName?: string;
  contentClassName?: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
};

/**
 * The "long card" hero format shared by the current user's "what's on" card
 * and the friends' activity cards: a wide image with an optional avatar badge
 * pinned to its top-right corner, an eyebrow label, a title, and free-form
 * meta/footer slots beneath.
 */
export function MealHeroCard({
  imageUrl,
  title,
  eyebrow,
  eyebrowClassName = "text-[#558B2F]",
  meta,
  avatar,
  footer,
  imageHeightClassName = "h-52 md:h-64",
  contentClassName = "p-5",
  titleClassName = "mt-1.5 text-2xl font-semibold leading-tight text-[#3A2A1F]",
  className = "overflow-hidden rounded-[28px] bg-[#E7F6DF]",
  priority,
  onClick,
}: MealHeroCardProps) {
  const content = (
    <>
      <div className={`relative w-full shrink-0 bg-[#D9CCBB] ${imageHeightClassName}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 390px) 390px, 390px"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
        )}
        {avatar && (
          <div
            title={avatar.title ?? avatar.label}
            style={avatar.style}
            className={
              avatar.className ??
              "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#7CB342] text-sm font-semibold text-white shadow-sm"
            }
          >
            {avatar.label}
          </div>
        )}
      </div>

      <div className={contentClassName}>
        <p className={`text-xs font-semibold uppercase tracking-wider ${eyebrowClassName}`}>{eyebrow}</p>
        <h2 className={titleClassName}>{title}</h2>
        {meta}
        {footer}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`block w-full text-left ${className}`}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
