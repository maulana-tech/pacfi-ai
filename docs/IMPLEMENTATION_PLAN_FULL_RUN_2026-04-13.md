# Implementation Plan - Full Run Readiness (2026-04-13)

## Objective

Mencapai kondisi aplikasi fully running secara fungsional, operasional, dan maintainable.

## Prinsip Eksekusi

1. Tutup gap user-facing dulu (data real, bukan mock).
2. Kunci jalur bisnis utama dengan automated tests.
3. Stabilkan operasi (observability, fallback, runbook).
4. Sinkronkan dokumentasi terakhir setelah implementasi stabil.

## Milestone Plan

## Milestone 1 - Live Data Completion (P0)

Target: seluruh halaman utama tidak bergantung pada mock default.

### Scope

1. Portfolio page:

- Buat endpoint backend untuk portfolio summary, equity curve, allocation, performance metrics.
- Ganti data statis di frontend dengan fetch live.

2. Swarm page:

- Tambahkan endpoint swarm run history + decision history.
- Pindahkan MOCK_CYCLES ke backend generated or stored result.
- Gunakan fallback idle state, bukan synthetic mock decision.

### Deliverables

1. PortfolioContent live API-ready.
2. SwarmContent live API-ready.
3. API contract doc untuk endpoint baru.

### Acceptance Criteria

1. Reload halaman tidak lagi menghasilkan data acak/random lokal.
2. Empty state jelas saat belum ada data real.
3. Error state dengan retry tersedia di dua halaman.

## Milestone 2 - End-to-End Core Flow Tests (P0)

Target: jalur paling kritis tervalidasi otomatis.

### Scope

1. Unit tests:

- signing payload builder
- wallet header validation
- mapper response dashboard/leaderboard

2. Integration tests (backend):

- orders create-market/create-limit validasi input
- dashboard endpoints envelope + shape
- builder workflow basic success/failure

3. E2E smoke (frontend + backend local):

- wallet state detected
- place order flow request payload
- dashboard refresh menampilkan perubahan

### Deliverables

1. Test framework terpasang dan script test aktif di root.
2. Pipeline lokal: type-check + test pass.

### Acceptance Criteria

1. Minimal 1 skenario sukses + 1 skenario gagal pada setiap domain utama.
2. Build gagal jika regression di flow inti.

## Milestone 3 - Reliability and Operational Hardening (P1)

Target: aplikasi tahan terhadap error eksternal dan mudah dioperasikan.

### Scope

1. Standardize timeout/retry untuk seluruh backend call ke Pacifica.
2. Structured logs dengan request correlation id.
3. Health endpoint ditingkatkan dengan dependency check (DB + Pacifica reachability ringan).
4. Error catalog untuk frontend notification yang konsisten.

### Deliverables

1. Shared utility untuk external request policy.
2. Logging guideline + contoh log format.
3. Operational troubleshooting section yang update.

### Acceptance Criteria

1. Error eksternal tidak menghasilkan crash/noisy stack trace tanpa konteks.
2. Incident diagnosis dapat dilakukan dari log dan health endpoint.

## Milestone 4 - Documentation and Runbook Alignment (P1)

Target: onboarding dan handover lancar.

### Scope

1. Sinkronisasi README, SETUP_GUIDE, DEVELOPMENT_GUIDE, BACKEND_API.
2. Hapus referensi lama yang tidak relevan (misalnya JWT flow lama jika masih tersisa).
3. Pastikan satu standar env file dan contoh command yang benar-benar executable.
4. Tambah release checklist dan QA matrix.

### Deliverables

1. Docs yang konsisten dan teruji dengan clean setup.
2. QA checklist final untuk pre-release.

### Acceptance Criteria

1. Engineer baru bisa menjalankan project end-to-end mengikuti docs saja.
2. Tidak ada konflik instruksi antar dokumen utama.

## Milestone 5 - Final UAT and Release Gate (P1)

Target: siap deploy dengan risiko terukur.

### Scope

1. UAT skenario:

- no wallet
- wallet connected
- order success/failure
- leaderboard period/sort/pagination
- builder approve/revoke/update
- agent wallet mode authorized/unauthorized

2. Performance and stability pass:

- dashboard refresh cycle stabil
- no major memory leak pada halaman interaktif

3. Security and config sanity:

- env validation saat startup
- no secret exposed ke frontend bundle

### Deliverables

1. UAT result log.
2. Release decision sheet (go/no-go + known issues).

### Acceptance Criteria

1. Semua blocker severity tinggi terselesaikan.
2. Known issues terdokumentasi dengan workaround.

## Execution Sequence (Recommended)

1. Milestone 1
2. Milestone 2
3. Milestone 3
4. Milestone 4
5. Milestone 5

## Work Breakdown by Week (estimasi)

- Week 1: Milestone 1 (live data completion)
- Week 2: Milestone 2 (tests baseline)
- Week 3: Milestone 3 (reliability hardening)
- Week 4: Milestone 4 + Milestone 5 (docs, UAT, release gate)

## Owner Mapping (disarankan)

1. Backend owner: API contract + integration reliability.
2. Frontend owner: UI live data integration + UX state handling.
3. QA owner: test scenario and release verification.
4. Tech lead: architecture guardrail + release go/no-go.

## Immediate Next Actions (7 hari ke depan)

1. Buat backend endpoint portfolio dan swarm history (design + implementation).
2. Refactor PortfolioContent dan SwarmContent ke live API.
3. Setup testing framework dan minimal integration tests untuk orders/dashboard.
4. Sinkronkan docs environment (pilih PUBLIC_API_URL sebagai standar frontend, dokumentasikan fallback).
