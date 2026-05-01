# Skill: Codebase Optimization Audit Pattern

## When to Use
When auditing a vanilla HTML/CSS/JS codebase for bloat, duplication, and token cost.

## Audit Checklist

### 1. Cross-File Duplication (Highest Token Impact)
- Firebase/API config objects duplicated across pages
- Service worker registration blocks duplicated
- Utility functions (escapeHtml, formatCurrency) defined multiple times
- CSS class definitions (.btn, .card) repeated in multiple stylesheets
- **Fix:** Extract to shared JS/CSS modules, link from all pages

### 2. Inline CSS Bloat
- Count inline `<style>` blocks in HTML files
- Count inline `style=""` attributes: `grep -c 'style="' file.html`
- **Fix:** Extract to external CSS files, convert inline attrs to classes

### 3. Dead Code Detection
- Search for function definitions, then grep for calls
- Look for "deprecated" comments near functions
- Check for variables only used in dead functions
- Check stub files that import but export nothing

### 4. Duplicate Logic Within Files
- Repeated state update patterns
- Same calculation in multiple code paths
- Key/suffix construction repeated
- Currency formatting done inline instead of via helper

### 5. Token Cost Rule of Thumb
- Every line duplicated across N files costs N× tokens when AI reads codebase
- Extracting to shared modules means AI reads once, not per-page
- Inline CSS/JS in HTML makes pages ~30-50% larger than necessary for AI context
