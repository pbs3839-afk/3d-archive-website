/**
 * Domain types for the classified archive.
 * Kept free of any Three.js dependency so data can be authored / serialised
 * without pulling in the 3D layer.
 */

export const CLASSIFICATIONS = [
  'TOP SECRET',
  'SECRET',
  'CONFIDENTIAL',
  'RESTRICTED',
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

/** A single dossier stored inside a locker. */
export interface ArchiveFileData {
  id: string;
  /** Short operation name shown on the card face, e.g. "PROJECT ALPHA". */
  codename: string;
  /** Full descriptive title shown in the detail panel. */
  title: string;
  classification: Classification;
  /** Display date, pre-formatted (yyyy.MM.dd). */
  date: string;
  /** Issuing office / authority. */
  origin: string;
  summary: string;
  /** Key-value rows rendered as a spec table in the detail panel. */
  entries: ReadonlyArray<{ label: string; value: string }>;
  /** Number of fake "redacted" bars drawn under the summary. */
  redactedLines: number;
}

export type LockerStatus = 'ACTIVE' | 'SEALED';

/** One compartment of the cabinet's inner grid. */
export interface LockerDefinition {
  /** Must match the GLB object name once the Blender model lands. */
  id: string;
  /** Plate code stencilled on the door, e.g. "A-01". */
  code: string;
  label: string;
  /** Grid column, 0 = leftmost. */
  column: number;
  /** Grid row, 0 = topmost. */
  row: number;
  status: LockerStatus;
  files: ReadonlyArray<ArchiveFileData>;
}

