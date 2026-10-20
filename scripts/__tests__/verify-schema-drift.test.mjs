import { describe, it, expect } from 'vitest';
import { validateSqlColumns, checkLiveMigrationParity } from '../verify-schema-drift.mjs';

describe('verify-schema-drift (Tier-2 AI Harness Gate)', () => {
    const mockSnapshot = {
        tables: {
            service_reports: {
                columns: ['id', 'order_number', 'serial_number', 'signing_token', 'technician_name']
            },
            equipment: {
                columns: ['id', 'model_type', 'manufacturer', 'production_year']
            },
            addresses: {
                columns: ['id', 'street_address', 'city', 'client_id']
            }
        }
    };

    describe('validateSqlColumns', () => {
        it('detects hallucinated column on PL/pgSQL record (e.g. v_equipment.serial_number)', () => {
            const sql = `
                CREATE OR REPLACE FUNCTION test_func() RETURNS jsonb AS $$
                DECLARE
                    v_equipment equipment%ROWTYPE;
                BEGIN
                    SELECT * INTO v_equipment FROM equipment WHERE id = 1;
                    RETURN jsonb_build_object('serial', v_equipment.serial_number);
                END;
                $$ LANGUAGE plpgsql;
            `;

            const violations = validateSqlColumns(sql, mockSnapshot, 'test_migration.sql');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].table).toBe('equipment');
            expect(violations[0].column).toBe('serial_number');
            expect(violations[0].message).toContain('equipment');
        });

        it('passes when accessing valid columns on PL/pgSQL record (e.g. v_equipment.model_type and v_report.serial_number)', () => {
            const sql = `
                CREATE OR REPLACE FUNCTION test_func() RETURNS jsonb AS $$
                DECLARE
                    v_equipment equipment%ROWTYPE;
                    v_report service_reports%ROWTYPE;
                BEGIN
                    SELECT * INTO v_equipment FROM equipment WHERE id = 1;
                    SELECT * INTO v_report FROM service_reports WHERE id = 1;
                    RETURN jsonb_build_object(
                        'model', v_equipment.model_type,
                        'serial', v_report.serial_number,
                        'token', v_report.signing_token
                    );
                END;
                $$ LANGUAGE plpgsql;
            `;

            const violations = validateSqlColumns(sql, mockSnapshot, 'test_migration.sql');
            expect(violations).toEqual([]);
        });

        it('detects hallucinated column on direct table reference (e.g. equipment.serial_number)', () => {
            const sql = `
                SELECT equipment.serial_number FROM equipment WHERE id = 1;
            `;

            const violations = validateSqlColumns(sql, mockSnapshot, 'query.sql');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].table).toBe('equipment');
            expect(violations[0].column).toBe('serial_number');
        });

        it('recognizes dynamically added columns in the same migration (ALTER TABLE ADD COLUMN)', () => {
            const sql = `
                ALTER TABLE equipment ADD COLUMN serial_number text;

                CREATE OR REPLACE FUNCTION test_func() RETURNS jsonb AS $$
                DECLARE
                    v_equipment equipment%ROWTYPE;
                BEGIN
                    RETURN jsonb_build_object('serial', v_equipment.serial_number);
                END;
                $$ LANGUAGE plpgsql;
            `;

            const violations = validateSqlColumns(sql, mockSnapshot, 'add_col_migration.sql');
            expect(violations).toEqual([]);
        });

        it('ignores comments and string literals in SQL', () => {
            const sql = `
                -- v_equipment.serial_number in a comment should be ignored
                /* equipment.fake_column in a block comment should be ignored */
                SELECT v_equipment.model_type FROM equipment;
            `;

            const violations = validateSqlColumns(sql, mockSnapshot, 'comments.sql');
            expect(violations).toEqual([]);
        });
    });

    describe('checkLiveMigrationParity', () => {
        it('detects unapplied local migrations when missing from remote schema_migrations', () => {
            const localMigrations = [
                '20261005110000_fix_postal_code.sql',
                '20261013110000_add_signing_token.sql'
            ];
            const remoteVersions = ['20261005110000'];

            const unapplied = checkLiveMigrationParity(localMigrations, remoteVersions);
            expect(unapplied).toHaveLength(1);
            expect(unapplied[0]).toBe('20261013110000_add_signing_token.sql');
        });

        it('passes when all local migrations are applied on remote', () => {
            const localMigrations = [
                '20261005110000_fix_postal_code.sql',
                '20261013110000_add_signing_token.sql'
            ];
            const remoteVersions = ['20261005110000', '20261013110000'];

            const unapplied = checkLiveMigrationParity(localMigrations, remoteVersions);
            expect(unapplied).toEqual([]);
        });
    });
});
