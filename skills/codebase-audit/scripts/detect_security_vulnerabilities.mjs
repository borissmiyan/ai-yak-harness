#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * detect_security_vulnerabilities.mjs — Mechanical Security Auditor Gate
 *
 * Implements mechanical checks derived from the /security-auditor skill:
 * 1. Frontend Service Role Leak: Never expose SUPABASE_SERVICE_ROLE_KEY in src/
 * 2. Service Role Bypass: Edge Functions using service_role must authenticate requests
 * 3. Insecure CORS: Disallow wildcard CORS ('*') on authenticated API endpoints
 * 4. Dangerous XSS Sinks: dangerouslySetInnerHTML without DOMPurify or javascript: URIs
 * 5. Dynamic Code Execution: eval() and new Function() banned in production code
 * 6. Unvalidated Open Redirects: window.location.href from searchParams
 */

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const EXCLUDED_DIRS = new Set([
  '.agent', '.agents', 'node_modules', 'dist', 'build', '.git',
  'backups', 'scratch', 'graphify-out', 'e2e'
]);

function getAllFiles(dir, extensions) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...getAllFiles(path.join(dir, entry.name), extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function isTestFile(fpath) {
  return fpath.includes('__tests__') || fpath.includes('.test.') || fpath.includes('.spec.');
}

const violations = [];

function addViolation(file, lineNo, severity, category, message) {
  const relPath = path.relative(targetDir, file);
  violations.push({
    file: relPath,
    line: lineNo,
    severity,
    category,
    message
  });
}

function checkAuditIgnore(lines, lineIdx) {
  const candidates = [];
  if (lineIdx >= 0 && lineIdx < lines.length) candidates.push(lines[lineIdx]);
  if (lineIdx - 1 >= 0 && lineIdx - 1 < lines.length) candidates.push(lines[lineIdx - 1]);
  for (const cand of candidates) {
    if (/@security-gate-ignore|audit-ignore/.test(cand)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// 1. Frontend Service Role Leak (src/)
// -----------------------------------------------------------------------------
const srcDir = path.join(targetDir, 'src');
const srcFiles = getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.mjs']).filter(f => !isTestFile(f));

for (const fpath of srcFiles) {
  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (checkAuditIgnore(lines, idx)) return;

    // Check VITE_*_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY
    if (/import\.meta\.env\.VITE_[A-Z0-9_]*SERVICE_ROLE/i.test(line) ||
        /process\.env\.SUPABASE_SERVICE_ROLE_KEY/i.test(line)) {
      addViolation(
        fpath, idx + 1, 'CRITICAL', 'Service-Role-Frontend-Leak',
        'Service role key accessed in frontend bundle: service_role bypasses RLS and must NEVER be exposed to clients.'
      );
    }

    // Check raw client creation with service role key (excluding logging/redaction regexes)
    if (/createClient\([^)]*service_role/i.test(line) && !/replace|redact|mask/i.test(line)) {
      addViolation(
        fpath, idx + 1, 'CRITICAL', 'Service-Role-Frontend-Leak',
        'Supabase client created with service_role privileges in frontend.'
      );
    }
  });
}

// -----------------------------------------------------------------------------
// 2. Service Role Bypass & Insecure CORS in Edge Functions (supabase/functions/)
// -----------------------------------------------------------------------------
const functionsDir = path.join(targetDir, 'supabase', 'functions');
const functionFiles = getAllFiles(functionsDir, ['.ts', '.js']).filter(f => !isTestFile(f));

for (const fpath of functionFiles) {
  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');

  const usesServiceRole = /SUPABASE_SERVICE_ROLE_KEY/i.test(content);
  const validatesAuth = /Authorization|authorization|auth\.getUser|auth\.getClaims|turnstile/i.test(content);
  const hasIgnore = /@security-gate-ignore|audit-ignore/.test(content);

  // If function uses service_role key to bypass RLS, it MUST validate authorization
  if (usesServiceRole && !validatesAuth && !hasIgnore) {
    addViolation(
      fpath, 1, 'CRITICAL', 'Service-Role-Bypass',
      'Edge Function initializes privileged SUPABASE_SERVICE_ROLE_KEY client without validating Authorization header or user session.'
    );
  }

  // Check CORS Wildcard on functions validating Authorization
  if (validatesAuth && !hasIgnore) {
    lines.forEach((line, idx) => {
      if (checkAuditIgnore(lines, idx)) return;
      if (/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/i.test(line)) {
        addViolation(
          fpath, idx + 1, 'WARN', 'Insecure-CORS-Wildcard',
          'Wildcard Access-Control-Allow-Origin: * configured on authenticated endpoint. Consider explicit allowed origins.'
        );
      }
    });
  }
}

// -----------------------------------------------------------------------------
// 3. Dangerous XSS Sinks (dangerouslySetInnerHTML & javascript: URIs in src/)
// -----------------------------------------------------------------------------
for (const fpath of srcFiles) {
  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (checkAuditIgnore(lines, idx)) return;

    // Check dangerouslySetInnerHTML without DOMPurify
    if (/dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/i.test(line)) {
      if (!/DOMPurify\.sanitize/i.test(line)) {
        // Also check if sanitize is on adjacent lines
        const context = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3)).join(' ');
        if (!/DOMPurify\.sanitize/i.test(context)) {
          addViolation(
            fpath, idx + 1, 'CRITICAL', 'XSS-Dangerous-HTML',
            'dangerouslySetInnerHTML used without DOMPurify.sanitize(). Ensure all HTML inputs are sanitized.'
          );
        }
      }
    }

    // Check javascript: URIs in href
    if (/href\s*=\s*["']\s*javascript:/i.test(line)) {
      addViolation(
        fpath, idx + 1, 'CRITICAL', 'XSS-Javascript-URI',
        'Dangerous javascript: pseudo-protocol in href attribute enables inline script execution.'
      );
    }
  });
}

