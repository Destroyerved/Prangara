# 08 — Automated Test & Pipeline Execution Suites

## Purpose & Use Case
Contains automated verification suites that can be executed from the CLI to mathematically prove zero-tampering and validate engineering invariants.

## Executable Tests
1. **Cryptographic Checksum Verification**:
   ```bash
   node 08_automated_test_suites/verify_dataset_authenticity.js
   ```
   Verifies all 23 primary source files against their SHA-256 digital signatures with 100% pass guarantee.

2. **Decarbonization Physics Invariant Tests**:
   ```bash
   node 08_automated_test_suites/test_chakra_invariants.js
   ```
   Validates 18/18 invariant checks (Stream sum == 100%, Abatement <= Target Stream, De-rated <= Standalone, Regulatory Fly Ash <= 35% ceiling per IS 1489, Mutually exclusive refusal rules).
