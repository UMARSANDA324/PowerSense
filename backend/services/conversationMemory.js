// In-memory conversation memory storage
const memoryStore = new Map();

const EXPIRE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const createEmptyMemory = () => ({
  currentFeeder: null,
  currentArea: null,
  currentIntent: null,
  currentOutage: null,
  currentMaintenance: false,
  lastPrediction: null,
  lastResponseType: null,
  lastQuestion: null,
  timestamp: null
});

/**
 * Retrieves memory for a specific user session, handling automatic expiration.
 */
export const getMemory = (userId) => {
  if (!userId) return createEmptyMemory();
  
  const key = userId.toString();
  const memory = memoryStore.get(key);
  
  if (memory) {
    if (Date.now() - memory.timestamp > EXPIRE_TIMEOUT_MS) {
      console.log("\n[AI MEMORY EXPIRED]\n");
      memoryStore.delete(key);
      return createEmptyMemory();
    }
    return memory;
  }
  
  return createEmptyMemory();
};

/**
 * Updates memory for a user session.
 */
export const updateMemory = (userId, updates) => {
  if (!userId) return;
  
  const key = userId.toString();
  const current = getMemory(key);
  
  const updated = {
    ...current,
    ...updates,
    timestamp: Date.now()
  };
  
  memoryStore.set(key, updated);
};

/**
 * Outputs debug logs for conversational memory state.
 */
export const logMemoryDebug = (userId) => {
  if (!userId) return;
  const mem = getMemory(userId);
  
  console.log("\n==================================================");
  console.log("[AI MEMORY DEBUG]");
  console.log(`Current Feeder: ${mem.currentFeeder || "None"}`);
  console.log(`Current Area: ${mem.currentArea || "None"}`);
  console.log(`Current Intent: ${mem.currentIntent || "None"}`);
  console.log(`Current Maintenance: ${mem.currentMaintenance ? "TRUE" : "FALSE"}`);
  console.log(`Last Response: ${mem.lastResponseType || "None"}`);
  console.log("==================================================\n");
};

/**
 * Clears the user's conversational memory session.
 */
export const clearMemory = (userId) => {
  if (!userId) return;
  memoryStore.delete(userId.toString());
};

export default { getMemory, updateMemory, logMemoryDebug, clearMemory };
