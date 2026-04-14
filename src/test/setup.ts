// Vitest setup: install a fake IndexedDB backed by an in-memory store so
// db/repo.ts and lib/events.ts can run under Node. Each test file that
// touches the DB should also reset it between tests — see db/repo.test.ts.
import 'fake-indexeddb/auto';
