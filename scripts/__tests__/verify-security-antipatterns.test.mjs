import { describe, it, expect } from 'vitest';
import {
    checkRlsPrivilegeEscalation,
    checkPublicAnonIdor,
    checkFrontendIdorLeaks
} from '../verify-security-antipatterns.mjs';

describe('verify-security-antipatterns gate', () => {
    describe('checkRlsPrivilegeEscalation', () => {
        it('detects unshielded UPDATE policy on tables with role/is_approved', () => {
            const badSql = `
                CREATE POLICY "Allow update profile" ON profiles
                FOR UPDATE USING (auth.uid() = id OR is_admin())
                WITH CHECK (auth.uid() = id OR is_admin());
            `;
            const violations = checkRlsPrivilegeEscalation(badSql, 'update_profiles.sql');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message).toContain('Privilege escalation');
        });

        it('passes when BEFORE UPDATE trigger guards the privileged fields', () => {
            const goodSql = `
                CREATE POLICY "Allow update profile" ON profiles
                FOR UPDATE USING (auth.uid() = id OR is_admin())
                WITH CHECK (auth.uid() = id OR is_admin());

                CREATE TRIGGER trg_protect_profile_privileged_fields
                BEFORE UPDATE ON profiles
                FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();
            `;
            const violations = checkRlsPrivilegeEscalation(goodSql, 'update_profiles.sql');
            expect(violations.length).toBe(0);
        });

        it('honors @security-gate-ignore directive', () => {
            const ignoredSql = `
                -- @security-gate-ignore: intentional demo policy
                CREATE POLICY "Allow update profile" ON profiles
                FOR UPDATE USING (auth.uid() = id);
            `;
            const violations = checkRlsPrivilegeEscalation(ignoredSql, 'update_profiles.sql');
            expect(violations.length).toBe(0);
        });
    });

    describe('checkPublicAnonIdor', () => {
        it('detects SECURITY DEFINER RPC with anon grant querying sequential ID', () => {
            const badSql = `
                CREATE OR REPLACE FUNCTION get_public_report_for_signing(p_report_id text)
                RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
                BEGIN
                    v_clean_id := regexp_replace(p_report_id, '^.*-(\\d+)$', '\\1');
                    SELECT * FROM service_reports WHERE id = v_clean_id::bigint;
                END;
                $$;
                GRANT EXECUTE ON FUNCTION get_public_report_for_signing(text) TO anon;
            `;
            const violations = checkPublicAnonIdor(badSql, 'get_report.sql');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message).toContain('IDOR vulnerability');
        });

        it('passes when query utilizes UUID signing_token', () => {
            const goodSql = `
                CREATE OR REPLACE FUNCTION get_public_report_for_signing(p_token text)
                RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
                BEGIN
                    SELECT * FROM service_reports WHERE signing_token = p_token::uuid;
                END;
                $$;
                GRANT EXECUTE ON FUNCTION get_public_report_for_signing(text) TO anon;
            `;
            const violations = checkPublicAnonIdor(goodSql, 'get_report.sql');
            expect(violations.length).toBe(0);
        });
    });

    describe('checkFrontendIdorLeaks', () => {
        it('detects numeric/slug ID-based signing links in UI', () => {
            const badJsx = 'const url = `${origin}/sign/protokol-${report.id}`;';
            const violations = checkFrontendIdorLeaks(badJsx, 'ShareModal.tsx');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message).toContain('Sequential ID in public signing URL');
        });

        it('passes when signing link utilizes signing_token', () => {
            const goodJsx = 'const url = `${origin}/sign/${report.signing_token}`;';
            const violations = checkFrontendIdorLeaks(goodJsx, 'ShareModal.tsx');
            expect(violations.length).toBe(0);
        });
    });
});
