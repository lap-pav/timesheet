// ============================================================================
// AI REPORT GENERATION CORE LOGIC
// ============================================================================

// ============================================================================
// AI PROCESSING CORE FUNCTIONS
// ============================================================================

/**
 * Process natural language input into structured AI request
 * @param {string} userInput - Raw natural language text
 * @returns {Object} Processed request data
 */
function processNaturalLanguageRequest(userInput) {
  try {
    logAIInfo('Processing natural language request', { input: userInput });
    
    // 1. Validate input
    if (!userInput || typeof userInput !== 'string') {
      return {
        success: false,
        error: 'Invalid input parameter: userInput must be a non-empty string'
      };
    }
    
    const trimmedInput = userInput.trim();
    if (trimmedInput.length === 0) {
      return {
        success: false,
        error: 'Input must be non-empty string'
      };
    }
    
    if (trimmedInput.length > AI_CONFIG.MAX_INPUT_LENGTH) {
      return {
        success: false,
        error: `Input exceeds maximum length of ${AI_CONFIG.MAX_INPUT_LENGTH} characters`
      };
    }
    
    // 2. Build AI context with timesheet structure and examples
    const aiContext = buildAIContext();
    if (!aiContext.success) {
      return {
        success: false,
        error: 'Failed to build AI context: ' + aiContext.error
      };
    }
    
    // 3. Build structured AI prompt
    const aiPrompt = buildAIPrompt(trimmedInput, aiContext.data);
    if (!aiPrompt.success) {
      return {
        success: false,
        error: 'Failed to build AI prompt: ' + aiPrompt.error
      };
    }
    
    // 4. Check cache first
    const cacheKey = generateCacheKey(trimmedInput);
    const cachedResult = getCachedConfiguration(cacheKey);
    if (cachedResult.success && cachedResult.found) {
      logAIInfo('Using cached AI result', { cacheKey: cacheKey });
      return {
        success: true,
        data: cachedResult.config,
        fromCache: true
      };
    }
    
    // 5. Call AI service with prompt
    const aiResponse = callAIService(aiPrompt.data);
    if (!aiResponse.success) {
      // Try error recovery strategies
      const recoveryResult = handleAIServiceFailure(aiPrompt.data, aiResponse.error);
      if (!recoveryResult.success) {
        return {
          success: false,
          error: recoveryResult.error || recoveryResult.userMessage
        };
      }
      // Use recovery result
      aiResponse.data = recoveryResult.data;
      aiResponse.success = true;
    }
    
    // 6. Parse AI response into structured configuration
    const configResult = parseAIResponse(aiResponse.data);
    if (!configResult.success) {
      return {
        success: false,
        error: 'Failed to parse AI response: ' + configResult.error
      };
    }
    
    // 7. Validate generated configuration
    const validationResult = validateConfiguration(configResult.data);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Configuration validation failed: ' + validationResult.error
      };
    }
    
    // 8. Cache the successful result
    setCachedConfiguration(cacheKey, configResult.data);
    
    // 9. Store configuration in Report Config sheet
    const storeResult = storeConfiguration(configResult.data);
    if (!storeResult.success) {
      return {
        success: false,
        error: 'Failed to store configuration: ' + storeResult.error
      };
    }
    
    logAIInfo('Successfully processed natural language request', {
      reportName: configResult.data.name,
      outputStructure: configResult.data.output_structure
    });
    
    return {
      success: true,
      data: configResult.data,
      fromCache: false
    };
    
  } catch (error) {
    logAIInfo('Error in processNaturalLanguageRequest', error);
    return {
      success: false,
      error: 'Internal processing error: ' + error.message
    };
  }
}

/**
 * Build comprehensive AI context from timesheet structure and examples
 * @returns {Object} AI context data
 */