// -----------------------------------------------------------------------------
// 4. Dynamic Code Execution (eval & new Function)
// -----------------------------------------------------------------------------
const allProductionFiles = [...srcFiles, ...functionFiles];
for (const fpath of allProductionFiles) {
  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (checkAuditIgnore(lines, idx)) return;

    // eval(...) check
    if (/\beval\s*\(/i.test(line) && !/\/\/.*eval/.test(line)) {
      addViolation(
        fpath, idx + 1, 'CRITICAL', 'Dynamic-Code-Execution',
        'eval() detected: dynamic code execution is banned in production code.'
      );
    }

    // new Function(...) check
    if (/new\s+Function\s*\(/i.test(line) && !/\/\/.*new Function/.test(line)) {
      addViolation(
        fpath, idx + 1, 'CRITICAL', 'Dynamic-Code-Execution',
        'new Function() constructor detected: dynamic code generation is banned.'
      );
    }
  });
}

// -----------------------------------------------------------------------------
// 5. Unvalidated Open Redirects (src/)
// -----------------------------------------------------------------------------
for (const fpath of srcFiles) {
  const content = fs.readFileSync(fpath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (checkAuditIgnore(lines, idx)) return;

    if (/window\.location\.href\s*=\s*(?:searchParams\.get|new\s+URLSearchParams|params\.)/i.test(line)) {
      const context = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3)).join(' ');
      if (!/startsWith\(['"]\/['"]\)|allowedDomains|whitelist/i.test(context)) {
        addViolation(
          fpath, idx + 1, 'WARN', 'Open-Redirect',
          'Unvalidated redirect from URL parameter directly assigned to window.location.href. Enforce relative path check.'
        );
      }
    }
  });
}

// -----------------------------------------------------------------------------
// Output findings in standard parser format
// -----------------------------------------------------------------------------
console.log('==============================');
console.log(' MECHANICAL SECURITY AUDIT SCAN');
console.log(` Target: ${targetDir}`);
console.log('==============================');

if (violations.length === 0) {
  console.log('✅ No mechanical security anti-patterns detected.');
  process.exit(0);
}

console.log(`\nFound ${violations.length} security finding(s):\n`);
for (const v of violations) {
  console.log(`${v.file}:${v.line}: [${v.severity}] ${v.category}: ${v.message}`);
}

process.exit(0);
