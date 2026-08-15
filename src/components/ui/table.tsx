"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Tabelas longas (ex: Clientes com 100+ linhas) empurram a barra de
// rolagem horizontal nativa lá pro fim da tabela — o usuário precisa
// descer a página inteira só pra conseguir rolar pros lados e ver
// colunas/botões escondidos. Essa barra espelhada no topo resolve isso,
// só aparecendo quando a tabela realmente não cabe na largura disponível.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  const topoRef = React.useRef<HTMLDivElement>(null)
  const baixoRef = React.useRef<HTMLDivElement>(null)
  const origemSync = React.useRef<"topo" | "baixo" | null>(null)
  const [scrollWidth, setScrollWidth] = React.useState(0)
  const [temOverflow, setTemOverflow] = React.useState(false)

  React.useEffect(() => {
    const baixo = baixoRef.current
    if (!baixo) return

    const atualizar = () => {
      setScrollWidth(baixo.scrollWidth)
      setTemOverflow(baixo.scrollWidth > baixo.clientWidth + 1)
    }
    atualizar()

    const observer = new ResizeObserver(atualizar)
    observer.observe(baixo)
    return () => observer.disconnect()
  }, [])

  return (
    <div data-slot="table-container" className="w-full">
      {temOverflow && (
        <div
          ref={topoRef}
          className="overflow-x-auto overflow-y-hidden [scrollbar-color:var(--muted-foreground)_var(--muted)] [scrollbar-width:auto] [&::-webkit-scrollbar]:h-4 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground"
          style={{ height: 16 }}
          onScroll={() => {
            if (origemSync.current === "baixo") {
              origemSync.current = null
              return
            }
            origemSync.current = "topo"
            if (baixoRef.current && topoRef.current) {
              baixoRef.current.scrollLeft = topoRef.current.scrollLeft
            }
          }}
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      )}
      <div
        ref={baixoRef}
        className="relative w-full overflow-x-auto"
        onScroll={() => {
          if (origemSync.current === "topo") {
            origemSync.current = null
            return
          }
          origemSync.current = "baixo"
          if (baixoRef.current && topoRef.current) {
            topoRef.current.scrollLeft = baixoRef.current.scrollLeft
          }
        }}
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