function buildAIContext() {
  try {
    logAIInfo('Building AI context');
    
    // 1. Get timesheet data structure information
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    // 2. Identify data columns from first timesheet sheet
    let dataStructure = [];
    for (const sheet of sheets) {
      const sheetName = sheet.getName();
      if (sheetName.includes('Timesheet_') || sheetName.includes('timesheet')) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        dataStructure = headers.filter(header => header && header.trim() !== '');
        break;
      }
    }
    
    // 3. Get existing report configurations for examples  
    let existingReports = [];
    try {
      const configSheet = spreadsheet.getSheetByName(AI_REPORT_CONFIG.SHEET_NAME);
      if (configSheet) {
        const configData = configSheet.getDataRange().getValues();
        const configHeaders = configData[0];
        
        for (let i = 1; i < Math.min(configData.length, 6); i++) { // Limit to 5 examples
          const row = configData[i];
          const reportConfig = {};
          configHeaders.forEach((header, index) => {
            if (row[index] !== undefined) {
              reportConfig[header] = row[index];
            }
          });
          if (reportConfig.name) {
            existingReports.push(reportConfig);
          }
        }
      }
    } catch (error) {
      logAIInfo('No existing report configurations found', error);
    }
    
    // 4. Build context object
    const context = {
      dataStructure: dataStructure,
      availableFields: Object.keys(AI_FIELD_MAPPING),
      fieldMappings: AI_FIELD_MAPPING,
      expressionFunctions: AI_EXPRESSION_FUNCTIONS,
      outputStructures: AI_REPORT_CONFIG.VALID_OUTPUT_STRUCTURES,
      summaryTypes: AI_REPORT_CONFIG.VALID_SUMMARY_TYPES,
      sortOrders: AI_REPORT_CONFIG.VALID_SORT_ORDERS,
      existingReports: existingReports,
      constraints: {
        maxReportNameLength: AI_REPORT_CONFIG.MAX_REPORT_NAME_LENGTH,
        maxDescriptionLength: AI_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH
      }
    };
    
    logAIInfo('AI context built successfully', {
      fieldsCount: dataStructure.length,
      existingReportsCount: existingReports.length
    });
    
    return {
      success: true,
      data: context
    };
    
  } catch (error) {
    logAIInfo('Error building AI context', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build structured AI prompt for report generation
 * @param {string} userInput - Natural language description
 * @param {Object} context - AI context data
 * @returns {Object} Formatted AI prompt
 */
function buildAIPrompt(userInput, context) {
  try {
    logAIInfo('Building AI prompt', { inputLength: userInput.length });
    
    const prompt = `You are a timesheet report configuration generator. Create a JSON configuration based on the user's natural language description.

USER REQUEST: "${userInput}"

AVAILABLE DATA STRUCTURE:
${JSON.stringify(context.dataStructure, null, 2)}

FIELD MAPPINGS (Internal → Display):
${JSON.stringify(context.fieldMappings, null, 2)}

EXPRESSION FUNCTIONS:
${context.expressionFunctions.join('\n')}

OUTPUT STRUCTURES:
${context.outputStructures.join(', ')}

SUMMARY TYPES:
${context.summaryTypes.join(', ')}

EXISTING REPORT EXAMPLES:
${JSON.stringify(context.existingReports, null, 2)}

REQUIREMENTS:
1. Report name must be unique and ≤ ${context.constraints.maxReportNameLength} characters
2. Description must be ≤ ${context.constraints.maxDescriptionLength} characters  
3. Use only available fields and expression functions
4. Choose appropriate output structure and summary type
5. Include relevant sorting and grouping
6. Return valid JSON only, no additional text

SUMMARY TYPE GUIDANCE:
- NONE: Individual timesheet entries (detailed records, no aggregation)
- MEMBER_TOTALS: Aggregated totals per member (one summary row per member)
- DAILY_TOTALS: Aggregated totals per day (one summary row per day)
- PROJECT_TOTALS: Aggregated totals per project (one summary row per project)  
- MEMBER_PROJECT_BREAKDOWN: Percentage breakdown of each member's time across projects

OUTPUT STRUCTURE GUIDANCE:
- SINGLE_SHEET: All data in one sheet (use for detailed records or simple reports)
- SHEET_PER_PROJECT: Separate sheet for each project (use with NONE to organize detailed records)
- SHEET_PER_EMPLOYEE: Separate sheet for each member (use with NONE to organize detailed records)
- FILE_PER_PROJECT: Separate file for each project (use with NONE for detailed project records)
- FILE_PER_EMPLOYEE: Separate file for each member (use with NONE for detailed member records)

IMPORTANT DISTINCTIONS:
- For "report BY member" (detailed records organized by member): Use NONE + SHEET_PER_EMPLOYEE
- For "totals PER member" (aggregated summary): Use MEMBER_TOTALS + SINGLE_SHEET
- For "breakdown BY project" (detailed records organized by project): Use NONE + SHEET_PER_PROJECT
- For "totals PER project" (aggregated summary): Use PROJECT_TOTALS + SINGLE_SHEET

EXAMPLE USER REQUESTS:
- "Show me timesheet entries by member" → NONE + SHEET_PER_EMPLOYEE
- "Show me member work hours summary" → MEMBER_TOTALS + SINGLE_SHEET
- "Create detailed project reports" → NONE + SHEET_PER_PROJECT
- "Show total hours per project" → PROJECT_TOTALS + SINGLE_SHEET

GROUPING RULES:
- If output_structure is SINGLE_SHEET: group_by should be []
- If output_structure contains PROJECT: group_by should be ["project"]  
- If output_structure contains EMPLOYEE: group_by should be ["member"]

CRITICAL COLUMN REQUIREMENT:
- If group_by contains any field, that field MUST be included in the fields array
- Example: If group_by is ["member"], then fields must include a field with name "member"
- Example: If group_by is ["project"], then fields must include a field with name "project"
- Always include the grouping field as the first field in the fields array

REQUIRED JSON FORMAT:
{
  "name": "Report Name",
  "description": "Report description",
  "output_structure": "SINGLE_SHEET",
  "summary_type": "NONE", 
  "fields": [
    {
      "name": "field_name",
      "expression": "field_name or expression",
      "display_name": "Display Name"
    }
  ],
  "filters": [
    {
      "field": "field_name",
      "operator": "equals|contains|greater_than|less_than",
      "value": "filter_value"
    }
  ],
  "sort": [
    {
      "field": "field_name", 
      "order": "ASC|DESC"
    }
  ],
  "group_by": ["field_name"]
}`;

    return {
      success: true,
      data: prompt
    };
    
  } catch (error) {
    logAIInfo('Error building AI prompt', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Call AI service with prompt and handle fallback
 * @param {string} prompt - Formatted AI prompt
 * @returns {Object} AI service response
 */
function callAIService(prompt) {
  try {
    logAIInfo('Calling AI service', { 
      primaryService: AI_CONFIG.PRIMARY_SERVICE,
      promptLength: prompt.length 
    });
    
    // Try primary service first
    let result;
    if (AI_CONFIG.PRIMARY_SERVICE === 'gemini') {
      result = callGeminiAPI(prompt);
    } else if (AI_CONFIG.PRIMARY_SERVICE === 'claude') {
      result = callClaudeAPI(prompt);
    } else {
      return {
        success: false,
        error: 'Invalid primary AI service configured: ' + AI_CONFIG.PRIMARY_SERVICE
      };
    }
    
    // If primary service succeeds, return result
    if (result.success) {
      logAIInfo('Primary AI service succeeded', { service: AI_CONFIG.PRIMARY_SERVICE });
      return result;
    }
    
    // Primary service failed, try fallback
    logAIInfo('Primary service failed, trying fallback', { 
      primaryError: result.error,
      fallbackService: AI_CONFIG.FALLBACK_SERVICE 
    });
    
    let fallbackResult;
    if (AI_CONFIG.FALLBACK_SERVICE === 'claude') {
      fallbackResult = callClaudeAPI(prompt);
    } else if (AI_CONFIG.FALLBACK_SERVICE === 'gemini') {
      fallbackResult = callGeminiAPI(prompt);
    } else {
      return {
        success: false,
        error: 'Primary service failed and no valid fallback configured. Primary error: ' + result.error
      };
    }
    
    if (fallbackResult.success) {
      logAIInfo('Fallback AI service succeeded', { service: AI_CONFIG.FALLBACK_SERVICE });
      return fallbackResult;
    }
    
    // Both services failed
    return {
      success: false,
      error: `Both AI services failed. Primary (${AI_CONFIG.PRIMARY_SERVICE}): ${result.error}. Fallback (${AI_CONFIG.FALLBACK_SERVICE}): ${fallbackResult.error}`
    };
    
  } catch (error) {
    logAIInfo('Error in callAIService', error);
    return {
      success: false,
      error: 'AI service call error: ' + error.message
    };
  }
}

/**
 * Call Google Gemini API
 * @param {string} prompt - AI prompt
 * @returns {Object} API response
 */
function callGeminiAPI(prompt) {
  try {
    logAIInfo('Calling Gemini API');
    
    // Get API key from Properties Service
    const properties = PropertiesService.getScriptProperties();
    const apiKey = properties.getProperty('GEMINI_API_KEY');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please set GEMINI_API_KEY in script properties.'
      };
    }
    
    // Prepare request payload for Gemini
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        topP: 0.8,
        topK: 10
      }
    };
    
    // Make API request
    const response = UrlFetchApp.fetch(`${AI_ENDPOINTS.GEMINI}?key=${apiKey}`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      logAIInfo('Gemini API error', responseData);
      return {
        success: false,
        error: `Gemini API error (${response.getResponseCode()}): ${responseData.error?.message || 'Unknown error'}`
      };
    }
    
    // Extract generated text
    if (!responseData.candidates || responseData.candidates.length === 0) {
      return {
        success: false,
        error: 'No response candidates from Gemini API'
      };
    }
    
    const generatedText = responseData.candidates[0].content.parts[0].text;
    
    logAIInfo('Gemini API response received', { responseLength: generatedText.length });
    
    return {
      success: true,
      data: generatedText
    };
    
  } catch (error) {
    logAIInfo('Error calling Gemini API', error);
    return {
      success: false,
      error: 'Gemini API call failed: ' + error.message
    };
  }
}

/**
 * Call Claude API
 * @param {string} prompt - AI prompt  
 * @returns {Object} API response
 */
function callClaudeAPI(prompt) {
  try {
    logAIInfo('Calling Claude API');
    
    // Get API key from Properties Service
    const properties = PropertiesService.getScriptProperties();
    const apiKey = properties.getProperty('CLAUDE_API_KEY');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Claude API key not configured. Please set CLAUDE_API_KEY in script properties.'
      };
    }
    
    // Prepare request payload for Claude
    const payload = {
      model: AI_CONFIG.CLAUDE_MODEL,
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };
    
    // Make API request  
    const response = UrlFetchApp.fetch(AI_ENDPOINTS.CLAUDE, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      logAIInfo('Claude API error', responseData);
      return {
        success: false,
        error: `Claude API error (${response.getResponseCode()}): ${responseData.error?.message || 'Unknown error'}`
      };
    }
    
    // Extract generated text
    if (!responseData.content || responseData.content.length === 0) {
      return {
        success: false,
        error: 'No content in Claude API response'
      };
    }
    
    const generatedText = responseData.content[0].text;
    
    logAIInfo('Claude API response received', { responseLength: generatedText.length });
    
    return {
      success: true,
      data: generatedText
    };
    
  } catch (error) {
    logAIInfo('Error calling Claude API', error);
    return {
      success: false,
      error: 'Claude API call failed: ' + error.message
    };
  }
}

