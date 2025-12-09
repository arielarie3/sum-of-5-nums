// ========================================
// Initialization
// ========================================

function initializeApp() {
    console.log('🚀 Initializing C Positive Sum Grader...');

    if (typeof JSCPP === 'undefined') {
        console.error('❌ JSCPP not loaded yet');
        setTimeout(initializeApp, 500);
        return;
    }

    console.log('✅ JSCPP library detected');

    const runButton = document.getElementById('runTests');
    if (runButton) {
        runButton.addEventListener('click', handleRunTests);
        console.log('✅ Event listener attached to button');
    } else {
        console.error('❌ Button not found!');
    }

    console.log('✅ System ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ========================================
// Main Test Runner
// ========================================

async function handleRunTests() {
    const codeEditor = document.getElementById('codeEditor');
    const studentCode = codeEditor.value.trim();

    if (!studentCode) {
        alert('אנא הדבק קוד C לפני הרצת הבדיקות');
        return;
    }

    if (typeof JSCPP === 'undefined') {
        alert('שגיאה: מערכת ההרצה לא נטענה כראוי. אנא רענן את הדף ונסה שוב.\n\nודא שיש לך חיבור לאינטרנט (JSCPP נטען מ-CDN).');
        console.error('JSCPP not loaded. JSCPP:', typeof JSCPP);
        return;
    }

    setUIRunning(true);
    clearPreviousResults();

    try {
        const testCases = generateTestCases();
        const testResults = await runAllTests(studentCode, testCases);

        const score = calculateScore(testResults, studentCode);
        const feedback = generateFeedback(testResults, score, studentCode);

        displayResults(testResults, score, feedback);
    } catch (error) {
        console.error('Error during testing:', error);
        displayError('שגיאה כללית בזמן הרצת הבדיקות: ' + (error.message || error));
    } finally {
        setUIRunning(false);
    }
}

// ========================================
// C Program Execution (באמצעות JSCPP)
// ========================================

async function runCProgram(cSource, input) {
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        try {
            const exitCode = JSCPP.run(cSource, input, {
                stdio: {
                    write: (s) => {
                        stdout += s;
                    }
                },
                maxTimeout: 3000
            });

            resolve({
                compiled: true,
                compileOutput: 'Compilation/execution successful (exit code ' + exitCode + ')',
                stdout: stdout,
                stderr: stderr
            });
        } catch (error) {
            const errorMsg = (error && error.message) ? error.message : String(error);
            console.error('❌ JSCPP error:', errorMsg);

            resolve({
                compiled: false,
                compileOutput: errorMsg,
                stdout: stdout,
                stderr: errorMsg
            });
        }
    });
}

// ========================================
// Test Case Generation – 5 מספרים חיוביים
// ========================================

function generateTestCases() {
    return [
        {
            name: 'Test 1: 1 2 3 4 5',
            input: '1\n2\n3\n4\n5\n',
            expectedSum: 15,
            points: 25
        },
        {
            name: 'Test 2: 10 20 30 40 50',
            input: '10\n20\n30\n40\n50\n',
            expectedSum: 150,
            points: 25
        },
        {
            // 0, -3, 5, 7, 8, 9, 10, 11 -> החיוביים הראשונים: 5,7,8,9,10 = 39
            name: 'Test 3: קלט עם 0 ושלילי – בדיקת תקינות',
            input: '0\n-3\n5\n7\n8\n9\n10\n11\n',
            expectedSum: 39,
            points: 25,
            isValidationTest: true
        },
        {
            // -1, 0, -2, 0, 3, 4, 5, 6, 7 -> החיוביים: 3,4,5,6,7 = 25
            name: 'Test 4: רצף עם מספר ניסיונות שגויים',
            input: '-1\n0\n-2\n0\n3\n4\n5\n6\n7\n',
            expectedSum: 25,
            points: 25,
            isValidationTest: true
        }
    ];
}

// ========================================
// Run All Tests
// ========================================

async function runAllTests(studentCode, testCases) {
    const results = [];

    for (const testCase of testCases) {
        console.log(`Running: ${testCase.name}`);

        const result = await runCProgram(studentCode, testCase.input);

        if (!result.compiled) {
            results.push({
                ...testCase,
                passed: false,
                reportedSum: null,
                notes: result.compileOutput || 'הקוד לא הצליח להתקמפל',
                compilationFailed: true
            });
            break;
        }

        const parseResult = extractSumFromOutput(result.stdout);
        const comparisonResult = compareSums(testCase.expectedSum, parseResult);

        results.push({
            ...testCase,
            passed: comparisonResult.passed,
            reportedSum: parseResult.sum,
            notes: comparisonResult.notes
        });
    }

    return results;
}

