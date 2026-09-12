const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('='.repeat(90));
console.log('CHAKRA & PRANGARA DATASET — CRYPTOGRAPHIC AUTHENTICITY & INTEGRITY VERIFICATION');
console.log('='.repeat(90));
console.log(`Execution Time: ${new Date().toISOString()}`);
console.log('Auditing primary sources against registered SHA-256 checksums...\n');

const projectRoot = path.resolve(__dirname, '..');
const checksumsPath = path.join(projectRoot, 'data', 'metadata', 'source_checksums.json');
const manifestPath = path.join(projectRoot, 'data', 'metadata', 'download_manifest.csv');
const registryPath = path.join(projectRoot, 'data', 'metadata', 'source_registry.json');

if (!fs.existsSync(checksumsPath)) {
  console.error(`ERROR: Checksums file not found at: ${checksumsPath}`);
  process.exit(1);
}

const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, 'utf8')) : [];

const registryMap = {};
for (const entry of registry) {
  if (entry.raw_file) {
    registryMap[entry.raw_file.replace(/\\/g, '/')] = entry;
  }
}

let totalFiles = 0;
let passedFiles = 0;
let failedFiles = 0;
let missingFiles = 0;

const results = [];

for (const [relPath, expectedSha256] of Object.entries(checksums)) {
  totalFiles++;
  const fullPath = path.join(projectRoot, relPath);
  const normalizedRel = relPath.replace(/\\/g, '/');
  const regEntry = registryMap[normalizedRel] || {};

  if (!fs.existsSync(fullPath)) {
    missingFiles++;
    results.push({
      file: path.basename(relPath),
      authority: regEntry.authority_class || 'UNKNOWN',
      agency: regEntry.agency ? regEntry.agency.substring(0, 24) : 'N/A',
      status: 'MISSING',
      shaMatch: false
    });
    continue;
  }

  const fileBytes = fs.readFileSync(fullPath);
  const computedSha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const isMatch = computedSha256.toLowerCase() === expectedSha256.toLowerCase();

  if (isMatch) {
    passedFiles++;
    results.push({
      file: path.basename(relPath),
      authority: regEntry.authority_class || 'VERIFIED',
      agency: regEntry.agency ? regEntry.agency.substring(0, 24) : 'N/A',
      status: 'VERIFIED_OK',
      shaMatch: true,
      sizeBytes: fileBytes.length,
      hashPrefix: `${computedSha256.substring(0, 8)}...${computedSha256.substring(56)}`
    });
  } else {
    failedFiles++;
    results.push({
      file: path.basename(relPath),
      authority: regEntry.authority_class || 'MISMATCH',
      agency: regEntry.agency ? regEntry.agency.substring(0, 24) : 'N/A',
      status: 'HASH_MISMATCH',
      shaMatch: false,
      sizeBytes: fileBytes.length,
      expected: expectedSha256,
      computed: computedSha256
    });
  }
}

console.log('| File Name                                      | Agency / Publisher       | Size (Bytes) | Hash (SHA-256 Prefix)   | Status        |');
console.log('|------------------------------------------------|--------------------------|--------------|-------------------------|---------------|');

for (const r of results) {
  const fileNameCol = r.file.padEnd(46);
  const agencyCol = (r.agency || '').padEnd(24);
  const sizeCol = String(r.sizeBytes || 0).padStart(12);
  const hashCol = (r.hashPrefix || 'MISMATCH').padEnd(23);
  const statusCol = r.status.padEnd(13);
  console.log(`| ${fileNameCol} | ${agencyCol} | ${sizeCol} | ${hashCol} | [${statusCol}] |`);
}

console.log('\n' + '='.repeat(90));
console.log('AUTHENTICITY AUDIT SUMMARY');
console.log('='.repeat(90));
const passRate = totalFiles > 0 ? ((passedFiles / totalFiles) * 100).toFixed(1) : '0.0';
console.log(`Total Source Files Checked : ${totalFiles}`);
console.log(`Cryptographically Verified : ${passedFiles} (${passRate}% Pass Rate)`);
console.log(`Hash Mismatches / Tampered : ${failedFiles}`);
console.log(`Missing Files              : ${missingFiles}`);

if (failedFiles === 0 && missingFiles === 0) {
  console.log('\nRESULT: ALL PRIMARY SOURCE FILES ARE CRYPTOGRAPHICALLY AUTHENTIC AND UNTAMPERED.\n');
  process.exit(0);
} else {
  console.error('\nRESULT: INTEGRITY FAILURE DETECTED.\n');
  process.exit(1);
}
