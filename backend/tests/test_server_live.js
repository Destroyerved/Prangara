/**
 * PRANGARA Unified Server Integration & Live Endpoint Verification Suite
 * Spins up an ephemeral instance of server.js and executes live HTTP requests
 * across all 16+ REST endpoints, verifying 200/201 status codes and response bodies.
 */

const http = require('http');
const assert = require('assert');
const { server } = require('../server');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  return fn()
    .then(() => {
      console.log(`✅ LIVE API PASS: ${name}`);
      passed++;
    })
    .catch(err => {
      console.error(`❌ LIVE API FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    });
}

function makeRequest(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAll() {
  server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    console.log(`Ephemeral Test Server started on port ${port}\n`);

    try {
      await runTest('GET /api/health returns ONLINE with factor & sector counts', async () => {
        const res = await makeRequest(port, '/api/health');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.status, 'ONLINE');
        assert(res.data.factors_count > 0, 'factors_count > 0');
      });

      await runTest('GET /api/sectors returns 10 industrial sectors', async () => {
        const res = await makeRequest(port, '/api/sectors');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.sectors.length, 10);
      });

      await runTest('GET /api/demo/textile_dyeing returns Tirupur hero assessment', async () => {
        const res = await makeRequest(port, '/api/demo/textile_dyeing');
        assert.strictEqual(res.status, 200);
        assert(res.data.footprint.total_footprint.base > 19000);
        assert(res.data.macc.recommendations.length > 0);
      });

      await runTest('POST /api/assess executes deterministic calculation', async () => {
        const res = await makeRequest(port, '/api/assess', 'POST', {
          sector_key: 'foundry_casting',
          annual_production_tonnes: 4500,
          electricity_kwh: 3200000,
          coal_t: 1200
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.footprint.total_footprint.base > 0);
      });

      await runTest('POST /api/assess/scenario returns side-by-side delta', async () => {
        const res = await makeRequest(port, '/api/assess/scenario', 'POST', {
          baseline_profile: {
            sector_key: 'textile_dyeing',
            annual_production_tonnes: 3600,
            electricity_kwh: 4800000
          },
          modifications: {
            electricity_kwh: 3000000
          }
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.net_abatement_tco2e > 0);
        assert(res.data.reduction_percentage > 0);
      });

      await runTest('POST /api/ml/optimize-portfolio generates 5-point Pareto frontier', async () => {
        const res = await makeRequest(port, '/api/ml/optimize-portfolio', 'POST', {
          plant_profile: {
            sector_key: 'textile_dyeing',
            annual_production_tonnes: 3600,
            electricity_kwh: 4800000
          },
          constraints: { max_budget_inr: 30000000 }
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.optimization.pareto_frontier.length, 5);
      });

      await runTest('POST /api/logistics/routes evaluates 4 presets', async () => {
        const res = await makeRequest(port, '/api/logistics/routes', 'POST', {
          origin_gps: [11.0168, 76.9558],
          destination_gps: [13.0827, 80.2707],
          payload_tonnes: 12.0
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.routes.balanced);
      });

      await runTest('POST /api/logistics/pool bundles shipments to cut empty volume', async () => {
        const res = await makeRequest(port, '/api/logistics/pool', 'POST', {
          shipments: [
            { id: 'S1', origin_gps: [11.0, 77.0], dest_gps: [13.0, 80.0], payload_tonnes: 7.0 },
            { id: 'S2', origin_gps: [11.1, 77.1], dest_gps: [13.0, 80.0], payload_tonnes: 8.0 }
          ]
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.trucks_dispatched_after, 1);
      });

      await runTest('POST /api/logistics/backhaul matches available empty capacity', async () => {
        const res = await makeRequest(port, '/api/logistics/backhaul', 'POST', {
          destination_cluster: 'Chennai Port',
          empty_truck_capacity_tonnes: 18.0
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.matched_backhauls_count > 0);
      });

      await runTest('POST /api/marketplace/rank-materials applies carbon-delta penalty', async () => {
        const res = await makeRequest(port, '/api/marketplace/rank-materials', 'POST', {
          buyer_gps: [11.1085, 77.3411],
          target_stream_key: 'cotton'
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.ranked_materials.length > 0);
      });

      await runTest('GET /api/marketplace/listings returns materials and ESCO services', async () => {
        const res = await makeRequest(port, '/api/marketplace/listings');
        assert.strictEqual(res.status, 200);
        assert(res.data.listings.length > 0);
      });

      await runTest('POST /api/marketplace/rfq submits RFQ and generates quote estimates', async () => {
        const res = await makeRequest(port, '/api/marketplace/rfq', 'POST', {
          intervention_id: 'INT-WHR-01',
          budget_inr: 3000000,
          target_abatement_tco2e: 400
        });
        assert.strictEqual(res.status, 201);
        assert(res.data.quotes.length > 0);
      });

      await runTest('POST /api/rag/ask retrieves statutory clauses with SHA-256 signatures', async () => {
        const res = await makeRequest(port, '/api/rag/ask', 'POST', {
          query: 'electricity grid factor'
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.results.length > 0);
        assert.strictEqual(res.data.results[0].citation.sha256_hash.length, 64);
      });

      await runTest('GET /api/compliance/cases returns active statutory cases', async () => {
        const res = await makeRequest(port, '/api/compliance/cases');
        assert.strictEqual(res.status, 200);
        assert(res.data.compliance_cases.length > 0);
      });

      await runTest('POST /api/data-quality/score computes composite DQI score', async () => {
        const res = await makeRequest(port, '/api/data-quality/score', 'POST', {
          activity_entries: [
            { stream_key: 'electricity', has_meter_bill: true, has_lab_certificate: true },
            { stream_key: 'coal', has_meter_bill: true, has_lab_certificate: false }
          ]
        });
        assert.strictEqual(res.status, 200);
        assert(res.data.overall_dqi_score >= 80);
      });

      await runTest('GET /api/corpus returns verified cryptographic proofs manifest', async () => {
        const res = await makeRequest(port, '/api/corpus');
        assert.strictEqual(res.status, 200);
        assert(res.data.registered_sources_count > 0);
      });

    } finally {
      server.close(() => {
        console.log('\n' + '='.repeat(75));
        console.log(`LIVE SERVER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log('='.repeat(75));
        if (failed > 0) process.exit(1);
        else process.exit(0);
      });
    }
  });
}

runAll();
