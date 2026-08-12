"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react"

import { cn } from "@/lib/utils"

const DropdownMenu = MenuPrimitive.Root

function DropdownMenuTrigger({
  className,
  ...props
}: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn(className)}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="z-50"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-[10rem] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 px-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
