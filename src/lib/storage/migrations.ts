import { SCHEMA_VERSION } from '@/types/resume';

type Raw = Record<string, unknown>;

/**
 * migrations[n] upgrades a record from version n to n+1. Version 0 is any draft
 * written without a version stamp. Add new steps here when SCHEMA_VERSION grows.
 */
const migrations: Record<number, (record: Raw) => Raw> = {
  0: (record) => ({ ...record, schemaVersion: 1 }),
};

export class UnsupportedVersionError extends Error {}

export function migrate(input: unknown, target: number = SCHEMA_VERSION): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  let record = input as Raw;
  let version = typeof record.schemaVersion === 'number' ? record.schemaVersion : 0;
  if (version > target) throw new UnsupportedVersionError(`Schema version ${version} is too new`);
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new UnsupportedVersionError(`No migration from version ${version}`);
    record = step(record);
    version += 1;
  }
  return record;
}
