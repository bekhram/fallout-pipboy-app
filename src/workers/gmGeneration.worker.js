import { computeGmGeneration } from "../utils/gmGenerationTasks.js";

self.onmessage = ({ data }) => {
  const { id, spec, includePreview } = data || {};
  try {
    self.postMessage({ id, ...computeGmGeneration(spec, includePreview) });
  } catch (error) {
    self.postMessage({ id, error: error?.message || "GM generator failed" });
  }
};