// ========================================
// Output Normalization – חילוץ הסכום מהפלט
// ========================================

function extractSumFromOutput(stdout) {
    if (!stdout) {
        return { sum: null, allNumbers: [] };
    }

    const matches = stdout.match(/-?\d+/g) || [];
    const numbers = matches
        .map(m => parseInt(m, 10))
        .filter(n => !Number.isNaN(n));

    console.log('📤 All numbers parsed from output:', numbers);

    if (numbers.length === 0) {
        return { sum: null, allNumbers: [] };
    }

    const reportedSum = numbers[numbers.length - 1];

    return { sum: reportedSum, allNumbers: numbers };
}

function compareSums(expectedSum, parseResult) {
    if (parseResult.sum === null) {
        return {
            passed: false,
            notes: 'לא הצלחתי למצוא מספר סופי בפלט. ודא שבסוף התוכנית אתה מדפיס את סכום 5 המספרים (רצוי בפורמט sum = X) ושאין הדפסות נוספות של מספרים אחרי הסכום.'
        };
    }

    if (parseResult.sum !== expectedSum) {
        return {
            passed: false,
            notes: `הסכום שגוי. צפוי ${expectedSum}, התקבל ${parseResult.sum}.`
        };
    }

    return {
        passed: true,
        notes: 'עבר בהצלחה ✓'
    };
}

// ========================================
// Scoring
// ========================================

function calculateScore(testResults, codeSource) {
    if (testResults.length > 0 && testResults[0].compilationFailed) {
        return 0;
    }

    const totalPoints = testResults.reduce((sum, test) => sum + (test.points || 0), 0);
    const earnedPoints = testResults.reduce((sum, test) => {
        return sum + (test.passed ? (test.points || 0) : 0);
    }, 0);

    // 80% – פונקציונליות
    const functionalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 80 : 0;

    // 20% – איכות קוד
    let qualityScore = 20;

    const hasLoop = /\b(for|while|do)\b/.test(codeSource);
    if (!hasLoop) qualityScore -= 10;

    const hasPositiveCheck =
        /\bif\s*\([^)]*(<=\s*0|<\s*1|num\s*<=\s*0|num\s*<\s*1)/.test(codeSource) ||
        /\bif\s*\([^)]*>\s*0/.test(codeSource);

    if (!hasPositiveCheck) qualityScore -= 10;

    if (qualityScore < 0) qualityScore = 0;

    const totalScore = Math.round(
        Math.max(0, Math.min(100, functionalScore + qualityScore))
    );

    return totalScore;
}

// ========================================
// Feedback Generation
// ========================================

function generateFeedback(testResults, score, codeSource) {
    if (testResults.length > 0 && testResults[0].compilationFailed) {
        return 'הקוד לא מתקמפל. אנא תקן את שגיאות הקומפילציה ונסה שוב.';
    }

    if (score === 100) {
        return 'מצוין! קלטת 5 מספרים חיוביים, ביצעת בדיקות תקינות והסכום מחושב ומודפס בצורה נכונה. 🎉';
    }

    let feedback = [];

    const anyWrongSum = testResults.some(t =>
        !t.passed && t.notes && t.notes.includes('הסכום שגוי')
    );
    if (anyWrongSum) {
        feedback.push('יש בעיה בחישוב או בהדפסת הסכום. בדוק שהקוד באמת מחשב את סכום 5 המספרים החיוביים בלבד.');
    }

    const validationTests = testResults.filter(t => t.isValidationTest);
    const failedValidation = validationTests.some(t => !t.passed);
    if (failedValidation) {
        feedback.push('נראה שהקוד לא מטפל כראוי במספרים שאינם חיוביים (0 או שליליים). עליך לבקש מהמשתמש להזין מחדש במקום לספור אותם כאחד מ־5 המספרים.');
    }

    const hasLoop = /\b(for|while|do)\b/.test(codeSource);
    if (!hasLoop) {
        feedback.push('נראה שאין שימוש בלולאה כדי לקלוט את המספרים. התרגיל דורש שימוש בלולאה עד שנקלטו 5 מספרים חיוביים.');
    }

    const hasPositiveCheck =
        /\bif\s*\([^)]*(<=\s*0|<\s*1|num\s*<=\s*0|num\s*<\s*1)/.test(codeSource) ||
        /\bif\s*\([^)]*>\s*0/.test(codeSource);
    if (!hasPositiveCheck) {
        feedback.push('חסרה בדיקת תקינות על כך שהמספר חיובי. ודא שאתה בודק שהמספר גדול מ־0 לפני שאתה מוסיף אותו לסכום ומתקדם לספירה.');
    }

    if (feedback.length === 0) {
        if (score >= 80) {
            return 'עבודה טובה! רוב הבדיקות עברו, יש כמה נקודות קטנות לשיפור – בדוק את פירוט מקרי הבדיקה.';
        } else if (score >= 60) {
            return 'יש התקדמות יפה, אבל חלק מהבדיקות נכשלו. כדאי לבדוק את נושא בדיקת החיוביות וחישוב הסכום.';
        } else {
            return 'הקוד זקוק לעבודה נוספת. בדוק את לוגיקת הלולאה, תנאי החיוביות והאופן שבו אתה מחשב ומדפיס את הסכום.';
        }
    }

    return feedback.join(' ');
}

