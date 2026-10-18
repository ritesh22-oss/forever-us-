# Security Specification: Forever Us Romantic Memory Vault

## 1. Data Invariants
1. Only authenticated users with verified credentials can read and write memories, albums, letters, and timeline items.
2. In the private couple vault, all mutations require `request.auth != null`.
3. An unauthenticated user or an attacker cannot read, tamper with, or delete memories or albums.
4. On memory creation, `incoming().uploaderUid == request.auth.uid`.
5. On album creation, `incoming().creatorUid == request.auth.uid`.
6. On love letter creation, `incoming().authorUid == request.auth.uid`.
7. Future-locked letters (`isLockedUntilDate == true`) cannot be read unless the current server time has reached or passed `unlockDate` (enforced in rules or via application gate).
8. Soft-deleted memories (`isDeleted: true`) cannot be purged unless by authorized partner.
9. ID parameters must satisfy regex `^[a-zA-Z0-9_\-]+$` and length <= 128 to prevent path-traversal / resource poisoning.
10. All string sizes must be strictly bounded to prevent denial-of-wallet payload attacks.
11. Settings updates are restricted to authenticated vault members.
12. Blanket reads are forbidden; default-deny is the root match rule.

## 2. The "Dirty Dozen" Payloads (Attacks that MUST fail)
1. **Unauthenticated Read on /memories/{id}**: Attempt by anonymous user to access private couple photos without auth -> REJECTED.
2. **Identity Spoofing on Memory Create**: User A creates a memory document setting `uploaderUid: "victim_user"` -> REJECTED (`incoming().uploaderUid == request.auth.uid`).
3. **ID Poisoning Attack**: An attacker injects a 50KB junk character document ID -> REJECTED (`isValidId(id)`).
4. **Denial of Wallet Payload**: An attacker submits a 2MB caption string -> REJECTED (`data.caption.size() <= 500`).
5. **Shadow Field Injection**: Attempt to inject arbitrary administrative flags or ghost properties -> REJECTED.
6. **Malicious Album Takeover**: Unauthorized user tries to delete another partner's album without auth -> REJECTED.
7. **Future-Letter Leakage**: Non-authorized attempt to bypass unlock date on future locked letters -> REJECTED.
8. **Negative / NaN File Size Attack**: Memory metadata with negative fileSize -> REJECTED (`data.fileSize >= 0`).
9. **Tampered Storage Path**: Injecting paths outside the authorized couple bucket -> REJECTED.
10. **Unbounded Tags Flood**: Uploading an array of 5,000 tags to crash document size -> REJECTED (`data.tags.size() <= 20`).
11. **Orphaned Media Reference**: Document referencing non-existent couple space -> REJECTED.
12. **Blanket Collection Scrape**: Unauthenticated query trying to list all couple spaces -> REJECTED by root default-deny.
