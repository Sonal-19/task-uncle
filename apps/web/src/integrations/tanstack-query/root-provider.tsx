import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryPersister } from "@/lib/offline/idb";

const DAY = 24 * 60 * 60_000;

/** One client for the app. The sync engine (lib/offline) patches its cache
 * directly, so it lives at module level rather than inside React. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // The sync engine refetches after it has pushed pending changes, so
      // fresh server data never briefly hides them.
      refetchOnReconnect: false,
      // Kept long enough to be saved for offline use.
      gcTime: 7 * DAY,
    },
    // Writes go through the outbox; the few direct ones (login, import)
    // fail fast with "you're offline" instead of waiting silently.
    mutations: { networkMode: "always" },
  },
});

export function getContext() {
  return { queryClient };
}

export function Provider({
  children,
  queryClient,
  onRestored,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
  onRestored?: () => void;
}) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      onSuccess={onRestored}
      persistOptions={{
        persister: queryPersister,
        maxAge: 7 * DAY,
        // A new build may change response shapes: start from a clean cache.
        buster: __APP_VERSION__,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PersistQueryClientProvider>
  );
}
