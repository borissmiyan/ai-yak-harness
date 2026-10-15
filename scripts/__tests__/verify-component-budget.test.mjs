import { describe, it, expect } from 'vitest';
import {
    countCleanLines,
    checkComponentBudget,
    isTargetFile,
    readFromGitIndex
} from '../verify-component-budget.mjs';

describe('verify-component-budget gate (Fail-Closed, Git Index, Hook Guard)', () => {
    describe('countCleanLines (ESLint Parity)', () => {
        it('returns 0 for empty or whitespace-only content', () => {
            expect(countCleanLines('')).toBe(0);
            expect(countCleanLines('   \n\n\t  \n')).toBe(0);
        });

        it('ignores single-line comments and empty lines', () => {
            const code = `
                // This is a comment
                const a = 1;

                // Another comment
                const b = 2;
            `;
            expect(countCleanLines(code)).toBe(2);
        });

        it('ignores multi-line comments and JSDoc blocks', () => {
            const code = `
                /**
                 * Detailed JSDoc explanation
                 * @param x
                 */
                function calculate(x: number) {
                    /* inline block comment */
                    return x * 2;
                }
            `;
            expect(countCleanLines(code)).toBe(3);
        });

        it('handles URLs without breaking', () => {
            const code = `
                const api = "https://api.example.com/v1";
                const fallback = 'http://localhost:3000';
            `;
            expect(countCleanLines(code)).toBe(2);
        });

        it('does not break on apostrophes in JSX text (JSX Parity)', () => {
            const code = `
                export function Notice() {
                    return <p>Don't panic and carry on</p>;
                }
            `;
            expect(countCleanLines(code)).toBe(3);
        });

        it('does not break on regex literals containing quotes', () => {
            const code = `
                const pattern = /'/g;
                const match = pattern.test("text");
            `;
            expect(countCleanLines(code)).toBe(2);
        });
    });

    describe('isTargetFile', () => {
        it('identifies .tsx components and use*.ts hooks as targets', () => {
            expect(isTargetFile('src/shared/ui/Button.tsx')).toBe(true);
            expect(isTargetFile('src/features/invoice/hooks/useInvoice.ts')).toBe(true);
            expect(isTargetFile('src/hooks/useAuth.ts')).toBe(true);
        });

        it('skips non-target files, tests, and stories', () => {
            expect(isTargetFile('src/shared/ui/Button.test.tsx')).toBe(false);
            expect(isTargetFile('src/shared/ui/Button.spec.tsx')).toBe(false);
            expect(isTargetFile('src/shared/ui/Button.stories.tsx')).toBe(false);
            expect(isTargetFile('src/hooks/useAuth.test.ts')).toBe(false);
            expect(isTargetFile('src/utils/math.ts')).toBe(false);
            expect(isTargetFile('package.json')).toBe(false);
        });
    });

    describe('checkComponentBudget (.tsx component limits)', () => {
        it('passes for components in golden standard zone (<= 250 lines)', () => {
            const lines = Array(150).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/UserCard.tsx', lines);
            expect(result.status).toBe('pass');
            expect(result.cleanLines).toBe(150);
        });

        it('warns for components in yellow tech debt zone (301-500 lines)', () => {
            const lines = Array(320).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/DashboardView.tsx', lines);
            expect(result.status).toBe('warn');
            expect(result.cleanLines).toBe(320);
            expect(result.message).toContain('Желтая зона');
        });

        it('fails with error for components in red zone (> 500 lines)', () => {
            const lines = Array(520).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/GodComponent.tsx', lines);
            expect(result.status).toBe('error');
            expect(result.cleanLines).toBe(520);
            expect(result.message).toContain('Аварийный потолок');
        });
    });

    describe('checkComponentBudget (use*.ts hook guard - anti-trash dump)', () => {
        it('passes for hooks within 150 lines', () => {
            const lines = Array(120).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/hooks/useFeatureLogic.ts', lines);
            expect(result.status).toBe('pass');
            expect(result.cleanLines).toBe(120);
        });

        it('warns for hooks in 151-250 lines zone', () => {
            const lines = Array(180).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/hooks/useComplexLogic.ts', lines);
            expect(result.status).toBe('warn');
            expect(result.cleanLines).toBe(180);
            expect(result.message).toContain('Хук перегружен');
        });

        it('fails with error for hooks > 250 lines (blocks hook trash dump)', () => {
            const lines = Array(300).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/hooks/useTrashDump.ts', lines);
            expect(result.status).toBe('error');
            expect(result.cleanLines).toBe(300);
            expect(result.message).toContain('Хук превысил лимит');
        });
    });

    describe('budget-exceptions.json handling (No Inline Bypasses)', () => {
        it('rejects inline @component-budget-ignore and still fails on large files', () => {
            const code = `// @component-budget-ignore: I want to bypass\n` +
                Array(550).fill('const x = 1;').join('\n');
            const result = checkComponentBudget('src/features/Cheater.tsx', code, {});
            expect(result.status).toBe('error');
            expect(result.inlineIgnoreAttempted).toBe(true);
        });

        it('honors authorized exceptions from budget-exceptions.json', () => {
            const code = Array(550).fill('const x = 1;').join('\n');
            const exceptions = {
                'src/features/AuthorizedGrid.tsx': 600
            };
            const result = checkComponentBudget('src/features/AuthorizedGrid.tsx', code, exceptions);
            expect(result.status).toBe('authorized_exception');
            expect(result.cleanLines).toBe(550);
        });
    });

    describe('readFromGitIndex (Fail-Closed)', () => {
        it('throws an error instead of silently reading from disk on missing git object', () => {
            expect(() => readFromGitIndex('non_existent_file_in_index.tsx')).toThrow(
                /FAIL-CLOSED/
            );
        });
    });
});
