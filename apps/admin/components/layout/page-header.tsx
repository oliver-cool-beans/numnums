type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}