/**
 * Parse AI response into structured configuration
 * @param {string} aiResponse - Raw AI response text
 * @returns {Object} Parsed configuration
 */
function parseAIResponse(aiResponse) {
  try {
    logAIInfo('Parsing AI response', { responseLength: aiResponse.length });
    
    // 1. Clean the response - remove any markdown formatting or extra text
    let cleanedResponse = aiResponse.trim();
    
    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
    
    // Find JSON content (look for first { and last })
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      return {
        success: false,
        error: 'No valid JSON structure found in AI response'
      };
    }
    
    const jsonString = cleanedResponse.substring(firstBrace, lastBrace + 1);
    
    // 2. Parse JSON
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        success: false,
        error: 'Invalid JSON in AI response: ' + parseError.message
      };
    }
    
    // 3. Validate required fields
    const requiredFields = ['name', 'description', 'output_structure', 'fields'];
    for (const field of requiredFields) {
      if (!parsedConfig.hasOwnProperty(field)) {
        return {
          success: false,
          error: `Missing required field in AI response: ${field}`
        };
      }
    }
    
    // 4. Set defaults for optional fields
    parsedConfig.summary_type = parsedConfig.summary_type || 'NONE';
    parsedConfig.filters = parsedConfig.filters || [];
    parsedConfig.sort = parsedConfig.sort || [];
    parsedConfig.group_by = parsedConfig.group_by || [];
    
    // 5. Validate array fields
    if (!Array.isArray(parsedConfig.fields)) {
      return {
        success: false,
        error: 'Fields must be an array'
      };
    }
    
    if (!Array.isArray(parsedConfig.filters)) {
      parsedConfig.filters = [];
    }
    
    if (!Array.isArray(parsedConfig.sort)) {
      parsedConfig.sort = [];
    }
    
    if (!Array.isArray(parsedConfig.group_by)) {
      parsedConfig.group_by = [];
    }
    
    logAIInfo('AI response parsed successfully', {
      reportName: parsedConfig.name,
      fieldsCount: parsedConfig.fields.length
    });
    
    return {
      success: true,
      data: parsedConfig
    };
    
  } catch (error) {
    logAIInfo('Error parsing AI response', error);
    return {
      success: false,
      error: 'Failed to parse AI response: ' + error.message
    };
  }
}

