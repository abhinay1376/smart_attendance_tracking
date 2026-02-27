import type { Request, Response, NextFunction } from 'express'

/**
 * Centralised error handler — must be the last `app.use()` call.
 *
 * Logs the full stack in development; returns a sanitised JSON body
 * in all environments so the client always gets consistent error shapes.
 */
export function errorHandler(
  err:  unknown,
  req:  Request,
  res:  Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV !== 'production'

  if (err instanceof Error) {
    if (isDev) {
      console.error('[ERROR]', err.stack)
    } else {
      console.error('[ERROR]', err.message)
    }

    res.status(500).json({
      message: isDev ? err.message : 'Internal server error',
      ...(isDev && { stack: err.stack }),
    })
    return
  }

  // Fallback for non-Error throws
  res.status(500).json({ message: 'Unknown error' })
}

/**
 * 404 handler — mount after all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
}
