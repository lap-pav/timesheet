/**
 * Test functions for timesheet functionality
 * These functions can be used to validate the timesheet implementation
 */

/**
 * Run all tests
 */
function runAllTests() {
  console.log('Starting timesheet tests...');
  
  try {
    testTimeCalculation();
    testTimeValidation();
    testProjectSuggestion();
    testDateUtils();
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test time calculation functionality
 */
function testTimeCalculation() {
  console.log('Testing time calculations...');
  
  // Test normal work day
  const hours1 = calculateTotalHours('09:00', '17:00', 60); // 8 hours with 1 hour break
  assert(hours1 === 7, `Expected 7 hours, got ${hours1}`);
  
  // Test no break
  const hours2 = calculateTotalHours('10:00', '14:00', 0); // 4 hours no break
  assert(hours2 === 4, `Expected 4 hours, got ${hours2}`);
  
  // Test overnight shift
  const hours3 = calculateTotalHours('22:00', '06:00', 30); // Overnight with 30 min break
  assert(hours3 === 7.5, `Expected 7.5 hours, got ${hours3}`);
  
  console.log('✓ Time calculation tests passed');
}

/**
 * Test validation functions
 */
function testTimeValidation() {
  console.log('Testing validation functions...');
  
  // Test valid date
  assert(isValidDate('2024-01-15'), 'Valid date should return true');
  assert(!isValidDate('2024-13-01'), 'Invalid date should return false');
  assert(!isValidDate('invalid-date'), 'Invalid format should return false');
  
  // Test valid time
  assert(isValidTime('09:30'), 'Valid time should return true');
  assert(isValidTime('23:59'), 'Valid time should return true');
  assert(!isValidTime('25:00'), 'Invalid time should return false');
  assert(!isValidTime('9:30'), 'Invalid format should return false');
  
  // Test entry validation
  const validEntry = {
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60
  };
  
  const validation = validateTimesheetEntry(validEntry);
  assert(validation.isValid, 'Valid entry should pass validation');
  
  const invalidEntry = {
    date: '',
    startTime: '25:00',
    endTime: '17:00'
  };
  
  const invalidValidation = validateTimesheetEntry(invalidEntry);
  assert(!invalidValidation.isValid, 'Invalid entry should fail validation');
  assert(invalidValidation.errors.length > 0, 'Should have validation errors');
  
  console.log('✓ Validation tests passed');
}

/**
 * Test project suggestion functionality
 */
function testProjectSuggestion() {
  console.log('Testing project suggestions...');
  
  // Test development keywords
  const devSuggestion = suggestProject('Working on coding and debugging the application');
  assert(devSuggestion === 'Development', `Expected 'Development', got '${devSuggestion}'`);
  
  // Test meeting keywords
  const meetingSuggestion = suggestProject('Attended standup meeting with team');
  assert(meetingSuggestion === 'Meetings', `Expected 'Meetings', got '${meetingSuggestion}'`);
  
  // Test no match
  const noSuggestion = suggestProject('Random work description');
  assert(noSuggestion === '', `Expected empty string, got '${noSuggestion}'`);
  
  console.log('✓ Project suggestion tests passed');
}

/**
 * Test date utility functions
 */
function testDateUtils() {
  console.log('Testing date utilities...');
  
  // Test current date format
  const currentDate = getCurrentDate();
  assert(isValidDate(currentDate), 'Current date should be valid');
  
  // Test current time format
  const currentTime = getCurrentTime();
  assert(isValidTime(currentTime), 'Current time should be valid');
  
  // Test hours to time formatting
  const formattedTime = formatHoursToTime(7.5);
  assert(formattedTime === '07:30', `Expected '07:30', got '${formattedTime}'`);
  
  const formattedTime2 = formatHoursToTime(10.25);
  assert(formattedTime2 === '10:15', `Expected '10:15', got '${formattedTime2}'`);
  
  console.log('✓ Date utility tests passed');
}

/**
 * Simple assertion function for testing
 * @param {boolean} condition - Condition to test
 * @param {string} message - Error message if assertion fails
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test the complete timesheet workflow
 * This creates a test spreadsheet scenario
 */
function testCompleteWorkflow() {
  console.log('Testing complete workflow...');
  
  try {
    // Note: This test requires an active spreadsheet
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Initialize timesheet
    initializeTimesheet();
    console.log('✓ Timesheet initialized');
    
    // Add test entries
    const testEntries = [
      ['2024-01-15', '09:00', '17:00', 60, 'Development', 'Working on new features'],
      ['2024-01-16', '10:00', '18:00', 30, 'Meetings', 'Team meetings and planning'],
      ['2024-01-17', '08:30', '16:30', 45, 'Testing', 'Quality assurance testing']
    ];
    
    testEntries.forEach(entry => {
      addTimesheetEntry(entry[0], entry[1], entry[2], entry[3], entry[4], entry[5]);
    });
    console.log('✓ Test entries added');
    
    // Test calculations
    const totalHours = getTotalHoursInRange('2024-01-15', '2024-01-17');
    console.log(`Total hours for test period: ${totalHours}`);
    
    // Test summary generation
    const summary = generateMonthlySummary();
    console.log('Monthly summary:', summary);
    
    console.log('✅ Complete workflow test passed!');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    throw error;
  }
}

/**
 * Performance test for large datasets
 */
function testPerformance() {
  console.log('Testing performance with larger dataset...');
  
  const startTime = new Date().getTime();
  
  // Generate test data for calculation
  const testCalculations = [];
  for (let i = 0; i < 1000; i++) {
    const hours = calculateTotalHours('09:00', '17:00', 60);
    testCalculations.push(hours);
  }
  
  const endTime = new Date().getTime();
  const duration = endTime - startTime;
  
  console.log(`✓ Performance test completed: 1000 calculations in ${duration}ms`);
  assert(duration < 5000, 'Performance test should complete within 5 seconds');
}