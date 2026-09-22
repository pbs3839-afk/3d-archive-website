import type { LockerDefinition } from '@/types/archive';

/**
 * Archive contents.
 *
 * Authored data only — nothing here imports the 3D layer, so the dossiers can
 * later be swapped for a CMS / API payload by replacing `LOCKERS` with a fetch
 * that returns the same shape.
 *
 * `id` must match the corresponding GLB object name once the Blender model is
 * dropped into /public/models.
 */
export const LOCKERS: ReadonlyArray<LockerDefinition> = [
  {
    id: 'Locker_01',
    code: 'A-01',
    label: 'NORTHERN DIRECTORATE',
    column: 0,
    row: 0,
    status: 'ACTIVE',
    files: [
      {
        id: 'alpha',
        codename: 'PROJECT ALPHA',
        title: 'Deep-Field Signal Intercept Programme',
        classification: 'TOP SECRET',
        date: '2026.09.18',
        origin: 'DIRECTORATE OF SIGNALS / SECTION 7',
        summary:
          'Long-baseline interception of non-terrestrial carrier bands. Programme remains active; all findings compartmented under ALPHA handling caveats.',
        entries: [
          { label: 'FILE REF', value: 'DS-7/ALPHA/0912' },
          { label: 'CUSTODIAN', value: 'SECTION 7 REGISTRY' },
          { label: 'REVIEW', value: '2031.09.18' },
          { label: 'COPIES', value: '02 OF 02' },
        ],
        redactedLines: 3,
      },
      {
        id: 'beta',
        codename: 'PROJECT BETA',
        title: 'Continuity of Government — Relocation Annex',
        classification: 'SECRET',
        date: '2026.09.12',
        origin: 'CABINET CONTINGENCY OFFICE',
        summary:
          'Relocation sequencing for principal officers under scenario bands 3 through 6. This annex supersedes all prior relocation schedules.',
        entries: [
          { label: 'FILE REF', value: 'CCO/BETA/2211' },
          { label: 'CUSTODIAN', value: 'CABINET REGISTRY' },
          { label: 'REVIEW', value: '2029.09.12' },
          { label: 'COPIES', value: '04 OF 09' },
        ],
        redactedLines: 2,
      },
      {
        id: 'gamma',
        codename: 'PROJECT GAMMA',
        title: 'Atmospheric Sampling — Northern Corridor',
        classification: 'CONFIDENTIAL',
        date: '2026.08.30',
        origin: 'ENVIRONMENTAL SURVEY BUREAU',
        summary:
          'Quarterly particulate survey along the northern corridor. Three sample sites returned anomalous isotope ratios pending second-stage assay.',
        entries: [
          { label: 'FILE REF', value: 'ESB/GAMMA/0480' },
          { label: 'CUSTODIAN', value: 'BUREAU ARCHIVE' },
          { label: 'REVIEW', value: '2028.08.30' },
          { label: 'COPIES', value: '11 OF 24' },
        ],
        redactedLines: 1,
      },
    ],
  },
  {
    id: 'Locker_02',
    code: 'B-04',
    label: 'MARITIME SECTION',
    column: 2,
    row: 0,
    status: 'ACTIVE',
    files: [
      {
        id: 'delta',
        codename: 'PROJECT DELTA',
        title: 'Subsurface Transit Log — Basin East',
        classification: 'TOP SECRET',
        date: '2026.07.04',
        origin: 'MARITIME SECTION / HYDROGRAPHIC CELL',
        summary:
          'Consolidated transit plots for unattributed subsurface contacts across the eastern basin. Contact 11 remains unresolved after four passes.',
        entries: [
          { label: 'FILE REF', value: 'MS-H/DELTA/1140' },
          { label: 'CUSTODIAN', value: 'HYDROGRAPHIC CELL' },
          { label: 'REVIEW', value: '2030.07.04' },
          { label: 'COPIES', value: '01 OF 03' },
        ],
        redactedLines: 4,
      },
      {
        id: 'epsilon',
        codename: 'PROJECT EPSILON',
        title: 'Harbour Denial Contingency',
        classification: 'SECRET',
        date: '2026.06.21',
        origin: 'MARITIME SECTION / PLANS',
        summary:
          'Denial and obstruction planning for three designated harbours. Execution authority is reserved to the standing committee.',
        entries: [
          { label: 'FILE REF', value: 'MS-P/EPSILON/0033' },
          { label: 'CUSTODIAN', value: 'PLANS REGISTRY' },
          { label: 'REVIEW', value: '2029.06.21' },
          { label: 'COPIES', value: '02 OF 05' },
        ],
        redactedLines: 2,
      },
    ],
  },
  {
    id: 'Locker_03',
    code: 'C-08',
    label: 'TECHNICAL RESEARCH',
    column: 1,
    row: 1,
    status: 'ACTIVE',
    files: [
      {
        id: 'zeta',
        codename: 'PROJECT ZETA',
        title: 'Coherent Optics — Phase II Trials',
        classification: 'TOP SECRET',
        date: '2026.05.29',
        origin: 'TECHNICAL RESEARCH ESTABLISHMENT',
        summary:
          'Phase II bench trials of the coherent optics assembly. Thermal margin remains below specification at sustained duty.',
        entries: [
          { label: 'FILE REF', value: 'TRE/ZETA/0771' },
          { label: 'CUSTODIAN', value: 'TRE CENTRAL REGISTRY' },
          { label: 'REVIEW', value: '2031.05.29' },
          { label: 'COPIES', value: '03 OF 06' },
        ],
        redactedLines: 3,
      },
      {
        id: 'eta',
        codename: 'PROJECT ETA',
        title: 'Materials Recovery — Site 12',
        classification: 'SECRET',
        date: '2026.04.17',
        origin: 'TECHNICAL RESEARCH ESTABLISHMENT',
        summary:
          'Recovery and cataloguing of fragments from Site 12. Nine of fourteen fragments resist conventional spectroscopy.',
        entries: [
          { label: 'FILE REF', value: 'TRE/ETA/0412' },
          { label: 'CUSTODIAN', value: 'SITE 12 LIAISON' },
          { label: 'REVIEW', value: '2030.04.17' },
          { label: 'COPIES', value: '01 OF 02' },
        ],
        redactedLines: 5,
      },
      {
        id: 'theta',
        codename: 'PROJECT THETA',
        title: 'Instrumentation Standards Revision',
        classification: 'RESTRICTED',
        date: '2026.03.02',
        origin: 'STANDARDS COMMITTEE',
        summary:
          'Revision of calibration tolerances for field instrumentation. Circulated for comment to all establishments.',
        entries: [
          { label: 'FILE REF', value: 'SC/THETA/0198' },
          { label: 'CUSTODIAN', value: 'STANDARDS SECRETARIAT' },
          { label: 'REVIEW', value: '2027.03.02' },
          { label: 'COPIES', value: '34 OF 60' },
        ],
        redactedLines: 0,
      },
      {
        id: 'iota',
        codename: 'PROJECT IOTA',
        title: 'Power Plant Hardening Survey',
        classification: 'CONFIDENTIAL',
        date: '2026.02.11',
        origin: 'INFRASTRUCTURE DIRECTORATE',
        summary:
          'Structural hardening survey across eleven generating stations. Four sites fall below the revised blast standard.',
        entries: [
          { label: 'FILE REF', value: 'ID/IOTA/2205' },
          { label: 'CUSTODIAN', value: 'INFRASTRUCTURE REGISTRY' },
          { label: 'REVIEW', value: '2028.02.11' },
          { label: 'COPIES', value: '07 OF 15' },
        ],
        redactedLines: 1,
      },
    ],
  },
  {
    id: 'Locker_04',
    code: 'D-11',
    label: 'PERSONNEL SECURITY',
    column: 0,
    row: 2,
    status: 'ACTIVE',
    files: [
      {
        id: 'kappa',
        codename: 'PROJECT KAPPA',
        title: 'Vetting Exception Register',
        classification: 'SECRET',
        date: '2026.01.23',
        origin: 'PERSONNEL SECURITY BRANCH',
        summary:
          'Standing register of vetting exceptions granted under emergency provisions. Twenty-two entries remain open.',
        entries: [
          { label: 'FILE REF', value: 'PSB/KAPPA/0007' },
          { label: 'CUSTODIAN', value: 'BRANCH REGISTRY' },
          { label: 'REVIEW', value: '2027.01.23' },
          { label: 'COPIES', value: '01 OF 01' },
        ],
        redactedLines: 4,
      },
      {
        id: 'lambda',
        codename: 'PROJECT LAMBDA',
        title: 'Access Control — Facility Audit',
        classification: 'CONFIDENTIAL',
        date: '2025.12.08',
        origin: 'PERSONNEL SECURITY BRANCH',
        summary:
          'Audit of badge issuance and door-controller logs across six facilities. Two controllers held unpatched firmware.',
        entries: [
          { label: 'FILE REF', value: 'PSB/LAMBDA/0316' },
          { label: 'CUSTODIAN', value: 'FACILITY SECURITY' },
          { label: 'REVIEW', value: '2027.12.08' },
          { label: 'COPIES', value: '05 OF 08' },
        ],
        redactedLines: 2,
      },
      {
        id: 'mu',
        codename: 'PROJECT MU',
        title: 'Courier Route Reassignment',
        classification: 'RESTRICTED',
        date: '2025.11.14',
        origin: 'SECURE DISTRIBUTION OFFICE',
        summary:
          'Reassignment of classified courier routes following the autumn review. Routes 4 and 9 are withdrawn from service.',
        entries: [
          { label: 'FILE REF', value: 'SDO/MU/0925' },
          { label: 'CUSTODIAN', value: 'DISTRIBUTION OFFICE' },
          { label: 'REVIEW', value: '2027.11.14' },
          { label: 'COPIES', value: '18 OF 40' },
        ],
        redactedLines: 0,
      },
    ],
  },
  {
    id: 'Locker_05',
    code: 'E-15',
    label: 'DEEP ARCHIVE',
    column: 2,
    row: 2,
    status: 'ACTIVE',
    files: [
      {
        id: 'nu',
        codename: 'PROJECT NU',
        title: 'Terminated Programmes — Consolidated Index',
        classification: 'TOP SECRET',
        date: '2025.10.02',
        origin: 'DEEP ARCHIVE / CLOSED HOLDINGS',
        summary:
          'Master index of terminated programmes held in closed storage. Thirty-one entries carry indefinite review holds.',
        entries: [
          { label: 'FILE REF', value: 'DA-C/NU/0001' },
          { label: 'CUSTODIAN', value: 'DEEP ARCHIVE' },
          { label: 'REVIEW', value: 'INDEFINITE' },
          { label: 'COPIES', value: '01 OF 01' },
        ],
        redactedLines: 6,
      },
      {
        id: 'xi',
        codename: 'PROJECT XI',
        title: 'Declassification Review — Tranche 14',
        classification: 'CONFIDENTIAL',
        date: '2025.08.19',
        origin: 'DECLASSIFICATION PANEL',
        summary:
          'Panel recommendations for tranche 14. Sixty-two documents cleared for release, nine withheld in full.',
        entries: [
          { label: 'FILE REF', value: 'DP/XI/1400' },
          { label: 'CUSTODIAN', value: 'PANEL SECRETARIAT' },
          { label: 'REVIEW', value: '2026.08.19' },
          { label: 'COPIES', value: '09 OF 20' },
        ],
        redactedLines: 1,
      },
    ],
  },
];

/** Lookup by locker id — built once at module load. */
export const LOCKER_BY_ID: ReadonlyMap<string, LockerDefinition> = new Map(
  LOCKERS.map((locker) => [locker.id, locker]),
);

export function getLocker(id: string | null): LockerDefinition | undefined {
  return id ? LOCKER_BY_ID.get(id) : undefined;
}

export function getFile(lockerId: string | null, fileId: string | null) {
  if (!lockerId || !fileId) return undefined;
  return getLocker(lockerId)?.files.find((file) => file.id === fileId);
}

export const ARCHIVE_META = {
  title: 'TOP SECRET ARCHIVE',
  subtitle: 'CENTRAL RECORDS FACILITY — SUBLEVEL 3',
  facility: 'FACILITY 0447',
  clearance: 'CLEARANCE OMEGA',
} as const;
