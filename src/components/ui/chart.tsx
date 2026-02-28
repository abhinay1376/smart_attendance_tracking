/**
 * chart.tsx – shadcn/ui Chart primitives
 * Thin wrapper over recharts that wires CSS custom property theming.
 *
 * Usage:
 *   const config = { present: { label: 'Present', color: '#6366f1' } }
 *   <ChartContainer config={config}>
 *     <BarChart data={data}>
 *       <Bar dataKey="present" fill="var(--color-present)" />
 *       <ChartTooltip content={<ChartTooltipContent />} />
 *     </BarChart>
 *   </ChartContainer>
 */

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/utils/helpers'

// ─── Config type ──────────────────────────────────────────────────────────────

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; color?: string; icon?: React.ComponentType }
>

// ─── Context ──────────────────────────────────────────────────────────────────

const ChartContext = React.createContext<{ config: ChartConfig }>({ config: {} })

function useChart() {
  return React.useContext(ChartContext)
}

// ─── ChartContainer ───────────────────────────────────────────────────────────

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uid = React.useId()
  const chartId = `chart-${id ?? uid.replace(/:/g, '')}`

  // Inject CSS custom properties for each color key
  const styleContent = Object.entries(config)
    .filter(([, c]) => c.color)
    .map(([key, c]) => `  --color-${key}: ${c.color};`)
    .join('\n')

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          'flex aspect-video justify-center text-xs',
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
          '[&_.recharts-cartesian-grid_line]:stroke-border/50',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
          '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
          '[&_.recharts-sector[stroke="#fff"]]:stroke-transparent',
          '[&_.recharts-surface]:outline-none',
          className,
        )}
        {...props}
      >
        {styleContent && (
          <style>{`[data-chart="${chartId}"] {\n${styleContent}\n}`}</style>
        )}
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = 'ChartContainer'

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

export const ChartTooltip = RechartsPrimitive.Tooltip

export interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{
    color?: string
    name?: string
    value?: unknown
    dataKey?: string
    payload?: Record<string, unknown>
  }>
  label?: string
  className?: string
  hideLabel?: boolean
  indicator?: 'dot' | 'line'
  nameKey?: string
  formatter?: (value: unknown, name: string) => React.ReactNode
}

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      className,
      hideLabel = false,
      indicator = 'dot',
      nameKey,
    },
    ref,
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) return null

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className,
        )}
      >
        {!hideLabel && label && (
          <div className="font-medium">{label}</div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = nameKey ?? (item.dataKey as string) ?? (item.name as string) ?? 'value'
            const cfgEntry = config[key]
            const color = item.color

            return (
              <div
                key={index}
                className={cn(
                  'flex w-full items-center gap-2',
                  indicator === 'dot' ? 'items-center' : 'items-stretch',
                )}
              >
                {indicator === 'dot' ? (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ) : (
                  <span
                    className="w-1 shrink-0 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                )}
                <div className="flex flex-1 justify-between gap-2 leading-none">
                  <span className="text-muted-foreground">
                    {cfgEntry?.label ?? item.name}
                  </span>
                  {item.value !== undefined && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {typeof item.value === 'number'
                        ? item.value.toLocaleString()
                        : String(item.value)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

// ─── ChartLegend ──────────────────────────────────────────────────────────────

export const ChartLegend = RechartsPrimitive.Legend

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    payload?: Array<{ value?: string; color?: string; dataKey?: string }>
    verticalAlign?: 'top' | 'bottom'
    nameKey?: string
  }
>(({ className, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload.map((item) => {
        const key = nameKey ?? item.dataKey ?? item.value ?? ''
        const cfgEntry = config[key]
        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">
              {cfgEntry?.label ?? item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = 'ChartLegendContent'
