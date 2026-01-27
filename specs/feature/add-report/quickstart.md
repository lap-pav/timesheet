# Quickstart: AI-Powered Report Generation

## Overview
This guide walks through implementing and testing the AI-powered report generation feature that allows users to create custom timesheet reports using natural language descriptions.

## Prerequisites
- Google Apps Script project with existing timesheet functionality
- Report Configs Sheet with enhanced configuration format
- Access to Gemini and Claude AI services
- Jest testing environment for unit tests

## Implementation Steps

### Step 1: Set Up AI Service Integration
```javascript
// 1. Add API key configuration constants
const AI_CONFIG = {
  GEMINI_API_KEY: 'your_gemini_api_key',
  CLAUDE_API_KEY: 'your_claude_api_key',
  PRIMARY_SERVICE: 'gemini',
  FALLBACK_SERVICE: 'claude',
  CACHE_TTL_HOURS: 24,
  MAX_INPUT_LENGTH: 1000
};

// 2. Store API keys securely in Properties Service
function setupAICredentials() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'GEMINI_API_KEY': AI_CONFIG.GEMINI_API_KEY,
    'CLAUDE_API_KEY': AI_CONFIG.CLAUDE_API_KEY
  });
}
```

### Step 2: Create Main Menu Integration
```javascript
// Add to existing onOpen() function
function onOpen() {
  // ... existing menu items ...
  
  ui.createMenu('AI Reports')
    .addItem('Create Report from Description', 'generateReportFromNaturalLanguage')
    .addToUi();
}

// Main entry point function
function generateReportFromNaturalLanguage() {
  try {
    // Show input dialog
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'Create Report',
      'Describe the report you want to create:\n(e.g., "Show weekly hours by project for development team")',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.CANCEL) {
      return;
    }
    
    const userInput = response.getResponseText().trim();
    if (!userInput) {
      ui.alert('Please provide a report description');
      return;
    }
    
    // Process the request
    processNaturalLanguageReport(userInput);
    
  } catch (error) {
    console.error('Error in generateReportFromNaturalLanguage:', error);
    SpreadsheetApp.getUi().alert('Error creating report: ' + error.message);
  }
}
```

### Step 3: Implement Core Processing Functions
```javascript
function processNaturalLanguageReport(userInput) {
  // 1. Check cache first
  const cacheKey = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, 
    userInput, 
    Utilities.Charset.UTF_8
  ).map(byte => (byte + 256).toString(16).slice(-2)).join('');
  
  const cached = getCachedConfiguration(cacheKey);
  if (cached.found) {
    storeConfiguration(cached.data.configuration);
    showSuccessMessage(cached.data.configuration.reportName);
    return;
  }
  
  // 2. Generate AI request
  const context = buildAIContext();
  const prompt = buildAIPrompt(userInput, context);
  
  // 3. Call AI service
  const aiResponse = callAIService(prompt, AI_CONFIG.PRIMARY_SERVICE);
  if (!aiResponse.success) {
    // Try fallback service
    const fallbackResponse = callAIService(prompt, AI_CONFIG.FALLBACK_SERVICE);
    if (!fallbackResponse.success) {
      throw new Error('Both AI services failed: ' + aiResponse.error);
    }
    aiResponse = fallbackResponse;
  }
  
  // 4. Parse and validate response
  const config = parseAIResponse(aiResponse.data.rawResponse);
  if (!config.success) {
    throw new Error('Failed to parse AI response: ' + config.error.message);
  }
  
  const validation = validateConfiguration(config.data);
  if (!validation.isValid) {
    throw new Error('Invalid configuration: ' + validation.errors.join(', '));
  }
  
  // 5. Store configuration
  setCachedConfiguration(cacheKey, config.data);
  storeConfiguration(config.data);
  showSuccessMessage(config.data.reportName);
}
```

### Step 4: Build AI Context and Prompts
```javascript
function buildAIContext() {
  // Load examples from REPORT_CONFIGS_EXAMPLES.md content
  const examples = `
Column format examples:
- Member Name:record.member
- Hours:calculateHours(record.from_time,record.to_time)
- Project:record.project
- Day:getDayOfWeek(record.date)

Available fields: member, date, from_time, to_time, project, task_type, description

Available functions: calculateHours, formatDate, getDayOfWeek, getMonthName, 
defaultValue, stringContains, upper, lower, concat

Output structures: SINGLE_SHEET, SHEET_PER_PROJECT, SHEET_PER_EMPLOYEE, 
FILE_PER_PROJECT, FILE_PER_EMPLOYEE

Summary types: NONE, MEMBER_TOTALS, DAILY_TOTALS, PROJECT_TOTALS
  `;
  
  return examples;
}

function buildAIPrompt(userInput, context) {
  return `
You are a report configuration generator for a timesheet system. Generate a valid configuration based on the user's natural language description.

Context and Examples:
${context}

User Request: "${userInput}"