/**
 * Validate generated configuration against constraints and data model
 * @param {Object} config - Report configuration  
 * @returns {Object} Validation result
 */
function validateConfiguration(config) {
  try {
    logAIInfo('Validating configuration', { reportName: config.name });
    
    const errors = [];
    
    // 1. Validate report name
    if (!config.name || typeof config.name !== 'string') {
      errors.push('Report name is required and must be a string');
    } else if (config.name.length > AI_REPORT_CONFIG.MAX_REPORT_NAME_LENGTH) {
      errors.push(`Report name exceeds maximum length of ${AI_REPORT_CONFIG.MAX_REPORT_NAME_LENGTH} characters`);
    } else if (config.name.trim().length === 0) {
      errors.push('Report name cannot be empty');
    }
    
    // 2. Validate description
    if (!config.description || typeof config.description !== 'string') {
      errors.push('Description is required and must be a string');
    } else if (config.description.length > AI_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description exceeds maximum length of ${AI_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH} characters`);
    }
    
    // 3. Validate output structure
    if (!AI_REPORT_CONFIG.VALID_OUTPUT_STRUCTURES.includes(config.output_structure)) {
      errors.push(`Invalid output structure: ${config.output_structure}. Valid options: ${AI_REPORT_CONFIG.VALID_OUTPUT_STRUCTURES.join(', ')}`);
    }
    
    // 4. Validate summary type
    if (!AI_REPORT_CONFIG.VALID_SUMMARY_TYPES.includes(config.summary_type)) {
      errors.push(`Invalid summary type: ${config.summary_type}. Valid options: ${AI_REPORT_CONFIG.VALID_SUMMARY_TYPES.join(', ')}`);
    }
    
    // 5. Validate fields array
    if (!Array.isArray(config.fields) || config.fields.length === 0) {
      errors.push('Fields array is required and must not be empty');
    } else {
      config.fields.forEach((field, index) => {
        if (!field.name || typeof field.name !== 'string') {
          errors.push(`Field ${index + 1}: name is required and must be a string`);
        }
        if (!field.expression || typeof field.expression !== 'string') {
          errors.push(`Field ${index + 1}: expression is required and must be a string`);
        }
        if (!field.display_name || typeof field.display_name !== 'string') {
          errors.push(`Field ${index + 1}: display_name is required and must be a string`);
        }
      });
    }
    
    // 6. Validate sort orders
    if (config.sort && Array.isArray(config.sort)) {
      config.sort.forEach((sortItem, index) => {
        if (!sortItem.field || typeof sortItem.field !== 'string') {
          errors.push(`Sort ${index + 1}: field is required and must be a string`);
        }
        if (!AI_REPORT_CONFIG.VALID_SORT_ORDERS.includes(sortItem.order)) {
          errors.push(`Sort ${index + 1}: invalid order '${sortItem.order}'. Valid options: ${AI_REPORT_CONFIG.VALID_SORT_ORDERS.join(', ')}`);
        }
      });
    }
    
    // 7. Validate filters
    if (config.filters && Array.isArray(config.filters)) {
      config.filters.forEach((filter, index) => {
        if (!filter.field || typeof filter.field !== 'string') {
          errors.push(`Filter ${index + 1}: field is required and must be a string`);
        }
        if (!filter.operator || typeof filter.operator !== 'string') {
          errors.push(`Filter ${index + 1}: operator is required and must be a string`);
        }
        if (filter.value === undefined || filter.value === null) {
          errors.push(`Filter ${index + 1}: value is required`);
        }
      });
    }
    
    // 8. Auto-fix: Ensure grouping fields are included in columns
    if (config.group_by && Array.isArray(config.group_by) && config.group_by.length > 0) {
      config.group_by.forEach(function(groupField) {
        const hasField = config.fields.some(function(field) {
          return field.name === groupField;
        });
        
        if (!hasField) {
          // Auto-add missing grouping field to columns at the beginning
          const displayName = AI_FIELD_MAPPING[groupField] || groupField;
          config.fields.unshift({
            name: groupField,
            expression: groupField,
            display_name: displayName
          });
          
          logAIInfo('Auto-added missing grouping field to columns', {
            field: groupField,
            displayName: displayName
          });
        }
      });
    }
    
    // 9. Check for duplicate report name
    const duplicateCheck = checkDuplicateReportName(config.name);
    if (duplicateCheck.isDuplicate) {
      errors.push(`Report name '${config.name}' already exists. Please choose a different name.`);
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        error: 'Configuration validation failed:\n• ' + errors.join('\n• ')
      };
    }
    
    logAIInfo('Configuration validation passed', { reportName: config.name });
    
    return {
      success: true,
      data: config
    };
    
  } catch (error) {
    logAIInfo('Error validating configuration', error);
    return {
      success: false,
      error: 'Configuration validation error: ' + error.message
    };
  }
}

// ============================================================================
// CACHING FUNCTIONS
// ============================================================================

/**
 * Generate cache key for natural language input
 * @param {string} input - User input text
 * @returns {string} Cache key
 */
function generateCacheKey(input) {
  // Create a simple hash of the input for caching
  const normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');
  return 'ai_report_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, normalized)
    .map(byte => (byte + 256).toString(16).slice(-2))
    .join('');
}

/**
 * Get cached configuration from Properties Service
 * @param {string} cacheKey - Cache key
 * @returns {Object} Cached configuration result
 */
function getCachedConfiguration(cacheKey) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const cached = properties.getProperty(`AI_CACHE_${cacheKey}`);
    
    if (!cached) {
      return {
        success: true,
        found: false,
        reason: 'No cached data found'
      };
    }
    
    const cacheData = JSON.parse(cached);
    
    // Check if cache is expired
    const now = new Date().getTime();
    let isExpired = false;
    let cacheAge = 0;
    
    // Use expiresAt if available, otherwise fall back to timestamp
    if (cacheData.expiresAt) {
      const expirationTime = new Date(cacheData.expiresAt).getTime();
      isExpired = now > expirationTime;
      cacheAge = now - (cacheData.timestamp ? new Date(cacheData.timestamp).getTime() : now);
    } else if (cacheData.timestamp) {
      let cacheTimestamp = cacheData.timestamp;
      if (typeof cacheTimestamp === 'string') {
        cacheTimestamp = new Date(cacheTimestamp).getTime();
      }
      cacheAge = now - cacheTimestamp;
      const maxAge = AI_CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000;
      isExpired = cacheAge > maxAge;
    }
    
    if (isExpired) {
      // Cache expired, remove it
      properties.deleteProperty(`AI_CACHE_${cacheKey}`);
      logAIInfo('Cache hit', { cacheKey: cacheKey, age: Math.round(cacheAge / 1000 / 60) + ' minutes' });
      return {
        success: true,
        found: false,
        reason: 'Cache expired'
      };
    }
    
    logAIInfo('Cache hit', { cacheKey: cacheKey, age: Math.round(cacheAge / 1000 / 60) + ' minutes' });
    return {
      success: true,
      found: true,
      config: cacheData.config,
      service: cacheData.service,
      timestamp: new Date(cacheData.timestamp).toISOString(),
      expiresAt: cacheData.expiresAt
    };
    
  } catch (error) {
    logAIInfo('Error getting cached configuration', error);
    return {
      success: false,
      error: 'Failed to retrieve cached configuration: ' + error.message
    };
  }
}

/**
 * Set cached configuration in Properties Service
 * @param {string} cacheKey - Cache key
 * @param {Object} configuration - Report configuration to cache
 * @param {string} service - AI service used (optional, for contract compliance)
 * @returns {Object} Cache operation result
 */
function setCachedConfiguration(cacheKey, configuration, service = 'unknown') {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const expiresAt = new Date(now.getTime() + (AI_CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000)).toISOString();
    
    const cacheData = {
      config: configuration,
      service: service,
      timestamp: timestamp,
      expiresAt: expiresAt
    };
    
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(`AI_CACHE_${cacheKey}`, JSON.stringify(cacheData));
    
    logAIInfo('Configuration cached', { cacheKey: cacheKey });
    
    return {
      success: true,
      cacheKey: cacheKey,
      expiresAt: expiresAt,
      service: service
    };
    
  } catch (error) {
    logAIInfo('Error caching configuration', error);
    return {
      success: false,
      error: 'Failed to cache configuration: ' + error.message
    };
  }
}

/**
 * Clear expired cache entries
 * @returns {Object} Cache cleanup result
 */
function clearExpiredCache() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const allProperties = properties.getProperties();
    
    const now = new Date().getTime();
    const maxAge = AI_CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000;
    let clearedCount = 0;
    let errorCount = 0;
    
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('AI_CACHE_')) {
        try {
          const cacheData = JSON.parse(allProperties[key]);
          let isExpired = false;
          
          // Check expiration using expiresAt if available
          if (cacheData.expiresAt) {
            const expirationTime = new Date(cacheData.expiresAt).getTime();
            isExpired = now > expirationTime;
          } else if (cacheData.timestamp) {
            // Fallback to timestamp-based expiration
            let cacheTimestamp = cacheData.timestamp;
            if (typeof cacheTimestamp === 'string') {
              cacheTimestamp = new Date(cacheTimestamp).getTime();
            }
            const cacheAge = now - cacheTimestamp;
            isExpired = cacheAge > maxAge;
          }
          
          if (isExpired) {
            properties.deleteProperty(key);
            clearedCount++;
          }
        } catch (error) {
          // Invalid cache data, remove it
          properties.deleteProperty(key);
          errorCount++;
        }
      }
    });
    
    logAIInfo('Cache cleanup completed', { removedEntries: clearedCount });
    
    return {
      success: true,
      clearedCount: clearedCount,
      errorCount: errorCount
    };
    
  } catch (error) {
    logAIInfo('Error clearing expired cache', error);
    return {
      success: false,
      error: 'Failed to clear expired cache: ' + error.message
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Log AI-related information for debugging
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function logAIInfo(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = `[AI Report ${timestamp}] ${message}`;
  
  if (Object.keys(data).length > 0) {
    console.log(logEntry, data);
  } else {
    console.log(logEntry);
  }
}

/**
 * Check if AI credentials are properly configured
 * @returns {Object} Credential status
 */
function checkAICredentials() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const geminiKey = properties.getProperty('GEMINI_API_KEY');
    const claudeKey = properties.getProperty('CLAUDE_API_KEY');
    
    const status = {
      gemini: !!geminiKey,
      claude: !!claudeKey,
      hasAny: !!(geminiKey || claudeKey),
      hasBoth: !!(geminiKey && claudeKey)
    };
    
    logAIInfo('AI credentials check', status);
    
    return {
      success: true,
      data: status
    };
    
  } catch (error) {
    logAIInfo('Error checking AI credentials', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Setup AI credentials in Properties Service
 * @param {string} geminiKey - Gemini API key
 * @param {string} claudeKey - Claude API key
 * @returns {Object} Setup result
 */
function setupAICredentials(geminiKey, claudeKey) {
  try {
    const properties = PropertiesService.getScriptProperties();
    
    if (geminiKey && geminiKey.trim()) {
      properties.setProperty('GEMINI_API_KEY', geminiKey.trim());
      logAIInfo('Gemini API key configured');
    }
    
    if (claudeKey && claudeKey.trim()) {
      properties.setProperty('CLAUDE_API_KEY', claudeKey.trim());
      logAIInfo('Claude API key configured');
    }
    
    return {
      success: true,
      message: 'AI credentials configured successfully'
    };
    
  } catch (error) {
    logAIInfo('Error setting up AI credentials', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert AI fields array to app columns string format
 * @param {Array} fields - AI fields array like [{"name":"member","expression":"member","display_name":"Member Name"}]
 * @returns {string} App format like "Member Name:record.member,Date:record.date"
 */
function convertFieldsToColumnsString(fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return '';
  }
  
  return fields.map(function(field) {
    const displayName = field.display_name || field.name || '';
    const expression = field.expression || field.name || '';
    
    // Convert field references to record.field format
    let finalExpression = expression;
    
    if (expression.includes('(')) {
      // Handle function calls - convert field names in parameters
      finalExpression = convertFunctionParameterFields(expression);
    } else if (!expression.includes('record.')) {
      // Simple field name without function
      finalExpression = `record.${expression}`;
    }
    
    return `${displayName}:${finalExpression}`;
  }).join(',');
}

/**
 * Convert field names in function parameters to use record. prefix
 * @param {string} expression - Function expression like "calculateHours(from_time, to_time)"
 * @returns {string} Expression with converted field names like "calculateHours(record.from_time, record.to_time)"
 */
function convertFunctionParameterFields(expression) {
  // Use all available field names from AI_FIELD_MAPPING constant
  const fieldNames = Object.keys(AI_FIELD_MAPPING);
  
  let result = expression;
  
  fieldNames.forEach(function(fieldName) {
    // Replace field names that are not already prefixed with record.
    // Match field names that are standalone (word boundaries) and not preceded by record.
    const regex = new RegExp('\\b' + fieldName + '\\b', 'g');
    result = result.replace(regex, function(match, offset) {
      // Check if already prefixed with record.
      const before = result.substring(Math.max(0, offset - 7), offset);
      if (before.endsWith('record.')) {
        return match; // Already prefixed
      }
      return 'record.' + match;
    });
  });
  
  return result;
}

/**
 * Convert AI filters array to app filters string format
 * @param {Array} filters - AI filters array like [{"field":"project","operator":"equals","value":"SAAS"}]
 * @returns {string} App format like "Project Name=SAAS"
 */
function convertFiltersToString(filters) {
  if (!filters || !Array.isArray(filters) || filters.length === 0) {
    return '';
  }
  
  return filters.map(function(filter) {
    const field = filter.field || '';
    const operator = filter.operator || 'equals';
    const value = filter.value || '';
    
    // Map field names to display names
    const displayName = AI_FIELD_MAPPING[field] || field;
    
    // For now, only support equals operator in string format
    if (operator === 'equals') {
      return `${displayName}=${value}`;
    }
    
    return `${displayName}=${value}`;
  }).join(',');
}

/**
 * Convert AI sort array to app sort string format
 * @param {Array} sort - AI sort array like [{"field":"member","order":"ASC"}]
 * @returns {string} App format like "Member Name"
 */
function convertSortToString(sort) {
  if (!sort || !Array.isArray(sort) || sort.length === 0) {
    return '';
  }
  
  // Use the first sort field
  const firstSort = sort[0];
  const field = firstSort.field || '';
  
  // Map field names to display names
  return AI_FIELD_MAPPING[field] || field;
}

/**
 * Convert AI sort array to app sort order string format
 * @param {Array} sort - AI sort array like [{"field":"member","order":"ASC"}]
 * @returns {string} App format like "ASC" or "DESC"
 */
function convertSortOrderToString(sort) {
  if (!sort || !Array.isArray(sort) || sort.length === 0) {
    return 'ASC';
  }
  
  // Use the first sort field's order
  const firstSort = sort[0];
  return firstSort.order || 'ASC';
}

/**
 * Convert AI group_by array to app grouping field string format
 * @param {Array} groupBy - AI group_by array like ["member"]
 * @param {string} outputStructure - Output structure type
 * @returns {string} App format like "Member Name"
 */
function convertGroupingFieldToString(groupBy, outputStructure) {
  // Only set grouping field for multi-sheet/file output structures
  if (!outputStructure || outputStructure === 'SINGLE_SHEET') {
    return '';
  }
  
  if (!groupBy || !Array.isArray(groupBy) || groupBy.length === 0) {
    return '';
  }
  
  // Use the first grouping field
  const firstGroup = groupBy[0];
  
  // Map field names to display names
  return AI_FIELD_MAPPING[firstGroup] || firstGroup;
}

/**
 * Store AI-generated configuration in Report Configs Sheet
 * @param {Object} config - Validated configuration object
 * @returns {Object} Storage result with success status
 */
function storeConfiguration(config) {
  try {
    logAIInfo('Storing AI-generated configuration', { reportName: config.name || config.reportName });
    
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Try to get existing Report Configs sheet or create new one
    let configSheet = null;
    try {
      configSheet = spreadsheet.getSheetByName('Report Configs');
    } catch (error) {
      // Sheet doesn't exist, create it
      configSheet = spreadsheet.insertSheet('Report Configs');
      
      // Add headers for all 10 columns (A through J)
      configSheet.getRange(1, 1, 1, 10).setValues([[
        'Name', 'Description', 'Columns', 'Filters', 'Sort By', 'Sort Order', 'Summary Type', 'Output Structure', 'Grouping Field', 'Enabled'
      ]]);
      
      // Format headers
      configSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }
    
    // Find the next empty row
    const lastRow = configSheet.getLastRow();
    const nextRow = lastRow + 1;
    
    // Prepare the data row - convert AI JSON format to app string format
    const configRow = [
      config.name || config.reportName || 'AI Generated Report',
      config.description || 'Generated by AI',
      config.columns || convertFieldsToColumnsString(config.fields),
      convertFiltersToString(config.filters),
      convertSortToString(config.sort),
      convertSortOrderToString(config.sort),
      config.summaryType || config.summary_type || 'NONE',
      config.outputStructure || config.output_structure || 'SINGLE_SHEET',
      convertGroupingFieldToString(config.group_by, config.output_structure || config.outputStructure),
      'TRUE'  // Always enable AI-generated reports
    ];
    
    // Insert the configuration
    configSheet.getRange(nextRow, 1, 1, 10).setValues([configRow]);
    
    logAIInfo('Configuration stored successfully', { 
      sheetName: 'Report Configs',
      row: nextRow,
      reportName: config.name
    });
    
    return {
      success: true,
      sheetName: 'Report Configs',
      row: nextRow,
      configName: config.name || config.reportName
    };
    
  } catch (error) {
    logAIInfo('Error storing configuration', error);
    return {
      success: false,
      error: 'Failed to store configuration: ' + error.toString()
    };
  }
}

/**
 * Check for duplicate report names in Report Configs Sheet
 * @param {string} reportName - Name to check for duplicates
 * @returns {Object} Duplicate check result
 */
function checkDuplicateReportName(reportName) {
  try {
    logAIInfo('Checking for duplicate report name', { reportName: reportName });
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = null;
    
    try {
      configSheet = spreadsheet.getSheetByName('Report Configs');
    } catch (error) {
      // Sheet doesn't exist, no duplicates possible
      return { success: true, isDuplicate: false };
    }
    
    // Get all existing names (assuming name is in column A)
    const lastRow = configSheet.getLastRow();
    if (lastRow <= 1) {
      // Only headers or empty sheet
      return { success: true, isDuplicate: false };
    }
    
    const nameRange = configSheet.getRange(2, 1, lastRow - 1, 1);
    const existingNames = nameRange.getValues().flat();
    
    // Check for exact match (case-insensitive)
    const isDuplicate = existingNames.some(name => 
      name && name.toString().toLowerCase() === reportName.toLowerCase()
    );
    
    logAIInfo('Duplicate check complete', { 
      reportName: reportName,
      isDuplicate: isDuplicate,
      existingCount: existingNames.length
    });
    
    return {
      success: true,
      isDuplicate: isDuplicate,
      suggestedName: isDuplicate ? `${reportName} (Copy)` : reportName
    };
    
  } catch (error) {
    logAIInfo('Error checking for duplicates', error);
    return {
      success: false,
      error: 'Failed to check duplicates: ' + error.toString()
    };
  }
}

/**
 * Handle AI service failures with comprehensive fallback strategy
 * @param {string} prompt - The original AI prompt
 * @param {string} error - The error message from the failed service
 * @returns {Object} Fallback handling result
 */
function handleAIServiceFailure(prompt, error) {
  try {
    logAIInfo('Handling AI service failure', { 
      errorMessage: error ? String(error).substring(0, 100) : 'Unknown error'
    });
    
    // Try to find a similar cached result as fallback
    const cacheKey = generateCacheKey(prompt);
    const cachedResult = getCachedConfiguration(cacheKey);
    
    if (cachedResult.success && cachedResult.found) {
      logAIInfo('Using cached result as fallback for service failure');
      return {
        success: true,
        data: cachedResult.config,
        source: 'cache_fallback',
        message: 'Retrieved similar report from cache due to service issues'
      };
    }
    
    // No cache available, return error with user-friendly message
    return {
      success: false,
      error: 'AI_SERVICE_UNAVAILABLE',
      userMessage: 'AI services are temporarily unavailable. Please try again in a few minutes.',
      technicalError: error ? error.toString() : 'Unknown error'
    };
    
  } catch (handlingError) {
    logAIInfo('Error in failure handling', handlingError);
    return {
      success: false,
      error: 'FAILURE_HANDLER_ERROR',
      userMessage: 'Unable to process your request at this time. Please try again later.',
      technicalError: handlingError.toString()
    };
  }
}

// Export functions for testing and main.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processNaturalLanguageRequest,
    buildAIContext,
    buildAIPrompt,
    callAIService,
    callGeminiAPI,
    callClaudeAPI,
    parseAIResponse,
    validateConfiguration,
    generateCacheKey,
    getCachedConfiguration,
    setCachedConfiguration,
    clearExpiredCache,
    logAIInfo,
    checkAICredentials,
    setupAICredentials,
    storeConfiguration,
    checkDuplicateReportName,
    handleAIServiceFailure
  };
}
