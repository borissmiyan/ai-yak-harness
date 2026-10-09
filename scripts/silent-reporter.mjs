/**
 * 🔇 Silent Success / Loud Failure Reporter for Vitest (Tier-4 AI Harness)
 * 
 * Предотвращает разрастание контекстного окна ИИ (Context Bloat).
 * При успешном прохождении тестов выводит только итоговую сводку (1-2 строки).
 * При падении тестов выводит подробный диагностический трейс упавшего теста.
 */

export default class SilentSuccessReporter {
    onInit() {
        this.startTime = Date.now();
    }

    onTestRunEnd(testModules = [], errors = []) {
        const duration = ((Date.now() - (this.startTime || Date.now())) / 1000).toFixed(2);
        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        const failedTasks = [];

        for (const module of testModules) {
            const children = module.children || module.tasks || [];
            const walk = (items) => {
                for (const item of items) {
                    if (item.type === 'test' || item.type === 'custom') {
                        totalTests++;
                        const state = item.result?.state || item.state;
                        if (state === 'pass') {
                            passedTests++;
                        } else if (state === 'fail') {
                            failedTests++;
                            failedTasks.push({
                                file: module.moduleId || module.name,
                                name: item.name,
                                error: item.result?.errors?.[0] || 'Assertion failed',
                            });
                        }
                    }
                    if (item.children) walk(item.children);
                    if (item.tasks) walk(item.tasks);
                }
            };
            walk(children);
        }

        const totalSuites = testModules.length;
        const hasFailures = failedTests > 0 || errors.length > 0;

        if (!hasFailures) {
            console.log(`\n✅ [Vitest Silent Success] All ${passedTests || totalTests} tests passed across ${totalSuites} suites in ${duration}s! (0 errors)\n`);
        } else {
            console.error(`\n❌ [Vitest Loud Failure] ${failedTests} of ${totalTests} tests failed in ${duration}s:\n`);
            for (const failure of failedTasks) {
                console.error(`  FAIL: ${failure.file} > ${failure.name}`);
                if (failure.error?.message) {
                    console.error(`    ${failure.error.message}`);
                }
                if (failure.error?.stack) {
                    const cleanStack = failure.error.stack.split('\n').slice(0, 5).join('\n    ');
                    console.error(`    ${cleanStack}`);
                }
                console.error('');
            }
            if (errors.length > 0) {
                console.error('  Global Errors:');
                for (const err of errors) {
                    console.error(`    ${err?.message || err}`);
                }
            }
        }
    }
}
