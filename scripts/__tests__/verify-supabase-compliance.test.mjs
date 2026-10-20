import { describe, it, expect } from 'vitest';
import {
    validateMigrationRls,
    validateSearchPath,
    validateAnonExecPrivileges,
    validateRlsPerformance
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
});
