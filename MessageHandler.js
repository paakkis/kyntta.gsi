export default class MessageHandler {
    constructor() {
        this.permanentLocks = new Set();      // messages sent only once
        this.cooldownTimestamps = new Map();  // messages allowed after timeout
        this.activeLocks = new Set();         // per-key async locks to avoid races
    }

    /**
     * Returns true if message was already permanently locked.
     */
    isPermanentlyLocked(key) {
        return this.permanentLocks.has(key);
    }

    /**
     * Set a key as permanently locked
     */
    setPermanentLock(key) {
        this.permanentLocks.add(key);
    }

    /**
     * Returns true if the key is within cooldown window
     */
    isOnCooldown(key, cooldownMs) {
        const lastSent = this.cooldownTimestamps.get(key) || 0;
        return Date.now() - lastSent < cooldownMs;
    }

    /**
     * Set the current time as the last sent time for cooldown tracking
     */
    setCooldown(key) {
        this.cooldownTimestamps.set(key, Date.now());
    }

    /**
     * Run the provided async function only if not already running for that key.
     * Ensures no actions happen across simultaneous requests.
     */
    async withLock(key, fn) {
        if (this.activeLocks.has(key)) return;
        this.activeLocks.add(key);
        try {
            await fn();
        } finally {
            this.activeLocks.delete(key);
        }
    }
}
