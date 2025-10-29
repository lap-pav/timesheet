# Research: AI-Powered Report Generation

## Research Overview
This document captures research findings for implementing natural language to report configuration generation using AI services within Google Apps Script constraints.

## AI Service Integration Research

### Decision: Gemini as Primary, Claude as Fallback
**Rationale**: 
- Gemini has better Google ecosystem integration and more generous free tier
- Claude provides excellent structured output generation as reliable fallback
- Both services support REST API calls compatible with Google Apps Script's UrlFetchApp

**Alternatives considered**:
- Single service approach: Less resilient to service outages
- Multiple services simultaneously: Unnecessary cost and complexity
- OpenAI GPT: Higher cost and less Google integration

## API Key Management Research

### Decision: Google Apps Script Properties Service with Encryption
**Rationale**:
- PropertiesService.getScriptProperties() provides secure, persistent storage
- Built-into Google Apps Script environment, no external dependencies
- Can implement additional encryption layer using Utilities.base64Encode/Decode
- Follows Google Apps Script security best practices

**Alternatives considered**:
- Environment variables: Not available in Google Apps Script runtime
- External key management: Violates constitution's no-external-dependencies rule
- User-provided keys: Poor user experience for business users

## Rate Limiting & Caching Strategy Research

### Decision: Local Caching with PropertiesService
**Rationale**:
- PropertiesService can store up to 9KB per property, sufficient for configurations
- Cache key = hash of natural language input for fast lookup
- Reduces API calls, improves performance, handles rate limits gracefully
- Falls within Google Apps Script storage constraints

**Alternatives considered**:
- No caching: Poor performance and higher API costs
- External caching service: Violates constitution requirements
- Session-based caching: Google Apps Script sessions are stateless

## Report Configuration Format Research

### Decision: Expression-Based Configuration Generation
**Rationale**:
- Existing REPORT_CONFIGS_EXAMPLES.md provides comprehensive format specification
- Expression system supports complex transformations: `Hours:calculateHours(record.from_time,record.to_time)`
- AI models excel at generating structured configuration from examples
- Full semantic validation possible using existing field mapping

**Key Format Elements**:
- Column format: `Display Name:expression` (e.g., `Member Name:record.member`)
- Built-in functions: calculateHours, formatDate, getDayOfWeek, etc.
- Output structures: SINGLE_SHEET, SHEET_PER_PROJECT, FILE_PER_EMPLOYEE
- Filter syntax: `Hours>8`, `Project Name contains Development`

## Validation Strategy Research

### Decision: Full Semantic Validation
**Rationale**:
- Check field names against known data model (record.member, record.date, etc.)
- Validate function calls against available expression functions
- Verify filter syntax and operators
- Prevents invalid configurations from reaching Report Configs Sheet

**Implementation approach**:
- Parse generated configuration into components
- Validate each column expression against field mapping
- Check function names and parameter counts
- Verify output structure options

## Error Handling Research

### Decision: Detailed Error Feedback with Retry Options
**Rationale**:
- Users need specific guidance when natural language is ambiguous
- Showing parsing errors helps users refine their requests
- Better user experience than silent failures or generic errors

**Error categories**:
- AI service failures (network, authentication, rate limits)
- Invalid configuration generation (unparseable, missing fields)
- Validation failures (unknown fields, invalid syntax)

## Google Apps Script API Integration Research

### Decision: Standard HTTP Calls with UrlFetchApp
**Rationale**:
- UrlFetchApp.fetch() supports HTTPS POST with JSON payloads
- Both Gemini and Claude APIs use standard REST interfaces
- Built-in JSON parsing with JSON.parse() and JSON.stringify()
- No external HTTP libraries needed

**API Patterns**:
- Gemini: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent`
- Claude: `https://api.anthropic.com/v1/messages`
- Standard OAuth/API key authentication headers

## Context Provision Strategy Research

### Decision: Comprehensive Context with Examples
**Rationale**:
- AI models need rich context to generate accurate configurations
- Include complete REPORT_CONFIGS_EXAMPLES.md content in prompts
- Provide field mapping and function reference
- Include validation rules and constraints

**Context components**:
- Available fields and their internal names
- Expression function library with examples
- Output structure options
- Filter syntax and operators
- Sample configurations for common use cases

## Performance Optimization Research

### Decision: Smart Caching and Prompt Optimization
**Rationale**:
- Cache frequently requested configurations
- Optimize AI prompts for consistent, structured output
- Use streaming responses where supported
- Implement timeout handling for Google Apps Script execution limits

**Optimization strategies**:
- Hash-based cache keys for exact match lookups
- Abbreviated prompts for common patterns
- Fallback to simpler configurations on timeout
- Progressive enhancement of complex configurations