Generate a JSON configuration with these exact fields:
{
  "reportName": "descriptive name (max 50 chars)",
  "description": "what the report shows (max 200 chars)",
  "columns": "comma-separated column expressions",
  "filters": "optional filter expressions",
  "sortBy": "column name to sort by",
  "sortOrder": "ASC or DESC",
  "summaryType": "NONE, MEMBER_TOTALS, DAILY_TOTALS, or PROJECT_TOTALS",
  "outputStructure": "SINGLE_SHEET, SHEET_PER_PROJECT, etc",
  "groupingField": "field name for grouping if needed"
}

Return only valid JSON with no additional text.
  `;
}
```

### Step 5: Implement AI Service Calls
```javascript
function callAIService(prompt, service) {
  try {
    const properties = PropertiesService.getScriptProperties();
    let url, headers, payload;
    
    if (service === 'gemini') {
      const apiKey = properties.getProperty('GEMINI_API_KEY');
      url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      });
    } else if (service === 'claude') {
      const apiKey = properties.getProperty('CLAUDE_API_KEY');
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      payload = JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });
    }
    
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: headers,
      payload: payload
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }
    
    return {
      success: true,
      data: {
        rawResponse: response.getContentText(),
        service: service,
        responseTime: Date.now() // Simplified timing
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'service_error',
        message: error.message,
        retryable: true
      }
    };
  }
}
```

## Testing Strategy

### Unit Tests for UI Functions
```javascript
// tests/unit/test_ai_report_generation.js
const { generateReportFromNaturalLanguage, processNaturalLanguageReport } = require('../../script/main.js');

// Mock Google Apps Script APIs
const mockSpreadsheetApp = {
  getUi: () => ({
    prompt: jest.fn(),
    alert: jest.fn(),
    Button: { CANCEL: 'CANCEL' },
    ButtonSet: { OK_CANCEL: 'OK_CANCEL' }
  })
};

global.SpreadsheetApp = mockSpreadsheetApp;
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: jest.fn(),
    setProperties: jest.fn()
  })
};

describe('AI Report Generation', () => {
  test('should handle user cancellation', () => {
    mockSpreadsheetApp.getUi().prompt.mockReturnValue({
      getSelectedButton: () => 'CANCEL'
    });
    
    expect(() => generateReportFromNaturalLanguage()).not.toThrow();
  });
  
  test('should validate user input', () => {
    mockSpreadsheetApp.getUi().prompt.mockReturnValue({
      getSelectedButton: () => 'OK',
      getResponseText: () => ''
    });
    
    generateReportFromNaturalLanguage();
    expect(mockSpreadsheetApp.getUi().alert).toHaveBeenCalledWith('Please provide a report description');
  });
});
```

### Integration Test Scenarios
```javascript
describe('End-to-End Report Generation', () => {
  test('should generate simple report configuration', async () => {
    const userInput = 'Show hours by employee for last month';
    
    // Mock AI service response
    global.UrlFetchApp = {
      fetch: jest.fn().mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          reportName: 'Monthly Hours by Employee',
          description: 'Shows total hours worked by each employee last month',
          columns: 'Member Name:record.member,Hours:calculateHours(record.from_time,record.to_time)',
          summaryType: 'MEMBER_TOTALS',
          outputStructure: 'SINGLE_SHEET'
        })
      })
    };
    
    const result = await processNaturalLanguageReport(userInput);
    expect(result).toBeTruthy();
  });
});
```

## Manual Testing Checklist

### Happy Path Testing
- [ ] User enters simple request: "Show hours by project"
- [ ] System generates valid configuration
- [ ] Configuration appears in Report Configs Sheet
- [ ] Report can be exported using existing functionality

### Error Handling Testing  
- [ ] Empty input → User prompted for retry
- [ ] Invalid AI response → Error message shown
- [ ] Network failure → Fallback service attempted
- [ ] Both services fail → Clear error message

### Edge Case Testing
- [ ] Very long input (>1000 chars) → Truncated or rejected
- [ ] Ambiguous request → Clarification requested
- [ ] Duplicate report name → Auto-increment or error
- [ ] Invalid field references → Validation catches

## Deployment Steps

1. **Set up API credentials** in Google Apps Script Properties
2. **Copy code** to Google Apps Script editor
3. **Test basic functionality** with simple requests
4. **Verify Report Configs Sheet** integration
5. **Test error handling** with invalid inputs
6. **Deploy to production** environment

## Success Criteria

✅ **User can create reports** using natural language  
✅ **AI generates valid configurations** matching existing format  
✅ **Configurations stored correctly** in Report Configs Sheet  
✅ **Error handling works** for common failure cases  
✅ **Performance acceptable** (<3 seconds with caching)  
✅ **Integration seamless** with existing export functionality

## Next Steps

After successful quickstart implementation:
1. Add more sophisticated prompt engineering
2. Implement advanced caching strategies  
3. Add user feedback collection
4. Monitor AI service costs and usage
5. Consider adding configuration preview/editing before saving
