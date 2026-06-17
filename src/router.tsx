import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    basepath: '/traffic-beta',
    context: { queryClient },
    defaultPreload: 'intent',
    stringifySearch: (search) => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(search)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      }
      return params.toString() ? `?${params.toString()}` : ''
    },
    parseSearch: (searchStr) => {
      const params = new URLSearchParams(searchStr)
      const result: Record<string, string> = {}
      params.forEach((v, k) => { result[k] = v })
      return result
    },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
