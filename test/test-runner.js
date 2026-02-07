// Simple test runner for Node.js
const suites = [];
let currentSuite = null;
let beforeEachFns = [];
let afterEachFns = [];

function describe(name, fn) {
    const parentSuite = currentSuite;
    const suite = {
        name: parentSuite ? `${parentSuite.name} > ${name}` : name,
        tests: [],
        beforeEach: [],
        afterEach: []
    };
    
    currentSuite = suite;
    suites.push(suite);
    
    const parentBeforeEach = beforeEachFns;
    const parentAfterEach = afterEachFns;
    beforeEachFns = [...parentBeforeEach];
    afterEachFns = [...parentAfterEach];
    
    fn();
    
    suite.beforeEach = beforeEachFns;
    suite.afterEach = afterEachFns;
    
    currentSuite = parentSuite;
    beforeEachFns = parentBeforeEach;
    afterEachFns = parentAfterEach;
}

function it(name, fn) {
    if (!currentSuite) {
        throw new Error('it() must be called inside describe()');
    }
    currentSuite.tests.push({ name, fn });
}

function beforeEach(fn) {
    beforeEachFns.push(fn);
}

function afterEach(fn) {
    afterEachFns.push(fn);
}

async function run() {
    let passed = 0;
    let failed = 0;
    const failures = [];
    
    console.log('\n🧪 Running tests...\n');
    
    for (const suite of suites) {
        console.log(`\n${suite.name}`);
        
        for (const test of suite.tests) {
            try {
                // Run beforeEach hooks
                for (const fn of suite.beforeEach) {
                    await fn();
                }
                
                // Run the test
                await test.fn();
                
                // Run afterEach hooks
                for (const fn of suite.afterEach) {
                    await fn();
                }
                
                console.log(`  ✓ ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`  ✗ ${test.name}`);
                console.log(`    ${error.message}`);
                failed++;
                failures.push({
                    suite: suite.name,
                    test: test.name,
                    error
                });
                
                // Try to run afterEach even if test failed
                try {
                    for (const fn of suite.afterEach) {
                        await fn();
                    }
                } catch (cleanupError) {
                    console.log(`    Cleanup error: ${cleanupError.message}`);
                }
            }
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n${passed} passed, ${failed} failed\n`);
    
    if (failures.length > 0) {
        console.log('Failures:\n');
        for (const failure of failures) {
            console.log(`${failure.suite} > ${failure.test}`);
            console.log(failure.error.stack || failure.error.message);
            console.log('');
        }
        process.exit(1);
    } else {
        console.log('✨ All tests passed!\n');
        process.exit(0);
    }
}

module.exports = { describe, it, beforeEach, afterEach, run };