// ========================================
// UI Functions
// ========================================

function setUIRunning(isRunning) {
    const runButton = document.getElementById('runTests');
    const loadingIndicator = document.getElementById('loadingIndicator');

    runButton.disabled = isRunning;
    loadingIndicator.classList.toggle('hidden', !isRunning);
}

function clearPreviousResults() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.add('hidden');

    document.getElementById('compilationOutput').textContent = '';
    document.getElementById('testResultsBody').innerHTML = '';
}

function displayResults(testResults, score, feedback) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.remove('hidden');

    const compilationOutput = document.getElementById('compilationOutput');
    if (testResults.length > 0 && testResults[0].compilationFailed) {
        compilationOutput.textContent = testResults[0].notes;
        compilationOutput.style.color = '#f44336';
    } else {
        compilationOutput.textContent = '✅ הקוד התקמפל והורץ בהצלחה';
        compilationOutput.style.color = '#4CAF50';
    }

    const scoreValue = document.getElementById('scoreValue');
    const scoreCircle = scoreValue.parentElement;
    const scoreFeedback = document.getElementById('scoreFeedback');

    scoreValue.textContent = score;
    scoreFeedback.textContent = feedback;

    scoreCircle.classList.remove('excellent', 'good', 'poor');
    scoreFeedback.classList.remove('excellent', 'good', 'poor');

    if (score >= 85) {
        scoreCircle.classList.add('excellent');
        scoreFeedback.classList.add('excellent');
    } else if (score >= 60) {
        scoreCircle.classList.add('good');
        scoreFeedback.classList.add('good');
    } else {
        scoreCircle.classList.add('poor');
        scoreFeedback.classList.add('poor');
    }

    const tbody = document.getElementById('testResultsBody');
    tbody.innerHTML = '';

    testResults.forEach((test, index) => {
        const row = document.createElement('tr');

        const statusIcon = test.passed ? '✓' : '✗';
        const statusClass = test.passed ? 'pass' : 'fail';
        const inputDisplay = test.input.replace(/\n/g, '\\n');

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${test.name}</td>
            <td><code class="test-input">${inputDisplay}</code></td>
            <td><span class="test-status ${statusClass}">${statusIcon}</span></td>
            <td class="test-notes">${test.notes}</td>
        `;

        tbody.appendChild(row);
    });

    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function displayError(errorMessage) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.remove('hidden');

    const compilationOutput = document.getElementById('compilationOutput');
    compilationOutput.textContent = errorMessage;
    compilationOutput.style.color = '#f44336';

    document.getElementById('scoreValue').textContent = '0';
    document.getElementById('scoreFeedback').textContent = 'אירעה שגיאה בזמן הבדיקה.';

    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// ========================================
// Welcome Modal Logic – הצגה בכל ריענון
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('welcomeModal');
    const btn = document.getElementById('enterAppButton');

    if (!modal || !btn) return;

    // ודא שהמודל מוצג כברירת מחדל בכל טעינה
    modal.classList.remove('hidden-modal');

    btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // סגירת המודל (בטעינה הבאה שוב יופיע)
        modal.classList.add('hidden-modal');
    });
});
