import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 250;

export default function useGmGenerationPreview(spec, includePreview) {
  const [result, setResult] = useState({
    pending: true,
    encounter: null,
    previewUrl: "",
    previewSpec: null,
    error: null,
  });
  const sequenceRef = useRef(0);
  const mountedRef = useRef(false);
  const workerRef = useRef(null);
  const inFlightRef = useRef(null);
  const queuedRef = useRef(null);
  const fallbackOnlyRef = useRef(false);

  const complete = useCallback((task, output = {}) => {
    if (!mountedRef.current || task.id !== sequenceRef.current) return;
    setResult({
      pending: false,
      encounter: output.encounter || null,
      previewUrl: output.previewUrl || "",
      previewSpec: task.spec,
      error: output.error || null,
    });
  }, []);

  // A worker is unavailable in a few embedded browsers. Preserve generation
  // there, but load its heavy dependencies only if the fallback is needed.
  const fallback = useCallback(async (task) => {
    try {
      const { computeGmGeneration } = await import("../utils/gmGenerationTasks.js");
      if (!mountedRef.current || task.id !== sequenceRef.current) return;
      complete(task, computeGmGeneration(task.spec, task.includePreview));
    } catch (error) {
      complete(task, { error: error?.message || "GM generator failed" });
    }
  }, [complete]);

  const dispatch = useCallback((task) => {
    const worker = workerRef.current;
    if (!worker) {
      fallback(task);
      return;
    }
    inFlightRef.current = task;
    try {
      worker.postMessage(task);
    } catch {
      inFlightRef.current = null;
      fallbackOnlyRef.current = true;
      worker.terminate();
      workerRef.current = null;
      fallback(task);
    }
  }, [fallback]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
      workerRef.current?.terminate();
      workerRef.current = null;
      inFlightRef.current = null;
      queuedRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = ++sequenceRef.current;
    // Stale enemy counts and backgrounds must not be shown for new inputs.
    setResult((previous) => ({ ...previous, pending: true, previewUrl: "", error: null }));

    const timer = window.setTimeout(() => {
      if (!mountedRef.current || id !== sequenceRef.current) return;
      const task = { id, spec, includePreview: Boolean(includePreview) };
      if (fallbackOnlyRef.current || typeof Worker !== "function") {
        fallback(task);
        return;
      }
      if (!workerRef.current) {
        try {
          const worker = new Worker(new URL("../workers/gmGeneration.worker.js", import.meta.url), { type: "module" });
          worker.onmessage = ({ data }) => {
            const finished = inFlightRef.current;
            inFlightRef.current = null;
            if (finished?.id === data?.id) complete(finished, data);
            // Coalesce rapid slider and form changes; run only the latest task.
            const queued = queuedRef.current;
            queuedRef.current = null;
            if (queued?.id === sequenceRef.current) dispatch(queued);
          };
          worker.onerror = (event) => {
            event.preventDefault?.();
            fallbackOnlyRef.current = true;
            worker.terminate();
            workerRef.current = null;
            const latest = queuedRef.current?.id === sequenceRef.current
              ? queuedRef.current
              : inFlightRef.current;
            queuedRef.current = null;
            inFlightRef.current = null;
            if (latest?.id === sequenceRef.current) fallback(latest);
          };
          workerRef.current = worker;
        } catch {
          fallbackOnlyRef.current = true;
          fallback(task);
          return;
        }
      }
      if (inFlightRef.current) queuedRef.current = task;
      else dispatch(task);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [spec, includePreview, complete, dispatch, fallback]);

  return result;
}
