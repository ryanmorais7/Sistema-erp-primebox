import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  action?: ReactNode;
  dataCy?: string;
};

export function PageHeader({ title, action, dataCy }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-mono text-[0.7rem] tracking-widest text-brand uppercase">
          PrimeBox ERP
        </p>
        <h1 className="text-2xl font-semibold tracking-tight" data-cy={dataCy}>
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
