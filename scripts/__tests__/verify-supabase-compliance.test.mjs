import { describe, it, expect } from 'vitest';
import {
    validateMigrationRls,
    validateSearchPath,
    validateAnonExecPrivileges,
    validateRlsPerformance,
    validateFunctionalIndexes,
    validateBatchLoops,
    extractFunctionalIndexes
} from '../verify-supabase-compliance.mjs';

describe('Supabase Compliance & Security Shield', () => {
    describe('validateMigrationRls', () => {
        it('should detect table created without enabling RLS', () => {
            const sql = `
                CREATE TABLE public.audit_trail (
                    id bigint primary key generated always as identity,
                    action text not null
                );
            `;
            const violations = validateMigrationRls(sql, 'migration_test.sql');
            expect(violations).toHaveLength(1);
            expect(violations[0].table).toBe('audit_trail');
            expect(violations[0].rule).toBe('RLS_MISSING');
        });

        it('should pass when RLS is enabled for created table', () => {
            const sql = `
                CREATE TABLE IF NOT EXISTS public.audit_trail (
                    id bigint primary key,
                    action text
                );
                ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
            `;
            const violations = validateMigrationRls(sql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });
    });

    describe('validateSearchPath', () => {
        it('should flag SECURITY DEFINER function missing search_path', () => {
            const sql = `
                CREATE OR REPLACE FUNCTION admin_wipe_data()
                RETURNS void
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    DELETE FROM data;
                END;
                $$;
            `;
            const violations = validateSearchPath(sql, 'migration_test.sql');
            expect(violations).toHaveLength(1);
            expect(violations[0].functionName).toBe('admin_wipe_data');
            expect(violations[0].rule).toBe('SEARCH_PATH_MUTABLE');
        });

        it('should pass when SECURITY DEFINER has SET search_path', () => {
            const sql = `
                CREATE OR REPLACE FUNCTION admin_wipe_data()
                RETURNS void
                LANGUAGE plpgsql
                SECURITY DEFINER
                SET search_path = public, pg_temp
                AS $$
                BEGIN
                    DELETE FROM data;
                END;
                $$;
            `;
            const violations = validateSearchPath(sql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });

        it('should ignore functions that are not SECURITY DEFINER', () => {
            const sql = `
                CREATE OR REPLACE FUNCTION calc_total(a int, b int)
                RETURNS int
                LANGUAGE sql
                AS $$
                    SELECT a + b;
                $$;
            `;
            const violations = validateSearchPath(sql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });
    });

    describe('validateAnonExecPrivileges', () => {
        it('should block granting execute on admin/sensitive function to anon', () => {
            const sql = `
                GRANT EXECUTE ON FUNCTION admin_create_user(text, text) TO anon;
            `;
            const violations = validateAnonExecPrivileges(sql, 'migration_test.sql');
            expect(violations).toHaveLength(1);
            expect(violations[0].functionName).toBe('admin_create_user');
            expect(violations[0].rule).toBe('ANON_EXECUTE_FORBIDDEN');
        });

        it('should allow whitelisted functions for anonymous signing', () => {
            const sql = `
                GRANT EXECUTE ON FUNCTION get_public_report_for_signing(text) TO anon;
                GRANT EXECUTE ON FUNCTION sign_report_by_customer(text, text) TO anon;
            `;
            const violations = validateAnonExecPrivileges(sql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });
    });

    describe('validateRlsPerformance', () => {
        it('should detect bare auth.uid() inside policy definition', () => {
            const sql = `
                CREATE POLICY "Allow users to read own tasks"
                ON public.tasks
                FOR SELECT
                USING (user_id = auth.uid());
            `;
            const violations = validateRlsPerformance(sql, 'migration_test.sql');
            expect(violations).toHaveLength(1);
            expect(violations[0].rule).toBe('RLS_INITPLAN_OPTIMIZATION');
        });

        it('should pass when auth.uid() is wrapped in (select auth.uid())', () => {
            const sql = `
                CREATE POLICY "Allow users to read own tasks"
                ON public.tasks
                FOR SELECT
                USING (user_id = (select auth.uid()));
            `;
            const violations = validateRlsPerformance(sql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });
    });

    describe('validateFunctionalIndexes', () => {
        it('detects unindexed expression in WHERE clause (Sequential Scan hazard)', () => {
            const badSql = `
                SELECT id FROM public.parcels WHERE UPPER(TRIM(tracking_number)) = v_tracking LIMIT 1;
            `;
            const violations = validateFunctionalIndexes(badSql, 'migration_test.sql');
            expect(violations).toHaveLength(1);
            expect(violations[0].rule).toBe('EXPRESSION_INDEX_MISSING');
            expect(violations[0].table).toBe('parcels');
            expect(violations[0].expression).toBe('UPPER(TRIM(tracking_number))');
        });

        it('passes when functional index is declared in same migration or schema', () => {
            const goodSql = `
                CREATE INDEX idx_parcels_upper_trim_tracking ON public.parcels (UPPER(TRIM(tracking_number)));
                SELECT id FROM public.parcels WHERE UPPER(TRIM(tracking_number)) = v_tracking LIMIT 1;
            `;
            const violations = validateFunctionalIndexes(goodSql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });

        it('ignores PL/pgSQL scalar variables in expressions (v_*, p_*)', () => {
            const sql = `
                SELECT id FROM public.clients WHERE client_code = UPPER(TRIM(v_clean_code)) LIMIT 1;
            `;
            const violations = validateFunctionalIndexes(sql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });

        it('honors @supabase-compliance-ignore directive', () => {
            const ignoredSql = `
                -- @supabase-compliance-ignore: functional-index
                SELECT id FROM public.parcels WHERE UPPER(description) = 'BOX';
            `;
            const violations = validateFunctionalIndexes(ignoredSql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });
    });

    describe('validateBatchLoops', () => {
        it('detects unbounded SELECT on heavy table inside FOR ... LOOP', () => {
            const badLoopSql = `
                FOR v_item IN SELECT * FROM batch_items LOOP
                    SELECT * FROM public.parcels WHERE code = v_item.code;
                END LOOP;
            `;
            const violations = validateBatchLoops(badLoopSql, 'migration_test.sql');
            expect(violations).toHaveLength(1);
            expect(violations[0].rule).toBe('LOOP_N_PLUS_ONE_UNBOUNDED');
            expect(violations[0].table).toBe('parcels');
        });

        it('passes when loop query has LIMIT 1', () => {
            const goodLoopSql = `
                FOR v_item IN SELECT * FROM batch_items LOOP
                    SELECT id INTO v_id FROM public.parcels WHERE code = v_item.code LIMIT 1;
                END LOOP;
            `;
            const violations = validateBatchLoops(goodLoopSql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });

        it('honors loop-query ignore directive', () => {
            const ignoredLoopSql = `
                -- @supabase-compliance-ignore: loop-query
                FOR v_item IN SELECT * FROM batch_items LOOP
                    SELECT * FROM public.parcels WHERE code = v_item.code;
                END LOOP;
            `;
            const violations = validateBatchLoops(ignoredLoopSql, 'migration_test.sql');
            expect(violations).toHaveLength(0);
        });
    });
});
