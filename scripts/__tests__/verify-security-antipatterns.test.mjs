import { describe, it, expect } from 'vitest';
import {
    checkRlsPrivilegeEscalation,
    checkPublicAnonIdor,
    checkFrontendIdorLeaks,
    checkHardcodedSecretFallbacks,
    checkClientSecretExposure
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

    describe('checkHardcodedSecretFallbacks', () => {
        it('detects hardcoded API key or secret in environment fallback expression', () => {
            const badCode = "const key = Deno.env.get('API_KEY') || 'mock_secret_token_fixture_abc1234567890xyz';";
            const violations = checkHardcodedSecretFallbacks(badCode, 'edge_function.ts');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message).toContain('Hardcoded credential fallback');

            const badClientCode = "const apiKey = import.meta.env.VITE_API_KEY || 'mock_secret_token_fixture_abc1234567890xyz';";
            const clientViolations = checkHardcodedSecretFallbacks(badClientCode, 'client.ts');
            expect(clientViolations.length).toBeGreaterThan(0);
        });

        it('passes when environment variable is read without hardcoded secret token', () => {
            const goodCode = "const key = Deno.env.get('API_KEY'); if (!key) throw new Error('Missing key');";
            const violations = checkHardcodedSecretFallbacks(goodCode, 'edge_function.ts');
            expect(violations.length).toBe(0);
        });

        it('passes when fallback is benign default URL or empty string', () => {
            const benignCode = "const url = Deno.env.get('BASE_URL') || 'https://pub-123.r2.dev'; const empty = Deno.env.get('PORT') || '';";
            const violations = checkHardcodedSecretFallbacks(benignCode, 'edge_function.ts');
            expect(violations.length).toBe(0);
        });
    });

    describe('checkClientSecretExposure', () => {
        it('detects client-side VITE_.*_SECRET access key exposure', () => {
            const badTs = "const secretKey = import.meta.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY;";
            const violations = checkClientSecretExposure(badTs, 'storageService.ts');
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message).toContain('Client bundle secret exposure');
        });

        it('passes with explicit @security-gate-ignore directive', () => {
            const ignoredTs = "// @security-gate-ignore: legacy dev fallback\nconst secretKey = import.meta.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY;";
            const violations = checkClientSecretExposure(ignoredTs, 'storageService.ts');
            expect(violations.length).toBe(0);
        });
    });
});
