// 轻量级测试框架 - 纯浏览器端实现，支持异步测试

const testSuites = [];
let currentSuite = null;
let globalBeforeEach = null;
let globalAfterEach = null;

export function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    tests: [],
    beforeEach: null,
    afterEach: null
  };
  currentSuite = suite;
  testSuites.push(suite);
  fn();
  currentSuite = null;
}

export function test(testName, fn) {
  if (!currentSuite) {
    throw new Error('test() must be called inside describe()');
  }
  currentSuite.tests.push({
    name: testName,
    fn,
    passed: false,
    error: null,
    duration: 0
  });
}

export function beforeEach(fn) {
  if (currentSuite) {
    currentSuite.beforeEach = fn;
  } else {
    globalBeforeEach = fn;
  }
}

export function afterEach(fn) {
  if (currentSuite) {
    currentSuite.afterEach = fn;
  } else {
    globalAfterEach = fn;
  }
}

export const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  },

  toEqual(expected) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
    }
  },

  toBeTruthy() {
    if (!actual) {
      throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
    }
  },

  toBeFalsy() {
    if (actual) {
      throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
    }
  },

  toContain(item) {
    if (!Array.isArray(actual) && typeof actual !== 'string') {
      throw new Error(`Expected array or string but got ${typeof actual}`);
    }
    if (!actual.includes(item)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
    }
  },

  toHaveLength(length) {
    if (actual.length !== length) {
      throw new Error(`Expected length ${length} but got ${actual.length}`);
    }
  },

  toBeGreaterThan(value) {
    if (actual <= value) {
      throw new Error(`Expected ${actual} to be greater than ${value}`);
    }
  },

  toBeGreaterThanOrEqual(value) {
    if (actual < value) {
      throw new Error(`Expected ${actual} to be greater than or equal to ${value}`);
    }
  },

  toBeLessThan(value) {
    if (actual >= value) {
      throw new Error(`Expected ${actual} to be less than ${value}`);
    }
  },

  toBeLessThanOrEqual(value) {
    if (actual > value) {
      throw new Error(`Expected ${actual} to be less than or equal to ${value}`);
    }
  },

  toMatch(regex) {
    if (!regex.test(actual)) {
      throw new Error(`Expected "${actual}" to match ${regex}`);
    }
  },

  toBeInstanceOf(Class) {
    if (!(actual instanceof Class)) {
      throw new Error(`Expected instance of ${Class.name}`);
    }
  },

  toBeDefined() {
    if (actual === undefined) {
      throw new Error(`Expected value to be defined but got undefined`);
    }
  },

  toBeNull() {
    if (actual !== null) {
      throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
    }
  },

  not: {
    toBe(expected) {
      if (actual === expected) {
        throw new Error(`Expected not ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item) {
      if (!Array.isArray(actual) && typeof actual !== 'string') {
        throw new Error(`Expected array or string but got ${typeof actual}`);
      }
      if (actual.includes(item)) {
        throw new Error(`Expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(item)}`);
      }
    },
    toThrow() {
      let threw = false;
      try {
        actual();
      } catch (e) {
        threw = true;
      }
      if (threw) {
        throw new Error(`Expected function not to throw but it did`);
      }
    }
  },

  toThrow() {
    let threw = false;
    try {
      actual();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(`Expected function to throw but it didn't`);
    }
  }
});

export function clearLocalStorage() {
  localStorage.removeItem('markdown-notes-app');
  localStorage.removeItem('markdown-notes-theme');
  localStorage.removeItem('md-notes-theme');
  localStorage.clear();
}

export async function runAllTests() {
  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of testSuites) {
    console.log(`\n📦 ${suite.name}`);
    console.log('─'.repeat(50));

    for (const test of suite.tests) {
      try {
        if (globalBeforeEach) await globalBeforeEach();
        if (suite.beforeEach) await suite.beforeEach();

        const testStart = Date.now();
        await test.fn();
        test.duration = Date.now() - testStart;

        test.passed = true;
        totalPassed++;
        console.log(`  ✅ ${test.name} (${test.duration}ms)`);
      } catch (error) {
        test.passed = false;
        test.error = error.message;
        totalFailed++;
        console.log(`  ❌ ${test.name}`);
        console.error(`     Error: ${error.message}`);
      } finally {
        try {
          if (suite.afterEach) await suite.afterEach();
          if (globalAfterEach) await globalAfterEach();
        } catch (e) {
          console.error('Error in afterEach:', e);
        }
      }
    }
  }

  const duration = Date.now() - startTime;

  return {
    total: totalPassed + totalFailed,
    passed: totalPassed,
    failed: totalFailed,
    duration,
    suites: testSuites
  };
}

export function getTestSummary() {
  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  for (const suite of testSuites) {
    for (const test of suite.tests) {
      results.push({
        name: `${suite.name} > ${test.name}`,
        passed: test.passed,
        error: test.error,
        duration: test.duration
      });
      if (test.passed) totalPassed++;
      else totalFailed++;
    }
  }

  return {
    total: totalPassed + totalFailed,
    passed: totalPassed,
    failed: totalFailed,
    results
  };
}

export function printTestSummary() {
  const summary = getTestSummary();

  console.log('\n' + '═'.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('═'.repeat(60));
  console.log(`  总测试数: ${summary.total}`);
  console.log(`  ✅ 通过: ${summary.passed}`);
  console.log(`  ❌ 失败: ${summary.failed}`);
  console.log(`  📈 通过率: ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0}%`);
  console.log('═'.repeat(60));

  if (summary.failed > 0) {
    console.log('\n❌ 失败的测试:');
    summary.results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}`);
        console.log(`    ${r.error}`);
      });
  } else {
    console.log('\n🎉 所有测试通过!');
  }

  return summary.failed === 0;
}

export function renderTestResultsToDOM(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '';

  for (const suite of testSuites) {
    const suitePassed = suite.tests.every(t => t.passed);
    const passedCount = suite.tests.filter(t => t.passed).length;

    html += `
      <div class="describe-block">
        <div class="describe-title">
          ${suitePassed ? '✅' : '❌'} ${suite.name} 
          <span style="font-weight: normal; color: #666; font-size: 13px;">
            (${passedCount}/${suite.tests.length} 通过)
          </span>
        </div>
    `;

    for (const test of suite.tests) {
      html += `
        <div class="test-item">
          <div class="test-status ${test.passed ? 'pass' : 'fail'}">
            ${test.passed ? '✓' : '✗'}
          </div>
          <div class="test-name">${test.name}</div>
          <div class="test-duration">${test.duration}ms</div>
        </div>
      `;
      if (test.error) {
        html += `<div class="test-error">${test.error}</div>`;
      }
    }

    html += `</div>`;
  }

  container.innerHTML = html;
}
