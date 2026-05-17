import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    "Supabase environment variables are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.";

  console.error(errorMessage);
  throw new Error(errorMessage);
}

const DEFAULT_TIMEOUT_MS = 20000;

function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const cleanup = [];

  if (init.signal?.aborted) {
    controller.abort();
  } else if (init.signal) {
    const abortFromCaller = () => controller.abort();
    init.signal.addEventListener("abort", abortFromCaller, { once: true });
    cleanup.push(() => init.signal.removeEventListener("abort", abortFromCaller));
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    cleanup.forEach((fn) => fn());
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
});
